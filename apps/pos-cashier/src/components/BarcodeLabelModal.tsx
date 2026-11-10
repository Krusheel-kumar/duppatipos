import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Product, ProductVariant } from '../types/pos';
import { IconTag, IconCheckCircle, IconPrinter } from './icons';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

export type SheetLayoutType =
  | 'A4_24_UP' // 3 cols x 8 rows (64mm x 33.9mm) - Avery L7159 Standard
  | 'A4_30_UP' // 3 cols x 10 rows (70mm x 29.7mm)
  | 'A4_40_UP' // 4 cols x 10 rows (48.5mm x 25.4mm)
  | 'THERMAL_ROLL_50x25' // 50mm x 25mm single roll (TSC, TVS, Zebra, Xprinter)
  | 'THERMAL_ROLL_2_ACROSS' // 50mm x 25mm dual roll
  | 'HANG_TAG_50x75'; // 50mm x 75mm garment swing tag

export type BarcodeSymbology = 'CODE128' | 'QR' | 'DUAL';

interface BarcodeLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  selectedProduct?: Product | null;
  selectedVariant?: ProductVariant | null;
  initialMode?: 'BATCH' | 'SINGLE';
}

export interface BatchTagItem {
  id: string;
  productId: string;
  productName: string;
  categoryName: string;
  variantName: string;
  color?: string;
  sizeLabel?: string;
  fabric?: string;
  barcode: string;
  hsnCode: string;
  mrp: number;
  price: number;
  quantity: number;
  selected: boolean;
}

// Generate 100% compliant standard ISO/IEC 15417 Code-128 SVG barcode pattern
function generateBarcodeSvg(code: string, width = 1.6, height = 36): string {
  try {
    if (typeof document === 'undefined') return '';
    const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svgNode, code, {
      format: 'CODE128',
      lineColor: '#000000',
      width,
      height,
      displayValue: false,
      margin: 4,
      background: '#ffffff',
    });
    return new XMLSerializer().serializeToString(svgNode);
  } catch (err) {
    console.error('Failed to generate Code-128 barcode:', err);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 30"><rect width="160" height="30" fill="#eee"/><text x="10" y="20" font-family="monospace" font-size="11" fill="#333">${code}</text></svg>`;
  }
}

