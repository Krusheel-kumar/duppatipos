import React, { useState } from 'react';
import type { Bill } from '../../types/pos';

interface AdminBillingViewProps {
  bills: Bill[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const AdminBillingView: React.FC<AdminBillingViewProps> = ({
  bills,
  isLoading,
  onRefresh,
}) => {
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <span className="badge badge-success">Paid</span>;
      case 'PARTIALLY_PAID':
        return <span className="badge badge-warning">Partial</span>;
      case 'CANCELLED':
        return <span className="badge badge-danger">Cancelled</span>;
      case 'ISSUED':
      default:
        return <span className="badge badge-info">Issued</span>;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Billing & Invoicing</h2>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
            Invoices, tax records, and recorded payments from POS checkout.
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={onRefresh}>
          Refresh Bills
        </button>
      </div>

      <div className="admin-card">
        {isLoading ? (
          <div className="loading-spinner">Loading bills...</div>
        ) : bills.length === 0 ? (
          <div className="empty-state">No bills generated for this outlet.</div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Order #</th>
                  <th>Status</th>
                  <th>Total Amount</th>
                  <th>Paid Amount</th>
                  <th>Balance Due</th>
                  <th>Created At</th>
                  <th>Payments</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => {
                  const balanceDue = bill.totalAmount - bill.paidAmount;
                  return (
                    <tr key={bill.id}>
                      <td><strong>{bill.invoiceNumber}</strong></td>
                      <td>{bill.order?.orderNumber || '-'}</td>
                      <td>{getStatusBadge(bill.status)}</td>
                      <td>₹{bill.totalAmount.toFixed(2)}</td>
                      <td style={{ color: '#15803d', fontWeight: 600 }}>₹{bill.paidAmount.toFixed(2)}</td>
                      <td style={{ color: balanceDue > 0 ? '#b91c1c' : '#64748b', fontWeight: balanceDue > 0 ? 600 : 400 }}>
                        ${balanceDue.toFixed(2)}
                      </td>
                      <td>{new Date(bill.createdAt).toLocaleString()}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedBill(bill)}
                        >
                          View ({bill.payments?.length ?? 0})
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* BILL PAYMENTS MODAL */}
      {selectedBill && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', width: '550px', maxWidth: '95%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Invoice {selectedBill.invoiceNumber}</h3>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedBill(null)}
              >
                Close
              </button>
            </div>

            <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#475569' }}>
              <div><strong>Status:</strong> {selectedBill.status}</div>
              <div><strong>Order Reference:</strong> {selectedBill.order?.orderNumber || 'N/A'}</div>
              <div><strong>Subtotal:</strong> ${selectedBill.subtotal.toFixed(2)}</div>
              <div><strong>Tax Amount:</strong> ${selectedBill.taxAmount.toFixed(2)}</div>
              <div><strong>Total Amount:</strong> ${selectedBill.totalAmount.toFixed(2)}</div>
              <div><strong>Paid Amount:</strong> ${selectedBill.paidAmount.toFixed(2)}</div>
            </div>

            <h4 style={{ margin: '1rem 0 0.5rem 0', fontSize: '1rem' }}>Payment Transactions</h4>
            {(!selectedBill.payments || selectedBill.payments.length === 0) ? (
              <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>No payment records found for this bill.</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Reference</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBill.payments.map((p) => (
                    <tr key={p.id}>
                      <td><strong>{p.paymentMethod}</strong></td>
                      <td>
                        <span className={`badge ${p.status === 'SUCCESSFUL' ? 'badge-success' : p.status === 'FAILED' ? 'badge-danger' : 'badge-warning'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td>₹{p.amount.toFixed(2)}</td>
                      <td>{p.transactionReference || '-'}</td>
                      <td>{new Date(p.createdAt).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


