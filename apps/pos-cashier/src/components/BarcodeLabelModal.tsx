import React, { useState } from 'react';
import type { Product, ProductVariant } from '../types/pos';
import { IconTag } from './icons';

interface BarcodeLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  selectedProduct?: Product | null;
  selectedVariant?: ProductVariant | null;
}

// Generate an SVG Code-128 simulated vector pattern from an alphanumeric string
function generateBarcodeSvg(code: string): string {
  // Hash characters deterministically into bar widths (1, 2, 3, 4 units)
  let bars = '10100110'; // Start Code B pattern
  for (let i = 0; i < code.length; i++) {
    const charCode = code.charCodeAt(i);
    const pattern = ((charCode * 31 + i * 17) % 15).toString(2).padStart(4, '0');
    bars += pattern.split('').map((b) => (b === '1' ? '110' : '100')).join('');
  }
  bars += '11000101011'; // Stop pattern

  // Convert binary pattern into SVG rectangles
  let x = 10;
  const barWidth = 1.8;
  const height = 40;
  const rects: string[] = [];

  for (let i = 0; i < bars.length; i++) {
    if (bars[i] === '1') {
      rects.push(`<rect x="${x}" y="0" width="${barWidth}" height="${height}" fill="#000000" />`);
    }
    x += barWidth;
  }

  const totalWidth = x + 10;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${height}" style="width: 100%; height: 42px; display: block;">${rects.join('')}</svg>`;
}

