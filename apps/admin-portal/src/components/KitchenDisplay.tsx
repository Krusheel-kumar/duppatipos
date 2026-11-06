import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { KitchenTicket, KitchenTicketStatus } from '../types/pos';
import { posApiClient } from '../api/posApiClient';
import './KitchenDisplay.css';

interface KitchenDisplayProps {
  onBackToPos?: () => void;
}

export const KitchenDisplay: React.FC<KitchenDisplayProps> = ({ onBackToPos }) => {
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<KitchenTicketStatus | 'ACTIVE'>('ACTIVE');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cancellingTicketId, setCancellingTicketId] = useState<string | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState<string>('');

  // Lock ref to prevent overlapping requests
  const isFetchingRef = useRef<boolean>(false);

  const fetchTickets = useCallback(async (isInitial = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (isInitial) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      // Backend supports filtering by specific status or fetching all
      const statusParam = selectedFilter === 'ACTIVE' ? undefined : selectedFilter;
      const response = await posApiClient.getKitchenTickets(undefined, statusParam, 0, 50);

      let fetched = response.content || [];
      if (selectedFilter === 'ACTIVE') {
        // Active tickets: QUEUED or PREPARING
        fetched = fetched.filter((t) => t.status === 'QUEUED' || t.status === 'PREPARING');
      }

      setTickets(fetched);
      setErrorMessage(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to kitchen service';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      isFetchingRef.current = false;
    }
  }, [selectedFilter]);

  // Initial fetch and interval refresh (every 5 seconds)
  useEffect(() => {
    fetchTickets(true);
    const interval = setInterval(() => {
      fetchTickets(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchTickets]);

  // Handle Ticket Status Updates
  const handleUpdateTicketStatus = async (ticketId: string, nextStatus: KitchenTicketStatus, reason?: string) => {
    try {
      const updated = await posApiClient.updateKitchenTicketStatus(ticketId, nextStatus, reason);
      setTickets((prev) =>
        prev
          .map((t) => (t.id === ticketId ? updated : t))
          .filter((t) => {
            if (selectedFilter === 'ACTIVE') {
              return t.status === 'QUEUED' || t.status === 'PREPARING';
            }
            return true;
          })
      );
      setCancellingTicketId(null);
      setCancelReasonInput('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update ticket status');
    }
  };

  // Handle Item Status Updates
  const handleUpdateItemStatus = async (ticketId: string, itemId: string, nextStatus: KitchenTicketStatus) => {
    try {
      const updatedItem = await posApiClient.updateKitchenTicketItemStatus(itemId, nextStatus);
      setTickets((prev) =>
        prev.map((t) => {
          if (t.id === ticketId) {
            const updatedItems = t.items.map((i) => (i.id === itemId ? updatedItem : i));
            // Check if all items are ready
            const allReady = updatedItems.every(
              (i) => i.status === 'READY' || i.status === 'CANCELLED'
            );
            const anyPreparing = updatedItems.some((i) => i.status === 'PREPARING');

            let updatedTicketStatus = t.status;
            if (allReady && t.status !== 'CANCELLED') updatedTicketStatus = 'READY';
            else if (anyPreparing && t.status === 'QUEUED') updatedTicketStatus = 'PREPARING';

            return {
              ...t,
              status: updatedTicketStatus,
              items: updatedItems,
            };
          }
          return t;
        })
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update item status');
    }
  };

  const formatElapsed = (isoDate: string) => {
    const elapsedMinutes = Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000);
    if (elapsedMinutes < 1) return 'Just now';
    if (elapsedMinutes === 1) return '1 min ago';
    return `${elapsedMinutes} mins ago`;
  };

  return (
    <div className="kds-screen" role="region" aria-label="Kitchen Display System">
      {/* KDS Header Bar */}
      <header className="kds-header">
        <div className="kds-brand-info">
          <h1>Kitchen Display System</h1>
          <span className="kds-live-tag">
            {isRefreshing ? 'Syncing...' : '● Live Kitchen Feed'}
          </span>
        </div>

        {/* Status Filters */}
        <div className="kds-filter-tabs" role="group" aria-label="Ticket filter">
          <button
            type="button"
            className={`kds-tab-btn ${selectedFilter === 'ACTIVE' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('ACTIVE')}
          >
            ACTIVE (QUEUED & PREPARING)
          </button>
          <button
            type="button"
            className={`kds-tab-btn ${selectedFilter === 'READY' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('READY')}
          >
            READY
          </button>
          <button
            type="button"
            className={`kds-tab-btn ${selectedFilter === 'CANCELLED' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('CANCELLED')}
          >
            CANCELLED
          </button>
        </div>

        <div className="kds-actions-right">
          <button
            type="button"
            className="kds-refresh-btn"
            onClick={() => fetchTickets(false)}
            aria-label="Refresh tickets"
          >
            ↻ Refresh
          </button>
          <a
            href="/admin"
            className="kds-pos-btn"
            style={{ textDecoration: 'none', background: '#3b82f6', color: 'white' }}
          >
            ⚙️ Admin
          </a>
          {onBackToPos && (
            <button type="button" className="kds-pos-btn" onClick={onBackToPos}>
              ← POS Register
            </button>
          )}
        </div>
      </header>

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="kds-error-alert" role="alert">
          <span>⚠ {errorMessage}</span>
          <button type="button" onClick={() => fetchTickets(true)} className="kds-retry-btn">
            Retry Connection
          </button>
        </div>
      )}

      {/* Main Ticket Grid / Empty State */}
      <main className="kds-body">
        {isLoading ? (
          <div className="kds-status-message">
            <h2>Loading tickets from kitchen queue...</h2>
          </div>
        ) : tickets.length === 0 ? (
          <div className="kds-status-message">
            <h2>No tickets in &ldquo;{selectedFilter}&rdquo; queue</h2>
            <p>New orders submitted by cashiers will appear here automatically.</p>
          </div>
        ) : (
          <div className="kds-ticket-grid">
            {tickets.map((ticket) => {
              const isQueued = ticket.status === 'QUEUED';
              const isPreparing = ticket.status === 'PREPARING';
              const isReady = ticket.status === 'READY';
              const isCancelled = ticket.status === 'CANCELLED';

              return (
                <div
                  key={ticket.id}
                  className={`kds-ticket-card status-₹{ticket.status.toLowerCase()}`}
                  data-testid={`ticket-₹{ticket.ticketNumber}`}
                >
                  {/* Ticket Header */}
                  <div className="ticket-card-header">
                    <div>
                      <span className="ticket-number">{ticket.ticketNumber}</span>
                      <span className="order-number-ref">Order: {ticket.orderNumberSnapshot}</span>
                    </div>
                    <div className="ticket-meta-right">
                      <span className="order-type-tag">{ticket.orderTypeSnapshot}</span>
                      <span className="ticket-time">{formatElapsed(ticket.createdAt)}</span>
                    </div>
                  </div>

                  {/* Customer Notes */}
                  {ticket.customerNotesSnapshot && (
                    <div className="ticket-customer-notes">
                      <strong>Notes:</strong> {ticket.customerNotesSnapshot}
                    </div>
                  )}

                  {/* Cancellation Reason if cancelled */}
                  {ticket.cancellationReason && (
                    <div className="ticket-cancelled-banner">
                      <strong>Cancelled:</strong> {ticket.cancellationReason}
                    </div>
                  )}

                  {/* Ticket Items */}
                  <div className="ticket-items-list">
                    {ticket.items.map((item) => {
                      const itemQueued = item.status === 'QUEUED';
                      const itemPreparing = item.status === 'PREPARING';
                      const itemReady = item.status === 'READY';

                      return (
                        <div key={item.id} className={`ticket-item-row ${item.status.toLowerCase()}`}>
                          <div className="ticket-item-info">
                            <span className="ticket-item-main">
                              <span className="ticket-item-qty">{item.quantity}x</span>
                              <span className="ticket-item-name">{item.productNameSnapshot}</span>
                              {item.variantNameSnapshot && (
                                <span className="ticket-item-variant"> ({item.variantNameSnapshot})</span>
                              )}
                            </span>

                            {item.addOns && item.addOns.length > 0 && (
                              <span className="ticket-item-addons">
                                + {item.addOns.map((a) => a.addOnNameSnapshot).join(', ')}
                              </span>
                            )}

                            {item.itemNotesSnapshot && (
                              <span className="ticket-item-prep-notes">
                                Note: {item.itemNotesSnapshot}
                              </span>
                            )}
                          </div>

                          {/* Item Preparation Control Buttons */}
                          {!isCancelled && !isReady && (
                            <div className="ticket-item-action-btns">
                              {itemQueued && (
                                <button
                                  type="button"
                                  className="item-btn btn-prep"
                                  onClick={() => handleUpdateItemStatus(ticket.id, item.id, 'PREPARING')}
                                  aria-label={`Start preparing ${item.productNameSnapshot}`}
                                >
                                  Cook
                                </button>
                              )}
                              {itemPreparing && (
                                <button
                                  type="button"
                                  className="item-btn btn-ready"
                                  onClick={() => handleUpdateItemStatus(ticket.id, item.id, 'READY')}
                                  aria-label={`Mark ${item.productNameSnapshot} ready`}
                                >
                                  Done ✓
                                </button>
                              )}
                              {itemReady && <span className="item-ready-badge">Ready ✓</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Ticket Footer Action Controls */}
                  <div className="ticket-card-footer">
                    {isQueued && (
                      <button
                        type="button"
                        className="ticket-btn btn-start-prep"
                        onClick={() => handleUpdateTicketStatus(ticket.id, 'PREPARING')}
                      >
                        Start All (PREPARING)
                      </button>
                    )}

                    {isPreparing && (
                      <button
                        type="button"
                        className="ticket-btn btn-mark-ready"
                        onClick={() => handleUpdateTicketStatus(ticket.id, 'READY')}
                      >
                        Complete Ticket (READY)
                      </button>
                    )}

                    {!isReady && !isCancelled && (
                      cancellingTicketId === ticket.id ? (
                        <div className="cancel-prompt">
                          <input
                            type="text"
                            placeholder="Reason for cancellation..."
                            value={cancelReasonInput}
                            onChange={(e) => setCancelReasonInput(e.target.value)}
                            className="cancel-input"
                          />
                          <button
                            type="button"
                            className="ticket-btn btn-confirm-cancel"
                            onClick={() => {
                              if (!cancelReasonInput.trim()) {
                                alert('Please provide a reason');
                                return;
                              }
                              handleUpdateTicketStatus(ticket.id, 'CANCELLED', cancelReasonInput);
                            }}
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            className="ticket-btn btn-abort-cancel"
                            onClick={() => setCancellingTicketId(null)}
                          >
                            Back
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="ticket-btn btn-cancel-ticket"
                          onClick={() => {
                            setCancellingTicketId(ticket.id);
                            setCancelReasonInput('');
                          }}
                        >
                          Cancel
                        </button>
                      )
                    )}

                    {isReady && <span className="ticket-complete-tag">Order Ready for Pickup</span>}
                    {isCancelled && <span className="ticket-cancelled-tag">Cancelled</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

