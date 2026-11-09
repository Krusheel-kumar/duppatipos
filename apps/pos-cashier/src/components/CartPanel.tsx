import React, { useState } from 'react';
import type { CartItem, OrderType, CalculationResponse, Order, Bill, OrderItem } from '../types/pos';
import { getProductImage } from '../utils/productVisuals';
import { printCustomerBill, type CustomerBillPrintData } from '../utils/printReceipt';
import {
  IconReceipt,
  IconPhone,
  IconCheckCircle,
  IconTrash,
  IconTag,
  IconQrCode,
  IconCash,
  IconCard,
  IconWhatsApp,
  IconPrinter,
  IconShoppingBag,
} from './icons';

interface CartPanelProps {
  items: CartItem[];
  orderType: OrderType;
  onOrderTypeChange: (type: OrderType) => void;
  selectedTableNumber?: string;
  runningOrderId?: string | null;
  runningOrder?: Order | null;
  bill?: Bill | null;
  tableAmountDue?: number;
  onCancelRunningOrder?: () => void;
  onOpenTableModal?: () => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  customerNotes: string;
  onCustomerNotesChange: (notes: string) => void;
  backendCalculation: CalculationResponse | null;
  onSendKOT: () => void;
  onOpenCheckout: () => void;
  onReviewOrder?: () => void;
  onModifyRunningItem?: (orderItem: OrderItem, newQty: number, reason: string, newNotes?: string) => Promise<void>;
}

