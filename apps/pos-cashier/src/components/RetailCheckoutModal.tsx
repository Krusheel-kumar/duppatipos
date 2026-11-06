import React, { useState } from 'react';
import type { CartItem, CalculationResponse } from '../types/pos';
import { printCustomerBill } from '../utils/printReceipt';
import { IconPrinter, IconWhatsApp, IconQrCode, IconCash, IconCard, IconSwap, IconCreditNote, IconTag } from './icons';

interface RetailCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  backendCalculation: CalculationResponse | null;
  onCheckoutSuccess: (orderData: {
    customerPhone: string;
    customerName: string;
    paymentMethod: string;
    paymentBreakdown: { cash?: number; upi?: number; card?: number; storeCredit?: number; change?: number; upiRef?: string };
    totalAmount: number;
    invoiceNumber: string;
  }) => void;
}

export const RetailCheckoutModal: React.FC<RetailCheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  backendCalculation,
  onCheckoutSuccess,
}) => {
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD' | 'SPLIT' | 'CREDIT'>('UPI');

  // Payment Breakdown Fields
  const [cashTendered, setCashTendered] = useState<string>('');
  const [upiRef, setUpiRef] = useState<string>('');
  const [splitCash, setSplitCash] = useState<string>('');
  const [splitUpi, setSplitUpi] = useState<string>('');
  const [storeCreditCode, setStoreCreditCode] = useState<string>('');

  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [lastInvoiceNumber, setLastInvoiceNumber] = useState<string>('');

  // Calculations
  const subtotal = backendCalculation?.subtotal ?? cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const totalMrp = cartItems.reduce((sum, item) => {
    const itemMrp = item.product.mrp || item.selectedVariant?.mrp || item.unitPrice * 1.25;
    return sum + itemMrp * item.quantity;
  }, 0);
  const totalSavings = Math.max(0, totalMrp - subtotal);
  const totalAmount = backendCalculation?.totalAmount ?? subtotal;

  const invoiceNumber = lastInvoiceNumber || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Handle Direct Print to Thermal Billing Machine
  const handlePrintThermalBill = () => {
    printCustomerBill({
      orderNumber: invoiceNumber,
      orderType: 'COUNTER',
      invoiceNumber,
      createdAt: new Date().toISOString(),
      items: cartItems.map((item) => ({
        name: item.product.name,
        variantName: item.selectedVariant ? `${item.selectedVariant.name} (HSN: ${item.product.hsnCode || '6302'})` : undefined,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
      subtotal,
      taxAmount: backendCalculation?.taxAmount ?? Math.round(subtotal * 0.05 * 100) / 100,
      discountAmount: totalSavings,
      totalAmount,
      payments: [
        {
          method: paymentMode,
          amount: totalAmount,
          status: 'SUCCESSFUL',
          transactionRef: paymentMode === 'UPI' ? (upiRef || 'UPI-QR-PAID') : undefined,
        },
      ],
      amountPaid: totalAmount,
      balanceDue: 0,
      outletName: 'KRUNNEX LUXE LIVING',
      outletAddress: 'Boutique Textiles & Apparel • Flagship Store',
    });
  };

  // Handle WhatsApp E-Bill Dispatch
  const handleSendWhatsAppBill = () => {
    const phone = customerPhone.replace(/\D/g, '');
    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;

    const itemsSummary = cartItems
      .map(
        (i) =>
          `• ${i.quantity}x ${i.product.name} (${i.selectedVariant?.name || 'Standard'}) - Rs. ${i.lineTotal.toFixed(2)}`
      )
      .join('\n');

    const msg = `🛍️ *KRUNNEX LUXE LIVING*
Thank you for shopping with us${customerName ? `, ${customerName}` : ''}! ✨

📄 *Tax Invoice: #${invoiceNumber}*
🗓️ Date: ${new Date().toLocaleDateString()} | ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
----------------------------------------
${itemsSummary}
----------------------------------------
Subtotal: Rs. ${subtotal.toFixed(2)}
${totalSavings > 0 ? `🎉 Total Savings: -Rs. ${totalSavings.toFixed(2)}\n` : ''}*Total Amount Paid: Rs. ${totalAmount.toFixed(2)}*
Payment Mode: ${paymentMode}
----------------------------------------
📄 *Download / View Digital E-Receipt:*
https://krunnex.store/invoice/${invoiceNumber}

🔄 *Exchange Policy:* 7 days exchange with this digital bill.
Thank you for supporting handloom & textiles! 🌿`;

    const encoded = encodeURIComponent(msg);
    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  // Handle Complete Settlement
  const handleCompleteSettlement = () => {
    setLastInvoiceNumber(invoiceNumber);
    setIsSuccess(true);

    onCheckoutSuccess({
      customerPhone,
      customerName,
      paymentMethod: paymentMode,
      paymentBreakdown: {
        cash: paymentMode === 'CASH' ? totalAmount : paymentMode === 'SPLIT' ? parseFloat(splitCash) || 0 : 0,
        upi: paymentMode === 'UPI' ? totalAmount : paymentMode === 'SPLIT' ? parseFloat(splitUpi) || 0 : 0,
        card: paymentMode === 'CARD' ? totalAmount : 0,
        storeCredit: paymentMode === 'CREDIT' ? totalAmount : 0,
        upiRef: upiRef || undefined,
      },
      totalAmount,
      invoiceNumber,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="pos-ref-modal-overlay" style={{ zIndex: 1150 }}>
      <div
        className="pos-ref-modal-content"
        style={{
          maxWidth: '620px',
          width: '92%',
          background: '#ffffff',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            background: isSuccess ? '#047857' : '#0f172a',
            color: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            transition: 'background 0.3s ease',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
              {isSuccess ? '✓ Payment Completed & Bill Issued' : 'Settle Bill & Customer Receipt'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: isSuccess ? '#a7f3d0' : '#94a3b8' }}>
              Invoice #{invoiceNumber} • {cartItems.length} line item(s)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.4rem',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px' }}>
          {isSuccess ? (
            /* Post Payment Success Actions */
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '8px' }}>🎉</div>
              <h2 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', color: '#0f172a' }}>
                ₹{totalAmount.toFixed(2)} Received via {paymentMode}
              </h2>
              <p style={{ margin: '0 0 24px 0', fontSize: '0.85rem', color: '#64748b' }}>
                Stock decremented automatically. Choose receipt options below:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
                <button
                  type="button"
                  onClick={handlePrintThermalBill}
                  style={{
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    padding: '14px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.3)',
                  }}
                >
                  <IconPrinter size={18} />
                  <span>Print Thermal Bill</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendWhatsAppBill}
                  style={{
                    background: '#25d366',
                    color: '#ffffff',
                    border: 'none',
                    padding: '14px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 6px -1px rgba(37, 211, 102, 0.3)',
                  }}
                >
                  <IconWhatsApp size={18} />
                  <span>Send WhatsApp E-Bill</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                style={{
                  background: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Start Next Sale →
              </button>
            </div>
          ) : (
            /* Active Settlement Form */
            <div>
              {/* Financial Summary Strip */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '18px',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>
                    Net Amount Due
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a' }}>
                    ₹{totalAmount.toFixed(2)}
                  </div>
                </div>
                {totalSavings > 0 && (
                  <div
                    style={{
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: '#047857',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <IconTag size={13} />
                    <span>You Save ₹{totalSavings.toFixed(2)} (MRP)</span>
                  </div>
                )}
              </div>

              {/* Customer Mobile & Name Input */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', marginBottom: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Customer Mobile (for WhatsApp E-Bill):
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 98765 43210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Customer Name:
                  </label>
                  <input
                    type="text"
                    placeholder="Optional"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>
              </div>

              {/* Payment Mode Selector Tabs */}
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                Select Payment Mode:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '16px' }}>
                {(['UPI', 'CASH', 'CARD', 'SPLIT', 'CREDIT'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    style={{
                      padding: '10px 4px',
                      borderRadius: '8px',
                      border: paymentMode === mode ? '2px solid #0f172a' : '1px solid #cbd5e1',
                      background: paymentMode === mode ? '#0f172a' : '#ffffff',
                      color: paymentMode === mode ? '#ffffff' : '#334155',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    {mode === 'UPI' && (
                      <>
                        <IconQrCode size={14} />
                        <span>UPI QR</span>
                      </>
                    )}
                    {mode === 'CASH' && (
                      <>
                        <IconCash size={14} />
                        <span>Cash</span>
                      </>
                    )}
                    {mode === 'CARD' && (
                      <>
                        <IconCard size={14} />
                        <span>Card</span>
                      </>
                    )}
                    {mode === 'SPLIT' && (
                      <>
                        <IconSwap size={14} />
                        <span>Split</span>
                      </>
                    )}
                    {mode === 'CREDIT' && (
                      <>
                        <IconCreditNote size={14} />
                        <span>Credit</span>
                      </>
                    )}
                  </button>
                ))}
              </div>

              {/* Dynamic Payment Fields Based on Selected Mode */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '14px',
                  marginBottom: '20px',
                }}
              >
                {paymentMode === 'UPI' && (
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div
                      style={{
                        width: '90px',
                        height: '90px',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: '#64748b',
                        gap: '4px',
                      }}
                    >
                      <IconQrCode size={28} />
                      <span>Scan UPI QR</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                        Scan via GPay / PhonePe / Paytm / BHIM
                      </div>
                      <input
                        type="text"
                        placeholder="Optional UTR / Ref Number"
                        value={upiRef}
                        onChange={(e) => setUpiRef(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.85rem',
                        }}
                      />
                    </div>
                  </div>
                )}

                {paymentMode === 'CASH' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '2px' }}>
                        Cash Tendered:
                      </label>
                      <input
                        type="number"
                        placeholder={`₹${totalAmount.toFixed(2)}`}
                        value={cashTendered}
                        onChange={(e) => setCashTendered(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.9rem',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '2px' }}>
                        Change to Return:
                      </label>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#047857', paddingTop: '4px' }}>
                        ₹{Math.max(0, (parseFloat(cashTendered) || 0) - totalAmount).toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}

                {paymentMode === 'CARD' && (
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                      Card Swiped on Counter EDC Machine
                    </div>
                    <input
                      type="text"
                      placeholder="Optional Authorization / Last 4 digits"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>
                )}

                {paymentMode === 'SPLIT' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '2px' }}>
                        Cash Amount (₹):
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 1500"
                        value={splitCash}
                        onChange={(e) => {
                          setSplitCash(e.target.value);
                          const cash = parseFloat(e.target.value) || 0;
                          setSplitUpi(Math.max(0, totalAmount - cash).toFixed(2));
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.9rem',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '2px' }}>
                        UPI / Card Amount (₹):
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 2797"
                        value={splitUpi}
                        onChange={(e) => setSplitUpi(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.9rem',
                        }}
                      />
                    </div>
                  </div>
                )}

                {paymentMode === 'CREDIT' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '2px' }}>
                      Store Credit Voucher Code:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CN-2026-8821"
                      value={storeCreditCode}
                      onChange={(e) => setStoreCreditCode(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1,
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCompleteSettlement}
                  style={{
                    flex: 2,
                    background: '#047857',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    color: '#ffffff',
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(4, 120, 87, 0.4)',
                  }}
                >
                  Complete &amp; Issue Bill (₹{totalAmount.toFixed(2)}) →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
