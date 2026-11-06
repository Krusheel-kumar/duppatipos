import React from 'react';
import type { Order, Bill } from '../../types/pos';

interface AdminDashboardProps {
  orders: Order[];
  bills: Bill[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  orders,
  bills,
  isLoading,
  onRefresh,
}) => {
  // Compute authentic real metrics strictly from existing order and bill payloads
  const totalRevenue = bills.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
  const totalBilled = bills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const totalOrdersCount = orders.length;
  const completedOrdersCount = orders.filter((o) => o.status === 'COMPLETED').length;
  const activeOrdersCount = orders.filter((o) => o.status === 'CONFIRMED' || o.status === 'PREPARING' || o.status === 'READY').length;
  const paidBillsCount = bills.filter((b) => b.status === 'PAID').length;
  const pendingBillsCount = bills.filter((b) => b.status === 'ISSUED' || b.status === 'PARTIALLY_PAID').length;

  if (isLoading) {
    return <div className="loading-spinner">Loading dashboard metrics...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Real-Time Performance Metrics</h2>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
            Derived directly from authorized outlet orders and billing records.
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={onRefresh}>
          Refresh Metrics
        </button>
      </div>

      <div className="admin-metrics-grid">
        <div className="admin-metric-card">
          <div className="admin-metric-title">Collected Revenue</div>
          <div className="admin-metric-value">₹{totalRevenue.toFixed(2)}</div>
          <div className="admin-metric-sub">From {paidBillsCount} fully/partially settled bills</div>
        </div>

        <div className="admin-metric-card">
          <div className="admin-metric-title">Total Invoiced</div>
          <div className="admin-metric-value">₹{totalBilled.toFixed(2)}</div>
          <div className="admin-metric-sub">{pendingBillsCount} pending payment</div>
        </div>

        <div className="admin-metric-card">
          <div className="admin-metric-title">Total Orders</div>
          <div className="admin-metric-value">{totalOrdersCount}</div>
          <div className="admin-metric-sub">{completedOrdersCount} completed</div>
        </div>

        <div className="admin-metric-card">
          <div className="admin-metric-title">In-Flight Orders</div>
          <div className="admin-metric-value">{activeOrdersCount}</div>
          <div className="admin-metric-sub">Confirmed, preparing, or ready</div>
        </div>
      </div>

      <div className="admin-card">
        <h3 style={{ marginTop: 0, fontSize: '1.1rem', marginBottom: '1rem' }}>Recent Order Activity</h3>
        {orders.length === 0 ? (
          <div className="empty-state">No orders registered for this outlet yet.</div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 5).map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontWeight: 600 }}>{order.orderNumber}</td>
                    <td>{order.orderType}</td>
                    <td>
                      <span className={`badge ${order.status === 'COMPLETED' ? 'badge-success' : order.status === 'CANCELLED' ? 'badge-danger' : 'badge-info'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>{order.items?.length ?? 0} item(s)</td>
                    <td>₹{order.totalAmount.toFixed(2)}</td>
                    <td>{new Date(order.createdAt).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};


