import React, { useState } from 'react';
import type { Product } from '../types/pos';
import { getProductImage, getProductBadge } from '../utils/productVisuals';
import { CategoryIcon } from './icons';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const isAvailable = product.isActive;
  const startingPrice = product.variants.length > 0
    ? Math.min(...product.variants.map((v) => v.price))
    : product.basePrice;

  const imageUrl = getProductImage(product);
  const badge = getProductBadge(product);

  return (
    <div
      className={`product-card ${!isAvailable ? 'sold-out' : ''}`}
      onClick={() => isAvailable && onSelect(product)}
      role="button"
      tabIndex={isAvailable ? 0 : -1}
      aria-label={`Select ${product.name}`}
      style={{ cursor: isAvailable ? 'pointer' : 'not-allowed' }}
    >
      {/* Top Star Favorite Icon */}
      <button
        type="button"
        className={`product-star-btn ${isStarred ? 'starred' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          setIsStarred((prev) => !prev);
        }}
        title={isStarred ? 'Remove from favorites' : 'Add to favorites'}
        aria-label={`Favorite ${product.name}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={isStarred ? '#f59e0b' : 'none'} stroke={isStarred ? '#f59e0b' : '#94a3b8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      </button>

      <div className="product-image-container">
        {badge && isAvailable && (
          <span className={`product-badge badge-${badge.type}`}>
            {badge.label}
          </span>
        )}
        {!isAvailable && <span className="sold-out-badge">Unavailable</span>}

        {!imgFailed ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="product-img"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="product-img-fallback">
            <CategoryIcon name={product.category?.name || product.name} size={34} style={{ color: '#047857' }} />
          </div>
        )}
      </div>

      <div className="product-card-body">
        <h3 className="product-name" title={product.name}>{product.name}</h3>
      </div>

      <div className="product-card-footer">
        <span className="product-price">
          ₹{startingPrice % 1 === 0 ? startingPrice.toFixed(0) : startingPrice.toFixed(2)}
          {product.variants.length > 1 ? '+' : ''}
        </span>
        {isAvailable && (
          <span className="product-add-circle purple-circle" aria-hidden="true" title="Add item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </span>
        )}
      </div>
    </div>
  );
};
