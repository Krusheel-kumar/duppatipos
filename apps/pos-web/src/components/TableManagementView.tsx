import React, { useState } from 'react';
import type { RestaurantTable, TableStatus } from '../types/pos';

interface TableManagementViewProps {
  tables: RestaurantTable[];
  selectedTableId: string | null;
  onSelectTable: (table: RestaurantTable) => void;
  onOpenRunningOrder: (orderId: string) => void;
  onCollectPayment?: (orderId: string) => void;
  onGenerateBill?: (orderId: string) => void;
  onCreateTable: (tableNumber: string, capacity: number) => Promise<void>;
  onDeleteTable: (tableId: string) => Promise<void>;
  onUpdateTableStatus: (tableId: string, status: TableStatus, reason?: string) => Promise<void>;
  onRefresh: () => void;
}

export const TableManagementView: React.FC<TableManagementViewProps> = ({
  tables,
  selectedTableId,
  onSelectTable,
  onOpenRunningOrder,
  onCollectPayment,
  onGenerateBill,
  onCreateTable,
  onDeleteTable,
  onUpdateTableStatus,
  onRefresh,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTableNum, setNewTableNum] = useState('');
  const [newCapacity, setNewCapacity] = useState('4');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNum.trim()) {
      setErrorMsg('Table number is required');
      return;
    }

    try {
      setErrorMsg(null);
      await onCreateTable(newTableNum.trim(), Number(newCapacity) || 4);
      setNewTableNum('');
      setIsAdding(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create table');
    }
  };

  const filteredTables = tables.filter((t) => {
    if (selectedStatusFilter === 'ALL') return true;
    return t.status === selectedStatusFilter;
  });

  const getStatusBadge = (status: TableStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return { label: 'Available', bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' };
      case 'RUNNING':
        return { label: 'Running Order', bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' };
      case 'BILL_REQUESTED':
        return { label: 'Bill Issued', bg: '#fef3c7', color: '#b45309', border: '#fde68a' };
      case 'PAYMENT_DUE':
        return { label: 'Payment Due', bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' };
      case 'PAID_CLEARING':
        return { label: 'Paid / Clearing', bg: '#f3e8ff', color: '#6b21a8', border: '#e9d5ff' };
      case 'CLOSED':
        return { label: 'Closed', bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' };
      default:
        return { label: status, bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
    }
  };

  return (
    <div className="table-management-container" style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🪑</span> Table Overview & Running Orders
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
            Live status of dining tables, active ticket durations, and outstanding balances.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onRefresh}
            style={{ padding: '8px 14px', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem' }}
          >
            ↻ Refresh
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsAdding(!isAdding)}
            style={{ padding: '8px 14px', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', background: '#2563eb', color: '#fff', border: 'none' }}
          >
            {isAdding ? '✕ Cancel' : '➕ Add Table'}
          </button>
        </div>
      </div>

      {/* Add Table Form */}
      {isAdding && (
        <form
          onSubmit={handleCreate}
          style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '20px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>
              Table Number / Label
            </label>
            <input
              type="text"
              placeholder="e.g. 7 or Patio-2"
              value={newTableNum}
              onChange={(e) => setNewTableNum(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '160px' }}
              autoFocus
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>
              Seating Capacity
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={newCapacity}
              onChange={(e) => setNewCapacity(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100px' }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: '8px 18px', background: '#2563eb', color: '#fff', borderRadius: '6px', border: 'none', fontWeight: 700 }}
          >
            Save Table
          </button>
        </form>
      )}

      {errorMsg && (
        <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
          ⚠ {errorMsg}
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        {['ALL', 'AVAILABLE', 'RUNNING', 'BILL_REQUESTED', 'PAYMENT_DUE', 'PAID_CLEARING', 'CLOSED'].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setSelectedStatusFilter(f)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: selectedStatusFilter === f ? '2px solid #2563eb' : '1px solid #cbd5e1',
              background: selectedStatusFilter === f ? '#eff6ff' : '#fff',
              color: selectedStatusFilter === f ? '#1d4ed8' : '#475569',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Table Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px',
        }}
      >
        {filteredTables.map((tbl) => {
          const badge = getStatusBadge(tbl.status);
          const isSelected = selectedTableId === tbl.id;
          const hasOrder = Boolean(tbl.currentOrderId);

          return (
            <div
              key={tbl.id}
              style={{
                background: '#fff',
                border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: isSelected ? '0 4px 12px rgba(37,99,235,0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'all 0.15s ease',
              }}
            >
              <div>
                {/* Header: Table Number & Status Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 800 }}>
                      Table {tbl.tableNumber}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Capacity: {tbl.capacity} seats
                    </span>
                  </div>
                  <span
                    style={{
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '12px',
                    }}
                  >
                    {badge.label}
                  </span>
                </div>

                {/* Running Order Info */}
                {hasOrder ? (
                  <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px', marginBottom: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                      <span style={{ color: '#475569' }}>Order:</span>
                      <strong style={{ color: '#0f172a' }}>{tbl.orderNumber || 'Active Order'}</strong>
                    </div>

                    {tbl.durationMinutes !== undefined && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                        <span style={{ color: '#475569' }}>Seated For:</span>
                        <span style={{ color: '#0369a1', fontWeight: 600 }}>⏱ {tbl.durationMinutes} mins</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                      <span style={{ color: '#475569' }}>Total:</span>
                      <strong>₹{(tbl.currentTotal || 0).toFixed(2)}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: '#475569' }}>Balance Due:</span>
                      <strong style={{ color: (tbl.amountDue || 0) > 0 ? '#dc2626' : '#15803d' }}>
                        ₹{(tbl.amountDue || 0).toFixed(2)}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '12px', fontStyle: 'italic', padding: '8px 0' }}>
                    No active order. Ready for new guests.
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                {/* Select for POS */}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onSelectTable(tbl)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    background: isSelected ? '#2563eb' : '#f1f5f9',
                    color: isSelected ? '#fff' : '#1e293b',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {isSelected ? '✓ Current' : 'Take Order'}
                </button>

                {/* If running order exists, allow viewing and adding items */}
                {hasOrder && tbl.currentOrderId && (
                  <>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => onOpenRunningOrder(tbl.currentOrderId!)}
                      style={{
                        padding: '8px 12px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        borderRadius: '6px',
                        background: '#0284c7',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      ➕ Add Items
                    </button>

                    {onGenerateBill && tbl.status === 'RUNNING' && (
                      <button
                        type="button"
                        onClick={() => onGenerateBill(tbl.currentOrderId!)}
                        style={{
                          padding: '8px 12px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          borderRadius: '6px',
                          background: '#f59e0b',
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        🧾 Bill
                      </button>
                    )}

                    {onCollectPayment && (tbl.status === 'RUNNING' || tbl.status === 'BILL_REQUESTED' || tbl.status === 'PAYMENT_DUE') && (
                      <button
                        type="button"
                        onClick={() => onCollectPayment(tbl.currentOrderId!)}
                        style={{
                          padding: '8px 12px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          borderRadius: '6px',
                          background: '#10b981',
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        💳 Pay
                      </button>
                    )}
                  </>
                )}

                {/* Mark Available / Release Table */}
                {tbl.status === 'PAID_CLEARING' && (
                  <button
                    type="button"
                    onClick={() => onUpdateTableStatus(tbl.id, 'AVAILABLE')}
                    style={{
                      padding: '8px 12px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      borderRadius: '6px',
                      background: '#15803d',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Clear & Free
                  </button>
                )}

                {/* Delete table if available */}
                {(tbl.status === 'AVAILABLE' || tbl.status === 'CLOSED') && (
                  <button
                    type="button"
                    title="Delete Table"
                    onClick={() => {
                      if (window.confirm(`Delete Table ${tbl.tableNumber}?`)) {
                        onDeleteTable(tbl.id);
                      }
                    }}
                    style={{
                      padding: '6px 8px',
                      fontSize: '0.8rem',
                      borderRadius: '6px',
                      background: 'transparent',
                      color: '#94a3b8',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                    }}
                  >
                    🗑
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
