import React, { useState } from 'react';
import type { CustomerBillPrintData } from '../utils/printReceipt';
import { printCustomerBill } from '../utils/printReceipt';
import { printCustomerBillESCPOS, isWebUSBSupported, pairWebUsbPrinter } from '../services/thermalPrinterService';
import { IconPrinter, IconWhatsApp, IconCheckCircle } from './icons';

interface ReceiptSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CustomerBillPrintData | null;
  customerPhone?: string;
}

export const ReceiptSlipModal: React.FC<ReceiptSlipModalProps> = ({
  isOpen,
  onClose,
  data,
  customerPhone = '',
}) => {
  const [usbStatus, setUsbStatus] = useState<string | null>(null);
  const [isPrintingUsb, setIsPrintingUsb] = useState<boolean>(false);

  if (!isOpen || !data) return null;

  const isPaid = data.balanceDue <= 0.01;
  const dateFormatted = data.createdAt
    ? new Date(data.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN');
  const timeFormatted = data.createdAt
    ? new Date(data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // 1-Click WhatsApp Send
  const handleWhatsAppShare = () => {
    const phone = customerPhone.replace(/\D/g, '');
    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;

    const itemsSummary = data.items
      .map(
        (it) =>
          `• ${it.quantity}x ${it.name} (${it.variantName || 'Standard'}) - ₹${it.lineTotal.toLocaleString('en-IN')}`
      )
      .join('\n');

    const msg = `🌿 *KRUNNEX LUXE RETAIL - DIGITAL BILL*
Invoice: #${data.invoiceNumber || data.orderNumber}
Date: ${dateFormatted} ${timeFormatted}
Store: ${data.outletName || 'Krunnex Luxe Retail'}
----------------------------------------
${itemsSummary}
----------------------------------------
Subtotal: ₹${data.subtotal.toLocaleString('en-IN')}
GST (5% Textile): ₹${data.taxAmount.toLocaleString('en-IN')}
${data.discountAmount > 0 ? `Savings / Discount: -₹${data.discountAmount.toLocaleString('en-IN')}\n` : ''}*Total Paid: ₹${data.totalAmount.toLocaleString('en-IN')}*
Payment Mode: ${data.payments[0]?.method || 'UPI'}
----------------------------------------
🔄 *Exchange Policy:* 7 days exchange with this digital bill.
Thank you for shopping with us! 🌿`;

    const encoded = encodeURIComponent(msg);
    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  // Direct Hardware Thermal USB Print (Zero Windows Dialogs)
  const handleDirectUsbPrint = async () => {
    setIsPrintingUsb(true);
    setUsbStatus(null);
    try {
      const printed = await printCustomerBillESCPOS(data);
      if (printed) {
        setUsbStatus('✓ Receipt printed directly to thermal printer!');
      } else {
        // Need to pair device
        if (isWebUSBSupported()) {
          const devName = await pairWebUsbPrinter();
          const retryPrinted = await printCustomerBillESCPOS(data);
          if (retryPrinted) {
            setUsbStatus(`✓ Connected to ${devName} and printed!`);
          } else {
            setUsbStatus(`Connected to ${devName}.`);
          }
        } else {
          setUsbStatus('WebUSB not supported on this browser. Use Chrome/Edge or System Print.');
        }
      }
    } catch (err: any) {
      setUsbStatus(`USB: ${err?.message || 'Device error'}`);
    } finally {
      setIsPrintingUsb(false);
    }
  };

  // Explicit System Print (Only if user clicks it intentionally)
  const handleSystemPrint = () => {
    printCustomerBill(data);
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Digital Receipt Slip"
    >
      <div
        style={{
          width: '100%',
          maxWidth: '430px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Modal Top Bar */}
        <div
          style={{
            padding: '12px 18px',
            background: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#10b981' }}><IconCheckCircle size={18} /></span>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800 }}>Digital Receipt Slip</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Zero-Popup Clean Billing</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.2rem',
              cursor: 'pointer',
              lineHeight: 1,
            }}
            title="Close slip"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Realistic 80mm Thermal Receipt View */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
            background: '#fafafa',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              padding: '20px 18px',
              borderRadius: '8px',
              border: '1px dashed #cbd5e1',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              fontFamily: 'monospace',
              fontSize: '0.84rem',
              color: '#0f172a',
              lineHeight: 1.4,
            }}
          >
            {/* Store Header */}
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, letterSpacing: '0.04em' }}>
                {data.outletName || 'KRUNNEX LUXE RETAIL'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {data.outletAddress || 'Boutique Textiles & Apparel • Flagship Store'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>GSTIN: 29ABCDE1234F1Z5</div>
              <div
                style={{
                  margin: '8px 0',
                  padding: '4px 0',
                  borderTop: '1px dashed #94a3b8',
                  borderBottom: '1px dashed #94a3b8',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                }}
              >
                {isPaid ? 'TAX INVOICE & RECEIPT' : 'BILL ESTIMATE (UNPAID)'}
              </div>
            </div>

            {/* Meta Table */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: '#475569', marginBottom: '4px' }}>
              <span>Invoice: <strong>#{data.invoiceNumber || data.orderNumber}</strong></span>
              <span>{dateFormatted}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: '#475569', marginBottom: '10px' }}>
              <span>Counter: <strong>#01</strong> (JD)</span>
              <span>{timeFormatted}</span>
            </div>

            {/* Items Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                padding: '4px 0',
                borderTop: '1px solid #0f172a',
                borderBottom: '1px solid #0f172a',
                fontWeight: 800,
                fontSize: '0.76rem',
              }}
            >
              <span>ITEM / DESCRIPTION</span>
              <span style={{ textAlign: 'right' }}>AMOUNT</span>
            </div>

            {/* Items List */}
            <div style={{ margin: '8px 0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {data.items.map((it, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {it.quantity}x {it.name}
                    </div>
                    {it.variantName && (
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Size: {it.variantName}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 700 }}>
                    ₹{it.lineTotal.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals Section */}
            <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '8px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span>Subtotal (Taxable):</span>
                <span>₹{data.subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span>GST (5% Textile):</span>
                <span>₹{data.taxAmount.toFixed(2)}</span>
              </div>
              {data.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#059669', fontWeight: 700 }}>
                  <span>Customer Savings:</span>
                  <span>-₹{data.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '1rem',
                  fontWeight: 900,
                  borderTop: '1.5px solid #0f172a',
                  borderBottom: '1.5px solid #0f172a',
                  padding: '6px 0',
                  margin: '6px 0',
                }}
              >
                <span>TOTAL PAID:</span>
                <span>₹{data.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: '#475569' }}>
                <span>Paid via:</span>
                <strong>{data.payments[0]?.method || 'UPI'}</strong>
              </div>
            </div>

            {/* Stamp */}
            <div
              style={{
                textAlign: 'center',
                margin: '14px 0 10px',
                padding: '6px',
                border: '1.5px solid #059669',
                color: '#059669',
                fontWeight: 900,
                fontSize: '0.85rem',
                letterSpacing: '0.08em',
                borderRadius: '4px',
              }}
            >
              ✓ PAID IN FULL
            </div>

            {/* Footer Message */}
            <div style={{ textAlign: 'center', fontSize: '0.72rem', color: '#64748b', marginTop: '10px' }}>
              <div>Thank you for shopping at Krunnex Luxe Retail!</div>
              <div>7 Days Exchange with this Digital Invoice</div>
            </div>
          </div>
        </div>

        {/* USB Status Feedback */}
        {usbStatus && (
          <div
            style={{
              padding: '6px 16px',
              background: usbStatus.startsWith('✓') ? '#ecfdf5' : '#fef2f2',
              borderTop: '1px solid #cbd5e1',
              color: usbStatus.startsWith('✓') ? '#047857' : '#b91c1c',
              fontSize: '0.75rem',
              fontWeight: 700,
              textAlign: 'center',
            }}
          >
            {usbStatus}
          </div>
        )}

        {/* Actions Footer */}
        <div
          style={{
            padding: '12px 18px',
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={handleWhatsAppShare}
              style={{
                padding: '9px 12px',
                borderRadius: '8px',
                background: '#25D366',
                color: '#ffffff',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <IconWhatsApp size={16} />
              <span>WhatsApp E-Bill</span>
            </button>

            <button
              type="button"
              onClick={handleDirectUsbPrint}
              disabled={isPrintingUsb}
              style={{
                padding: '9px 12px',
                borderRadius: '8px',
                background: '#047857',
                color: '#ffffff',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: isPrintingUsb ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
              title="Prints directly to USB Thermal Printer with zero popups"
            >
              <IconPrinter size={16} />
              <span>{isPrintingUsb ? 'Printing...' : 'Direct USB Thermal'}</span>
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleSystemPrint}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: '0.75rem',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Open Windows System Print Dialog (if needed)
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Done / Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
