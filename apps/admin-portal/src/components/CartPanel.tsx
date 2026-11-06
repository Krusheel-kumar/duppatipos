import React from 'react';
import type { CartItem, OrderType, CalculationResponse } from '../types/pos';

interface CartPanelProps {
  items: CartItem[];
  orderType: OrderType;
  onOrderTypeChange: (type: OrderType) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  customerNotes: string;
  onCustomerNotesChange: (notes: string) => void;
  backendCalculation: CalculationResponse | null;
  onReviewOrder: () => void;
}

export const CartPanel: React.FC<CartPanelProps> = ({
  items,
  orderType,
  onOrderTypeChange,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  customerNotes,
  onCustomerNotesChange,
  backendCalculation,
  onReviewOrder,
}) => {
  // Fallback estimates if backend calculation isn't ready
  const estimatedSubtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const subtotal = backendCalculation?.subtotal ?? estimatedSubtotal;
  const discount = backendCalculation?.discountAmount ?? 0;
  const tax = backendCalculation?.taxAmount ?? 0;
  const total = backendCalculation?.totalAmount ?? (subtotal - discount + tax);

  return (
    <aside className="cart-panel" aria-label="Current Order Cart">
      <div className="cart-header">
        <h2>Current Order</h2>
        {items.length > 0 && (
          <button type="button" className="btn-text-danger" onClick={onClearCart}>
            Clear
          </button>
        )}
      </div>

      {/* Order Type Toggle */}
      <div className="order-type-selector" role="group" aria-label="Order Type">
        {(['DINE_IN', 'TAKEAWAY', 'COUNTER'] as OrderType[]).map((type) => (
          <button
            key={type}
            type="button"
            className={`order-type-btn ${orderType === type ? 'active' : ''}`}
            onClick={() => onOrderTypeChange(type)}
          >
            {type.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Cart Items List */}
      <div className="cart-items-container">
        {items.length === 0 ? (
          <div className="empty-cart-state">
            <p>Your cart is empty.</p>
            <span>Tap any item on the menu to begin ordering.</span>
          </div>
        ) : (
          <ul className="cart-items-list">
            {items.map((item) => (
              <li key={item.id} className="cart-item">
                <div className="cart-item-info">
                  <span className="cart-item-title">
                    {item.product.name}
                    {item.selectedVariant && (
                      <span className="cart-item-variant"> ({item.selectedVariant.name})</span>
                    )}
                  </span>

                  {item.selectedAddOns.length > 0 && (
                    <span className="cart-item-addons">
                      + {item.selectedAddOns.map((a) => a.name).join(', ')}
                    </span>
                  )}

                  {item.itemNotes && (
                    <span className="cart-item-notes">Note: {item.itemNotes}</span>
                  )}

                  <span className="cart-item-price">
                    ${item.lineTotal.toFixed(2)}
                  </span>
                </div>

                <div className="cart-item-actions">
                  <button
                    type="button"
                    className="cart-qty-btn"
                    onClick={() => onUpdateQuantity(item.id, -1)}
                    aria-label={`Decrease ${item.product.name} quantity`}
                  >
                    −
                  </button>
                  <span className="cart-qty-num">{item.quantity}</span>
                  <button
                    type="button"
                    className="cart-qty-btn"
                    onClick={() => onUpdateQuantity(item.id, 1)}
                    aria-label={`Increase ${item.product.name} quantity`}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="cart-remove-btn"
                    onClick={() => onRemoveItem(item.id)}
                    aria-label={`Remove ${item.product.name} from cart`}
                  >
                    🗑
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Notes & Summary */}
      {items.length > 0 && (
        <div className="cart-footer">
          <div className="order-notes-box">
            <label htmlFor="customer-notes">Customer / Kitchen Instructions:</label>
            <input
              id="customer-notes"
              type="text"
              placeholder="e.g. Table #4, Allergies, Less ice..."
              value={customerNotes}
              onChange={(e) => onCustomerNotesChange(e.target.value)}
              className="notes-input"
            />
          </div>

          <div className="cart-summary">
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="summary-row discount">
                <span>Discount:</span>
                <span>-₹{discount.toFixed(2)}</span>
              </div>
            )}
            <div className="summary-row">
              <span>Taxes:</span>
              <span>₹{tax.toFixed(2)}</span>
            </div>
            <div className="summary-row total-row">
              <span>Total:</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>

          <button
            type="button"
            className="checkout-btn"
            onClick={onReviewOrder}
            disabled={items.length === 0}
          >
            Review & Place Order (${total.toFixed(2)})
          </button>
        </div>
      )}
    </aside>
  );
};