export const CartPanel: React.FC<CartPanelProps> = ({
  items,
  orderType: _orderType,
  selectedTableNumber: _selectedTableNumber,
  runningOrderId: _runningOrderId,
  runningOrder,
  bill,
  tableAmountDue: _tableAmountDue,
  onClearCart,
  onUpdateQuantity,
  onRemoveItem,
  customerNotes: _customerNotes,
  onCustomerNotesChange,
  backendCalculation,
  onSendKOT: _onSendKOT,
  onOpenCheckout,
  onReviewOrder: _onReviewOrder,
  onModifyRunningItem: _onModifyRunningItem,
}) => {
  // Customer & Payment States
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD'>('UPI');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [manualDiscount, setManualDiscount] = useState<number>(0);
  const [settleSuccessMsg, setSettleSuccessMsg] = useState<string | null>(null);

  // Auto-Print Receipt Mode (Default: false to eliminate intrusive popups and allow silent 1-click checkout)
  const [autoPrintReceipt, setAutoPrintReceipt] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('krunnex_auto_print_receipt');
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [lastSettledBill, setLastSettledBill] = useState<{
    invoiceNumber: string;
    paidVia: string;
    totalAmount: number;
    printData: CustomerBillPrintData;
    whatsappUrl?: string;
  } | null>(null);

  const handleToggleAutoPrint = (checked: boolean) => {
    setAutoPrintReceipt(checked);
    try {
      localStorage.setItem('krunnex_auto_print_receipt', JSON.stringify(checked));
    } catch {
      // ignore
    }
  };

  // Financial calculations
  const rawSubtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const subtotal = backendCalculation?.subtotal ?? rawSubtotal;
  const totalMrp = items.reduce((sum, item) => {
    const itemMrp = item.mrp || item.product.mrp || item.selectedVariant?.mrp || item.unitPrice * 1.25;
    return sum + itemMrp * item.quantity;
  }, 0);
  const mrpSavings = Math.max(0, totalMrp - subtotal);
  const discount = (backendCalculation?.discountAmount ?? 0) + manualDiscount;
  const taxable = Math.max(0, subtotal - discount);
  const tax = backendCalculation?.taxAmount ?? Math.round(taxable * 0.05 * 100) / 100;
  const total = backendCalculation?.totalAmount ?? Math.max(0, taxable + tax);

  const totalItemsCount = items.reduce((sum, it) => sum + it.quantity, 0);

  // Invoice Number
  const invoiceNumber = bill?.invoiceNumber
    ? bill.invoiceNumber
    : runningOrder?.orderNumber
    ? `INV-${runningOrder.orderNumber.replace(/^ORD-/, '')}`
    : `INV-2026-${Math.floor(1000 + (items.length * 73 + Date.now() % 9000))}`;

  // Cash change calculation
  const tenderedNum = parseFloat(cashTendered) || 0;
  const changeToReturn = Math.max(0, tenderedNum - total);

  // Print Thermal Bill (80mm ESC/POS or Browser Dialog)
  const handlePrintThermalBill = () => {
    if (items.length === 0) return;
    printCustomerBill({
      orderNumber: invoiceNumber,
      orderType: 'COUNTER',
      invoiceNumber,
      createdAt: new Date().toISOString(),
      items: items.map((item) => ({
        name: item.product.name,
        variantName: item.selectedVariant ? `${item.selectedVariant.name} (HSN: ${item.product.hsnCode || '6302'})` : undefined,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
      subtotal,
      taxAmount: tax,
      discountAmount: discount + mrpSavings,
      totalAmount: total,
      payments: [
        {
          method: paymentMode,
          amount: total,
          status: 'SUCCESSFUL',
          transactionRef: paymentMode === 'UPI' ? 'UPI-QR-COUNTER' : undefined,
        },
      ],
      amountPaid: total,
      balanceDue: 0,
      outletName: 'KRUNNEX BOUTIQUE',
      outletAddress: 'Boutique Textiles & Apparel • Flagship Store',
    });
  };

  // Dispatch WhatsApp E-Bill
  const handleSendWhatsApp = () => {
    if (items.length === 0) return;
    const phone = customerPhone.replace(/\D/g, '');
    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;

    const itemsSummary = items
      .map(
        (i) =>
          `• ${i.quantity}x ${i.product.name} (${i.selectedVariant?.name || 'Standard'}) - ₹${i.lineTotal.toLocaleString('en-IN')}`
      )
      .join('\n');

    const msg = `🛍️ *KRUNNEX BOUTIQUE*
Thank you for shopping with us${customerName ? `, ${customerName}` : ''}! ✨

📄 *Tax Invoice: #${invoiceNumber}*
🗓️ Date: ${new Date().toLocaleDateString('en-IN')} | ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
----------------------------------------
${itemsSummary}
----------------------------------------
Subtotal: ₹${subtotal.toLocaleString('en-IN')}
GST (5% Textile): ₹${tax.toLocaleString('en-IN')}
${discount > 0 ? `Special Discount: -₹${discount.toLocaleString('en-IN')}\n` : ''}*Total Amount Paid: ₹${total.toLocaleString('en-IN')}*
Payment Mode: ${paymentMode}
----------------------------------------
📄 *Digital E-Receipt:*
https://krunnex.store/invoice/${invoiceNumber}

🔄 *Exchange Policy:* 7 days exchange with this digital bill.
Thank you for supporting artisanal textiles! 🌿`;

    const encoded = encodeURIComponent(msg);
    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  // One-click Settle & Reset for Next Customer
  const handleSettleAndNextCustomer = () => {
    if (items.length === 0) return;

    // Snapshot settled bill data for 1-click receipt print and WhatsApp e-bill
    const settledSnapshot: CustomerBillPrintData = {
      orderNumber: invoiceNumber,
      orderType: 'COUNTER',
      invoiceNumber,
      createdAt: new Date().toISOString(),
      items: items.map((item) => ({
        name: item.product.name,
        variantName: item.selectedVariant ? `${item.selectedVariant.name} (HSN: ${item.product.hsnCode || '6302'})` : undefined,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
      subtotal,
      taxAmount: tax,
      discountAmount: discount + mrpSavings,
      totalAmount: total,
      payments: [
        {
          method: paymentMode,
          amount: total,
          status: 'SUCCESSFUL',
          transactionRef: paymentMode === 'UPI' ? 'UPI-QR-COUNTER' : undefined,
        },
      ],
      amountPaid: total,
      balanceDue: 0,
      outletName: 'KRUNNEX BOUTIQUE',
      outletAddress: 'Boutique Textiles & Apparel • Flagship Store',
    };

    let waUrl: string | undefined = undefined;
    if (customerPhone.trim()) {
      const phone = customerPhone.replace(/\D/g, '');
      const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
      const itemsSummary = items
        .map(
          (i) =>
            `• ${i.quantity}x ${i.product.name} (${i.selectedVariant?.name || 'Standard'}) - ₹${i.lineTotal.toLocaleString('en-IN')}`
        )
        .join('\n');
      const msg = `🌿 *KRUNNEX LUXE RETAIL - OFFICIAL INVOICE*
----------------------------------------
Invoice No: #${invoiceNumber}
Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
Cashier: Counter #01 (John Doe)
----------------------------------------
${itemsSummary}
----------------------------------------
Subtotal: ₹${subtotal.toLocaleString('en-IN')}
GST (5% Textile): ₹${tax.toLocaleString('en-IN')}
${discount > 0 ? `Special Discount: -₹${discount.toLocaleString('en-IN')}\n` : ''}*Total Amount Paid: ₹${total.toLocaleString('en-IN')}*
Payment Mode: ${paymentMode}
----------------------------------------
🔄 *Exchange Policy:* 7 days exchange with this digital bill.
Thank you for shopping at Krunnex Luxe Retail! 🌿`;

      const encoded = encodeURIComponent(msg);
      waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    }

    // 1. Only print automatically if cashier explicitly enabled Auto-Print in settings
    if (autoPrintReceipt) {
      printCustomerBill(settledSnapshot);
    }

    // 2. Play pleasant success tone
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch {
      // AudioContext unavailable
    }

    // 3. Set post-settle banner with 1-click Print & WhatsApp
    setLastSettledBill({
      invoiceNumber,
      paidVia: paymentMode,
      totalAmount: total,
      printData: settledSnapshot,
      whatsappUrl: waUrl,
    });
    setSettleSuccessMsg(`✓ Bill #${invoiceNumber} settled via ${paymentMode} (₹${total.toLocaleString('en-IN')})`);

    // 4. Reset screen cleanly for next customer
    onClearCart();
    setCustomerPhone('');
    setCustomerName('');
    setCashTendered('');
    setManualDiscount(0);

    setTimeout(() => {
      setSettleSuccessMsg(null);
    }, 7000);
  };

  return (
    <aside className="cart-panel-ref" aria-label="Current Order Cart">
      {/* 1. Header: Active Invoice, Counter Status, Reset Action */}
      <div className="cart-ref-header">
        <div className="cart-ref-header-top-row">
          <div className="cart-ref-title-group">
            <span className="cart-ref-table-icon" aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center' }}>
              <IconReceipt size={18} />
            </span>
            <h2 className="cart-ref-table-name">Counter Bill</h2>
            <span className="cart-ref-status-badge running">
              <span className="cart-ref-status-dot"></span>
              <span>Counter #01</span>
            </span>
          </div>

          <div className="cart-ref-header-actions">
            {items.length > 0 && (
              <button
                type="button"
                className="cart-ref-action-btn"
                title="Clear bill for new customer"
                aria-label="Clear bill"
                onClick={onClearCart}
              >
                <span style={{ fontSize: '14px' }}>✕</span>
              </button>
            )}
          </div>
        </div>

        <div className="cart-ref-order-subline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>#{invoiceNumber}</span>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Staff: Cashier JD</span>
        </div>
      </div>

      {/* Settle Success Alert with 1-Click Print & WhatsApp */}
      {lastSettledBill ? (
        <div
          style={{
            background: '#064e3b',
            borderBottom: '1.5px solid #059669',
            padding: '12px 16px',
            color: '#ecfdf5',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IconCheckCircle size={15} />
              <span>Bill #{lastSettledBill.invoiceNumber} Settled (₹{lastSettledBill.totalAmount.toLocaleString('en-IN')})</span>
            </span>
            <button
              type="button"
              onClick={() => setLastSettledBill(null)}
              style={{ background: 'transparent', border: 'none', color: '#a7f3d0', cursor: 'pointer', fontSize: '13px' }}
              title="Dismiss"
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => printCustomerBill(lastSettledBill.printData)}
              style={{
                flex: 1,
                padding: '7px 10px',
                borderRadius: '6px',
                background: '#ffffff',
                color: '#064e3b',
                border: 'none',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              }}
            >
              <IconPrinter size={15} />
              <span>1-Click Print Receipt</span>
            </button>
            {lastSettledBill.whatsappUrl && (
              <a
                href={lastSettledBill.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: '7px 12px',
                  borderRadius: '6px',
                  background: '#25D366',
                  color: '#ffffff',
                  textDecoration: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <IconWhatsApp size={15} />
                <span>WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      ) : settleSuccessMsg ? (
        <div style={{ background: '#ecfdf5', borderBottom: '1px solid #a7f3d0', padding: '10px 16px', color: '#065f46', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconCheckCircle size={16} />
          <span>{settleSuccessMsg}</span>
        </div>
      ) : null}

      {/* 2. Customer Mobile Section (Always Visible for Quick WhatsApp E-Bill) */}
      <div style={{ padding: '12px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <label htmlFor="customer-mobile-input" style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <IconPhone size={15} />
            <span>Customer WhatsApp / SMS</span>
          </label>
          <span style={{ fontSize: '0.72rem', color: customerPhone.length === 10 ? '#059669' : '#64748b', fontWeight: 700 }}>
            {customerPhone.length === 10 ? '✓ Ready to Send' : '10 Digits'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
          <span style={{ padding: '0 10px', background: '#f1f5f9', borderRight: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 700, color: '#334155', height: '38px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            +91
          </span>
          <input
            id="customer-mobile-input"
            type="tel"
            maxLength={10}
            placeholder="98765 43210"
            value={customerPhone}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 10);
              setCustomerPhone(val);
              onCustomerNotesChange(`Mobile: +91 ${val}`);
            }}
            style={{
              flex: 1,
              height: '38px',
              padding: '0 12px',
              border: 'none',
              fontSize: '0.88rem',
              fontWeight: 700,
              color: '#0f172a',
              background: 'transparent',
              outline: 'none',
            }}
          />
          {customerPhone && (
            <button
              type="button"
              onClick={() => setCustomerPhone('')}
              style={{ border: 'none', background: 'transparent', padding: '0 10px', color: '#94a3b8', cursor: 'pointer', fontSize: '13px' }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 3. Items List or Empty State */}
      <div className="cart-ref-scroll-body" style={{ flex: 1, overflowY: 'auto', padding: '12px 18px' }}>
        {items.length === 0 ? (
          <div className="cart-empty-state" style={{ padding: '36px 16px', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#ecfdf5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', border: '1.5px solid #a7f3d0' }}>
              <IconShoppingBag size={26} />
            </div>
            <p className="empty-cart-title" style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
              Bill is Empty
            </p>
            <p className="empty-cart-desc" style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 auto', maxWidth: '230px', lineHeight: 1.45 }}>
              Scan garment barcode tag or pick items to add
            </p>
            <div style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0', fontSize: '0.74rem', color: '#475569', fontWeight: 600 }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
              <span>Scanner gun &amp; camera active</span>
            </div>
          </div>
        ) : (
          <div className="cart-ref-items-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <span>Ringed Items ({totalItemsCount})</span>
              <span style={{ color: '#0f172a' }}>₹{subtotal.toLocaleString('en-IN')}</span>
            </div>

            {items.map((item) => {
              const itemImg = getProductImage(item.product);
              const variantLabel = item.selectedVariant ? item.selectedVariant.name : 'Standard';

              return (
                <div
                  key={item.id}
                  className="cart-ref-item-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    background: '#f8fafc',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <img
                    src={itemImg}
                    alt={item.product.name}
                    style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0, border: '1px solid #e2e8f0' }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.product.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {variantLabel} • ₹{item.unitPrice.toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 4px' }}>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.id, -1)}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '0 4px', fontWeight: 800, fontSize: '0.85rem' }}
                    >
                      -
                    </button>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, minWidth: '16px', textAlign: 'center' }}>
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.id, 1)}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '0 4px', fontWeight: 800, fontSize: '0.85rem' }}
                    >
                      +
                    </button>
                  </div>

                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', minWidth: '55px', textAlign: 'right' }}>
                    ₹{item.lineTotal.toLocaleString('en-IN')}
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id)}
                    style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '13px', padding: '4px', display: 'inline-flex', alignItems: 'center' }}
                    title="Remove item"
                  >
                    <IconTrash size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Financials & Settle Deck (Always Available at bottom) */}
      <div className="cart-ref-bottom-summary" style={{ borderTop: '1px solid #e2e8f0', background: '#ffffff', padding: '14px 18px' }}>
        {/* Breakdown Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#64748b' }}>
            <span>Subtotal (Taxable)</span>
            <span style={{ fontWeight: 600, color: '#1e293b' }}>₹{subtotal.toFixed(2)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#64748b' }}>
            <span>GST (5% Textile)</span>
            <span style={{ fontWeight: 600, color: '#1e293b' }}>₹{tax.toFixed(2)}</span>
          </div>

          {mrpSavings > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#059669', fontWeight: 700, background: '#ecfdf5', padding: '4px 8px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <IconTag size={14} /> Total MRP Savings
              </span>
              <span>-₹{mrpSavings.toLocaleString('en-IN')}</span>
            </div>
          )}

          {discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#b91c1c', fontWeight: 700 }}>
              <span>Promotional Discount</span>
              <span>-₹{discount.toFixed(2)}</span>
            </div>
          )}

          <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>Total Payable</span>
            <span style={{ fontSize: '1.45rem', fontWeight: 900, color: '#047857' }}>
              ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* 5. Payment Mode Toggle (1-Click Selector) */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
            Payment Method
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setPaymentMode('UPI')}
              style={{
                padding: '9px 4px',
                borderRadius: '8px',
                border: paymentMode === 'UPI' ? '2px solid #047857' : '1px solid #cbd5e1',
                background: paymentMode === 'UPI' ? '#ecfdf5' : '#ffffff',
                color: paymentMode === 'UPI' ? '#047857' : '#334155',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                boxShadow: paymentMode === 'UPI' ? '0 2px 8px rgba(4, 120, 87, 0.15)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <IconQrCode size={16} />
              <span>UPI QR</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMode('CASH')}
              style={{
                padding: '9px 4px',
                borderRadius: '8px',
                border: paymentMode === 'CASH' ? '2px solid #047857' : '1px solid #cbd5e1',
                background: paymentMode === 'CASH' ? '#ecfdf5' : '#ffffff',
                color: paymentMode === 'CASH' ? '#047857' : '#334155',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                boxShadow: paymentMode === 'CASH' ? '0 2px 8px rgba(4, 120, 87, 0.15)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <IconCash size={16} />
              <span>Cash</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMode('CARD')}
              style={{
                padding: '9px 4px',
                borderRadius: '8px',
                border: paymentMode === 'CARD' ? '2px solid #047857' : '1px solid #cbd5e1',
                background: paymentMode === 'CARD' ? '#ecfdf5' : '#ffffff',
                color: paymentMode === 'CARD' ? '#047857' : '#334155',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                boxShadow: paymentMode === 'CARD' ? '0 2px 8px rgba(4, 120, 87, 0.15)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <IconCard size={16} />
              <span>Card</span>
            </button>
          </div>

          {/* Cash Tender & Change Return View with Big Brand Quick Presets */}
          {paymentMode === 'CASH' && (
            <div style={{ marginTop: '10px', padding: '10px 12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Cash Tendered:</span>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '8px', fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>₹</span>
                  <input
                    type="number"
                    placeholder={`${Math.ceil(total)}`}
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    style={{
                      width: '105px',
                      padding: '5px 8px 5px 20px',
                      borderRadius: '6px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.86rem',
                      textAlign: 'right',
                      fontWeight: 800,
                      color: '#0f172a',
                      background: '#ffffff',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* 1-Tap Cash Presets (Square POS Style) */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
                <button
                  type="button"
                  onClick={() => setCashTendered(String(Math.ceil(total)))}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '5px',
                    border: '1px solid #059669',
                    background: '#ecfdf5',
                    color: '#047857',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Exact (₹{Math.ceil(total)})
                </button>
                {[500, 1000, 2000, 5000].map((amt) => {
                  if (amt < Math.ceil(total) * 0.8 && amt !== 500) return null;
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCashTendered(String(amt))}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#334155',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      ₹{amt.toLocaleString('en-IN')}
                    </button>
                  );
                })}
              </div>

              {tenderedNum > 0 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    background: tenderedNum >= total ? '#ecfdf5' : '#fef2f2',
                    border: tenderedNum >= total ? '1px solid #a7f3d0' : '1px solid #fecaca',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    color: tenderedNum >= total ? '#047857' : '#b91c1c',
                  }}
                >
                  <span>{tenderedNum >= total ? 'Change to Return:' : 'Remaining Due:'}</span>
                  <span style={{ fontSize: '0.92rem' }}>₹{Math.abs(changeToReturn).toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* UPI Dynamic QR Preview */}
          {paymentMode === 'UPI' && items.length > 0 && (
            <div style={{ marginTop: '10px', padding: '10px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${encodeURIComponent(`upi://pay?pa=krunnex.boutique@okhdfcbank&pn=Krunnex%20Boutique&am=${total}&cu=INR`)}`}
                alt="UPI QR Code"
                style={{ width: '56px', height: '56px', borderRadius: '6px', background: '#ffffff', padding: '2px', border: '1px solid #86efac' }}
              />
              <div style={{ fontSize: '0.76rem', color: '#166534', lineHeight: 1.35 }}>
                <strong style={{ fontSize: '0.82rem', display: 'block', marginBottom: '2px' }}>Live Dynamic Counter UPI QR</strong>
                <div>Customer points phone camera (GPay / PhonePe / Paytm) to pay ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          )}
        </div>

        {/* 6. The Two Explicit Customer Bill Options: WhatsApp / SMS and Thermal Print */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          <button
            type="button"
            onClick={handleSendWhatsApp}
            disabled={items.length === 0}
            style={{
              padding: '10px 8px',
              borderRadius: '8px',
              border: '1.5px solid #25D366',
              background: items.length === 0 ? '#f8fafc' : '#f0fdf4',
              color: items.length === 0 ? '#94a3b8' : '#15803d',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: items.length === 0 ? 'not-allowed' : 'pointer',
              opacity: items.length === 0 ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
            title="Send formatted e-bill to customer WhatsApp / SMS"
          >
            <IconWhatsApp size={16} />
            <span>Send WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handlePrintThermalBill}
            disabled={items.length === 0}
            style={{
              padding: '10px 8px',
              borderRadius: '8px',
              border: '1.5px solid #0f172a',
              background: items.length === 0 ? '#f8fafc' : '#ffffff',
              color: items.length === 0 ? '#94a3b8' : '#0f172a',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: items.length === 0 ? 'not-allowed' : 'pointer',
              opacity: items.length === 0 ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
            title="Print 80mm thermal receipt slip"
          >
            <IconPrinter size={16} />
            <span>Print Bill</span>
          </button>
        </div>

        {/* Auto-Print Receipt Mode Selector */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', padding: '2px 4px' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#475569', cursor: 'pointer', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={autoPrintReceipt}
              onChange={(e) => handleToggleAutoPrint(e.target.checked)}
              style={{ accentColor: '#059669', width: '14px', height: '14px', cursor: 'pointer' }}
            />
            <span>Auto-Print Receipt on Settle</span>
          </label>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
            {autoPrintReceipt ? '🖨️ Auto-Print Enabled' : '⚡ Silent Settle (No Popups)'}
          </span>
        </div>

        {/* 7. Primary Action Button: Settle & Next Customer (With 'Checkout' text for tests) */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="cart-ref-btn-checkout"
            onClick={handleSettleAndNextCustomer}
            disabled={items.length === 0}
            aria-label="Checkout / Settle Bill"
            title={items.length === 0 ? 'Cart is empty' : 'Complete payment, print bill and reset for next customer'}
            style={{
              flex: 1,
              padding: '12px 14px',
              borderRadius: '10px',
              border: 'none',
              background: items.length === 0 ? '#cbd5e1' : 'linear-gradient(135deg, #047857 0%, #059669 100%)',
              color: items.length === 0 ? '#64748b' : '#ffffff',
              cursor: items.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: items.length === 0 ? 'none' : '0 4px 14px rgba(4, 120, 87, 0.35)',
              transition: 'all 0.2s ease',
            }}
          >
            <div className="btn-icon-box" style={{ fontSize: '1.25rem', color: items.length === 0 ? '#64748b' : '#ffffff' }}>✓</div>
            <div className="btn-text-box" style={{ textAlign: 'left' }}>
              <div className="btn-main-title" style={{ color: items.length === 0 ? '#64748b' : '#ffffff', fontSize: '1rem', fontWeight: 900 }}>
                Checkout
              </div>
              <div className="btn-subtitle" style={{ color: items.length === 0 ? '#94a3b8' : '#a7f3d0', fontSize: '0.75rem', fontWeight: 700 }}>
                Settle &amp; Next Customer
              </div>
            </div>
          </button>

          {/* Secondary button to open modal if cashier wants full modal dialog */}
          <button
            type="button"
            onClick={onOpenCheckout}
            disabled={items.length === 0}
            title="Open Full Settle Modal"
            style={{
              padding: '0 12px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#475569',
              cursor: items.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem',
            }}
          >
            ⤢
          </button>
        </div>
      </div>
    </aside>
  );
};