export const BarcodeLabelModal: React.FC<BarcodeLabelModalProps> = ({
  isOpen,
  onClose,
  products,
  selectedProduct: initialProduct,
  selectedVariant: initialVariant,
  initialMode = 'BATCH',
}) => {
  // Mode: 'BATCH' (Sheet of 10+ items) or 'SINGLE' (One quick item)
  const [activeMode, setActiveMode] = useState<'BATCH' | 'SINGLE'>(initialProduct ? 'SINGLE' : initialMode);

  // Studio Settings
  const [storeName, setStoreName] = useState<string>('KRUNNEX LUXE RETAIL');
  const [sheetLayout, setSheetLayout] = useState<SheetLayoutType>('A4_24_UP');
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeSymbology>('CODE128');
  const [showMrp, setShowMrp] = useState<boolean>(true);
  const [showHsn, setShowHsn] = useState<boolean>(true);
  const [showVariantDetails, setShowVariantDetails] = useState<boolean>(true);

  // Batch Filter & Search States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [activePreviewTab, setActivePreviewTab] = useState<'ITEMS_LIST' | 'SHEET_PREVIEW'>('ITEMS_LIST');

  // Single Item Mode States
  const [singleProdId, setSingleProdId] = useState<string>(initialProduct?.id || products[0]?.id || '');
  const [singleVarId, setSingleVarId] = useState<string>(initialVariant?.id || '');
  const [singleQuantity, setSingleQuantity] = useState<number>(1);
  const [singleQrUrl, setSingleQrUrl] = useState<string>('');

  // Cache of pre-generated QR code data URLs (code -> dataUrl)
  const qrCache = useRef<Record<string, string>>({});

  // Batch Tag Items List (All items in inventory ready for batch sheet printing)
  const [batchItems, setBatchItems] = useState<BatchTagItem[]>([]);

  // Initialize and synchronize batch items whenever products change
  useEffect(() => {
    if (!products || products.length === 0) {
      setBatchItems([]);
      return;
    }

    const items: BatchTagItem[] = [];

    products.forEach((prod) => {
      const catName = prod.category?.name || 'Textiles';
      const hsn = prod.hsnCode || '6302';
      const fabric = prod.fabric || 'Premium Textile';

      if (prod.variants && prod.variants.length > 0) {
        prod.variants.forEach((v) => {
          const barcode = v.barcode || v.sku || prod.barcode || prod.sku || `KRN-${prod.id.slice(0, 4)}-${v.id?.slice(0, 3) || '01'}`;
          const mrp = v.mrp || prod.mrp || (v.price ? v.price * 1.3 : 1999);
          const price = v.price || prod.basePrice || 1499;
          const varDesc = `${v.sizeLabel || v.name}${v.color ? ` • ${v.color}` : ''}`;

          items.push({
            id: `${prod.id}_${v.id || v.name}`,
            productId: prod.id,
            productName: prod.name,
            categoryName: catName,
            variantName: varDesc,
            color: v.color,
            sizeLabel: v.sizeLabel || v.name,
            fabric,
            barcode,
            hsnCode: hsn,
            mrp,
            price,
            quantity: 1, // Default 1 tag per product/variant
            selected: true, // Default all 10 items selected
          });
        });
      } else {
        const barcode = prod.barcode || prod.sku || `KRN-PROD-${prod.id.slice(0, 4)}`;
        const mrp = prod.mrp || (prod.basePrice ? prod.basePrice * 1.3 : 1999);
        const price = prod.basePrice || 1499;

        items.push({
          id: prod.id,
          productId: prod.id,
          productName: prod.name,
          categoryName: catName,
          variantName: 'Standard',
          fabric,
          barcode,
          hsnCode: hsn,
          mrp,
          price,
          quantity: 1,
          selected: true,
        });
      }
    });

    setBatchItems(items);
  }, [products]);

  // Synchronize initial single item selection
  useEffect(() => {
    if (initialProduct) {
      setSingleProdId(initialProduct.id);
      if (initialProduct.variants && initialProduct.variants.length > 0) {
        setSingleVarId(initialVariant?.id || initialProduct.variants[0].id || '');
      }
      setActiveMode('SINGLE');
    }
  }, [initialProduct, initialVariant]);

  // QR Code generator helper with caching
  const getQrCodeUrl = async (code: string): Promise<string> => {
    if (qrCache.current[code]) return qrCache.current[code];
    try {
      const url = await QRCode.toDataURL(code, {
        width: 120,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      });
      qrCache.current[code] = url;
      return url;
    } catch {
      return '';
    }
  };

  // Pre-generate QR code for single item view
  const currentSingleProd = products.find((p) => p.id === singleProdId) || products[0];
  const singleVariants = currentSingleProd?.variants || [];
  const currentSingleVar = singleVariants.find((v) => v.id === singleVarId) || singleVariants[0];
  const singleBarcodeValue =
    currentSingleVar?.barcode ||
    currentSingleVar?.sku ||
    currentSingleProd?.barcode ||
    currentSingleProd?.sku ||
    'KRN-BS-KNG-001';
  const singleMrpValue =
    currentSingleVar?.mrp || currentSingleProd?.mrp || (currentSingleProd?.basePrice ? currentSingleProd.basePrice * 1.3 : 1999);
  const singleSellingPrice = currentSingleVar?.price || currentSingleProd?.basePrice || 1499;
  const singleHsnCode = currentSingleProd?.hsnCode || '6302';
  const singleVariantDetail = currentSingleVar
    ? `${currentSingleVar.sizeLabel || currentSingleVar.name}${currentSingleVar.color ? ` • ${currentSingleVar.color}` : ''}`
    : 'Standard';

  useEffect(() => {
    if (singleBarcodeValue) {
      getQrCodeUrl(singleBarcodeValue).then((url) => setSingleQrUrl(url));
    }
  }, [singleBarcodeValue]);

  // Distinct categories for filter
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    batchItems.forEach((it) => set.add(it.categoryName));
    return Array.from(set);
  }, [batchItems]);

  // Filtered batch items
  const filteredBatchItems = useMemo(() => {
    return batchItems.filter((item) => {
      const matchesCat = selectedCategoryFilter === 'ALL' || item.categoryName === selectedCategoryFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.productName.toLowerCase().includes(q) ||
        item.barcode.toLowerCase().includes(q) ||
        item.variantName.toLowerCase().includes(q) ||
        item.categoryName.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [batchItems, selectedCategoryFilter, searchQuery]);

  // Batch Selection Stats
  const selectedBatchItems = batchItems.filter((i) => i.selected);
  const totalStickersCount = selectedBatchItems.reduce((sum, i) => sum + i.quantity, 0);

  // Labels per page based on layout
  const labelsPerPage = useMemo(() => {
    switch (sheetLayout) {
      case 'A4_24_UP':
        return 24;
      case 'A4_30_UP':
        return 30;
      case 'A4_40_UP':
        return 40;
      case 'THERMAL_ROLL_2_ACROSS':
        return 2;
      default:
        return 1;
    }
  }, [sheetLayout]);

  const estimatedPages = Math.max(1, Math.ceil(totalStickersCount / labelsPerPage));

  // Selection Handlers
  const handleToggleSelectAll = (select: boolean) => {
    setBatchItems((prev) => prev.map((it) => ({ ...it, selected: select })));
  };

  const handleToggleItem = (id: string) => {
    setBatchItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, selected: !it.selected } : it))
    );
  };

  const handleItemQuantityChange = (id: string, qty: number) => {
    setBatchItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, quantity: Math.max(1, qty) } : it))
    );
  };

  const handleSetAllQuantities = (qty: number) => {
    setBatchItems((prev) => prev.map((it) => ({ ...it, quantity: qty })));
  };

  // Compile full array of tag units to print
  const compileTagList = () => {
    const list: BatchTagItem[] = [];
    selectedBatchItems.forEach((item) => {
      for (let i = 0; i < item.quantity; i++) {
        list.push(item);
      }
    });
    return list;
  };

  // Print Batch Sticker Sheet
  const handlePrintBatchSheet = async () => {
    const tagsToPrint = compileTagList();
    if (tagsToPrint.length === 0) {
      alert('Please select at least one item to print barcode labels.');
      return;
    }

    // Pre-cache all QR codes if needed
    if (barcodeFormat === 'QR' || barcodeFormat === 'DUAL') {
      const uniqueCodes = Array.from(new Set(tagsToPrint.map((t) => t.barcode)));
      await Promise.all(uniqueCodes.map((c) => getQrCodeUrl(c)));
    }

    const printWindow = window.open('', '_blank', 'width=880,height=960');
    if (!printWindow) {
      alert('Please allow popups in your browser to print barcode sheets.');
      return;
    }

    // Generate individual label HTML
    const renderLabelHtml = (item: BatchTagItem) => {
      const qrUrl = qrCache.current[item.barcode] || '';
      const barcodeSvg = generateBarcodeSvg(item.barcode, 1.4, 32);

      let visualCodeHtml = '';
      if (barcodeFormat === 'QR') {
        visualCodeHtml = qrUrl
          ? `<img src="${qrUrl}" style="width: 52px; height: 52px; margin: 2px auto; display: block;" />`
          : `<div style="font-size: 9px; color: #666;">QR CODE</div>`;
      } else if (barcodeFormat === 'DUAL') {
        visualCodeHtml = `
          <div style="display: flex; align-items: center; justify-content: center; gap: 4px; margin: 1px 0;">
            <div style="flex: 1; max-width: 145px; overflow: hidden;">${barcodeSvg}</div>
            ${qrUrl ? `<img src="${qrUrl}" style="width: 32px; height: 32px; display: block;" />` : ''}
          </div>
        `;
      } else {
        visualCodeHtml = `<div style="margin: 1px auto; max-width: 175px;">${barcodeSvg}</div>`;
      }

      return `
        <div class="sticker-card">
          <div class="card-header">
            <div class="store-brand">${storeName}</div>
            <div class="prod-title">${item.productName}</div>
            ${showVariantDetails ? `<div class="variant-sub">${item.variantName}</div>` : ''}
          </div>

          <div class="barcode-area">
            ${visualCodeHtml}
            <div class="barcode-num">${item.barcode}</div>
          </div>

          <div class="card-footer">
            ${showHsn ? `<span class="hsn-tag">HSN: ${item.hsnCode}</span>` : '<span></span>'}
            <div class="price-box">
              ${showMrp ? `<span class="mrp-price">₹${item.mrp.toFixed(0)}</span>` : ''}
              <span class="sale-price">₹${item.price.toFixed(0)}</span>
            </div>
          </div>
        </div>
      `;
    };

    let pagesHtml = '';

    if (sheetLayout === 'A4_24_UP' || sheetLayout === 'A4_30_UP' || sheetLayout === 'A4_40_UP') {
      // Chunk into pages
      const perPage = sheetLayout === 'A4_24_UP' ? 24 : sheetLayout === 'A4_30_UP' ? 30 : 40;
      const totalPages = Math.ceil(tagsToPrint.length / perPage);

      for (let p = 0; p < totalPages; p++) {
        const pageItems = tagsToPrint.slice(p * perPage, (p + 1) * perPage);
        const labelsHtml = pageItems.map(renderLabelHtml).join('');
        const gridClass =
          sheetLayout === 'A4_24_UP' ? 'grid-24' : sheetLayout === 'A4_30_UP' ? 'grid-30' : 'grid-40';

        pagesHtml += `
          <div class="a4-page ${gridClass}">
            ${labelsHtml}
          </div>
        `;
      }
    } else {
      // Continuous roll / hang tag
      pagesHtml = tagsToPrint
        .map(
          (item) => `
          <div class="single-roll-item ${sheetLayout === 'HANG_TAG_50x75' ? 'hang-tag-size' : 'sticker-size'}">
            ${renderLabelHtml(item)}
          </div>
        `
        )
        .join('');
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcode Sheet - ${tagsToPrint.length} Labels</title>
          <style>
            @page {
              size: ${sheetLayout === 'HANG_TAG_50x75' ? '50mm 75mm' : sheetLayout.startsWith('THERMAL') ? '50mm 25mm' : 'A4 portrait'};
              margin: ${sheetLayout.startsWith('A4') ? '8mm 6mm' : '0'};
            }
            * {
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #000000;
              background: #ffffff;
            }
            .a4-page {
              width: 198mm;
              height: 280mm;
              margin: 0 auto;
              page-break-after: always;
              display: grid;
              gap: 2.5mm 3mm;
            }
            .grid-24 {
              grid-template-columns: repeat(3, 63.5mm);
              grid-template-rows: repeat(8, 32.5mm);
            }
            .grid-30 {
              grid-template-columns: repeat(3, 63.5mm);
              grid-template-rows: repeat(10, 26mm);
            }
            .grid-40 {
              grid-template-columns: repeat(4, 47mm);
              grid-template-rows: repeat(10, 26mm);
            }
            .sticker-card {
              width: 100%;
              height: 100%;
              border: 0.5px dashed #cbd5e1;
              border-radius: 4px;
              padding: 1.5mm 2mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              text-align: center;
              overflow: hidden;
              background: #ffffff;
              page-break-inside: avoid;
            }
            .single-roll-item {
              page-break-after: always;
              overflow: hidden;
            }
            .sticker-size {
              width: 50mm;
              height: 25mm;
              padding: 1.5mm;
            }
            .hang-tag-size {
              width: 50mm;
              height: 75mm;
              padding: 3mm 2mm;
            }
            .store-brand {
              font-size: 7.5px;
              font-weight: 900;
              letter-spacing: 0.6px;
              text-transform: uppercase;
              color: #000;
              line-height: 1;
            }
            .prod-title {
              font-size: 8.5px;
              font-weight: 800;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              line-height: 1.2;
              margin-top: 1px;
            }
            .variant-sub {
              font-size: 7px;
              color: #333;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              line-height: 1;
            }
            .barcode-area {
              margin: 1px 0;
            }
            .barcode-area svg {
              display: block;
              margin: 0 auto;
              width: 100%;
              height: auto;
              max-height: 26px;
            }
            .barcode-num {
              font-family: 'Courier New', Courier, monospace;
              font-size: 7.5px;
              font-weight: 700;
              letter-spacing: 0.8px;
              line-height: 1.1;
            }
            .card-footer {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-top: 0.5px solid #000;
              padding-top: 1px;
              font-size: 7.5px;
              line-height: 1.1;
            }
            .hsn-tag {
              font-size: 6.8px;
              color: #444;
            }
            .price-box {
              display: flex;
              align-items: center;
              gap: 4px;
            }
            .mrp-price {
              text-decoration: line-through;
              color: #666;
              font-size: 7px;
            }
            .sale-price {
              font-weight: 900;
              font-size: 9px;
            }
          </style>
        </head>
        <body>
          ${pagesHtml}
          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  // Print Single Label
  const handlePrintSingleLabel = () => {
    const item: BatchTagItem = {
      id: singleProdId,
      productId: singleProdId,
      productName: currentSingleProd?.name || 'Product',
      categoryName: currentSingleProd?.category?.name || 'Textiles',
      variantName: singleVariantDetail,
      barcode: singleBarcodeValue,
      hsnCode: singleHsnCode,
      mrp: singleMrpValue,
      price: singleSellingPrice,
      quantity: singleQuantity,
      selected: true,
    };

    const printWindow = window.open('', '_blank', 'width=450,height=600');
    if (!printWindow) {
      alert('Please allow popups to print barcode labels.');
      return;
    }

    const barcodeSvg = generateBarcodeSvg(singleBarcodeValue, 1.8, 42);
    const visualCodeHtml =
      barcodeFormat === 'QR'
        ? `<img src="${singleQrUrl}" style="width: 58px; height: 58px; margin: 2px auto; display: block;" />`
        : barcodeFormat === 'DUAL'
        ? `<div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
             <div style="flex: 1; max-width: 160px;">${barcodeSvg}</div>
             <img src="${singleQrUrl}" style="width: 38px; height: 38px; display: block;" />
           </div>`
        : `<div style="margin: 2px 0;">${barcodeSvg}</div>`;

    const labelsHtml = Array.from({ length: singleQuantity })
      .map(
        () => `
        <div class="label-container ${sheetLayout === 'HANG_TAG_50x75' ? 'hang-tag' : 'sticker'}">
          <div class="store-name">${storeName}</div>
          <div class="prod-title">${item.productName}</div>
          <div class="variant-info">${item.variantName}</div>
          <div class="barcode-svg">${visualCodeHtml}</div>
          <div class="barcode-number">${item.barcode}</div>
          <div class="price-row">
            <span class="hsn">HSN: ${item.hsnCode}</span>
            <span class="mrp">MRP: ₹${item.mrp.toFixed(0)}</span>
            <span class="our-price">OUR: ₹${item.price.toFixed(0)}</span>
          </div>
        </div>
      `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Label - ${singleBarcodeValue}</title>
          <style>
            @page {
              size: ${sheetLayout === 'HANG_TAG_50x75' ? '50mm 75mm' : '50mm 25mm'};
              margin: 0;
            }
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; color: #000; background: #fff; }
            .label-container {
              box-sizing: border-box;
              page-break-after: always;
              overflow: hidden;
              text-align: center;
              border: 0.5px dashed #ccc;
            }
            .sticker { width: 50mm; height: 25mm; padding: 1.5mm 2mm; display: flex; flex-direction: column; justify-content: space-between; }
            .hang-tag { width: 50mm; height: 75mm; padding: 4mm 3mm; display: flex; flex-direction: column; justify-content: space-between; }
            .store-name { font-size: 8px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; }
            .prod-title { font-size: 8.5px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.1; }
            .variant-info { font-size: 7.5px; color: #333; }
            .barcode-svg { width: 90%; margin: 0 auto; }
            .barcode-number { font-family: monospace; font-size: 8px; font-weight: bold; letter-spacing: 1px; }
            .price-row { display: flex; justify-content: space-between; align-items: center; font-size: 7.5px; border-top: 0.5px solid #000; padding-top: 1px; }
            .mrp { text-decoration: line-through; color: #555; }
            .our-price { font-weight: 900; font-size: 8.5px; }
          </style>
        </head>
        <body>
          ${labelsHtml}
          <script>
            window.onload = function() { window.focus(); window.print(); };
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
          maxWidth: '920px',
          width: '95%',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Header with Mode Switcher */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#ecfdf5',
                color: '#059669',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconTag size={22} />
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 800, color: '#0f172a' }}>
                Barcode Label Studio &amp; Generator
              </h3>
              <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b' }}>
                Auto-align &amp; batch print barcode sticker sheets for inventory items
              </p>
            </div>
          </div>

          {/* Mode Switch Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                background: '#e2e8f0',
                padding: '3px',
                borderRadius: '8px',
                gap: '2px',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveMode('BATCH')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: activeMode === 'BATCH' ? '#ffffff' : 'transparent',
                  color: activeMode === 'BATCH' ? '#047857' : '#475569',
                  boxShadow: activeMode === 'BATCH' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                📑 Batch Label Sheet (All Items)
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('SINGLE')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: activeMode === 'SINGLE' ? '#ffffff' : 'transparent',
                  color: activeMode === 'SINGLE' ? '#047857' : '#475569',
                  boxShadow: activeMode === 'SINGLE' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                🏷️ Single Item Tag
              </button>
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
                padding: '4px 8px',
              }}
              title="Close Studio"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Global Configuration Bar */}
        <div
          style={{
            padding: '10px 20px',
            background: '#ffffff',
            borderBottom: '1px solid #f1f5f9',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
              Sheet / Paper Format:
            </label>
            <select
              value={sheetLayout}
              onChange={(e) => setSheetLayout(e.target.value as SheetLayoutType)}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#0f172a',
                background: '#f8fafc',
              }}
            >
              <option value="A4_24_UP">📄 A4 Sticker Sheet (24-Up • 3×8 Grid)</option>
              <option value="A4_30_UP">📄 A4 Sticker Sheet (30-Up • 3×10 Grid)</option>
              <option value="A4_40_UP">📄 A4 Sticker Sheet (40-Up • 4×10 Grid)</option>
              <option value="THERMAL_ROLL_50x25">🖨️ Continuous Thermal Roll (50×25mm)</option>
              <option value="HANG_TAG_50x75">🏷️ Garment Swing Tag (50×75mm)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
              Barcode Symbology:
            </label>
            <select
              value={barcodeFormat}
              onChange={(e) => setBarcodeFormat(e.target.value as BarcodeSymbology)}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#0f172a',
                background: '#f8fafc',
              }}
            >
              <option value="CODE128">Standard 1D Barcode (Code-128)</option>
              <option value="QR">2D QR Code (Fastest Mobile Focus)</option>
              <option value="DUAL">Dual (1D Barcode + 2D QR Code)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
              Store Name on Tag:
            </label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Store Name"
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#0f172a',
                background: '#f8fafc',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', paddingTop: '14px' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#475569', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showMrp}
                onChange={(e) => setShowMrp(e.target.checked)}
                style={{ accentColor: '#059669' }}
              />
              <span>MRP</span>
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#475569', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showHsn}
                onChange={(e) => setShowHsn(e.target.checked)}
                style={{ accentColor: '#059669' }}
              />
              <span>HSN</span>
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#475569', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showVariantDetails}
                onChange={(e) => setShowVariantDetails(e.target.checked)}
                style={{ accentColor: '#059669' }}
              />
              <span>Color/Size</span>
            </label>
          </div>
        </div>

        {/* Modal Main Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', background: '#fafafa' }}>
          {activeMode === 'BATCH' ? (
            /* ============================================================== */
            /* BATCH PRINTING MODE                                            */
            /* ============================================================== */
            <div>
              {/* Toolbar: Selection & Bulk Controls */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  marginBottom: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(true)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      cursor: 'pointer',
                    }}
                  >
                    Select All ({batchItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(false)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      color: '#64748b',
                      cursor: 'pointer',
                    }}
                  >
                    Deselect All
                  </button>

                  <div style={{ height: '16px', width: '1px', background: '#cbd5e1', margin: '0 4px' }} />

                  <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Set Qty:</span>
                  <button
                    type="button"
                    onClick={() => handleSetAllQuantities(1)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    1 Each
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAllQuantities(2)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    2 Each
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAllQuantities(5)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    5 Each
                  </button>
                </div>

                {/* Sub View Toggle: Items Table vs Live Sheet Preview */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search item / barcode..."
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.76rem',
                      width: '170px',
                    }}
                  />
                  {categoriesList.length > 1 && (
                    <select
                      value={selectedCategoryFilter}
                      onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                      style={{
                        padding: '5px 8px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.76rem',
                        background: '#f8fafc',
                      }}
                    >
                      <option value="ALL">All Categories</option>
                      {categoriesList.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      background: '#f1f5f9',
                      padding: '2px',
                      borderRadius: '6px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setActivePreviewTab('ITEMS_LIST')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        border: 'none',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: activePreviewTab === 'ITEMS_LIST' ? '#047857' : 'transparent',
                        color: activePreviewTab === 'ITEMS_LIST' ? '#ffffff' : '#64748b',
                      }}
                    >
                      Items ({filteredBatchItems.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePreviewTab('SHEET_PREVIEW')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        border: 'none',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: activePreviewTab === 'SHEET_PREVIEW' ? '#047857' : 'transparent',
                        color: activePreviewTab === 'SHEET_PREVIEW' ? '#ffffff' : '#64748b',
                      }}
                    >
                      Live Sheet Preview
                    </button>
                  </div>
                </div>
              </div>

              {/* View 1: Items Selection Table */}
              {activePreviewTab === 'ITEMS_LIST' ? (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    overflow: 'hidden',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '8px 12px', width: '38px', textAlign: 'center' }}>✓</th>
                        <th style={{ padding: '8px 12px' }}>Product &amp; Category</th>
                        <th style={{ padding: '8px 12px' }}>Color / Variant</th>
                        <th style={{ padding: '8px 12px' }}>Barcode / SKU</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>MRP / Sale Price</th>
                        <th style={{ padding: '8px 12px', width: '130px', textAlign: 'center' }}>Tag Copies</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBatchItems.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                            No products match search criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredBatchItems.map((item) => (
                          <tr
                            key={item.id}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              background: item.selected ? '#ffffff' : '#fcfcfc',
                              opacity: item.selected ? 1 : 0.65,
                            }}
                          >
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={item.selected}
                                onChange={() => handleToggleItem(item.id)}
                                style={{ accentColor: '#059669', width: '15px', height: '15px', cursor: 'pointer' }}
                              />
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.productName}</div>
                              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{item.categoryName}</div>
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <div style={{ color: '#334155' }}>{item.variantName}</div>
                              {item.fabric && <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{item.fabric}</div>}
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <div
                                style={{
                                  fontFamily: 'monospace',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  color: '#0f172a',
                                  background: '#f1f5f9',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  display: 'inline-block',
                                }}
                              >
                                {item.barcode}
                              </div>
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                              <div style={{ fontWeight: 800, color: '#047857' }}>₹{item.price.toFixed(0)}</div>
                              {item.mrp > item.price && (
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                                  ₹{item.mrp.toFixed(0)}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '6px',
                                  background: '#ffffff',
                                  overflow: 'hidden',
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleItemQuantityChange(item.id, item.quantity - 1)}
                                  disabled={!item.selected || item.quantity <= 1}
                                  style={{
                                    border: 'none',
                                    background: '#f8fafc',
                                    padding: '4px 8px',
                                    cursor: item.quantity <= 1 ? 'not-allowed' : 'pointer',
                                    fontSize: '0.8rem',
                                    color: '#475569',
                                  }}
                                >
                                  -
                                </button>
                                <span
                                  style={{
                                    padding: '2px 10px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    color: '#0f172a',
                                    minWidth: '24px',
                                    textAlign: 'center',
                                  }}
                                >
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleItemQuantityChange(item.id, item.quantity + 1)}
                                  disabled={!item.selected}
                                  style={{
                                    border: 'none',
                                    background: '#f8fafc',
                                    padding: '4px 8px',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    color: '#475569',
                                  }}
                                >
                                  +
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* View 2: Live Sheet Alignment Preview */
                <div
                  style={{
                    background: '#e2e8f0',
                    padding: '20px',
                    borderRadius: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 700, marginBottom: '8px' }}>
                    Live A4 Sticker Alignment Preview (3 Columns × 8 Rows = 24 Labels/Page)
                  </div>

                  {/* Scaled A4 Sheet Representation */}
                  <div
                    style={{
                      width: '680px',
                      background: '#ffffff',
                      borderRadius: '6px',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
                      padding: '16px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '8px',
                    }}
                  >
                    {compileTagList()
                      .slice(0, 24)
                      .map((item, idx) => (
                        <div
                          key={`${item.id}_${idx}`}
                          style={{
                            border: '1px dashed #94a3b8',
                            borderRadius: '4px',
                            padding: '6px 8px',
                            background: '#fafafa',
                            minHeight: '75px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            textAlign: 'center',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '7px', fontWeight: 900, color: '#0f172a' }}>{storeName}</div>
                            <div
                              style={{
                                fontSize: '8px',
                                fontWeight: 800,
                                color: '#0f172a',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {item.productName}
                            </div>
                            <div style={{ fontSize: '6.8px', color: '#64748b' }}>{item.variantName}</div>
                          </div>

                          <div style={{ margin: '2px 0' }}>
                            <div
                              dangerouslySetInnerHTML={{ __html: generateBarcodeSvg(item.barcode, 1.2, 22) }}
                              style={{ margin: '0 auto', maxWidth: '140px' }}
                            />
                            <div style={{ fontFamily: 'monospace', fontSize: '7px', fontWeight: 700 }}>
                              {item.barcode}
                            </div>
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: '6.8px',
                              borderTop: '0.5px solid #cbd5e1',
                              paddingTop: '1px',
                            }}
                          >
                            <span style={{ color: '#64748b' }}>HSN: {item.hsnCode}</span>
                            <span style={{ fontWeight: 800, color: '#047857' }}>₹{item.price.toFixed(0)}</span>
                          </div>
                        </div>
                      ))}

                    {/* Empty Slots Fillers */}
                    {Array.from({ length: Math.max(0, 24 - compileTagList().length) })
                      .slice(0, 6)
                      .map((_, i) => (
                        <div
                          key={`empty_${i}`}
                          style={{
                            border: '1px dotted #e2e8f0',
                            borderRadius: '4px',
                            padding: '6px',
                            background: '#fcfcfc',
                            minHeight: '75px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#cbd5e1',
                            fontSize: '0.72rem',
                          }}
                        >
                          Slot #{compileTagList().length + i + 1}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ============================================================== */
            /* SINGLE PRODUCT TAG MODE                                        */
            /* ============================================================== */
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Select Product:
                  </label>
                  <select
                    value={singleProdId}
                    onChange={(e) => {
                      setSingleProdId(e.target.value);
                      const p = products.find((prod) => prod.id === e.target.value);
                      if (p?.variants?.length) {
                        setSingleVarId(p.variants[0].id || '');
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      background: '#ffffff',
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
                    Select Variant:
                  </label>
                  <select
                    value={singleVarId}
                    onChange={(e) => setSingleVarId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      background: '#ffffff',
                    }}
                  >
                    {singleVariants.map((v) => (
                      <option key={v.id || v.name} value={v.id || ''}>
                        {v.name} (₹{v.price})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Tag Copies to Print:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={singleQuantity}
                    onChange={(e) => setSingleQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      background: '#ffffff',
                    }}
                  />
                </div>
              </div>

              {/* Single Tag Visual Preview */}
              <div
                style={{
                  background: '#f1f5f9',
                  padding: '24px',
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: '300px',
                    minHeight: '140px',
                    background: '#ffffff',
                    border: '2px dashed #94a3b8',
                    borderRadius: '6px',
                    padding: '12px 16px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    textAlign: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '9px', fontWeight: 900, color: '#0f172a' }}>{storeName}</div>
                    <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                      {currentSingleProd?.name}
                    </div>
                    <div style={{ fontSize: '8.5px', color: '#475569' }}>{singleVariantDetail}</div>
                  </div>

                  <div style={{ margin: '4px 0' }}>
                    {barcodeFormat === 'QR' ? (
                      singleQrUrl ? (
                        <img
                          src={singleQrUrl}
                          alt="QR Code"
                          style={{ width: '65px', height: '65px', margin: '0 auto', display: 'block' }}
                        />
                      ) : (
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>Generating QR...</div>
                      )
                    ) : barcodeFormat === 'DUAL' ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <div
                          dangerouslySetInnerHTML={{ __html: generateBarcodeSvg(singleBarcodeValue, 1.4, 34) }}
                          style={{ flex: 1, maxWidth: '170px' }}
                        />
                        {singleQrUrl && (
                          <img src={singleQrUrl} alt="QR Code" style={{ width: '40px', height: '40px', display: 'block' }} />
                        )}
                      </div>
                    ) : (
                      <div
                        dangerouslySetInnerHTML={{ __html: generateBarcodeSvg(singleBarcodeValue, 1.6, 38) }}
                        style={{ margin: '0 auto', maxWidth: '220px' }}
                      />
                    )}
                    <div style={{ fontFamily: 'monospace', fontSize: '9.5px', fontWeight: 700, color: '#0f172a' }}>
                      {singleBarcodeValue}
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
                    <span style={{ color: '#64748b' }}>HSN: {singleHsnCode}</span>
                    <span style={{ textDecoration: 'line-through', color: '#94a3b8' }}>
                      MRP: ₹{singleMrpValue.toFixed(0)}
                    </span>
                    <span style={{ fontWeight: 800, color: '#047857', fontSize: '10.5px' }}>
                      OUR: ₹{singleSellingPrice.toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with 1-Click Print Action */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          {activeMode === 'BATCH' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#ecfdf5',
                  color: '#065f46',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                }}
              >
                <IconCheckCircle size={15} />
                <span>
                  {selectedBatchItems.length} Products Selected • {totalStickersCount} Total Stickers ({estimatedPages} Page{estimatedPages > 1 ? 's' : ''})
                </span>
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Grid: {sheetLayout.replace('_', ' ')}
              </span>
            </div>
          ) : (
            <div style={{ fontSize: '0.8rem', color: '#475569' }}>
              Single Tag: <strong>{currentSingleProd?.name}</strong> ({singleQuantity} copy)
            </div>
          )}

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

            {activeMode === 'BATCH' ? (
              <button
                type="button"
                onClick={handlePrintBatchSheet}
                disabled={totalStickersCount === 0}
                style={{
                  background: totalStickersCount === 0 ? '#cbd5e1' : 'linear-gradient(135deg, #047857 0%, #059669 100%)',
                  border: 'none',
                  padding: '9px 24px',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  cursor: totalStickersCount === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: totalStickersCount === 0 ? 'none' : '0 4px 12px rgba(4, 120, 87, 0.35)',
                }}
              >
                <IconPrinter size={16} />
                <span>Print {totalStickersCount} Label(s) (Batch Sheet)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePrintSingleLabel}
                style={{
                  background: 'linear-gradient(135deg, #047857 0%, #059669 100%)',
                  border: 'none',
                  padding: '9px 24px',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(4, 120, 87, 0.35)',
                }}
              >
                <IconPrinter size={16} />
                <span>Print {singleQuantity} Label(s)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
