import React from 'react';

interface Facet {
  _id: string;
  count: number;
}

interface FacetFilterProps {
  categories: Facet[];
  selected: string;
  onSelect: (category: string) => void;
}

/**
 * Category facet filter sidebar component.
 * SFP-140, SFP-150, SFP-162, SFP-198
 */
export default function FacetFilter({
  categories,
  selected,
  onSelect,
}: FacetFilterProps): React.ReactElement {
  return (
    <nav className="facet-filter" aria-label="Filter by category">
      <h3>Categories</h3>
      <ul>
        <li>
          <button
            className={!selected ? 'active' : ''}
            onClick={() => onSelect('')}
          >
            All <span className="count">({categories.reduce((s, f) => s + f.count, 0)})</span>
          </button>
        </li>
        {categories.map((facet) => (
          <li key={facet._id}>
            <button
              className={selected === facet._id ? 'active' : ''}
              onClick={() => onSelect(facet._id)}
            >
              {facet._id} <span className="count">({facet.count})</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
