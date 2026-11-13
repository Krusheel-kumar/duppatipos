import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { generateBarcodeSvg } from '../utils/barcode';
import { IconPrinter, IconWhatsApp, IconCheckCircle } from './icons';

export interface DigitalBillItem {
  name: string;
  variantName?: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface DigitalBillData {
  invoiceNumber: string;
  orderNumber?: string;
  createdAt: string;
  storeName: string;
  storeAddress: string;
  storeGstin: string;
  storePhone: string;
  customerName?: string;
  customerPhone?: string;
  items: DigitalBillItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentMode: string;
  paymentRef?: string;
}

interface DigitalBillViewProps {
  onBackToPos?: () => void;
  initialData?: DigitalBillData | null;
}

// Fallback high-end demo bill if URL contains no parameters
const DEFAULT_DEMO_BILL: DigitalBillData = {
  invoiceNumber: 'INV-2026-8492',
  orderNumber: 'ORD-8492',
  createdAt: new Date().toISOString(),
  storeName: 'DUPPATI',
  storeAddress: 'Road No. 36, Jubilee Hills, Hyderabad - 500033',
  storeGstin: '36AABCU9603R1ZM',
  storePhone: '+91 98765 43210',
  customerName: 'Rajesh Kumar',
  customerPhone: '9876543210',
  items: [
    {
      name: 'Banarasi Katan Pure Silk Saree',
      variantName: 'Emerald Green • Floral Zari Pallu',
      hsnCode: '5007',
      quantity: 1,
      unitPrice: 3499,
      lineTotal: 3499,
    },
    {
      name: 'Chanderi Handloom Cotton Kurti',
      variantName: 'Indigo Blue • Size M (38)',
      hsnCode: '6204',
      quantity: 1,
      unitPrice: 1299,
      lineTotal: 1299,
    },
  ],
  subtotal: 4798,
  taxAmount: 239.9,
  discountAmount: 1200,
  totalAmount: 5037.9,
  paymentMode: 'UPI',
  paymentRef: 'UPI/HDFC/63910284',
};

export const DigitalBillView: React.FC<DigitalBillViewProps> = ({ onBackToPos, initialData }) => {
  const [bill, setBill] = useState<DigitalBillData>(initialData || DEFAULT_DEMO_BILL);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const billContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialData) {
      setBill(initialData);
      return;
    }

    // Try reading from URL query string
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const encodedData = params.get('data');
      let billId = params.get('id') || params.get('bill');

      // Also extract ID from path segments: e.g. /invoice/INV-2026-4771 or /bill/INV-2026-4771
      if (!billId && window.location.pathname) {
        const segments = window.location.pathname.split('/').filter(Boolean);
        if (segments.length >= 2 && (segments[0] === 'invoice' || segments[0] === 'bill')) {
          billId = segments[1];
        }
      }

      if (encodedData) {
        try {
          const jsonStr = decodeURIComponent(atob(encodedData));
          const parsed = JSON.parse(jsonStr);
          setBill(parsed);
          return;
        } catch {
          // If atob fails, try plain JSON decodeURIComponent
          try {
            const parsed = JSON.parse(decodeURIComponent(encodedData));
            setBill(parsed);
            return;
          } catch {
            console.warn('Failed to parse bill data from URL query');
          }
        }
      }

