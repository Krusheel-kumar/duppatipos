import React, { useState, useMemo } from 'react';
import type { Order, Bill } from '../types/pos';
import type { RestaurantTable } from '../utils/tableStorage';

interface RunningOrdersViewProps {
  orders: Order[];
  tables: RestaurantTable[];
  bills?: Bill[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  onOpenCheckout: (order: Order, table?: RestaurantTable) => void;
  onSelectRunningTable?: (table: RestaurantTable, order: Order) => void;
  onCloseTable?: (table: RestaurantTable) => Promise<void>;
  onSwitchToNewOrder: () => void;
}

type OrderTypeFilter = 'ALL' | 'UNPAID' | 'PAID' | 'DINE_IN' | 'TAKEAWAY' | 'COUNTER';
type StatusFilter = 'ACTIVE' | 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'ALL';

export const RunningOrdersView: React.FC<RunningOrdersViewProps> = ({
  orders,
  tables,
  bills = [],
  isLoading,
  onRefresh,
  onOpenCheckout,
  onSelectRunningTable,
  onCloseTable,
  onSwitchToNewOrder,
}) => {
  const [typeFilter, setTypeFilter] = useState<OrderTypeFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [closingTableId, setClosingTableId] = useState<string | null>(null);

  // Map of tableId or tableNumber to RestaurantTable
  const tableMap = useMemo(() => {
    const map = new Map<string, RestaurantTable>();
    tables.forEach((t) => {
      if (t.id) map.set(t.id, t);
      if (t.tableNumber) map.set(t.tableNumber, t);
    });
    return map;
  }, [tables]);

  // Map of orderId to Bill
  const billMap = useMemo(() => {
    const map = new Map<string, Bill>();
    bills.forEach((b) => {
      if (b.order?.id) {
        map.set(b.order.id, b);
      }
    });
    return map;
  }, [bills]);

  // Helper: compute payment status for an order
  const getOrderPaymentStatus = (order: Order, associatedTable?: RestaurantTable) => {
    const bill = billMap.get(order.id);
    const total = bill ? bill.totalAmount : order.totalAmount;
    const paid = bill ? bill.paidAmount : (associatedTable?.amountPaid || 0);
    const due = Math.max(0, total - paid);

    const isFullyPaid =
      (bill && (bill.status === 'PAID' || bill.paidAmount >= bill.totalAmount - 0.01)) ||
      (associatedTable && associatedTable.status === 'PAID_CLEARING') ||
      (paid >= total - 0.01 && total > 0);

    const isPartial = !isFullyPaid && paid > 0.01;

    // Collect payment methods
    const methods: string[] = [];
    if (bill && bill.payments) {
      bill.payments.forEach((p) => {
        if (p.status === 'SUCCESSFUL' && p.paymentMethod) {
          methods.push(p.paymentMethod);
        }
      });
    }

    return {
      total,
      paid,
      due,
      isFullyPaid,
      isPartial,
      bill,
      methods: Array.from(new Set(methods)),
    };
  };

  // Compute billing and order stats
  const stats = useMemo(() => {
    let totalActive = 0;
    let unpaidCount = 0;
    let unpaidTotalAmount = 0;
    let paidCount = 0;
    let paidTotalAmount = 0;
    let dineInActive = 0;
    let takeawayActive = 0;
    let counterActive = 0;

    orders.forEach((o) => {
      const isCompleteOrCancelled = o.status === 'COMPLETED' || o.status === 'CANCELLED';
      const tblNumber =
        o.table?.tableNumber || (o.table?.id && tableMap.get(o.table.id)?.tableNumber);
      const associatedTable =
        (o.table?.id && tableMap.get(o.table.id)) ||
        (tblNumber ? tableMap.get(tblNumber) : undefined);

      const payInfo = getOrderPaymentStatus(o, associatedTable);

      if (!isCompleteOrCancelled) {
        totalActive++;
        if (o.orderType === 'DINE_IN') dineInActive++;
        else if (o.orderType === 'TAKEAWAY') takeawayActive++;
        else if (o.orderType === 'COUNTER') counterActive++;

        if (payInfo.isFullyPaid) {
          paidCount++;
          paidTotalAmount += payInfo.paid;
        } else {
          unpaidCount++;
          unpaidTotalAmount += payInfo.due;
        }
      }
    });

    return {
      totalActive,
      unpaidCount,
      unpaidTotalAmount,
      paidCount,
      paidTotalAmount,
      dineInActive,
      takeawayActive,
      counterActive,
    };
  }, [orders, tableMap, billMap]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        const tblNumber =
          order.table?.tableNumber || (order.table?.id && tableMap.get(order.table.id)?.tableNumber);
        const associatedTable =
          (order.table?.id && tableMap.get(order.table.id)) ||
          (tblNumber ? tableMap.get(tblNumber) : undefined);
        const payInfo = getOrderPaymentStatus(order, associatedTable);

        // Type / Payment filter
        if (typeFilter === 'UNPAID') {
          if (payInfo.isFullyPaid) return false;
        } else if (typeFilter === 'PAID') {
          if (!payInfo.isFullyPaid) return false;
        } else if (typeFilter === 'DINE_IN') {
          if (order.orderType !== 'DINE_IN') return false;
        } else if (typeFilter === 'TAKEAWAY') {
          if (order.orderType !== 'TAKEAWAY') return false;
        } else if (typeFilter === 'COUNTER') {
          if (order.orderType !== 'COUNTER') return false;
        }

        // Status filter
        if (statusFilter === 'ACTIVE') {
          if (order.status === 'COMPLETED' || order.status === 'CANCELLED') return false;
        } else if (statusFilter === 'PENDING') {
          if (order.status !== 'CREATED' && order.status !== 'CONFIRMED') return false;
        } else if (statusFilter === 'PREPARING') {
          if (order.status !== 'PREPARING') return false;
        } else if (statusFilter === 'READY') {
          if (order.status !== 'READY') return false;
        } else if (statusFilter === 'COMPLETED') {
          if (order.status !== 'COMPLETED') return false;
        }

        // Search query filter
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          const matchesOrderNumber = order.orderNumber.toLowerCase().includes(query);
          const matchesTable =
            order.table?.tableNumber?.toLowerCase().includes(query) ||
            (order.items &&
              order.items.some((i) => i.productNameSnapshot.toLowerCase().includes(query)));
          const matchesNotes = order.customerNotes?.toLowerCase().includes(query);

          if (!matchesOrderNumber && !matchesTable && !matchesNotes) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, typeFilter, statusFilter, searchQuery, tableMap, billMap]);

