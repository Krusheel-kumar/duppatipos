import React from 'react';
import type { Product } from '../types/pos';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  const isAvailable = product.isActive;
  const startingPrice = product.variants.length > 0
    ? Math.min(...product.variants.map((v) => v.price))
    : product.basePrice;

  return (
    <button
      type="button"
      className={`product-card ${!isAvailable ? 'sold-out' : ''}`}
      onClick={() => isAvailable && onSelect(product)}
      disabled={!isAvailable}
      aria-label={`Select ${product.name}`}
    >
      <div className="product-card-header">
        <span className="product-sku">{product.sku || 'SKU'}</span>
        {!isAvailable && <span className="sold-out-badge">Unavailable</span>}
      </div>
      
      <div className="product-card-body">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-desc">{product.description}</p>
      </div>

      <div className="product-card-footer">
        <span className="product-price">
          ${startingPrice.toFixed(2)}
          {product.variants.length > 1 ? '+' : ''}
        </span>
        {isAvailable && (
          <span className="product-add-badge" aria-hidden="true">+ Add</span>
        )}
      </div>
    </button>
  );
};

