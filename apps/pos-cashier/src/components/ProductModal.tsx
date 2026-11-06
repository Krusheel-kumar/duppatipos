import React, { useState } from 'react';
import type { Product, ProductVariant, AddOn, CartItem } from '../types/pos';

interface ProductModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: Omit<CartItem, 'id' | 'lineTotal'>) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
}) => {
  const defaultVariant = product.variants.length > 0 ? product.variants[0] : undefined;
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(defaultVariant);
  const [selectedAddOns, setSelectedAddOns] = useState<AddOn[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [itemNotes, setItemNotes] = useState<string>('');

  if (!isOpen) return null;

  const currentUnitPrice =
    (selectedVariant ? selectedVariant.price : product.basePrice) +
    selectedAddOns.reduce((sum, a) => sum + a.price, 0);

  const toggleAddOn = (addon: AddOn) => {
    if (selectedAddOns.some((a) => a.id === addon.id)) {
      setSelectedAddOns(selectedAddOns.filter((a) => a.id !== addon.id));
    } else {
      setSelectedAddOns([...selectedAddOns, addon]);
    }
  };

  const handleConfirm = () => {
    onAddToCart({
      product,
      selectedVariant,
      selectedAddOns,
      quantity,
      itemNotes,
      unitPrice: currentUnitPrice,
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-container">
        <div className="modal-header">
          <div>
            <h2 id="modal-title">{product.name}</h2>
            <span className="modal-base-sku">{product.sku}</span>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Variant / Size selection */}
          {product.variants.length > 0 && (
            <div className="option-section">
              <h4>Select Size / Variant</h4>
              <div className="variant-options">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    className={`option-btn ${selectedVariant?.id === variant.id ? 'active' : ''}`}
                    onClick={() => setSelectedVariant(variant)}
                  >
                    <span>{variant.name}</span>
                    <span className="price-tag">₹{variant.price.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add-ons selection */}
          {product.addOns.length > 0 && (
            <div className="option-section">
              <h4>Custom Add-Ons</h4>
              <div className="addon-options">
                {product.addOns.map((addon) => {
                  const isSelected = selectedAddOns.some((a) => a.id === addon.id);
                  return (
                    <button
                      key={addon.id}
                      type="button"
                      className={`option-btn ${isSelected ? 'active' : ''}`}
                      onClick={() => toggleAddOn(addon)}
                    >
                      <span>{addon.name}</span>
                      <span className="price-tag">+₹{addon.price.toFixed(2)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Preparation Notes */}
          <div className="option-section">
            <label htmlFor="item-notes"><h4>Special Instructions / Notes</h4></label>
            <input
              id="item-notes"
              type="text"
              placeholder="e.g. 50% sugar, extra ice, oat milk..."
              value={itemNotes}
              onChange={(e) => setItemNotes(e.target.value)}
              className="notes-input"
            />
          </div>

          {/* Quantity Controls */}
          <div className="quantity-section">
            <h4>Quantity</h4>
            <div className="qty-picker">
              <button
                type="button"
                className="qty-btn"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="qty-value">{quantity}</span>
              <button
                type="button"
                className="qty-btn"
                onClick={() => setQuantity(quantity + 1)}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary add-to-cart-btn"
            onClick={handleConfirm}
          >
            Add to Cart — ₹{(currentUnitPrice * quantity).toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
};


