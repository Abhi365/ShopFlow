import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchProducts, SearchResult, SearchParams } from '@/api/catalog';
import ProductCard from '@/components/ProductCard';
import FacetFilter from '@/components/FacetFilter';

/**
 * Product catalog with full-text search and faceted filtering.
 * Search state is encoded in URL query parameters for shareability.
 * SFP-140, SFP-150, SFP-161, SFP-162, SFP-163, SFP-197, SFP-198, SFP-199, SFP-200
 */
export default function CatalogPage(): React.ReactElement {
  const [searchParams, setSearchParams] = useSearchParams();
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Read search state from URL (SFP-199)
  const q = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? '';
  const sort = (searchParams.get('sort') ?? 'relevance') as SearchParams['sort'];
  const page = parseInt(searchParams.get('page') ?? '1');
  const minPrice = searchParams.get('minPrice') ?? undefined;
  const maxPrice = searchParams.get('maxPrice') ?? undefined;

  useEffect(() => {
    setLoading(true);
    void searchProducts({
      q: q || undefined,
      category: category || undefined,
      sort,
      page,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
    })
      .then(setResult)
      .finally(() => setLoading(false));
  }, [q, category, sort, page, minPrice, maxPrice]);

  function updateParam(key: string, value: string): void {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    next.delete('page'); // reset to page 1 on filter change
    setSearchParams(next);
  }

  return (
    <main className="catalog-page">
      <aside className="catalog-sidebar">
        <FacetFilter
          categories={result?.facets.categories ?? []}
          selected={category}
          onSelect={(cat) => updateParam('category', cat)}
        />
        <div className="price-filter">
          <label>
            Min price
            <input
              type="number"
              min={0}
              value={minPrice ?? ''}
              onChange={(e) => updateParam('minPrice', e.target.value)}
            />
          </label>
          <label>
            Max price
            <input
              type="number"
              min={0}
              value={maxPrice ?? ''}
              onChange={(e) => updateParam('maxPrice', e.target.value)}
            />
          </label>
        </div>
      </aside>

      <section className="catalog-main">
        <div className="catalog-toolbar">
          <input
            type="search"
            placeholder="Search products…"
            value={q}
            onChange={(e) => updateParam('q', e.target.value)}
            aria-label="Search products"
          />
          <select
            value={sort}
            onChange={(e) => updateParam('sort', e.target.value)}
            aria-label="Sort results"
          >
            <option value="relevance">Relevance</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="newest">Newest</option>
          </select>
        </div>

        {loading && <p>Loading…</p>}

        <div className="product-grid">
          {result?.products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
          {!loading && result?.products.length === 0 && (
            <p>No products found. Try a different search term.</p>
          )}
        </div>

        {result && result.pagination.totalPages > 1 && (
          <nav className="pagination" aria-label="Pagination">
            <button
              disabled={page <= 1}
              onClick={() => updateParam('page', String(page - 1))}
            >
              Previous
            </button>
            <span>
              Page {result.pagination.page} of {result.pagination.totalPages}
            </span>
            <button
              disabled={page >= result.pagination.totalPages}
              onClick={() => updateParam('page', String(page + 1))}
            >
              Next
            </button>
          </nav>
        )}
      </section>
    </main>
  );
}
