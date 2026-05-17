import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getProductDetail, Product } from '@/api/catalog';
import { addToCart } from '@/api/cart';
import ProductCard from '@/components/ProductCard';

/**
 * Product detail page with image carousel, pricing, stock status,
 * JSON-LD structured data injection, and related products section.
 * SFP-141, SFP-154, SFP-182, SFP-183, SFP-184, SFP-191
 */
export default function ProductDetailPage(): React.ReactElement {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    void getProductDetail(slug)
      .then(({ product, related, structuredData }) => {
        setProduct(product);
        setRelated(related);

        // Inject JSON-LD structured data for Google Shopping (SFP-183)
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(structuredData);
        script.id = 'product-jsonld';
        document.head.appendChild(script);
      })
      .catch(() => setError('Product not found'))
      .finally(() => setLoading(false));

    return () => {
      // Clean up structured data on unmount
      document.getElementById('product-jsonld')?.remove();
    };
  }, [slug]);

  async function handleAddToCart(): Promise<void> {
    if (!product) return;
    try {
      await addToCart(product.sku, quantity);
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 3000);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(message ?? 'Could not add to cart');
    }
  }

  if (loading) return <p>Loading product…</p>;
  if (error || !product) return <p className="error">{error ?? 'Not found'}</p>;

  return (
    <main className="product-detail-page">
      <div className="product-detail-layout">
        {/* Image carousel (SFP-182) */}
        <div className="product-images">
          <img
            src={product.images[selectedImage] ?? '/placeholder.png'}
            alt={product.title}
            className="product-main-image"
          />
          <div className="image-thumbnails">
            {product.images.map((src, idx) => (
              <button key={src} onClick={() => setSelectedImage(idx)} aria-label={`View image ${idx + 1}`}>
                <img src={src} alt={`Thumbnail ${idx + 1}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Product info */}
        <div className="product-info">
          <h1>{product.title}</h1>
          <p className="product-price">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: product.currency }).format(
              product.price
            )}
          </p>

          {/* Stock availability */}
          {product.stock > 0 ? (
            <p className="in-stock">In stock ({product.stock} available)</p>
          ) : (
            <p className="out-of-stock">Out of stock</p>
          )}

          <p className="product-description">{product.description}</p>

          {product.stock > 0 && (
            <div className="add-to-cart">
              <label>
                Quantity
                <input
                  type="number"
                  min={1}
                  max={product.stock}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </label>
              <button onClick={handleAddToCart} className="cta-button">
                {addedToCart ? 'Added!' : 'Add to cart'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Related products (SFP-184) */}
      {related.length > 0 && (
        <section className="related-products">
          <h2>Related products</h2>
          <div className="product-grid">
            {related.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
