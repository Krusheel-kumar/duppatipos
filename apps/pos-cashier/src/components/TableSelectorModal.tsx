import React, { useState } from 'react';
import type { RestaurantTable } from '../utils/tableStorage';
import { getTableStatusMeta } from '../utils/tableColors';

interface TableSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: RestaurantTable[];
  selectedTableNumber: string;
  onSelectTable: (tableNumber: string) => void;
  onSelectRunningTable?: (table: RestaurantTable) => void;
  onCloseTable?: (table: RestaurantTable) => Promise<void>;
  onAddTable: (tableNumber: string, capacity?: number) => void;
  onDeleteTable: (tableId: string) => void;
  onRefresh?: () => void;
  onOpenCheckout?: (table: RestaurantTable) => void;
}

export const TableSelectorModal: React.FC<TableSelectorModalProps> = ({
  isOpen,
  onClose,
  tables,
  selectedTableNumber,
  onSelectTable,
  onSelectRunningTable,
  onCloseTable,
  onAddTable,
  onDeleteTable,
  onRefresh,
  onOpenCheckout,
}) => {
  const [newTableNum, setNewTableNum] = useState('');
  const [newCapacity, setNewCapacity] = useState('4');
  const [isAdding, setIsAdding] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [closingTableId, setClosingTableId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'RUNNING' | 'PAYMENT' | 'PAID'>('ALL');

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTableNum.trim();
    if (!trimmed) {
      setValidationError('Table number is required');
      return;
    }
    const exists = tables.some((t) => t.tableNumber.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setValidationError(`Table "${trimmed}" already exists`);
      return;
    }

    onAddTable(trimmed, Number(newCapacity) || 4);
    setNewTableNum('');
    setValidationError(null);
    setIsAdding(false);
  };

  const handleCloseTableClick = async (e: React.MouseEvent, tbl: RestaurantTable) => {
    e.stopPropagation();
    setActionError(null);

    // Business rule: Never release a table with an unpaid balance through normal closure
    const amountDue = tbl.amountDue !== undefined
      ? tbl.amountDue
      : (tbl.currentTotal || 0) - (tbl.amountPaid || 0);

    if (amountDue > 0.01) {
      setActionError(`Cannot close Table ${tbl.tableNumber}: Unpaid balance of ₹${amountDue.toFixed(2)} must be collected first.`);
      return;
    }

    if (onCloseTable) {
      try {
        setClosingTableId(tbl.id);
        await onCloseTable(tbl);
      } catch (err: unknown) {
        setActionError(err instanceof Error ? err.message : 'Failed to close table');
      } finally {
        setClosingTableId(null);
      }
    }
  };

  const runningCount = tables.filter((t) => t.status === 'RUNNING').length;
  const availableCount = tables.filter((t) => !t.status || t.status === 'AVAILABLE').length;
  const paymentCount = tables.filter((t) => t.status === 'BILL_REQUESTED' || t.status === 'PAYMENT_DUE').length;
  const paidCount = tables.filter((t) => t.status === 'PAID_CLEARING').length;

  const filteredTables = tables.filter((tbl) => {
    const status = tbl.status || (tbl.currentOrderId ? 'RUNNING' : 'AVAILABLE');
    if (statusFilter === 'RUNNING') return status === 'RUNNING';
    if (statusFilter === 'AVAILABLE') return status === 'AVAILABLE';
    if (statusFilter === 'PAYMENT') return status === 'BILL_REQUESTED' || status === 'PAYMENT_DUE';
    if (statusFilter === 'PAID') return status === 'PAID_CLEARING';
    return true;
  });

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-container table-manager-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '780px', width: '92%' }}
      >
        <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🪑</span> Table Status & Management
            </h2>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
              Real-time table status synchronized with backend orders and bills. Select an available table or reopen a running order.
            </p>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close table modal">
            ✕
          </button>
        </div>

        {/* Action Error Alert */}
        {actionError && (
          <div
            style={{
              padding: '10px 16px',
              background: '#fef2f2',
              color: '#b91c1c',
              borderBottom: '1px solid #fecaca',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>🚫 {actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontWeight: 700 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Status Counter Bar & Filters */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 20px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          {/* Quick Filter Buttons */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              style={{
                padding: '5px 10px',
                borderRadius: '16px',
                border: statusFilter === 'ALL' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                background: statusFilter === 'ALL' ? '#eff6ff' : '#fff',
                color: statusFilter === 'ALL' ? '#1d4ed8' : '#475569',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              All ({tables.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('AVAILABLE')}
              style={{
                padding: '5px 10px',
                borderRadius: '16px',
                border: statusFilter === 'AVAILABLE' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                background: statusFilter === 'AVAILABLE' ? '#f0fdf4' : '#fff',
                color: statusFilter === 'AVAILABLE' ? '#15803d' : '#475569',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
              Available ({availableCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('RUNNING')}
              style={{
                padding: '5px 10px',
                borderRadius: '16px',
                border: statusFilter === 'RUNNING' ? '2px solid #f97316' : '1px solid #cbd5e1',
                background: statusFilter === 'RUNNING' ? '#fff7ed' : '#fff',
                color: statusFilter === 'RUNNING' ? '#c2410c' : '#475569',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#f97316' }} />
              Running ({runningCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PAYMENT')}
              style={{
                padding: '5px 10px',
                borderRadius: '16px',
                border: statusFilter === 'PAYMENT' ? '2px solid #eab308' : '1px solid #cbd5e1',
                background: statusFilter === 'PAYMENT' ? '#fefce8' : '#fff',
                color: statusFilter === 'PAYMENT' ? '#854d0e' : '#475569',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#eab308' }} />
              Payment Due ({paymentCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PAID')}
              style={{
                padding: '5px 10px',
                borderRadius: '16px',
                border: statusFilter === 'PAID' ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                background: statusFilter === 'PAID' ? '#eff6ff' : '#fff',
                color: statusFilter === 'PAID' ? '#1d4ed8' : '#475569',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
              Paid / Clearing ({paidCount})
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                style={{
                  background: '#fff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ↻ Refresh
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsAdding(!isAdding)}
              style={{
                background: isAdding ? '#e2e8f0' : '#2563eb',
                color: isAdding ? '#1e293b' : '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>{isAdding ? '✕ Cancel' : '➕ Add Table'}</span>
            </button>
          </div>
        </div>

        <div className="modal-body" style={{ maxHeight: '62vh', overflowY: 'auto', padding: '16px 20px' }}>
          {/* Add Table Form */}
          {isAdding && (
            <form
              onSubmit={handleCreate}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
                Create New Dining Table
              </div>

              {validationError && (
                <div style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600 }}>
                  ⚠ {validationError}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Table Number / Name:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 7, 12, T-04"
                    value={newTableNum}
                    onChange={(e) => {
                      setNewTableNum(e.target.value);
                      setValidationError(null);
                    }}
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Seats / Capacity:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setValidationError(null);
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid #cbd5e1',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Save Table
                </button>
              </div>
            </form>
          )}

          {/* Table Cards Grid */}
          {filteredTables.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <p style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>No tables found matching filter.</p>
              <span style={{ fontSize: '0.85rem' }}>Switch filter to "All" or click "Add Table" to create one.</span>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '14px',
              }}
            >
              {filteredTables.map((tbl) => {
                const isSelected = selectedTableNumber.toLowerCase() === tbl.tableNumber.toLowerCase();
                const meta = getTableStatusMeta(tbl);
                const hasOrder = Boolean(tbl.currentOrderId);
                const canReopen = hasOrder && (meta.status === 'RUNNING' || meta.status === 'BILL_REQUESTED' || meta.status === 'PAYMENT_DUE');
                const isPaidClearing = meta.status === 'PAID_CLEARING';

                return (
                  <div
                    key={tbl.id}
                    style={{
                      position: 'relative',
                      border: isSelected ? '2px solid #2563eb' : `1.5px solid ${meta.cardBorder}`,
                      borderRadius: '12px',
                      padding: '14px',
                      background: isSelected ? '#eff6ff' : meta.cardBg,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected
                        ? '0 4px 14px rgba(37,99,235,0.25)'
                        : '0 2px 6px rgba(0,0,0,0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                    onClick={() => {
                      if (canReopen && onSelectRunningTable) {
                        onSelectRunningTable(tbl);
                        onClose();
                      } else if (meta.status === 'AVAILABLE') {
                        onSelectTable(tbl.tableNumber);
                        onClose();
                      }
                    }}
                  >
                    {/* Delete button (only when completely available) */}
                    {meta.status === 'AVAILABLE' && !hasOrder && (
                      <button
                        type="button"
                        title={`Delete Table ${tbl.tableNumber}`}
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          background: 'transparent',
                          border: 'none',
                          color: '#94a3b8',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          padding: '2px 5px',
                          borderRadius: '4px',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete Table ${tbl.tableNumber}?`)) {
                            onDeleteTable(tbl.id);
                          }
                        }}
                      >
                        ✕
                      </button>
                    )}

                    {/* Top Table info */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '1.25rem' }}>{meta.icon}</span>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: meta.badgeBg,
                            color: meta.badgeColor,
                            border: `1px solid ${meta.badgeBorder}`,
                          }}
                        >
                          {meta.label}
                        </span>
                      </div>

                      <div style={{ fontWeight: 800, fontSize: '1.15rem', color: isSelected ? '#1e40af' : '#0f172a' }}>
                        Table {tbl.tableNumber}
                      </div>

                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                        👥 {tbl.capacity || 4} Seats
                      </div>
                    </div>

                    {/* Order Details Banner for Occupied Tables */}
                    {hasOrder && (
                      <div
                        style={{
                          marginTop: '10px',
                          padding: '8px 10px',
                          background: meta.badgeBg,
                          borderRadius: '6px',
                          border: `1px solid ${meta.badgeBorder}`,
                          fontSize: '0.78rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: meta.badgeColor, marginBottom: '2px' }}>
                          <span>Order:</span>
                          <span>{tbl.orderNumber || 'Active'}</span>
                        </div>
                        {tbl.currentTotal !== undefined && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1e293b' }}>
                            <span>Total:</span>
                            <strong>₹{tbl.currentTotal.toFixed(2)}</strong>
                          </div>
                        )}
                        {tbl.amountDue !== undefined && tbl.amountDue > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c', fontWeight: 700 }}>
                            <span>Due:</span>
                            <span>₹{tbl.amountDue.toFixed(2)}</span>
                          </div>
                        )}
                        {tbl.durationMinutes !== undefined && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginTop: '2px' }}>
                            <span>Seated:</span>
                            <span>⏱ {tbl.durationMinutes}m</span>
                          </div>
                        )}
                        {canReopen && (
                          <div style={{ marginTop: '6px', display: 'flex', gap: '6px' }}>
                            <div style={{ flex: 1, textAlign: 'center', color: meta.badgeColor, fontWeight: 700, fontSize: '0.72rem', padding: '3px 0' }}>
                              ⚡ Click to Add
                            </div>
                            {onOpenCheckout && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onClose();
                                  onOpenCheckout(tbl);
                                }}
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  border: 'none',
                                  background: '#2563eb',
                                  color: '#fff',
                                  fontWeight: 700,
                                  fontSize: '0.72rem',
                                  cursor: 'pointer',
                                }}
                              >
                                💳 Settle
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Ready for Guests status */}
                    {!hasOrder && meta.status === 'AVAILABLE' && (
                      <div
                        style={{
                          marginTop: '10px',
                          padding: '6px 8px',
                          background: '#f0fdf4',
                          borderRadius: '6px',
                          textAlign: 'center',
                          color: '#15803d',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                        }}
                      >
                        ✓ Ready for Guests
                      </div>
                    )}

                    {/* Close Table Action (Available when Paid / Clearing) */}
                    {isPaidClearing && onCloseTable && (
                      <button
                        type="button"
                        disabled={closingTableId === tbl.id}
                        onClick={(e) => handleCloseTableClick(e, tbl)}
                        style={{
                          marginTop: '10px',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          background: '#2563eb',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 1px 3px rgba(37,99,235,0.3)',
                        }}
                      >
                        <span>🧹</span>
                        <span>{closingTableId === tbl.id ? 'Closing...' : 'Close Table (Make Available)'}</span>
                      </button>
                    )}

                    {isSelected && (
                      <div
                        style={{
                          marginTop: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          color: '#2563eb',
                          textAlign: 'center',
                        }}
                      >
                        ✓ Currently Selected
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div
          className="modal-footer"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          {selectedTableNumber ? (
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontWeight: 600,
              }}
              onClick={() => {
                onSelectTable('');
                onClose();
              }}
            >
              Clear Table Selection
            </button>
          ) : (
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No table selected</span>
          )}

          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '0.85rem' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
