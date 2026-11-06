import React, { useState } from 'react';
import type { PaymentMethod, Bill, Order } from '../types/pos';

interface PaymentCollectModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  bill: Bill | null;
  onRecordPayment: (
    amount: number,
    method: PaymentMethod,
    ref?: string
  ) => Promise<void>;
  isProcessing: boolean;
}

export const PaymentCollectModal: React.FC<PaymentCollectModalProps> = ({
  isOpen,
  onClose,
  order,
  bill,
  onRecordPayment,
  isProcessing,
}) => {
  const totalAmount = bill ? bill.totalAmount : order.totalAmount;
  const paidAmount = bill ? bill.paidAmount : 0;
  const balanceDue = Math.max(0, totalAmount - paidAmount);

  const [paymentAmount, setPaymentAmount] = useState<string>(balanceDue.toFixed(2));
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CASH');
  const [transRef, setTransRef] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(paymentAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Please enter a valid positive payment amount');
      return;
    }
    if (parsedAmount > balanceDue + 0.001) {
      setErrorMessage(`Payment cannot exceed the outstanding balance of ₹${balanceDue.toFixed(2)}`);
      return;
    }

    try {
      setErrorMessage(null);
      await onRecordPayment(parsedAmount, selectedMethod, transRef.trim() || undefined);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Payment recording failed');
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-container payment-modal" style={{ maxWidth: '480px', width: '90%' }}>
        <div className="modal-header">
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>💳 Collect Payment</h2>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Order #{order.orderNumber} {order.table ? `• Table ${order.table.tableNumber}` : ''}
            </span>
          </div>
          <button type="button" className="close-btn" onClick={onClose} disabled={isProcessing}>
            ✕
          </button>
        </div>

        <form onSubmit={handlePay}>
          <div className="modal-body" style={{ padding: '16px' }}>
            {/* Balance Overview Card */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem' }}>
                <span style={{ color: '#64748b' }}>Order Total:</span>
                <strong>₹{totalAmount.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem' }}>
                <span style={{ color: '#64748b' }}>Already Settled:</span>
                <span style={{ color: '#15803d', fontWeight: 600 }}>₹{paidAmount.toFixed(2)}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '8px',
                  borderTop: '1px solid #cbd5e1',
                  fontSize: '1.05rem',
                }}
              >
                <strong style={{ color: '#0f172a' }}>Balance Due:</strong>
                <strong style={{ color: balanceDue > 0 ? '#b91c1c' : '#15803d' }}>
                  ₹{balanceDue.toFixed(2)}
                </strong>
              </div>
            </div>

            {errorMessage && (
              <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.85rem' }}>
                ⚠ {errorMessage}
              </div>
            )}

            {/* Payment Method Selector */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Payment Method
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {(['CASH', 'UPI', 'CARD', 'OTHER'] as PaymentMethod[]).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setSelectedMethod(method)}
                    style={{
                      padding: '10px 4px',
                      borderRadius: '8px',
                      border: selectedMethod === method ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: selectedMethod === method ? '#eff6ff' : '#fff',
                      color: selectedMethod === method ? '#1d4ed8' : '#334155',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount input */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Payment Amount (₹)
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={balanceDue.toFixed(2)}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setPaymentAmount(balanceDue.toFixed(2))}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Full Amount
                </button>
              </div>
              {parseFloat(paymentAmount) < balanceDue && (
                <span style={{ fontSize: '0.75rem', color: '#0369a1', marginTop: '4px', display: 'block' }}>
                  Partial payment: ₹{(balanceDue - parseFloat(paymentAmount || '0')).toFixed(2)} will remain due.
                </span>
              )}
            </div>

            {/* Reference Number */}
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Transaction Reference / UPI ID (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. UPI-REF-987654 or Card Auth Code"
                value={transRef}
                onChange={(e) => setTransRef(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div
            className="modal-footer"
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              padding: '14px 16px',
              borderTop: '1px solid #e2e8f0',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isProcessing}
              style={{ padding: '8px 16px', borderRadius: '8px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isProcessing}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                background: '#15803d',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
              }}
            >
              {isProcessing ? 'Verifying & Recording...' : `Confirm Payment (₹${parseFloat(paymentAmount || '0').toFixed(2)})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