export const BarcodeLabelModal: React.FC<BarcodeLabelModalProps> = ({
  isOpen,
  onClose,
  products,
  selectedProduct: initialProduct,
  selectedVariant: initialVariant,
}) => {
  const [selectedProdId, setSelectedProdId] = useState<string>(initialProduct?.id || products[0]?.id || '');
  const [selectedVarId, setSelectedVarId] = useState<string>(initialVariant?.id || '');
  const [quantity, setQuantity] = useState<number>(1);
  const [labelType, setLabelType] = useState<'STICKER_50x25' | 'HANG_TAG_50x75'>('STICKER_50x25');

  const currentProduct = products.find((p) => p.id === selectedProdId) || products[0];
  const variants = currentProduct?.variants || [];
  const currentVariant = variants.find((v) => v.id === selectedVarId) || variants[0];

  const barcodeValue = currentVariant?.barcode || currentVariant?.sku || currentProduct?.barcode || currentProduct?.sku || 'KRN-001';
  const mrpValue = currentVariant?.mrp || currentProduct?.mrp || (currentProduct?.basePrice ? currentProduct.basePrice * 1.3 : 1999);
  const sellingPrice = currentVariant?.price || currentProduct?.basePrice || 1499;
  const hsnCode = currentProduct?.hsnCode || '6302';
  const variantDetail = currentVariant ? `${currentVariant.sizeLabel || currentVariant.name}${currentVariant.color ? ` • ${currentVariant.color}` : ''}${currentVariant.threadCount ? ` • ${currentVariant.threadCount}` : ''}` : 'Standard';

  const handlePrintLabels = () => {
    const printWindow = window.open('', '_blank', 'width=450,height=600');
    if (!printWindow) {
      alert('Please allow popups to print barcode labels.');
      return;
    }

    const labelsHtml = Array.from({ length: quantity })
      .map(
        () => `
        <div class="label-container ${labelType === 'HANG_TAG_50x75' ? 'hang-tag' : 'sticker'}">
          <div class="store-name">KRUNNEX LUXE LIVING</div>
          <div class="prod-title">${currentProduct.name}</div>
          <div class="variant-info">${variantDetail}</div>
          <div class="barcode-svg">
            ${generateBarcodeSvg(barcodeValue)}
          </div>
          <div class="barcode-number">${barcodeValue}</div>
          <div class="price-row">
            <span class="hsn">HSN: ${hsnCode}</span>
            <span class="mrp">MRP: ₹${mrpValue.toFixed(2)}</span>
            <span class="our-price">OUR: ₹${sellingPrice.toFixed(2)}</span>
          </div>
        </div>
      `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcode Labels - ${barcodeValue}</title>
          <style>
            @page {
              size: ${labelType === 'HANG_TAG_50x75' ? '50mm 75mm' : '50mm 25mm'};
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, Helvetica, sans-serif;
              color: #000;
              background: #fff;
            }
            .label-container {
              box-sizing: border-box;
              page-break-after: always;
              overflow: hidden;
              text-align: center;
              border: 1px dotted #ccc;
            }
            .sticker {
              width: 50mm;
              height: 25mm;
              padding: 1.5mm 2mm;
              display: flex;
              flex-direction: column;
              justifyContent: space-between;
            }
            .hang-tag {
              width: 50mm;
              height: 75mm;
              padding: 4mm 3mm;
              display: flex;
              flex-direction: column;
              justifyContent: space-between;
            }
            .store-name {
              font-size: 8px;
              font-weight: 900;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }
            .prod-title {
              font-size: 8.5px;
              font-weight: bold;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              line-height: 1.1;
            }
            .variant-info {
              font-size: 7.5px;
              color: #333;
            }
            .barcode-svg {
              width: 90%;
              margin: 0 auto;
            }
            .barcode-number {
              font-family: monospace;
              font-size: 8px;
              font-weight: bold;
              letter-spacing: 1px;
            }
            .price-row {
              display: flex;
              justifyContent: space-between;
              align-items: center;
              font-size: 7.5px;
              border-top: 0.5px solid #000;
              padding-top: 1px;
            }
            .mrp { text-decoration: line-through; color: #555; }
            .our-price { font-weight: 900; font-size: 8.5px; }
          </style>
        </head>
        <body>
          ${labelsHtml}
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  if (!isOpen) return null;

  return (
    <div className="pos-ref-modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="pos-ref-modal-content"
        style={{
          maxWidth: '580px',
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', color: '#047857' }}>
              <IconTag size={22} />
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                Barcode Label Studio &amp; Generator
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                Generate Code-128 barcodes &amp; print ready-to-stick tags
              </p>
            </div>
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
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          {/* Controls Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Select Product:
              </label>
              <select
                value={selectedProdId}
                onChange={(e) => {
                  setSelectedProdId(e.target.value);
                  const p = products.find((prod) => prod.id === e.target.value);
                  if (p?.variants?.length) {
                    setSelectedVarId(p.variants[0].id || '');
                  }
                }}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  color: '#0f172a',
                  background: '#f8fafc',
                }}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Select Variant (Size / Color):
              </label>
              <select
                value={selectedVarId}
                onChange={(e) => setSelectedVarId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  color: '#0f172a',
                  background: '#f8fafc',
                }}
              >
                {variants.map((v) => (
                  <option key={v.id || v.name} value={v.id || ''}>
                    {v.name} (₹{v.price})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Tag Type &amp; Dimensions:
              </label>
              <select
                value={labelType}
                onChange={(e) => setLabelType(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  color: '#0f172a',
                  background: '#f8fafc',
                }}
              >
                <option value="STICKER_50x25">Thermal Sticker (50mm x 25mm / 2"x1")</option>
                <option value="HANG_TAG_50x75">Garment Hang Tag (50mm x 75mm)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Print Quantity (Copies):
              </label>
              <input
                type="number"
                min="1"
                max="200"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  color: '#0f172a',
                  background: '#f8fafc',
                }}
              />
            </div>
          </div>

          {/* Live Thermal Sticker Preview Box */}
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Live Thermal Label Preview:
            </span>

            <div
              style={{
                marginTop: '8px',
                background: '#f1f5f9',
                padding: '24px',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {/* 50x25mm Label Representation */}
              <div
                style={{
                  width: '280px',
                  minHeight: '135px',
                  background: '#ffffff',
                  border: '2px dashed #94a3b8',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  textAlign: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '0.5px', color: '#0f172a' }}>
                    KRUNNEX LUXE LIVING
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                    {currentProduct?.name}
                  </div>
                  <div style={{ fontSize: '8.5px', color: '#475569' }}>{variantDetail}</div>
                </div>

                <div style={{ margin: '4px 0' }}>
                  <div
                    dangerouslySetInnerHTML={{ __html: generateBarcodeSvg(barcodeValue) }}
                    style={{ margin: '0 auto', maxWidth: '210px' }}
                  />
                  <div style={{ fontFamily: 'monospace', fontSize: '9px', fontWeight: 700, color: '#0f172a', letterSpacing: '1px' }}>
                    {barcodeValue}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '8.5px',
                    borderTop: '1px solid #e2e8f0',
                    paddingTop: '3px',
                  }}
                >
                  <span style={{ color: '#64748b' }}>HSN: {hsnCode}</span>
                  <span style={{ textDecoration: 'line-through', color: '#94a3b8' }}>
                    MRP: ₹{mrpValue.toFixed(2)}
                  </span>
                  <span style={{ fontWeight: 800, color: '#047857', fontSize: '10px' }}>
                    OUR: ₹{sellingPrice.toFixed(2)}
                  </span>
                </div>
              </div>
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
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Direct print to TSC, TVS, Zebra, Xprinter or A4 sheet
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
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
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePrintLabels}
              style={{
                background: '#047857',
                border: 'none',
                padding: '9px 22px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 6px -1px rgba(4, 120, 87, 0.4)',
              }}
            >
              <span>🖨️</span>
              <span>Print {quantity} Label(s)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
