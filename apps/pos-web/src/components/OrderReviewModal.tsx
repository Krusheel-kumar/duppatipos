import React from 'react';
import type { CartItem, OrderType, CalculationResponse } from '../types/pos';

interface OrderReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmOrder: () => void;
  items: CartItem[];
  orderType: OrderType;
  customerNotes: string;
  calculation: CalculationResponse | null;
  isSubmitting: boolean;
  tableNumber?: string | null;
  isAddingToRunningOrder?: boolean;
}

export const OrderReviewModal: React.FC<OrderReviewModalProps> = ({
  isOpen,
  onClose,
  onConfirmOrder,
  items,
  orderType,
  customerNotes,
  calculation,
  isSubmitting,
  tableNumber,
  isAddingToRunningOrder,
}) => {
  if (!isOpen) return null;

  const estimatedSubtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const subtotal = calculation?.subtotal ?? estimatedSubtotal;
  const discount = calculation?.discountAmount ?? 0;
  const tax = calculation?.taxAmount ?? 0;
  const total = calculation?.totalAmount ?? (subtotal - discount + tax);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="review-title">
      <div className="modal-container review-modal">
        <div className="modal-header">
          <div>
            <h2 id="review-title">
              {isAddingToRunningOrder ? 'Add Items to Running Order' : 'Review Order'}
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <span className="order-badge">{orderType.replace('_', ' ')}</span>
              {tableNumber && (
                <span className="order-badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                  Table {tableNumber}
                </span>
              )}
            </div>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close review dialog">
            ✕
          </button>
        </div>

        <div className="modal-body">
          {customerNotes && (
            <div className="review-notice">
              <strong>Order Notes:</strong> {customerNotes}
            </div>
          )}

          <div className="review-items-list">
            <h4>Items Summary ({items.reduce((sum, i) => sum + i.quantity, 0)})</h4>
            <ul>
              {items.map((item) => (
                <li key={item.id} className="review-item-row">
                  <div>
                    <span className="review-item-name">
                      {item.quantity}x {item.product.name}
                      {item.selectedVariant && ` (${item.selectedVariant.name})`}
                    </span>
                    {item.selectedAddOns.length > 0 && (
                      <span className="review-addons">
                        + {item.selectedAddOns.map((a) => a.name).join(', ')}
                      </span>
                    )}
                    {item.itemNotes && (
                      <span className="review-item-notes">Note: {item.itemNotes}</span>
                    )}
                  </div>
                  <span className="review-item-price">₹{item.lineTotal.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="review-pricing-breakdown">
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
              <span>Estimated Taxes:</span>
              <span>₹{tax.toFixed(2)}</span>
            </div>
            <div className="summary-row total-row">
              <span>Final Total:</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Modify Order
          </button>
          <button
            type="button"
            className="btn-primary confirm-order-btn"
            onClick={onConfirmOrder}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Sending to Kitchen & POS...'
              : isAddingToRunningOrder
              ? `Confirm & Send Add-ons to Kitchen (₹${total.toFixed(2)})`
              : `Confirm & Place Order (₹${total.toFixed(2)})`}
          </button>
        </div>
      </div>
    </div>
  );
};