  // Handler: Print Bill / Receipt directly
  const handlePrintSlip = (order: Order, bill?: Bill | null, isReceipt = false) => {
    const printWindow = window.open('', '_blank', 'width=380,height=600');
    if (!printWindow) {
      alert('Please allow popups to print bill receipts');
      return;
    }

    const total = bill ? bill.totalAmount : order.totalAmount;
    const paid = bill ? bill.paidAmount : 0;
    const due = Math.max(0, total - paid);

    const itemsHtml = (order.items || [])
      .map(
        (it) => `
        <tr>
          <td style="padding: 4px 0;">${it.quantity}x ${it.productNameSnapshot}${
          it.variantNameSnapshot ? ` (${it.variantNameSnapshot})` : ''
        }</td>
          <td style="text-align: right; padding: 4px 0;">₹${it.lineTotalSnapshot.toFixed(2)}</td>
        </tr>
      `
      )
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${isReceipt ? 'Receipt' : 'Bill'} #${order.orderNumber}</title>
          <style>
            body { font-family: monospace; font-size: 12px; margin: 15px; color: #000; }
            .header { text-align: center; margin-bottom: 12px; }
            .title { font-size: 16px; font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; }
            .total-row { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">KRUNNEX POS</div>
            <div>${isReceipt ? 'PAYMENT RECEIPT' : 'CUSTOMER BILL'}</div>
            <div>Order: #${order.orderNumber}</div>
            <div>${new Date(order.createdAt).toLocaleString()}</div>
          </div>
          <div class="divider"></div>
          <table>
            <thead>
              <tr style="text-align: left;"><th>Item</th><th style="text-align: right;">Total</th></tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div class="divider"></div>
          <table>
            <tr><td>Total Bill:</td><td style="text-align: right;">₹${total.toFixed(2)}</td></tr>
            <tr><td>Paid:</td><td style="text-align: right;">₹${paid.toFixed(2)}</td></tr>
            <tr class="total-row"><td>Balance Due:</td><td style="text-align: right;">₹${due.toFixed(2)}</td></tr>
          </table>
          <div class="divider"></div>
          <div style="text-align: center; margin-top: 15px;">Thank you for your visit!</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // Helper to extract clean customer notes without [Table: X] clutter
  const getCleanedNotes = (rawNotes?: string) => {
    if (!rawNotes) return null;
    const stripped = rawNotes.replace(/\[Table:\s*[^\]]+\]/gi, '').trim();
    return stripped.length > 0 ? stripped : null;
  };

  const getKitchenStatusBadge = (status: string) => {
    switch (status) {
      case 'CREATED':
        return { label: 'Queued', bg: '#fef3c7', text: '#d97706' };
      case 'CONFIRMED':
        return { label: 'Confirmed', bg: '#e0e7ff', text: '#4338ca' };
      case 'PREPARING':
        return { label: 'In Kitchen', bg: '#fff7ed', text: '#c2410c' };
      case 'READY':
        return { label: 'Ready', bg: '#dcfce7', text: '#15803d' };
      case 'COMPLETED':
        return { label: 'Completed', bg: '#f1f5f9', text: '#475569' };
      default:
        return { label: status, bg: '#f1f5f9', text: '#475569' };
    }
  };

  const getTypeBadge = (type: string, tableNumber?: string) => {
    switch (type) {
      case 'DINE_IN':
        return {
          icon: '🪑',
          label: tableNumber ? `Dine-in • Table ${tableNumber}` : 'Dine-in',
          bg: '#eff6ff',
          text: '#1d4ed8',
        };
      case 'TAKEAWAY':
        return {
          icon: '🛍️',
          label: 'Takeaway',
          bg: '#fdf4ff',
          text: '#a21caf',
        };
      case 'COUNTER':
        return {
          icon: '🥤',
          label: 'Counter Quick Order',
          bg: '#ecfdf5',
          text: '#047857',
        };
      default:
        return { icon: '📦', label: type, bg: '#f8fafc', text: '#475569' };
    }
  };

  return (
    <div className="running-orders-container">
      {/* 1. Header & Billing KPI Statistics */}
      <div className="running-orders-header">
        <div className="running-orders-title-block">
          <div className="title-with-actions">
            <div>
              <h2 className="running-orders-title">Billing &amp; Running Orders Dashboard</h2>
              <p className="running-orders-subtitle">
                Cashier live overview: Track bill payment statuses, unpaid balances, and active orders.
              </p>
            </div>
            <div className="running-orders-top-actions">
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="running-refresh-btn"
                title="Refresh Orders & Bills"
              >
                <span className={`refresh-icon ${isLoading ? 'spinning' : ''}`}>🔄</span>
                <span>Refresh</span>
              </button>
              <button
                type="button"
                onClick={onSwitchToNewOrder}
                className="running-new-order-btn"
              >
                <span>+ New Order</span>
              </button>
            </div>
          </div>

          {/* Cashier Billing Metric KPI Cards */}
          <div className="running-kpi-grid">
            {/* Total Active */}
            <div
              className={`kpi-chip ${typeFilter === 'ALL' && statusFilter === 'ACTIVE' ? 'active' : ''}`}
              onClick={() => {
                setTypeFilter('ALL');
                setStatusFilter('ACTIVE');
              }}
            >
              <div className="kpi-value">{stats.totalActive}</div>
              <div className="kpi-label">Total Live Orders</div>
            </div>

            {/* UNPAID Bills (Crucial for Cashier!) */}
            <div
              className={`kpi-chip kpi-unpaid ${typeFilter === 'UNPAID' ? 'active' : ''}`}
              onClick={() => {
                setTypeFilter('UNPAID');
                setStatusFilter('ACTIVE');
              }}
              title="Click to view all unpaid orders"
            >
              <div className="kpi-value text-red">
                {stats.unpaidCount}
                <span className="kpi-amount-sub"> (₹{stats.unpaidTotalAmount.toFixed(2)} due)</span>
              </div>
              <div className="kpi-label">🔴 Unpaid / Payment Due</div>
            </div>

            {/* PAID Bills */}
            <div
              className={`kpi-chip ${typeFilter === 'PAID' ? 'active' : ''}`}
              onClick={() => {
                setTypeFilter('PAID');
                setStatusFilter('ACTIVE');
              }}
              title="Click to view settled orders"
            >
              <div className="kpi-value text-green">
                {stats.paidCount}
                <span className="kpi-amount-sub"> (₹{stats.paidTotalAmount.toFixed(2)})</span>
              </div>
              <div className="kpi-label">🟢 Paid &amp; Settled</div>
            </div>

            {/* Dine-in Active */}
            <div
              className={`kpi-chip ${typeFilter === 'DINE_IN' ? 'active' : ''}`}
              onClick={() => {
                setTypeFilter('DINE_IN');
                setStatusFilter('ACTIVE');
              }}
            >
              <div className="kpi-value text-blue">{stats.dineInActive}</div>
              <div className="kpi-label">🪑 Dine-In Active</div>
            </div>

            {/* Takeaway Active */}
            <div
              className={`kpi-chip ${typeFilter === 'TAKEAWAY' ? 'active' : ''}`}
              onClick={() => {
                setTypeFilter('TAKEAWAY');
                setStatusFilter('ACTIVE');
              }}
            >
              <div className="kpi-value text-purple">{stats.takeawayActive}</div>
              <div className="kpi-label">🛍️ Takeaway Active</div>
            </div>

            {/* Counter Active */}
            <div
              className={`kpi-chip ${typeFilter === 'COUNTER' ? 'active' : ''}`}
              onClick={() => {
                setTypeFilter('COUNTER');
                setStatusFilter('ACTIVE');
              }}
            >
              <div className="kpi-value text-emerald">{stats.counterActive}</div>
              <div className="kpi-label">🥤 Counter Active</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Billing Filter Pills & Search */}
      <div className="running-controls-bar">
        {/* Cashier Filter Pills: Quick access to Unpaid, Paid, or Types */}
        <div className="running-type-pills">
          <button
            type="button"
            className={`pill-btn ${typeFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setTypeFilter('ALL')}
          >
            All Orders ({stats.totalActive})
          </button>
          <button
            type="button"
            className={`pill-btn pill-unpaid ${typeFilter === 'UNPAID' ? 'active' : ''}`}
            onClick={() => setTypeFilter('UNPAID')}
          >
            🔴 Unpaid ({stats.unpaidCount})
          </button>
          <button
            type="button"
            className={`pill-btn pill-paid ${typeFilter === 'PAID' ? 'active' : ''}`}
            onClick={() => setTypeFilter('PAID')}
          >
            🟢 Paid ({stats.paidCount})
          </button>
          <button
            type="button"
            className={`pill-btn ${typeFilter === 'DINE_IN' ? 'active' : ''}`}
            onClick={() => setTypeFilter('DINE_IN')}
          >
            🪑 Dine-In
          </button>
          <button
            type="button"
            className={`pill-btn ${typeFilter === 'TAKEAWAY' ? 'active' : ''}`}
            onClick={() => setTypeFilter('TAKEAWAY')}
          >
            🛍️ Takeaway
          </button>
          <button
            type="button"
            className={`pill-btn ${typeFilter === 'COUNTER' ? 'active' : ''}`}
            onClick={() => setTypeFilter('COUNTER')}
          >
            🥤 Counter
          </button>
        </div>

        {/* Status Filter Tabs */}
        <div className="running-status-tabs">
          <button
            type="button"
            className={`status-tab ${statusFilter === 'ACTIVE' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ACTIVE')}
          >
            Live Active
          </button>
          <button
            type="button"
            className={`status-tab ${statusFilter === 'PREPARING' ? 'active' : ''}`}
            onClick={() => setStatusFilter('PREPARING')}
          >
            In Kitchen
          </button>
          <button
            type="button"
            className={`status-tab ${statusFilter === 'READY' ? 'active' : ''}`}
            onClick={() => setStatusFilter('READY')}
          >
            Ready
          </button>
          <button
            type="button"
            className={`status-tab ${statusFilter === 'COMPLETED' ? 'active' : ''}`}
            onClick={() => setStatusFilter('COMPLETED')}
          >
            Completed
          </button>
          <button
            type="button"
            className={`status-tab ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            All History
          </button>
        </div>

        {/* Search input */}
        <div className="running-search-box">
          <input
            type="text"
            placeholder="Search Order #, table, or items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="running-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 3. Orders Grid Area */}
      <div className="running-orders-grid-area">
        {filteredOrders.length === 0 ? (
          <div className="running-empty-state">
            <div className="empty-icon">🧾</div>
            <h3>No orders found</h3>
            <p>
              {searchQuery
                ? `No orders matching "${searchQuery}" in this view.`
                : typeFilter === 'UNPAID'
                ? 'All bills are settled! No outstanding payments pending.'
                : 'No orders found for the selected filter.'}
            </p>
            <button
              type="button"
              onClick={onSwitchToNewOrder}
              className="empty-new-order-btn"
            >
              + Create New Order
            </button>
          </div>
        ) : (
          <div className="running-cards-grid">
            {filteredOrders.map((order) => {
              const tblNumber =
                order.table?.tableNumber ||
                (order.table?.id && tableMap.get(order.table.id)?.tableNumber);
              const typeMeta = getTypeBadge(order.orderType, tblNumber);
              const associatedTable =
                (order.table?.id && tableMap.get(order.table.id)) ||
                (tblNumber ? tableMap.get(tblNumber) : undefined);

              const payInfo = getOrderPaymentStatus(order, associatedTable);
              const kitchenMeta = getKitchenStatusBadge(order.status);
              const cleanNotes = getCleanedNotes(order.customerNotes);

              const formattedTime = new Date(order.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={order.id}
                  className={`running-order-card billing-card ${
                    payInfo.isFullyPaid ? 'paid-order-card' : 'unpaid-order-card'
                  }`}
                >
                  {/* Card Top: Order Number, Time & Type Badge */}
                  <div className="card-top-row">
                    <div className="order-number-group">
                      <span className="order-num-text">#{order.orderNumber}</span>
                      <span className="order-time-text">{formattedTime}</span>
                    </div>

                    <span
                      className="order-type-badge"
                      style={{
                        backgroundColor: typeMeta.bg,
                        color: typeMeta.text,
                      }}
                    >
                      <span className="type-badge-icon">{typeMeta.icon}</span>
                      <span>{typeMeta.label}</span>
                    </span>
                  </div>

                  {/* Card Sub-row: PAYMENT STATUS BADGE (High Visibility for Billing!) */}
                  <div className="card-billing-status-row">
                    {payInfo.isFullyPaid ? (
                      <span className="pay-badge-paid">
                        <span className="pay-dot-paid" />
                        <span>✓ PAID</span>
                        {payInfo.methods.length > 0 && (
                          <span className="pay-method-tag">({payInfo.methods.join(', ')})</span>
                        )}
                      </span>
                    ) : payInfo.isPartial ? (
                      <span className="pay-badge-partial">
                        <span className="pay-dot-partial" />
                        <span>🟡 PARTIAL (Due: ₹{payInfo.due.toFixed(2)})</span>
                      </span>
                    ) : (
                      <span className="pay-badge-unpaid">
                        <span className="pay-dot-unpaid" />
                        <span>🔴 UNPAID • ₹{payInfo.due.toFixed(2)} DUE</span>
                      </span>
                    )}

                    {/* Secondary Kitchen Status & Items count */}
                    <div className="card-sub-kitchen-info">
                      <span
                        className="kitchen-status-chip"
                        style={{
                          backgroundColor: kitchenMeta.bg,
                          color: kitchenMeta.text,
                        }}
                      >
                        {kitchenMeta.label}
                      </span>
                      <span className="card-item-count">
                        {(order.items || []).reduce((acc, it) => acc + it.quantity, 0)} items
                      </span>
                    </div>
                  </div>

                  {/* Items Snapshot List */}
                  <div className="card-items-scroll">
                    {(order.items || []).map((it) => (
                      <div key={it.id} className="card-item-row">
                        <div className="item-name-qty">
                          <span className="item-qty-badge">{it.quantity}x</span>
                          <span className="item-name-text">
                            {it.productNameSnapshot}
                            {it.variantNameSnapshot && (
                              <span className="item-variant-sub"> ({it.variantNameSnapshot})</span>
                            )}
                          </span>
                        </div>
                        <span className="item-price-text">
                          ₹{it.lineTotalSnapshot.toFixed(2)}
                        </span>
                      </div>
                    ))}

                    {/* Only display genuine customer requests (cleaned of [Table: X]) */}
                    {cleanNotes && (
                      <div className="card-notes-row">
                        <span className="notes-icon">📝</span>
                        <span className="notes-text">{cleanNotes}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom: Financial Breakdown & Billing Actions */}
                  <div className="card-bottom-section">
                    <div className="card-financial-summary">
                      <div className="fin-line">
                        <span className="fin-label">Total Bill:</span>
                        <strong className="fin-val">₹{payInfo.total.toFixed(2)}</strong>
                      </div>
                      {payInfo.isFullyPaid ? (
                        <div className="fin-line text-green">
                          <span className="fin-label">Settled:</span>
                          <strong className="fin-val">₹{payInfo.paid.toFixed(2)}</strong>
                        </div>
                      ) : (
                        <div className="fin-line text-red">
                          <span className="fin-label">Balance Due:</span>
                          <strong className="fin-val">₹{payInfo.due.toFixed(2)}</strong>
                        </div>
                      )}
                    </div>

                    {/* Billing Actions tailored for Cashier Staff */}
                    <div className="card-actions-grid">
                      {/* Settle Bill / Pay Action: Primary if Unpaid */}
                      {!payInfo.isFullyPaid ? (
                        <button
                          type="button"
                          className="action-btn-settle-primary"
                          onClick={() => onOpenCheckout(order, associatedTable)}
                          title="Open Checkout to collect Cash, UPI, Card or Split Payment"
                        >
                          <span>💳</span>
                          <span>Settle Bill (₹{payInfo.due.toFixed(2)})</span>
                        </button>
                      ) : (
                        /* Paid State Actions: Print Receipt / Close Table */
                        <>
                          <button
                            type="button"
                            className="action-btn-print"
                            onClick={() => handlePrintSlip(order, payInfo.bill, true)}
                            title="Print Customer Payment Receipt"
                          >
                            <span>🖨️</span>
                            <span>Print Receipt</span>
                          </button>

                          {order.orderType === 'DINE_IN' && associatedTable && onCloseTable && (
                            <button
                              type="button"
                              className="action-btn-close-table"
                              disabled={closingTableId === associatedTable.id}
                              onClick={async () => {
                                setClosingTableId(associatedTable.id);
                                try {
                                  await onCloseTable(associatedTable);
                                } finally {
                                  setClosingTableId(null);
                                }
                              }}
                              title="Clear table and make available for next customer"
                            >
                              <span>🧹</span>
                              <span>{closingTableId === associatedTable.id ? 'Closing...' : 'Close Table'}</span>
                            </button>
                          )}
                        </>
                      )}

                      {/* Print Customer Bill (when Unpaid) */}
                      {!payInfo.isFullyPaid && (
                        <button
                          type="button"
                          className="action-btn-print"
                          onClick={() => handlePrintSlip(order, payInfo.bill, false)}
                          title="Print customer bill estimate before payment"
                        >
                          <span>🖨️</span>
                          <span>Bill Slip</span>
                        </button>
                      )}

                      {/* + Add Items button for running Dine-In orders */}
                      {order.orderType === 'DINE_IN' && associatedTable && onSelectRunningTable && (
                        <button
                          type="button"
                          className="action-btn-add-items"
                          onClick={() => onSelectRunningTable(associatedTable, order)}
                          title="Add more food or drinks to this table"
                        >
                          <span>+ Add Items</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
