import React, { useEffect, useState } from 'react';
import { createProduct, updateProduct, archiveProduct, Product } from '@/api/catalog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const ProductFormSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(''),
  sku: z.string().min(1),
  price: z.coerce.number().positive(),
  stock: z.coerce.number().int().min(0).default(0),
  category: z.string().min(1),
  status: z.enum(['draft', 'published']).default('draft'),
});

type ProductForm = z.infer<typeof ProductFormSchema>;

/**
 * Merchant dashboard for product lifecycle management.
 * Create, update, publish/draft toggle, and archive products.
 * Enforces SKU uniqueness per merchant.
 * SFP-139, SFP-149, SFP-181, SFP-205, SFP-206, SFP-217, SFP-220, SFP-221
 */
export default function MerchantDashboardPage(): React.ReactElement {
  const [products, setProducts] = useState<Product[]>([]);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProductForm>({
    resolver: zodResolver(ProductFormSchema),
  });

  // TODO [SFP-149]: fetch merchant's product list from /api/catalog/products?merchantId=me
  useEffect(() => {
    setProducts([]);
  }, []);

  async function onSubmit(data: ProductForm): Promise<void> {
    setError(null);
    setSuccess(null);
    try {
      if (editingSlug) {
        // SFP-181, SFP-220, SFP-221
        const updated = await updateProduct(editingSlug, data);
        setProducts((prev) => prev.map((p) => (p.slug === editingSlug ? updated : p)));
        setSuccess('Product updated successfully');
      } else {
        // SFP-181, SFP-205, SFP-206, SFP-217
        const created = await createProduct(data);
        setProducts((prev) => [created, ...prev]);
        setSuccess('Product created successfully');
      }
      reset();
      setEditingSlug(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Failed to save product');
    }
  }

  async function handleArchive(slug: string): Promise<void> {
    // SFP-139, SFP-206, SFP-217
    await archiveProduct(slug);
    setProducts((prev) => prev.map((p) => p.slug === slug ? { ...p, status: 'archived' as const } : p));
  }

  function startEdit(product: Product): void {
    setEditingSlug(product.slug);
    reset({
      title: product.title,
      description: product.description,
      sku: product.sku,
      price: product.price,
      stock: product.stock,
      category: product.category,
      status: product.status === 'archived' ? 'draft' : product.status,
    });
  }

  return (
    <main className="merchant-dashboard">
      <h1>Product Management</h1>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      <form onSubmit={handleSubmit(onSubmit)} className="product-form">
        <h2>{editingSlug ? 'Edit Product' : 'Add New Product'}</h2>

        <label>Title <input {...register('title')} /></label>
        {errors.title && <span className="error">{errors.title.message}</span>}

        <label>Description <textarea {...register('description')} /></label>

        <label>SKU <input {...register('sku')} /></label>
        {errors.sku && <span className="error">{errors.sku.message}</span>}

        <label>Price <input type="number" step="0.01" {...register('price')} /></label>
        {errors.price && <span className="error">{errors.price.message}</span>}

        <label>Stock <input type="number" {...register('stock')} /></label>

        <label>Category <input {...register('category')} /></label>
        {errors.category && <span className="error">{errors.category.message}</span>}

        {/* Publish/draft state (SFP-205, SFP-221) */}
        <label>
          Status
          <select {...register('status')}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>

        <div className="form-actions">
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : editingSlug ? 'Update Product' : 'Create Product'}
          </button>
          {editingSlug && (
            <button type="button" onClick={() => { reset(); setEditingSlug(null); }}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <section className="products-list">
        <h2>My Products</h2>
        <table>
          <thead>
            <tr>
              <th>Title</th><th>SKU</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product._id} className={product.status === 'archived' ? 'archived' : ''}>
                <td>{product.title}</td>
                <td>{product.sku}</td>
                <td>${product.price.toFixed(2)}</td>
                <td>{product.stock}</td>
                <td>{product.status}</td>
                <td>
                  {product.status !== 'archived' && (
                    <>
                      <button onClick={() => startEdit(product)}>Edit</button>
                      <button onClick={() => void handleArchive(product.slug)}>Archive</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
