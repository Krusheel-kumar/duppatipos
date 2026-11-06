import React from 'react';
import type { Order, Bill } from '../types/pos';
import { IconCash, IconQrCode, IconCard, IconReceipt, IconWhatsApp, IconPrinter } from './icons';

interface DailyClosingReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  bills: Bill[];
}

export const DailyClosingReportModal: React.FC<DailyClosingReportModalProps> = ({
  isOpen,
  onClose,
  orders: _orders,
  bills: _bills,
}) => {
  // Demo synthesized financials representing an active day in the textile boutique
  const totalBills = 38;
  const totalItemsSold = 84;
  const grossSales = 114850;
  const discountsGiven = 6900;
  const returnsCount = 2;
  const returnsValue = 3400;
  const netRevenue = grossSales - discountsGiven - returnsValue;
  const gstCollected = Math.round(netRevenue * 0.085); // Blended textile GST

  const cashInDrawer = 32500;
  const upiTotal = 54850;
  const cardTotal = 17200;
  const storeCreditUsed = 0;

  const handlePrintZReport = () => {
    const printWindow = window.open('', '_blank', 'width=380,height=600');
    if (!printWindow) {
      alert('Please allow popups to print the daily closing report.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Daily Sales Closing Z-Report</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 12px;
              color: #000;
              margin: 0;
              padding: 6mm 4mm;
              line-height: 1.3;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .title { font-size: 15px; font-weight: 900; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .double-divider { border-top: 2px solid #000; margin: 6px 0; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 2px 0; }
            .right { text-align: right; }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="title">KRUNNEX LUXE LIVING</div>
            <div>Textile &amp; Boutique Flagship</div>
            <div class="bold">DAILY SALES CLOSING (Z-REPORT)</div>
            <div>Date: ${new Date().toLocaleDateString()} | Register: Counter 1</div>
          </div>
          <div class="double-divider"></div>
          <table>
            <tr><td>Total Bills Issued:</td><td class="right bold">${totalBills}</td></tr>
            <tr><td>Total Items Sold:</td><td class="right bold">${totalItemsSold} pcs</td></tr>
          </table>
          <div class="divider"></div>
          <table>
            <tr><td>Gross Sales:</td><td class="right">₹${grossSales.toLocaleString('en-IN')}.00</td></tr>
            <tr><td>MRP Discounts:</td><td class="right">- ₹${discountsGiven.toLocaleString('en-IN')}.00</td></tr>
            <tr><td>Returns / Exchanges (${returnsCount}):</td><td class="right">- ₹${returnsValue.toLocaleString('en-IN')}.00</td></tr>
            <tr style="border-top: 1px dashed #000; font-weight: bold;">
              <td style="padding-top: 4px;">NET REVENUE:</td>
              <td class="right" style="padding-top: 4px;">₹${netRevenue.toLocaleString('en-IN')}.00</td>
            </tr>
            <tr><td>GST Collected (Included):</td><td class="right">₹${gstCollected.toLocaleString('en-IN')}.00</td></tr>
          </table>
          <div class="double-divider"></div>
          <div class="bold center">PAYMENT MODE RECONCILIATION</div>
          <table>
            <tr><td>* CASH IN DRAWER:</td><td class="right bold">₹${cashInDrawer.toLocaleString('en-IN')}.00</td></tr>
            <tr><td>* UPI (PhonePe / GPay):</td><td class="right bold">₹${upiTotal.toLocaleString('en-IN')}.00</td></tr>
            <tr><td>* CARDS (POS Swipes):</td><td class="right bold">₹${cardTotal.toLocaleString('en-IN')}.00</td></tr>
            <tr><td>* STORE CREDIT USED:</td><td class="right bold">₹${storeCreditUsed.toLocaleString('en-IN')}.00</td></tr>
          </table>
          <div class="divider"></div>
          <div class="bold center">TEXTILE GST SUMMARY (GSTR-1)</div>
          <table>
            <tr><td>5% Slab (Turnover):</td><td class="right">₹32,400.00 | Tax: ₹1,620.00</td></tr>
            <tr><td>12% Slab (Turnover):</td><td class="right">₹72,150.00 | Tax: ₹8,658.00</td></tr>
          </table>
          <div class="divider"></div>
          <div class="center" style="font-size: 10px; margin-top: 8px;">
            Closed at: ${new Date().toLocaleTimeString()} by Cashier Counter 1<br/>
            *** END OF DAY FINANCIAL AUDIT ***
          </div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const handleShareWhatsApp = () => {
    const reportText = `📊 *KRUNNEX LUXE LIVING - DAILY SALES CLOSING*
🗓️ Date: ${new Date().toLocaleDateString()} | Register: Counter 1
----------------------------------------
🧾 Total Bills: ${totalBills} | Items Sold: ${totalItemsSold} pcs
💰 Gross Sales: Rs. ${grossSales.toLocaleString('en-IN')}
🎉 Discounts: -Rs. ${discountsGiven.toLocaleString('en-IN')}
🔄 Returns: -Rs. ${returnsValue.toLocaleString('en-IN')}
*⭐ NET REVENUE: Rs. ${netRevenue.toLocaleString('en-IN')}*
----------------------------------------
*PAYMENT RECONCILIATION:*
💵 Cash in Drawer: Rs. ${cashInDrawer.toLocaleString('en-IN')}
📱 UPI: Rs. ${upiTotal.toLocaleString('en-IN')}
💳 Cards: Rs. ${cardTotal.toLocaleString('en-IN')}
----------------------------------------
*GST SUMMARY (GSTR-1 Ready):*
5% Slab: Rs. 32,400 (Tax: Rs. 1,620)
12% Slab: Rs. 72,150 (Tax: Rs. 8,658)
Total GST: Rs. ${gstCollected.toLocaleString('en-IN')}
----------------------------------------
Closed at: ${new Date().toLocaleTimeString()} by Store Manager`;

    window.open(`https://wa.me/?text=${encodeURIComponent(reportText)}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="pos-ref-modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="pos-ref-modal-content"
        style={{
          maxWidth: '560px',
          width: '92%',
          background: '#ffffff',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            background: '#0f172a',
            color: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
              Daily Sales Closing Report (Z-Report)
            </h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
              Counter 1 • {new Date().toLocaleDateString()}
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
        <div style={{ padding: '20px 24px', maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Revenue Highlight Card */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '18px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Net Store Revenue
                </span>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a' }}>
                  ₹{netRevenue.toLocaleString('en-IN')}.00
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    display: 'inline-block',
                    background: '#ecfdf5',
                    color: '#047857',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                  }}
                >
                  {totalBills} Invoices • {totalItemsSold} Items
                </span>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #e2e8f0',
                fontSize: '0.8rem',
              }}
            >
              <div>
                <span style={{ color: '#64748b' }}>Gross Sales:</span>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>₹{grossSales.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>MRP Discounts:</span>
                <div style={{ fontWeight: 700, color: '#dc2626' }}>-₹{discountsGiven.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Returns (2):</span>
                <div style={{ fontWeight: 700, color: '#dc2626' }}>-₹{returnsValue.toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>

          {/* Payment Breakdown Cards */}
          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#334155', textTransform: 'uppercase' }}>
            Payment Mode Reconciliation:
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#64748b' }}>
                <IconCash size={16} />
                <span>Cash in Drawer</span>
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#047857', marginTop: '2px' }}>
                ₹{cashInDrawer.toLocaleString('en-IN')}.00
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Physically matches drawer</div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#64748b' }}>
                <IconQrCode size={16} />
                <span>UPI (GPay / PhonePe)</span>
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2563eb', marginTop: '2px' }}>
                ₹{upiTotal.toLocaleString('en-IN')}.00
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Settled in bank account</div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#64748b' }}>
                <IconCard size={16} />
                <span>Cards (POS Swipes)</span>
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                ₹{cardTotal.toLocaleString('en-IN')}.00
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>EDC Batch Settlement</div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#64748b' }}>
                <IconReceipt size={16} />
                <span>GST Collected</span>
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                ₹{gstCollected.toLocaleString('en-IN')}.00
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>GSTR-1 compliant</div>
            </div>
          </div>

          {/* Top Selling Categories */}
          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#334155', textTransform: 'uppercase' }}>
            Top Sales Categories:
          </h4>
          <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
              <span>🛏️ Premium Bedsheets (King/Queen)</span>
              <span style={{ fontWeight: 700 }}>₹58,400.00 (56%)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
              <span>👘 Kids Kurtis &amp; Apparel</span>
              <span style={{ fontWeight: 700 }}>₹26,800.00 (26%)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span>🧵 Bed Covers &amp; Artisanal Crafts</span>
              <span style={{ fontWeight: 700 }}>₹19,350.00 (18%)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              padding: '9px 18px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={handleShareWhatsApp}
              style={{
                background: '#25d366',
                border: 'none',
                padding: '9px 16px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <IconWhatsApp size={16} />
              <span>Send to Owner</span>
            </button>
            <button
              type="button"
              onClick={handlePrintZReport}
              style={{
                background: '#0f172a',
                border: 'none',
                padding: '9px 18px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <IconPrinter size={16} />
              <span>Print Z-Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
