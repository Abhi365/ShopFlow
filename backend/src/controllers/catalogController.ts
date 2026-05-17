import { Request, Response } from 'express';
import slugify from 'slugify';
import { Product } from '../models/Product';
import { z } from 'zod';

const CreateProductSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().default(''),
  sku: z.string().min(1).max(100),
  price: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  stock: z.number().int().min(0).default(0),
  category: z.string().min(1),
  tags: z.array(z.string()).default([]),
  images: z.array(z.string().url()).default([]),
  status: z.enum(['draft', 'published']).default('draft'),
});

/**
 * GET /api/catalog/products
 * Performs full-text search + faceted filtering with URL-shareable parameters.
 * Target: P95 <300ms for up to 100K products.
 * SFP-140, SFP-150, SFP-161, SFP-162, SFP-163, SFP-197, SFP-198, SFP-199, SFP-200
 */
export async function searchProducts(req: Request, res: Response): Promise<void> {
  const {
    q,
    category,
    minPrice,
    maxPrice,
    tags,
    sort = 'relevance',
    page = '1',
    limit = '20',
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = { status: 'published' };

  // Full-text search with typo tolerance via MongoDB text index (SFP-161, SFP-197)
  if (q) {
    filter.$text = { $search: q };
  }

  // Faceted filters (SFP-162, SFP-198)
  if (category) filter.category = category;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = parseFloat(minPrice);
    if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
  }
  if (tags) {
    filter.tags = { $in: tags.split(',').map((t: string) => t.trim()) };
  }

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    relevance: q ? { score: { $meta: 'textScore' } as unknown as 1 } : { createdAt: -1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    newest: { createdAt: -1 },
  };
  const sortOption = sortMap[sort] ?? sortMap['newest'];

  const projection = q ? { score: { $meta: 'textScore' } } : {};

  const [products, total] = await Promise.all([
    Product.find(filter, projection).sort(sortOption).skip(skip).limit(limitNum).lean(),
    Product.countDocuments(filter),
  ]);

  // Build facet aggregation for category counts (SFP-162, SFP-198)
  // TODO [SFP-163]: add Redis cache layer for facet aggregation results
  const facets = await Product.aggregate([
    { $match: { status: 'published' } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  res.json({
    products,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    facets: { categories: facets },
  });
}

/**
 * GET /api/catalog/products/:slug
 * Returns product detail with JSON-LD structured data and related products.
 * SFP-141, SFP-154, SFP-182, SFP-183, SFP-184, SFP-191
 */
export async function getProductBySlug(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;

  const product = await Product.findOne({ slug, status: 'published' }).lean();
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  // Related products via same category (SFP-184)
  const related = await Product.find({
    category: product.category,
    _id: { $ne: product._id },
    status: 'published',
  })
    .limit(4)
    .select('title slug price images category')
    .lean();

  // JSON-LD structured data for Google Shopping (SFP-183)
  const structuredData = buildProductJsonLd(product);

  res.json({ product, related, structuredData });
}

function buildProductJsonLd(product: Record<string, unknown>): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product['title'],
    description: product['description'],
    sku: product['sku'],
    image: product['images'],
    offers: {
      '@type': 'Offer',
      price: product['price'],
      priceCurrency: product['currency'] ?? 'USD',
      availability:
        (product['stock'] as number) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      url: `${process.env.FRONTEND_URL ?? ''}/products/${product['slug']}`,
    },
  };
}

/**
 * POST /api/catalog/products
 * Creates a product. Generates a canonical slug and enforces SKU uniqueness per merchant.
 * SFP-139, SFP-149, SFP-181, SFP-191, SFP-205, SFP-206, SFP-217, SFP-220, SFP-221
 */
export async function createProduct(req: Request, res: Response): Promise<void> {
  const parsed = CreateProductSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;
  const merchantId = req.user!.sub;

  // Generate unique slug from title + merchant ID suffix (SFP-191)
  const baseSlug = slugify(data.title, { lower: true, strict: true });
  const slug = `${baseSlug}-${merchantId.slice(-6)}`;

  try {
    const product = await Product.create({ ...data, merchantId, slug });
    res.status(201).json(product);
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      res.status(409).json({ error: 'SKU already exists for this merchant (SFP-206, SFP-217)' });
      return;
    }
    throw err;
  }
}

/**
 * PATCH /api/catalog/products/:slug
 * Updates product fields. Validates required + optional fields.
 * SFP-139, SFP-149, SFP-181, SFP-205, SFP-220, SFP-221
 */
export async function updateProduct(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;
  const merchantId = req.user!.sub;

  const product = await Product.findOne({ slug, merchantId });
  if (!product) {
    res.status(404).json({ error: 'Product not found or not owned by merchant' });
    return;
  }
  if (product.status === 'archived') {
    res.status(400).json({ error: 'Cannot update archived product' });
    return;
  }

  const partial = CreateProductSchema.partial().safeParse(req.body);
  if (!partial.success) {
    res.status(400).json({ errors: partial.error.flatten() });
    return;
  }

  Object.assign(product, partial.data);
  await product.save();
  res.json(product);
}

/**
 * DELETE /api/catalog/products/:slug
 * Soft-deletes (archives) a product. Preserves all order references.
 * SFP-139, SFP-149, SFP-181, SFP-206, SFP-217
 */
export async function archiveProduct(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;
  const merchantId = req.user!.sub;

  const product = await Product.findOneAndUpdate(
    { slug, merchantId },
    { status: 'archived' },
    { new: true }
  );

  if (!product) {
    res.status(404).json({ error: 'Product not found or not owned by merchant' });
    return;
  }

  res.json({ message: 'Product archived', slug: product.slug });
}