      if (billId) {
        // Try reading from localStorage
        const stored = localStorage.getItem(`krunnex_bill_${billId}`);
        if (stored) {
          try {
            setBill(JSON.parse(stored));
            return;
          } catch (e) {
            console.error('Failed to parse stored bill', e);
          }
        }
        // Fallback: adapt invoice number so the requested bill is cleanly displayed
        setBill((prev) => ({
          ...prev,
          invoiceNumber: billId!,
          orderNumber: billId!,
        }));
      }
    }
  }, [initialData]);

  // Generate QR code for the current URL so anyone looking at this screen can share or verify
  useEffect(() => {
    if (typeof window !== 'undefined') {
      QRCode.toDataURL(window.location.href, { width: 140, margin: 1 })
        .then(setQrDataUrl)
        .catch((err) => console.error('QR code generation error', err));
    }
  }, [bill]);

  const dateFormatted = new Date(bill.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeFormatted = new Date(bill.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const barcodeSvg = generateBarcodeSvg(bill.invoiceNumber, 1.3, 34);

  const handlePrintPdf = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const cleanPhone = bill.customerPhone ? bill.customerPhone.replace(/\D/g, '') : '';
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const itemsSummary = bill.items
      .map((it) => `• ${it.quantity}x ${it.name} (${it.variantName || 'Std'}) - ₹${it.lineTotal.toFixed(2)}`)
      .join('\n');

    const msg = `✨ *${bill.storeName}* ✨
${bill.storeAddress}
GSTIN: ${bill.storeGstin}
────────────────────────────
🧾 *Tax Invoice:* #${bill.invoiceNumber}
👤 *Customer:* ${bill.customerName || 'Valued Guest'}
📅 *Date:* ${dateFormatted}, ${timeFormatted}
────────────────────────────
🛍️ *ITEMS:*
${itemsSummary}
────────────────────────────
💰 *Subtotal:* ₹${bill.subtotal.toFixed(2)}
🏷️ *GST (5%):* ₹${bill.taxAmount.toFixed(2)}
${bill.discountAmount > 0 ? `🎉 *Discount/Savings:* -₹${bill.discountAmount.toFixed(2)}\n` : ''}⭐ *TOTAL PAID:* ₹${bill.totalAmount.toFixed(2)} (${bill.paymentMode})
────────────────────────────
👉 *Tap to view your Digital Tax Invoice:*
${window.location.href}

🙏 *Thank you for shopping with us! Visit again.*`;

    const encoded = encodeURIComponent(msg);
    const waUrl = targetPhone ? `https://wa.me/${targetPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#090d16',
        color: '#0f172a',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: '24px 12px 60px 12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Top Mobile Bar */}
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
        className="no-print"
      >
        <button
          type="button"
          onClick={onBackToPos || (() => { window.location.href = '/'; })}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#f8fafc',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            padding: '7px 14px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>←</span>
          <span>Back to POS</span>
        </button>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={handleCopyLink}
            style={{
              background: copiedLink ? '#059669' : 'rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              border: 'none',
              padding: '7px 12px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {copiedLink ? '✓ Copied!' : '🔗 Copy Link'}
          </button>
          <button
            type="button"
            onClick={handleShareWhatsApp}
            style={{
              background: '#25d366',
              color: '#ffffff',
              border: 'none',
              padding: '7px 12px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <IconWhatsApp size={14} />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Main Luxury Digital Receipt Card */}
      <div
        ref={billContainerRef}
        id="digital-receipt-card"
        style={{
          width: '100%',
          maxWidth: '480px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Decorative Top Accent Stripe */}
        <div
          style={{
            height: '6px',
            background: 'linear-gradient(90deg, #059669 0%, #10b981 50%, #d97706 100%)',
          }}
        />

        {/* Store Luxury Header */}
        <div
          style={{
            padding: '24px 20px 18px 20px',
            textAlign: 'center',
            borderBottom: '1px dashed #cbd5e1',
            background: '#fafbfc',
          }}
        >
          <div
            style={{
              display: 'inline-block',
              background: '#000000',
              color: '#ffffff',
              border: 'none',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.72rem',
              fontWeight: 900,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}
          >
            Official Tax Invoice
          </div>
          <h1
            style={{
              margin: '0 0 4px 0',
              fontSize: '2.2rem',
              fontWeight: 950,
              letterSpacing: '0.08em',
              color: '#000000',
              textTransform: 'uppercase',
              lineHeight: 1.1,
            }}
          >
            {bill.storeName || 'DUPPATI'}
          </h1>
          <p
            style={{
              margin: '0 0 4px 0',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#000000',
              lineHeight: 1.4,
            }}
          >
            {bill.storeAddress}
          </p>
          <div
            style={{
              fontSize: '0.78rem',
              fontWeight: 800,
              color: '#000000',
              display: 'flex',
              justifyContent: 'center',
              gap: '14px',
              flexWrap: 'wrap',
              marginTop: '4px',
            }}
          >
            <span>GSTIN: <strong>{bill.storeGstin}</strong></span>
            <span>Tel: <strong>{bill.storePhone}</strong></span>
          </div>
        </div>

        {/* Invoice & Customer Meta Bar */}
        <div
          style={{
            padding: '14px 20px',
            background: '#ffffff',
            borderBottom: '2px solid #000000',
            fontSize: '0.86rem',
            fontWeight: 800,
            color: '#000000',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div>
              <span style={{ color: '#000000' }}>Invoice No: </span>
              <strong style={{ color: '#000000', fontFamily: 'monospace', fontSize: '0.95rem' }}>#{bill.invoiceNumber}</strong>
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: '#000000',
                color: '#ffffff',
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '0.76rem',
                fontWeight: 900,
              }}
            >
              <IconCheckCircle size={13} />
              <span>PAID</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#000000', fontSize: '0.84rem' }}>
            <div>
              <span>Date: </span>
              <strong>{dateFormatted} • {timeFormatted}</strong>
            </div>
            {bill.customerName && (
              <div>
                <span>Billed To: </span>
                <strong style={{ color: '#000000' }}>{bill.customerName}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Itemized Table */}
        <div style={{ padding: '16px 20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '2.5px solid #000000', textAlign: 'left', color: '#000000', fontSize: '0.86rem' }}>
                <th style={{ padding: '6px 0', fontWeight: 950, width: '52%' }}>Item Details</th>
                <th style={{ padding: '6px 4px', fontWeight: 950, textAlign: 'center', width: '12%' }}>Qty</th>
                <th style={{ padding: '6px 4px', fontWeight: 950, textAlign: 'right', width: '16%' }}>Rate</th>
                <th style={{ padding: '6px 0', fontWeight: 950, textAlign: 'right', width: '20%' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {bill.items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 0 8px 0', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 900, color: '#000000', fontSize: '0.98rem', lineHeight: 1.3 }}>{item.name}</div>
                    {item.variantName && (
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginTop: '2px' }}>
                        • {item.variantName}
                      </div>
                    )}
                    {item.hsnCode && (
                      <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>
                        HSN: {item.hsnCode}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 4px 8px 4px', textAlign: 'center', verticalAlign: 'top', fontWeight: 900, fontSize: '0.95rem', color: '#000000' }}>
                    {item.quantity}
                  </td>
                  <td style={{ padding: '10px 4px 8px 4px', textAlign: 'right', verticalAlign: 'top', fontWeight: 800, fontSize: '0.92rem', color: '#000000' }}>
                    ₹{item.unitPrice.toFixed(2)}
                  </td>
                  <td style={{ padding: '10px 0 8px 0', textAlign: 'right', verticalAlign: 'top', fontWeight: 950, fontSize: '1.05rem', color: '#000000' }}>
                    ₹{item.lineTotal.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pricing Totals Box */}
          <div
            style={{
              borderTop: '2.5px solid #000000',
              marginTop: '12px',
              paddingTop: '10px',
              fontSize: '0.88rem',
              fontWeight: 800,
              color: '#000000',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span>Subtotal:</span>
              <span style={{ fontWeight: 900 }}>₹{bill.subtotal.toFixed(2)}</span>
            </div>

            {bill.discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontWeight: 900 }}>
                <span>Savings / Discount:</span>
                <span>-₹{bill.discountAmount.toFixed(2)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span>Tax (CGST 2.5% + SGST 2.5%):</span>
              <span style={{ fontWeight: 900 }}>₹{bill.taxAmount.toFixed(2)}</span>
            </div>

            {/* Net Total Box */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#ffffff',
                border: '2.5px solid #000000',
                borderRadius: '8px',
                padding: '12px 16px',
                margin: '12px 0',
                color: '#000000',
              }}
            >
              <div>
                <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 950 }}>
                  Total Amount Paid
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155' }}>
                  Via {bill.paymentMode} {bill.paymentRef ? `(${bill.paymentRef})` : ''}
                </div>
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 950, color: '#000000' }}>
                ₹{bill.totalAmount.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Barcode & Verification Section */}
          <div
            style={{
              marginTop: '16px',
              paddingTop: '12px',
              borderTop: '1px dashed #cbd5e1',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '16px',
                margin: '6px 0',
              }}
            >
              <div style={{ maxWidth: '180px', overflow: 'hidden' }}>
                <div dangerouslySetInnerHTML={{ __html: barcodeSvg }} />
                <div style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: '#64748b' }}>
                  {bill.invoiceNumber}
                </div>
              </div>

              {qrDataUrl && (
                <div style={{ textAlign: 'center' }}>
                  <img src={qrDataUrl} alt="Verify QR" style={{ width: '56px', height: '56px', display: 'block', margin: '0 auto' }} />
                  <div style={{ fontSize: '0.62rem', color: '#94a3b8', marginTop: '2px' }}>Verify Bill</div>
                </div>
              )}
            </div>

            <p style={{ margin: '8px 0 2px 0', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
              🌿 7 Days Return / Size Exchange with this digital e-bill.
            </p>
            <p style={{ margin: '0', fontSize: '0.68rem', color: '#94a3b8' }}>
              Thank you for shopping with us! This is an electronically generated tax invoice.
            </p>
          </div>
        </div>

        {/* Download & Actions Footer */}
        <div
          style={{
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            padding: '14px 20px',
            display: 'flex',
            gap: '10px',
          }}
          className="no-print"
        >
          <button
            type="button"
            onClick={handlePrintPdf}
            style={{
              flex: 1,
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              padding: '11px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <IconPrinter size={16} />
            <span>Print / Save PDF</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            style={{
              flex: 1,
              background: '#25d366',
              color: '#ffffff',
              border: 'none',
              padding: '11px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <IconWhatsApp size={16} />
            <span>Send to WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Print Stylesheet */}
      <style>{`
        @media print {
          body {
            background: #ffffff !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          #digital-receipt-card {
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};
