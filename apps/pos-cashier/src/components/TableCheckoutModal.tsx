import React, { useState, useEffect, useCallback } from 'react';
import type { Order, Bill, Payment, PaymentMethod, CartItem, OrderType, CreateOrderRequest, CalculationResponse } from '../types/pos';
import type { RestaurantTable } from '../utils/tableStorage';
import { posApiClient } from '../api/posApiClient';
import { getTableStatusMeta } from '../utils/tableColors';
import { printKOT, printCustomerBill } from '../utils/printReceipt';

interface TableCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  table: RestaurantTable | null;
  // For pre-payment Takeaway / Counter checkout:
  pendingCartItems?: CartItem[];
  pendingOrderType?: OrderType;
  pendingCustomerNotes?: string;
  backendCalculation?: CalculationResponse | null;
  onTakeawayPaymentSuccess?: (createdOrder: Order, paymentMethod: PaymentMethod, amount: number) => Promise<void>;
  onPaymentSettled?: () => Promise<void>;
  onCloseTable?: (table: RestaurantTable, reason?: string) => Promise<void>;
  onCancelBill?: (billId: string, reason: string) => Promise<void>;
}

export const TableCheckoutModal: React.FC<TableCheckoutModalProps> = ({
  isOpen,
  onClose,
  order,
  table,
  pendingCartItems,
  pendingOrderType = 'DINE_IN',
  pendingCustomerNotes = '',
  backendCalculation,
  onTakeawayPaymentSuccess,
  onPaymentSettled,
  onCloseTable,
  onCancelBill,
}) => {
  const isTakeawayPrePayment = !order && Boolean(pendingCartItems && pendingCartItems.length > 0);

  const [bill, setBill] = useState<Bill | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoadingBill, setIsLoadingBill] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Payment Form States
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState<string>('');

  // Authorized Exception Close Table States
  const [showExceptionDialog, setShowExceptionDialog] = useState(false);
  const [exceptionReason, setExceptionReason] = useState('');
  const [isClosingTable, setIsClosingTable] = useState(false);

  // Bill Cancellation & Manager Approval States
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('Customer Walkout / Left before dining');
  const [cancelNotes, setCancelNotes] = useState('');
  const [managerPin, setManagerPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isCancellingBill, setIsCancellingBill] = useState(false);

  // Load or Issue Bill and Payment History from Backend for existing orders
  const loadBillAndPayments = useCallback(async () => {
    if (!order) return;
    setIsLoadingBill(true);
    setActionError(null);
    try {
      let currentBill = await posApiClient.getBillByOrderId(order.id);
      if (!currentBill) {
        currentBill = await posApiClient.issueBill(order.id, `Bill for Table ${table?.tableNumber || ''}`);
      }
      setBill(currentBill);

      if (currentBill) {
        const billPayments = await posApiClient.getBillPayments(currentBill.id);
        setPayments(billPayments);
        const due = Math.max(0, currentBill.totalAmount - currentBill.paidAmount);
        setPaymentAmount(due > 0 ? due.toFixed(2) : '0.00');
        setCashTendered(due > 0 ? due.toFixed(2) : '0.00');
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to load bill & payment history');
    } finally {
      setIsLoadingBill(false);
    }
  }, [order, table]);

  useEffect(() => {
    if (isOpen) {
      setSelectedMethod(null);
      setShowExceptionDialog(false);
      setExceptionReason('');
      setActionSuccess(null);
      setActionError(null);

      if (order) {
        loadBillAndPayments();
      } else if (isTakeawayPrePayment && pendingCartItems) {
        // Calculate totals for takeaway pre-payment
        const sub = pendingCartItems.reduce((acc, it) => acc + it.lineTotal, 0);
        const tax = backendCalculation?.taxAmount ?? (sub * 0.05);
        const tot = backendCalculation?.totalAmount ?? (sub + tax);
        setPaymentAmount(tot.toFixed(2));
        setCashTendered(tot.toFixed(2));
      }
    }
  }, [isOpen, order, isTakeawayPrePayment, pendingCartItems, backendCalculation, loadBillAndPayments]);

  if (!isOpen) return null;
  if (!order && !isTakeawayPrePayment) return null;

  // Compute Items List
  const displayItems = order
    ? (order.items || []).map((it) => ({
        id: it.id,
        quantity: it.quantity,
        name: it.productNameSnapshot,
        variantName: it.variantNameSnapshot,
        lineTotal: it.lineTotalSnapshot,
        unitPrice: it.unitPriceSnapshot,
        notes: it.itemNotes,
      }))
    : (pendingCartItems || []).map((it) => ({
        id: it.id,
        quantity: it.quantity,
        name: it.product.name,
        variantName: it.selectedVariant?.name,
        lineTotal: it.lineTotal,
        unitPrice: it.unitPrice,
        notes: it.itemNotes,
      }));

  // Compute Financial Amounts
  const subtotal = order
    ? order.subtotal
    : (backendCalculation?.subtotal ?? (pendingCartItems || []).reduce((acc, it) => acc + it.lineTotal, 0));
  const discountAmount = order ? order.discountAmount : (backendCalculation?.discountAmount ?? 0);
  const taxAmount = order ? order.taxAmount : (backendCalculation?.taxAmount ?? (subtotal * 0.05));
  const totalAmount = bill ? bill.totalAmount : (order ? order.totalAmount : (backendCalculation?.totalAmount ?? (subtotal + taxAmount)));
  const paidAmount = bill ? bill.paidAmount : (table?.amountPaid || 0);
  const balanceDue = Math.max(0, totalAmount - paidAmount);
  const isFullySettled = balanceDue <= 0.001;

  // Change Due calculation for Cash
  const numPaymentAmount = balanceDue > 0 ? balanceDue : (parseFloat(paymentAmount) || totalAmount);
  const numCashTendered = parseFloat(cashTendered) || 0;
  const changeDue = selectedMethod === 'CASH' && numCashTendered > numPaymentAmount
    ? numCashTendered - numPaymentAmount
    : 0;

  const tableMeta = table ? getTableStatusMeta(table) : null;

  // Handler: Confirm Payment (Supports both Dine-in existing order and Takeaway/Counter payment-first)
  const handleConfirmPayment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!selectedMethod) {
      setActionError('Please select a payment mode (Cash, UPI, Card, Other) to settle the bill.');
      return;
    }

    if (numPaymentAmount <= 0) {
      setActionError('Payment amount must be greater than zero.');
      return;
    }

    setIsProcessingPayment(true);
    setActionError(null);
    setActionSuccess(null);

    // ==========================================
    // FLOW 1: TAKEAWAY / COUNTER PRE-PAYMENT
    // ==========================================
    if (isTakeawayPrePayment && pendingCartItems) {
      try {
        const outletId = posApiClient.getConfig().outletId || '00000000-0000-0000-0000-000000000000';
        const idempotencyKey = `POS-PAYFIRST-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

        // 1. Create order
        const orderPayload: CreateOrderRequest = {
          outletId,
          orderType: pendingOrderType,
          idempotencyKey,
          customerNotes: pendingCustomerNotes.trim() || undefined,
          items: pendingCartItems.map((item) => ({
            productId: item.product.id,
            variantId: item.selectedVariant?.id,
            addOnIds: item.selectedAddOns.map((a) => a.id),
            quantity: item.quantity,
            itemNotes: item.itemNotes.trim() !== '' ? item.itemNotes : undefined,
          })),
        };

        const createdOrder = await posApiClient.createOrder(orderPayload);

        // 2. Issue bill
        const createdBill = await posApiClient.issueBill(
          createdOrder.id,
          `${pendingOrderType === 'TAKEAWAY' ? 'Takeaway' : 'Counter'} Bill #${createdOrder.orderNumber}`
        );

        // 3. Record payment
        // CRITICAL FIX: The payment recorded against the bill can never exceed the bill's actual remaining balance
        const billBalance = Math.max(0, createdBill.totalAmount - (createdBill.paidAmount || 0));
        const paymentToRecord = billBalance > 0 ? Math.min(numPaymentAmount, billBalance) : createdBill.totalAmount;

        const payIdempotency = `pay-${createdBill.id}-${Date.now()}`;
        const paymentRecord = await posApiClient.recordPayment(
          createdBill.id,
          paymentToRecord,
          selectedMethod,
          payIdempotency,
          transactionRef.trim() || undefined
        );

        // 4. Confirm payment status to SUCCESSFUL
        await posApiClient.updatePaymentStatus(paymentRecord.id, 'SUCCESSFUL');

        // 5. Automatically Print Customer Bill / Receipt
        printCustomerBill({
          orderNumber: createdOrder.orderNumber,
          orderType: pendingOrderType,
          invoiceNumber: createdBill.invoiceNumber,
          createdAt: createdOrder.createdAt,
          items: displayItems.map((it) => ({
            name: it.name,
            variantName: it.variantName,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            lineTotal: it.lineTotal,
          })),
          subtotal: createdBill.subtotal || subtotal,
          taxAmount: createdBill.taxAmount ?? taxAmount,
          discountAmount: createdBill.discountAmount ?? discountAmount,
          totalAmount: createdBill.totalAmount,
          payments: [
            {
              method: selectedMethod,
              amount: paymentToRecord,
              status: 'SUCCESSFUL',
              transactionRef: transactionRef.trim() || undefined,
            },
          ],
          amountPaid: paymentToRecord,
          balanceDue: 0,
        });

        // 6. Automatically Print KOT for Kitchen
        printKOT({
          orderNumber: createdOrder.orderNumber,
          orderType: pendingOrderType,
          items: displayItems.map((it) => ({
            name: it.name,
            variantName: it.variantName,
            quantity: it.quantity,
            notes: it.notes,
          })),
          customerNotes: pendingCustomerNotes,
        });

        if (onTakeawayPaymentSuccess) {
          await onTakeawayPaymentSuccess(createdOrder, selectedMethod, paymentToRecord);
        }

        onClose();
      } catch (err: unknown) {
        setActionError(err instanceof Error ? err.message : 'Takeaway order & payment processing failed');
      } finally {
        setIsProcessingPayment(false);
      }
      return;
    }

    // ==========================================
    // FLOW 2: DINE-IN EXISTING ORDER PAYMENT
    // ==========================================
    if (!bill) {
      setActionError('Bill not issued. Cannot record payment.');
      setIsProcessingPayment(false);
      return;
    }

    const idempotencyKey = `pay-${bill.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    try {
      // 1. Record payment attempt on backend
      const billRemaining = Math.max(0, bill.totalAmount - (bill.paidAmount || 0));
      const paymentToRecord = billRemaining > 0 ? Math.min(numPaymentAmount, billRemaining) : numPaymentAmount;

      const paymentRecord = await posApiClient.recordPayment(
        bill.id,
        paymentToRecord,
        selectedMethod,
        idempotencyKey,
        transactionRef.trim() || undefined
      );

      // 2. Confirm payment to SUCCESSFUL state
      await posApiClient.updatePaymentStatus(paymentRecord.id, 'SUCCESSFUL');

      setActionSuccess(`Payment of ₹${paymentToRecord.toFixed(2)} via ${selectedMethod} recorded and confirmed!`);
      setTransactionRef('');

      // 3. Reload live bill & payment history directly from backend
      await loadBillAndPayments();

      const isSettlingFullBalance = numPaymentAmount >= balanceDue - 0.01;

      // 4. Automatically release and free up table if fully settled (NO extra popup!)
      if (table && isSettlingFullBalance) {
        try {
          if (!table.id.startsWith('tbl-')) {
            await posApiClient.updateTableStatus(table.id, { status: 'AVAILABLE' });
          }
        } catch {
          // Non-blocking status update
        }

        if (onCloseTable) {
          try {
            await onCloseTable(table);
          } catch {
            // Non-blocking
          }
        }

        setActionSuccess(`✓ Payment Settled! Table ${table.tableNumber} released & bill saved.`);

        // Auto-print receipt
        try {
          printCustomerBill({
            orderNumber: order?.orderNumber || 'DINE-IN',
            orderType: order?.orderType || 'DINE_IN',
            tableNumber: table.tableNumber,
            invoiceNumber: bill.invoiceNumber,
            createdAt: order?.createdAt || new Date().toISOString(),
            items: displayItems.map((it) => ({
              name: it.name,
              variantName: it.variantName,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              lineTotal: it.lineTotal,
            })),
            subtotal,
            taxAmount,
            discountAmount,
            totalAmount,
            payments: [
              ...payments.map((p) => ({
                method: p.paymentMethod,
                amount: p.amount,
                status: p.status,
                transactionRef: p.transactionReference,
              })),
              {
                method: selectedMethod,
                amount: paymentToRecord,
                status: 'SUCCESSFUL',
                transactionRef: transactionRef.trim() || undefined,
              },
            ],
            amountPaid: paidAmount + paymentToRecord,
            balanceDue: 0,
          });
        } catch {
          // Non-blocking print
        }

        // Auto-close modal after brief delay so cashier sees confirmation
        setTimeout(() => {
          onClose();
        }, 1200);
      }

      // 5. Notify parent to refresh tables & orders
      if (onPaymentSettled) {
        await onPaymentSettled();
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Payment recording failed on server');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Handler: Cancel / Void Bill with Manager PIN Approval
  const handleCancelBillAction = async () => {
    if (!bill) return;

    if (!managerPin.trim()) {
      setPinError('Manager PIN is required to authorize bill cancellation.');
      return;
    }

    if (managerPin.trim() !== '1234') {
      setPinError('Invalid Manager PIN. Authorization failed.');
      return;
    }

    if (bill.paidAmount > 0) {
      setPinError('Cannot cancel bill with recorded payments. Please refund payments first.');
      return;
    }

    setIsCancellingBill(true);
    setPinError(null);
    setActionError(null);

    const fullReason = `${cancelReason}${cancelNotes.trim() ? ` - ${cancelNotes.trim()}` : ''} (Mgr PIN Verified)`;

    try {
      if (onCancelBill) {
        await onCancelBill(bill.id, fullReason);
      } else {
        await posApiClient.cancelBill(bill.id, fullReason);
        if (order) {
          try {
            await posApiClient.updateOrderStatus(order.id, 'CANCELLED', fullReason);
          } catch {
            // Non-blocking
          }
        }
        if (table && onCloseTable) {
          await onCloseTable(table, `Bill Cancelled: ${fullReason}`);
        }
        if (onPaymentSettled) {
          await onPaymentSettled();
        }
      }

      setShowCancelDialog(false);
      setActionSuccess(`Bill #${bill.invoiceNumber || bill.id} has been cancelled. Table ${table?.tableNumber || ''} released.`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: unknown) {
      setPinError(err instanceof Error ? err.message : 'Failed to cancel bill on server');
    } finally {
      setIsCancellingBill(false);
    }
  };

  // Handler: Print Official Customer Tax Bill
  const handlePrintCustomerBill = () => {
    printCustomerBill({
      orderNumber: order?.orderNumber || 'PRE-ORDER',
      orderType: order?.orderType || pendingOrderType,
      tableNumber: table?.tableNumber,
      invoiceNumber: bill?.invoiceNumber,
      createdAt: order?.createdAt || new Date().toISOString(),
      items: displayItems.map((it) => ({
        name: it.name,
        variantName: it.variantName,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        lineTotal: it.lineTotal,
      })),
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount,
      payments: payments.map((p) => ({
        method: p.paymentMethod,
        amount: p.amount,
        status: p.status,
        transactionRef: p.transactionReference,
      })),
      amountPaid: paidAmount,
      balanceDue,
    });
  };

  // Handler: Print Kitchen Order Ticket (KOT) - Strictly NO prices/taxes
  const handlePrintKOTTicket = () => {
    printKOT({
      orderNumber: order?.orderNumber || 'KOT-LIVE',
      orderType: order?.orderType || pendingOrderType,
      tableNumber: table?.tableNumber,
      items: displayItems.map((it) => ({
        name: it.name,
        variantName: it.variantName,
        quantity: it.quantity,
        notes: it.notes,
      })),
      customerNotes: order?.customerNotes || pendingCustomerNotes,
      createdAt: order?.createdAt,
    });
  };

  // Handler: Close Table & Finish Visit (Does NOT close automatically upon payment!)
  const handleCloseTableAction = async () => {
    if (!table) return;

    if (!isFullySettled && !showExceptionDialog) {
      setShowExceptionDialog(true);
      return;
    }

    if (!isFullySettled && showExceptionDialog && !exceptionReason.trim()) {
      setActionError('An authorized exception reason is required to close a table with an unpaid balance.');
      return;
    }

    setIsClosingTable(true);
    setActionError(null);

    try {
      if (onCloseTable) {
        await onCloseTable(table, showExceptionDialog ? exceptionReason.trim() : undefined);
      } else {
        await posApiClient.updateTableStatus(table.id, { status: 'AVAILABLE' });
      }
      onClose();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to close table');
    } finally {
      setIsClosingTable(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
      <div
        className="modal-container checkout-modal-container"
        style={{
          maxWidth: '820px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 45px rgba(15, 23, 42, 0.18)',
          overflow: 'hidden',
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                <line x1="2" y1="10" x2="22" y2="10"></line>
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 id="checkout-title" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Checkout &amp; Settle Bill
                </h2>
                {table ? (
                  <span
                    style={{
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      border: '1px solid #bfdbfe',
                    }}
                  >
                    Table {table.tableNumber}
                  </span>
                ) : (
                  <span
                    style={{
                      background: '#fdf4ff',
                      color: '#a21caf',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      border: '1px solid #f0abfc',
                    }}
                  >
                    {pendingOrderType === 'TAKEAWAY' || order?.orderType === 'TAKEAWAY'
                      ? '🛍️ Takeaway'
                      : '🥤 Counter'}
                  </span>
                )}
                {tableMeta && (
                  <span
                    style={{
                      background: tableMeta.badgeBg,
                      color: tableMeta.badgeColor,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      border: `1px solid ${tableMeta.badgeBorder}`,
                    }}
                  >
                    {tableMeta.label}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {order
                  ? `Order #${order.orderNumber} • Placed ${new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : `Payment-first order • ${displayItems.length} items`}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {bill && bill.status !== 'CANCELLED' && !isFullySettled && (
              <button
                type="button"
                onClick={() => {
                  setManagerPin('');
                  setPinError(null);
                  setShowCancelDialog(true);
                }}
                disabled={isProcessingPayment || isClosingTable || isCancellingBill}
                title="Cancel & Void this bill (Manager PIN required)"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #fecaca',
                  background: '#fff1f2',
                  color: '#e11d48',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>🚫</span>
                <span>Cancel Bill</span>
              </button>
            )}

            <button
              type="button"
              className="close-btn"
              onClick={onClose}
              disabled={isProcessingPayment || isClosingTable || isCancellingBill}
              style={{ fontSize: '1.2rem', cursor: 'pointer', background: 'none', border: 'none', color: '#64748b' }}
              aria-label="Close checkout modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Action Alerts */}
        {actionError && (
          <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '10px 24px', fontSize: '0.85rem', fontWeight: 600, borderBottom: '1px solid #fecaca' }}>
            ⚠ {actionError}
          </div>
        )}
        {actionSuccess && (
          <div style={{ background: '#f0fdf4', color: '#15803d', padding: '10px 24px', fontSize: '0.85rem', fontWeight: 600, borderBottom: '1px solid #bbf7d0' }}>
            ✓ {actionSuccess}
          </div>
        )}

        {/* Modal Body: Left Items & Financials | Right Payment Terminal */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.1fr 1fr',
            gap: '20px',
            padding: '20px 24px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {/* Left Column: Items, Breakdown & Payments */}
          <div>
            {/* Ordered Items List */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Ordered Items ({displayItems.length})</span>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {order ? `#${order.orderNumber}` : 'New Order'}
                </span>
              </div>
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  maxHeight: '140px',
                  overflowY: 'auto',
                  padding: '8px 12px',
                  background: '#f8fafc',
                }}
              >
                {displayItems.map((it) => (
                  <div
                    key={it.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '5px 0',
                      borderBottom: '1px dashed #e2e8f0',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{it.quantity}x </span>
                      <span>{it.name}</span>
                      {it.variantName && (
                        <span style={{ color: '#64748b', fontSize: '0.78rem' }}> ({it.variantName})</span>
                      )}
                    </div>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{it.lineTotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary Card */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#15803d', marginBottom: '4px' }}>
                  <span>Discounts:</span>
                  <span>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', marginBottom: '6px' }}>
                <span>Taxes &amp; GST (5%):</span>
                <span>₹{taxAmount.toFixed(2)}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '6px',
                  borderTop: '1px solid #f1f5f9',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: '#334155',
                }}
              >
                <span>Total Bill Amount:</span>
                <span>₹{totalAmount.toFixed(2)}</span>
              </div>
              {paidAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#15803d', marginTop: '4px' }}>
                  <span>Previous Payments:</span>
                  <span>-₹{paidAmount.toFixed(2)}</span>
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '8px',
                  marginTop: '8px',
                  borderTop: '2px solid #e2e8f0',
                }}
              >
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>Remaining Balance:</span>
                <span
                  style={{
                    fontWeight: 900,
                    fontSize: '1.25rem',
                    color: isFullySettled ? '#15803d' : '#2563eb',
                  }}
                >
                  ₹{balanceDue.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment History (if any) */}
            {payments.length > 0 && (
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Recorded Payments ({payments.length})
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 10px', background: '#f8fafc', fontSize: '0.78rem' }}>
                  {payments.map((p) => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                      <span>✓ {p.paymentMethod} {p.transactionReference ? `(${p.transactionReference})` : ''}</span>
                      <strong style={{ color: '#15803d' }}>₹{p.amount.toFixed(2)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Clean & Minimal Payment Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingLeft: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', marginBottom: '6px' }}>
                Select Customer Payment Mode
              </label>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 16px 0' }}>
                Choose how the customer is paying to settle this bill:
              </p>

              {/* 4 Large, Touch-Friendly Payment Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
                {(['CASH', 'UPI', 'CARD', 'OTHER'] as PaymentMethod[]).map((m) => {
                  const isSelected = selectedMethod === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setSelectedMethod(m);
                        setActionError(null);
                      }}
                      disabled={isFullySettled || isProcessingPayment}
                      style={{
                        padding: '16px 12px',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid #2563eb' : '1.5px solid #e2e8f0',
                        background: isSelected ? '#eff6ff' : '#ffffff',
                        color: isSelected ? '#1d4ed8' : '#334155',
                        cursor: isFullySettled ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: isSelected ? '0 4px 12px rgba(37, 99, 235, 0.15)' : '0 1px 3px rgba(0,0,0,0.03)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: '1.8rem' }}>
                        {m === 'CASH' ? '💵' : m === 'UPI' ? '📱' : m === 'CARD' ? '💳' : '⚡'}
                      </span>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{m}</span>
                      {isSelected && (
                        <span style={{ fontSize: '0.72rem', background: '#2563eb', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                          Selected
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Mode Selection Feedback or Cash Tendered Calculator */}
              {selectedMethod === 'CASH' && (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    marginBottom: '14px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                      Cash Received from Customer (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={() => setCashTendered(numPaymentAmount.toFixed(2))}
                      style={{ padding: '2px 8px', background: '#e2e8f0', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', color: '#0f172a' }}
                    >
                      Exact (₹{numPaymentAmount.toFixed(2)})
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min={numPaymentAmount}
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    disabled={isFullySettled || isProcessingPayment}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '1rem',
                      fontWeight: 700,
                      boxSizing: 'border-box',
                    }}
                    placeholder="e.g. 500"
                  />
                  {numCashTendered > numPaymentAmount && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>Change to Return:</span>
                      <strong style={{ fontSize: '1.05rem', color: '#15803d' }}>
                        ₹{changeDue.toFixed(2)}
                      </strong>
                    </div>
                  )}
                </div>
              )}

              {selectedMethod && selectedMethod !== 'CASH' && (
                <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <span style={{ fontSize: '1.3rem' }}>
                    {selectedMethod === 'UPI' ? '📱' : selectedMethod === 'CARD' ? '💳' : '⚡'}
                  </span>
                  <div>
                    <span style={{ display: 'block', fontWeight: 800, color: '#166534', fontSize: '0.88rem' }}>
                      Customer paying via {selectedMethod}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#15803d' }}>
                      Click "Settle Bill" below to record and complete payment of ₹{balanceDue.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {!selectedMethod && !isFullySettled && (
                <div style={{ background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: '10px', padding: '14px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                  👆 Tap a payment mode above (Cash, UPI, Card, Other) to enable bill settlement
                </div>
              )}
            </div>

            {/* Bottom Actions Bar: Print Bill, Print KOT, and Settle Bill (or Close Table) */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {/* 1. Print Bill Button */}
                <button
                  type="button"
                  onClick={handlePrintCustomerBill}
                  disabled={isLoadingBill}
                  title="Print customer bill check"
                  style={{
                    flex: 1,
                    padding: '11px 10px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#1e293b',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                  }}
                >
                  <span>🖨️</span>
                  <span>Print Bill</span>
                </button>

                {/* 2. Print KOT Button */}
                <button
                  type="button"
                  onClick={handlePrintKOTTicket}
                  disabled={isLoadingBill}
                  title="Print kitchen order ticket (KOT without prices)"
                  style={{
                    flex: 1,
                    padding: '11px 10px',
                    borderRadius: '8px',
                    border: '1.5px solid #fde68a',
                    background: '#fefce8',
                    color: '#b45309',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                  }}
                >
                  <span>👨‍🍳</span>
                  <span>Print KOT</span>
                </button>

                {/* 3. Settle Bill Action (Enabled ONLY when a payment mode is selected!) */}
                {!isFullySettled ? (
                  <button
                    type="button"
                    onClick={() => handleConfirmPayment()}
                    disabled={!selectedMethod || isProcessingPayment}
                    aria-label="Confirm Payment & Settle Bill"
                    title={!selectedMethod ? 'Select a payment mode (Cash, UPI, Card, Other) above to settle' : `Settle bill via ${selectedMethod}`}
                    style={{
                      flex: 1.6,
                      padding: '11px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: selectedMethod ? '#15803d' : '#e2e8f0',
                      color: selectedMethod ? '#ffffff' : '#94a3b8',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      cursor: selectedMethod && !isProcessingPayment ? 'pointer' : 'not-allowed',
                      boxShadow: selectedMethod ? '0 2px 8px rgba(21, 128, 61, 0.35)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{isProcessingPayment ? '⏳' : '💳'}</span>
                    <span>
                      {isProcessingPayment
                        ? 'Settling...'
                        : selectedMethod
                        ? `Settle via ${selectedMethod} (₹${balanceDue.toFixed(2)})`
                        : 'Settle Bill (Select Mode)'}
                    </span>
                  </button>
                ) : (
                  /* 4. When Fully Settled: Table is already released, cashier just clicks Done / Close */
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Settlement complete"
                    style={{
                      flex: 1.6,
                      padding: '11px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#15803d',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 8px rgba(21, 128, 61, 0.3)',
                    }}
                  >
                    <span>✓</span>
                    <span>Settled &amp; Table Freed (Done)</span>
                  </button>
                )}
              </div>

              {/* Secondary Actions when unsettled: Cancel Bill and Emergency Close */}
              {!isFullySettled && !showExceptionDialog && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                  {bill && bill.status !== 'CANCELLED' && (
                    <button
                      type="button"
                      onClick={() => {
                        setManagerPin('');
                        setPinError(null);
                        setShowCancelDialog(true);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#e11d48',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: '2px 4px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>🚫</span>
                      <span>Cancel / Void Bill</span>
                    </button>
                  )}

                  {table && (
                    <button
                      type="button"
                      onClick={handleCloseTableAction}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        fontSize: '0.74rem',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        padding: '2px 4px',
                      }}
                    >
                      Close Table (Unsettled)
                    </button>
                  )}
                </div>
              )}

              {/* Exception reason prompt for closing table with unpaid balance */}
              {showExceptionDialog && (
                <div style={{ background: '#fef3c7', border: '1px solid #fde047', borderRadius: '8px', padding: '10px', fontSize: '0.8rem' }}>
                  <div style={{ fontWeight: 700, color: '#92400e', marginBottom: '4px' }}>
                    Table has an unpaid balance of ₹{balanceDue.toFixed(2)}. Enter reason to proceed:
                  </div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#78350f', marginBottom: '4px' }}>
                    Reason for Closing Table with Unsettled Balance (Manager Override):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Manager Void / Guest Walkout"
                    value={exceptionReason}
                    onChange={(e) => setExceptionReason(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #d97706', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setShowExceptionDialog(false)}
                      style={{ padding: '4px 8px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseTableAction}
                      disabled={isClosingTable || !exceptionReason.trim()}
                      style={{ padding: '4px 10px', background: '#b45309', color: '#ffffff', border: 'none', borderRadius: '4px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Confirm Authorized Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bill Cancellation Dialog with Policy & Manager Security Approval */}
      {showCancelDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
            }}
          >
            {/* Dialog Header */}
            <div
              style={{
                padding: '16px 20px',
                background: '#fff1f2',
                borderBottom: '1px solid #fecdd3',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#ffe4e6',
                  color: '#e11d48',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                }}
              >
                🚫
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#9f1239' }}>
                  Cancel Bill &amp; Void Order
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#be123c' }}>
                  {table ? `Table ${table.tableNumber}` : 'Order'} • Bill {bill?.invoiceNumber || `#${order?.orderNumber || ''}`}
                </span>
              </div>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Cancellation Policy Banner */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  fontSize: '0.8rem',
                  color: '#475569',
                  lineHeight: 1.45,
                }}
              >
                <strong style={{ display: 'block', color: '#0f172a', marginBottom: '4px', fontSize: '0.82rem' }}>
                  📜 Cancellation Policy &amp; Audit Trail:
                </strong>
                A bill can only be cancelled prior to final payment settlement. Once authorized, the bill and active order will be voided, and Table {table?.tableNumber || ''} will immediately return to Available inventory. Every cancellation is logged with manager credentials.
              </div>

              {bill && bill.paidAmount > 0 && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px', color: '#b91c1c', fontSize: '0.82rem', fontWeight: 600 }}>
                  ⚠ Warning: Bill has ₹{bill.paidAmount.toFixed(2)} in recorded payments. Backend policy requires recorded payments to be refunded first.
                </div>
              )}

              {/* Reason Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  Cancellation Reason <span style={{ color: '#e11d48' }}>*</span>
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                  }}
                >
                  <option value="Customer Walkout / Left before dining">Customer Walkout / Left before dining</option>
                  <option value="Wrong Order Punched by Cashier">Wrong Order Punched by Cashier</option>
                  <option value="Excessive Kitchen Delay / Customer Refused">Excessive Kitchen Delay / Customer Refused</option>
                  <option value="Food Quality / Guest Complaint">Food Quality / Guest Complaint</option>
                  <option value="Duplicate Order Created">Duplicate Order Created</option>
                  <option value="Guest Changed Mind / Cancelled Items">Guest Changed Mind / Cancelled Items</option>
                  <option value="Other Operational Reason">Other Operational Reason</option>
                </select>
              </div>

              {/* Additional Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Additional Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Table changed or cashier duplicate punch"
                  value={cancelNotes}
                  onChange={(e) => setCancelNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Manager Approval Security PIN */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                  🔐 Manager Security Approval PIN <span style={{ color: '#e11d48' }}>*</span>
                </label>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '6px' }}>
                  Required for managerial audit authorization (Default PIN: <strong>1234</strong>)
                </span>
                <input
                  type="password"
                  placeholder="Enter Manager PIN (1234)"
                  value={managerPin}
                  onChange={(e) => {
                    setManagerPin(e.target.value);
                    setPinError(null);
                  }}
                  maxLength={6}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: pinError ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                    fontSize: '1rem',
                    fontWeight: 800,
                    letterSpacing: '3px',
                    boxSizing: 'border-box',
                  }}
                />
                {pinError && (
                  <span style={{ display: 'block', color: '#e11d48', fontSize: '0.78rem', fontWeight: 600, marginTop: '4px' }}>
                    ⚠ {pinError}
                  </span>
                )}
              </div>
            </div>

            {/* Dialog Footer Actions */}
            <div
              style={{
                padding: '14px 20px',
                background: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowCancelDialog(false);
                  setPinError(null);
                }}
                disabled={isCancellingBill}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Keep Bill
              </button>

              <button
                type="button"
                onClick={handleCancelBillAction}
                disabled={isCancellingBill || (bill ? bill.paidAmount > 0 : false)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#e11d48',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: isCancellingBill ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(225, 29, 72, 0.35)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{isCancellingBill ? '⏳' : '🚫'}</span>
                <span>{isCancellingBill ? 'Voiding Bill...' : 'Authorize & Cancel Bill'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
