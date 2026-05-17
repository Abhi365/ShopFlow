import api from './client';

export interface Product {
  _id: string;
  title: string;
  description: string;
  slug: string;
  sku: string;
  price: number;
  currency: string;
  stock: number;
  category: string;
  tags: string[];
  images: string[];
  status: 'draft' | 'published' | 'archived';
}

export interface SearchParams {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  tags?: string;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest';
  page?: number;
  limit?: number;
}

export interface SearchResult {
  products: Product[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  facets: { categories: Array<{ _id: string; count: number }> };
}

/**
 * Full-text search + faceted filter.
 * SFP-140, SFP-150, SFP-161, SFP-162, SFP-197, SFP-198, SFP-199
 */
export async function searchProducts(params: SearchParams): Promise<SearchResult> {
  const { data } = await api.get('/catalog/products', { params });
  return data;
}

/**
 * Product detail page data including related products and structured data.
 * SFP-141, SFP-154, SFP-182, SFP-183, SFP-184, SFP-191
 */
export async function getProductDetail(slug: string): Promise<{
  product: Product;
  related: Product[];
  structuredData: object;
}> {
  const { data } = await api.get(`/catalog/products/${slug}`);
  return data;
}

/**
 * Merchant: create a new product.
 * SFP-139, SFP-149, SFP-181, SFP-205, SFP-206, SFP-217, SFP-220, SFP-221
 */
export async function createProduct(payload: Partial<Product>): Promise<Product> {
  const { data } = await api.post('/catalog/products', payload);
  return data;
}

/**
 * Merchant: update a product.
 * SFP-139, SFP-149, SFP-181, SFP-220
 */
export async function updateProduct(slug: string, payload: Partial<Product>): Promise<Product> {
  const { data } = await api.patch(`/catalog/products/${slug}`, payload);
  return data;
}

/**
 * Merchant: archive a product.
 * SFP-139, SFP-149, SFP-181, SFP-206, SFP-217
 */
export async function archiveProduct(slug: string): Promise<void> {
  await api.delete(`/catalog/products/${slug}`);
}
