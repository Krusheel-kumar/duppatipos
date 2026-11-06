import React, { useState } from 'react';
import type { Order } from '../../types/pos';

interface AdminOrdersViewProps {
  orders: Order[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const AdminOrdersView: React.FC<AdminOrdersViewProps> = ({
  orders,
  isLoading,
  onRefresh,
}) => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Order Management</h2>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
            Historical and active orders placed through the POS cashier.
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={onRefresh}>
          Refresh Orders
        </button>
      </div>

      <div className="admin-card">
        {isLoading ? (
          <div className="loading-spinner">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="empty-state">No orders found for this outlet.</div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Subtotal</th>
                  <th>Tax</th>
                  <th>Total</th>
                  <th>Items Count</th>
                  <th>Created At</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td><strong>{order.orderNumber}</strong></td>
                    <td>{order.orderType}</td>
                    <td>
                      <span className={`badge ${order.status === 'COMPLETED' ? 'badge-success' : order.status === 'CANCELLED' ? 'badge-danger' : 'badge-info'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>₹{order.subtotal.toFixed(2)}</td>
                    <td>₹{order.taxAmount.toFixed(2)}</td>
                    <td><strong>₹{order.totalAmount.toFixed(2)}</strong></td>
                    <td>{order.items?.length ?? 0} item(s)</td>
                    <td>{new Date(order.createdAt).toLocaleString()}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedOrder(order)}
                      >
                        View Items
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ORDER ITEMS MODAL */}
      {selectedOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', width: '550px', maxWidth: '95%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Order {selectedOrder.orderNumber}</h3>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedOrder(null)}
              >
                Close
              </button>
            </div>

            <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#475569' }}>
              <div><strong>Type:</strong> {selectedOrder.orderType}</div>
              <div><strong>Status:</strong> {selectedOrder.status}</div>
              {selectedOrder.customerNotes && (
                <div style={{ marginTop: '0.25rem' }}>
                  <strong>Notes:</strong> {selectedOrder.customerNotes}
                </div>
              )}
            </div>

            <h4 style={{ margin: '1rem 0 0.5rem 0', fontSize: '1rem' }}>Item Snapshots</h4>
            {(!selectedOrder.items || selectedOrder.items.length === 0) ? (
              <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>No item details available.</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.productNameSnapshot}</strong>
                        {item.variantNameSnapshot && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Variant: {item.variantNameSnapshot}</div>
                        )}
                        {item.itemNotes && (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Note: {item.itemNotes}</div>
                        )}
                      </td>
                      <td>{item.quantity}</td>
                      <td>₹{item.unitPriceSnapshot.toFixed(2)}</td>
                      <td>₹{item.lineTotalSnapshot.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div style={{ marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <div>
                <div>Subtotal: ₹{selectedOrder.subtotal.toFixed(2)}</div>
                <div>Discount: ₹{selectedOrder.discountAmount.toFixed(2)}</div>
                <div>Tax: ₹{selectedOrder.taxAmount.toFixed(2)}</div>
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                Total: ₹{selectedOrder.totalAmount.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


