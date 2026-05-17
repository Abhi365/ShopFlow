import React from 'react';
import { Link } from 'react-router-dom';
import { Product } from '@/api/catalog';
import { addToCart } from '@/api/cart';

interface ProductCardProps {
  product: Product;
}

/**
 * Shared product card used in CatalogPage and ProductDetailPage (related products).
 * SFP-140, SFP-141, SFP-150, SFP-154, SFP-184
 */
export default function ProductCard({ product }: ProductCardProps): React.ReactElement {
  async function handleQuickAdd(e: React.MouseEvent): Promise<void> {
    e.preventDefault();
    e.stopPropagation();
    await addToCart(product.sku, 1);
  }

  return (
    <article className="product-card">
      <Link to={`/products/${product.slug}`}>
        <img
          src={product.images[0] ?? '/placeholder.png'}
          alt={product.title}
          loading="lazy"
        />
        <div className="product-card-body">
          <h3>{product.title}</h3>
          <p className="product-card-category">{product.category}</p>
          <p className="product-card-price">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: product.currency }).format(
              product.price
            )}
          </p>
          {product.stock === 0 && <span className="out-of-stock-badge">Out of stock</span>}
        </div>
      </Link>
      {product.stock > 0 && (
        <button className="quick-add-btn" onClick={handleQuickAdd}>
          Quick add
        </button>
      )}
    </article>
  );
}
