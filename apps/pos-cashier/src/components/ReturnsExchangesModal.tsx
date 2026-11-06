import React, { useState } from 'react';
import type { Product } from '../types/pos';
import { IconSync, IconCreditNote, IconPackage, IconCheckCircle } from './icons';

interface ReturnsExchangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

export const ReturnsExchangesModal: React.FC<ReturnsExchangesModalProps> = ({
  isOpen,
  onClose,
  products,
}) => {
  const [activeTab, setActiveTab] = useState<'EXCHANGE' | 'CREDIT_NOTE' | 'VENDOR_RETURN'>('EXCHANGE');

  // Customer Exchange States
  const [invoiceSearch, setInvoiceSearch] = useState<string>('INV-2026-1049');
  const [returnItemName, setReturnItemName] = useState<string>("Kids' Handblock Mulmul Kurti (Size 2-3Y)");
  const [returnItemPrice, setReturnItemPrice] = useState<number>(899);
  const [exchangeItemProdId, setExchangeItemProdId] = useState<string>(products[4]?.id || products[0]?.id || '');
  const [exchangeSuccessMsg, setExchangeSuccessMsg] = useState<string | null>(null);

  // Store Credit States
  const [creditCustomerPhone, setCreditCustomerPhone] = useState<string>('9876543210');
  const [creditAmount, setCreditAmount] = useState<string>('899');
  const [creditNoteGenerated, setCreditNoteGenerated] = useState<string | null>(null);

  // Vendor Purchase Return States
  const [vendorName, setVendorName] = useState<string>('Jaipur Handloom Mills');
  const [vendorReason, setVendorReason] = useState<string>('Fabric Dye Bleed / Weave Defect');
  const [vendorQty, setVendorQty] = useState<number>(5);
  const [vendorDebitNote, setVendorDebitNote] = useState<string | null>(null);

  const exchangeProduct = products.find((p) => p.id === exchangeItemProdId) || products[0];
  const exchangeItemPrice = exchangeProduct?.basePrice || 999;
  const differenceToPay = exchangeItemPrice - returnItemPrice;

  const handleProcessExchange = () => {
    setExchangeSuccessMsg(
      `✓ Exchange approved! Replaced "${returnItemName}" with "${exchangeProduct?.name}". Differential ${differenceToPay >= 0 ? `due: ₹${differenceToPay}` : `refund: ₹${Math.abs(differenceToPay)}`}. Stock updated.`
    );
  };

  const handleIssueCreditNote = () => {
    const code = `CN-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    setCreditNoteGenerated(code);
  };

  const handleProcessVendorReturn = () => {
    const debitCode = `DN-VEND-${Math.floor(1000 + Math.random() * 9000)}`;
    setVendorDebitNote(debitCode);
  };

  if (!isOpen) return null;

  return (
    <div className="pos-ref-modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="pos-ref-modal-content"
        style={{
          maxWidth: '600px',
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
              Returns, Size Exchanges &amp; Purchase Returns
            </h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
              Process customer size swaps or vendor defective stock debit notes
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

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('EXCHANGE')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              borderBottom: activeTab === 'EXCHANGE' ? '3px solid #0f172a' : '3px solid transparent',
              background: 'transparent',
              fontWeight: 700,
              fontSize: '0.85rem',
              color: activeTab === 'EXCHANGE' ? '#0f172a' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <IconSync size={16} />
            <span>Size / Item Exchange</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CREDIT_NOTE')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              borderBottom: activeTab === 'CREDIT_NOTE' ? '3px solid #0f172a' : '3px solid transparent',
              background: 'transparent',
              fontWeight: 700,
              fontSize: '0.85rem',
              color: activeTab === 'CREDIT_NOTE' ? '#0f172a' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <IconCreditNote size={16} />
            <span>Store Credit Note</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('VENDOR_RETURN')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              borderBottom: activeTab === 'VENDOR_RETURN' ? '3px solid #0f172a' : '3px solid transparent',
              background: 'transparent',
              fontWeight: 700,
              fontSize: '0.85rem',
              color: activeTab === 'VENDOR_RETURN' ? '#0f172a' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <IconPackage size={16} />
            <span>Vendor Purchase Return</span>
          </button>
        </div>

        {/* Tab Body */}
        <div style={{ padding: '20px 24px' }}>
          {/* TAB 1: CUSTOMER SIZE EXCHANGE */}
          {activeTab === 'EXCHANGE' && (
            <div>
              {exchangeSuccessMsg ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', color: '#10b981' }}>
                    <IconCheckCircle size={40} />
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#047857', marginBottom: '16px' }}>
                    {exchangeSuccessMsg}
                  </div>
                  <button
                    type="button"
                    onClick={() => setExchangeSuccessMsg(null)}
                    style={{
                      background: '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Process Another Exchange
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Lookup Original Bill Number / Scan Barcode:
                    </label>
                    <input
                      type="text"
                      value={invoiceSearch}
                      onChange={(e) => setInvoiceSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>

                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Item Being Returned &amp; Price:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '8px' }}>
                      <input
                        type="text"
                        value={returnItemName}
                        onChange={(e) => setReturnItemName(e.target.value)}
                        style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                      <input
                        type="number"
                        value={returnItemPrice}
                        onChange={(e) => setReturnItemPrice(parseFloat(e.target.value) || 0)}
                        style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700 }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Select Replacement Item / Size:
                    </label>
                    <select
                      value={exchangeItemProdId}
                      onChange={(e) => setExchangeItemProdId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        color: '#0f172a',
                        background: '#ffffff',
                      }}
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (₹{p.basePrice})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Differential Calculation Strip */}
                  <div
                    style={{
                      background: differenceToPay >= 0 ? '#ecfdf5' : '#fef2f2',
                      border: `1px solid ${differenceToPay >= 0 ? '#a7f3d0' : '#fecaca'}`,
                      padding: '12px 16px',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '18px',
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: differenceToPay >= 0 ? '#047857' : '#b91c1c' }}>
                      {differenceToPay >= 0 ? 'Differential Amount to Collect from Customer:' : 'Amount to Refund to Customer:'}
                    </span>
                    <span style={{ fontWeight: 900, fontSize: '1.2rem', color: differenceToPay >= 0 ? '#047857' : '#b91c1c' }}>
                      ₹{Math.abs(differenceToPay).toFixed(2)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleProcessExchange}
                    style={{
                      width: '100%',
                      background: '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      padding: '12px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                    }}
                  >
                    Confirm &amp; Issue Exchange Slip →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: STORE CREDIT NOTE */}
          {activeTab === 'CREDIT_NOTE' && (
            <div>
              {creditNoteGenerated ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', color: '#2563eb' }}>
                    <IconCreditNote size={40} />
                  </div>
                  <h3 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>Credit Note Issued!</h3>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#2563eb', fontFamily: 'monospace', margin: '8px 0' }}>
                    {creditNoteGenerated}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 16px 0' }}>
                    Amount: ₹{creditAmount} • Valid for 6 Months • Sent to {creditCustomerPhone} via WhatsApp
                  </p>
                  <button
                    type="button"
                    onClick={() => setCreditNoteGenerated(null)}
                    style={{
                      background: '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 18px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Issue Another Credit Note
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Customer Mobile Number:
                    </label>
                    <input
                      type="tel"
                      value={creditCustomerPhone}
                      onChange={(e) => setCreditCustomerPhone(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '18px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Credit Voucher Amount (₹):
                    </label>
                    <input
                      type="number"
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.95rem',
                        fontWeight: 700,
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleIssueCreditNote}
                    style={{
                      width: '100%',
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      padding: '12px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                    }}
                  >
                    Generate Store Credit Note (₹{creditAmount}) →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: VENDOR PURCHASE RETURN */}
          {activeTab === 'VENDOR_RETURN' && (
            <div>
              {vendorDebitNote ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', color: '#dc2626' }}>
                    <IconPackage size={40} />
                  </div>
                  <h3 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>Purchase Return Recorded!</h3>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#dc2626', fontFamily: 'monospace', margin: '8px 0' }}>
                    Debit Note: {vendorDebitNote}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 16px 0' }}>
                    {vendorQty} pieces returned to {vendorName}. Inventory deducted from active stock ledger.
                  </p>
                  <button
                    type="button"
                    onClick={() => setVendorDebitNote(null)}
                    style={{
                      background: '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 18px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Process Another Return
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Vendor / Textile Mill:
                    </label>
                    <input
                      type="text"
                      value={vendorName}
                      onChange={(e) => setVendorName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Return Reason:
                    </label>
                    <select
                      value={vendorReason}
                      onChange={(e) => setVendorReason(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        background: '#ffffff',
                      }}
                    >
                      <option value="Fabric Dye Bleed / Weave Defect">Fabric Dye Bleed / Weave Defect</option>
                      <option value="Damaged Packaging on Arrival">Damaged Packaging on Arrival</option>
                      <option value="Wrong Size Tagging from Factory">Wrong Size Tagging from Factory</option>
                      <option value="Excess Unsold Seasonal Consignment">Excess Unsold Seasonal Consignment</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '18px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Defective Quantity to Return (Pcs):
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={vendorQty}
                      onChange={(e) => setVendorQty(parseInt(e.target.value, 10) || 1)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleProcessVendorReturn}
                    style={{
                      width: '100%',
                      background: '#dc2626',
                      color: '#ffffff',
                      border: 'none',
                      padding: '12px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                    }}
                  >
                    Issue Vendor Debit Note &amp; Deduct Stock →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
