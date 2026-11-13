import type { OrderType } from '../types/pos';

export interface KOTPrintData {
  orderNumber: string;
  orderType: OrderType;
  tableNumber?: string;
  items: Array<{
    name: string;
    variantName?: string;
    addOns?: string[];
    quantity: number;
    notes?: string;
  }>;
  customerNotes?: string;
  serverName?: string;
  createdAt?: string;
  kotNumber?: string;
}

export interface CustomerBillPrintData {
  orderNumber: string;
  orderType: OrderType;
  tableNumber?: string;
  invoiceNumber?: string;
  createdAt: string;
  items: Array<{
    name: string;
    variantName?: string;
    quantity: number;
    unitPrice?: number;
    lineTotal: number;
  }>;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  payments: Array<{
    method: string;
    amount: number;
    status: string;
    transactionRef?: string;
  }>;
  amountPaid: number;
  balanceDue: number;
  outletName?: string;
  outletAddress?: string;
}

/**
 * Print receipt HTML using a hidden in-page <iframe> to eliminate annoying pop-up windows.
 * In Chrome/Edge retail POS (--kiosk-printing), this prints silently with zero dialogs!
 */
export function printHtmlViaHiddenIframe(htmlContent: string): void {
  try {
    if (typeof document === 'undefined') return;

    let iframe = document.getElementById('krunnex-silent-print-frame') as HTMLIFrameElement | null;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'krunnex-silent-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.border = 'none';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        try {
          iframe?.contentWindow?.focus();
          iframe?.contentWindow?.print();
        } catch {
          // Ignore
        }
      }, 250);
      return;
    }
  } catch (err) {
    console.warn('Hidden iframe print failed, falling back:', err);
  }

  // Graceful fallback to window.open if iframe is blocked
  try {
    const printWindow = window.open('', '_blank', 'width=420,height=650');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  } catch {
    // ignore
  }
}

/**
 * Print Kitchen Order Ticket (KOT)
 * STRICTLY NO PRICES, NO TAXES, NO FINANCIALS.
 * Only kitchen preparation details: Table, Order #, Time, Items, Variants, Notes, Quantities.
 */
export async function printKOT(data: KOTPrintData): Promise<void> {
  // 1. Attempt Direct Hardware Thermal Printer (WebUSB / WebSerial)
  try {
    const { buildKOTESCPOS, sendRawToPrinter, getThermalPrinterConfig } = await import('../services/thermalPrinterService');
    const config = getThermalPrinterConfig();
    if (config.connection !== 'BROWSER_POPUP') {
      const bytes = buildKOTESCPOS(data, config);
      const printed = await sendRawToPrinter(bytes);
      if (printed) {
        return; // Successfully printed directly to physical thermal printer!
      }
    }
  } catch (err) {
    console.warn('Direct thermal print for KOT failed or not connected, falling back to browser dialog:', err);
  }

  // 2. Fallback to Browser Print Window
  const printWindow = window.open('', '_blank', 'width=380,height=580');
  if (!printWindow) {
    alert('Please allow popups in your browser to print KOT.');
    return;
  }

  const timeStr = data.createdAt ? new Date(data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = data.createdAt ? new Date(data.createdAt).toLocaleDateString() : new Date().toLocaleDateString();

  const itemsHtml = data.items
    .map(
      (item) => `
      <tr style="border-bottom: 1px dotted #ccc;">
        <td style="padding: 6px 0; font-size: 15px; font-weight: bold; width: 40px; vertical-align: top;">
          ${item.quantity}x
        </td>
        <td style="padding: 6px 0; vertical-align: top;">
          <div style="font-size: 15px; font-weight: bold; color: #000;">${item.name}</div>
          ${item.variantName ? `<div style="font-size: 13px; color: #333;">Size: ${item.variantName}</div>` : ''}
          ${item.addOns && item.addOns.length > 0 ? `<div style="font-size: 12px; color: #555;">+ ${item.addOns.join(', ')}</div>` : ''}
          ${item.notes ? `<div style="font-size: 12px; font-weight: bold; color: #b45309; background: #fef3c7; padding: 2px 4px; border-radius: 3px; display: inline-block; margin-top: 2px;">★ Note: ${item.notes}</div>` : ''}
        </td>
      </tr>
    `
    )
    .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>KOT #${data.orderNumber}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          html, body {
            margin: 0;
            padding: 4mm 3mm 18mm 3mm;
            width: 74mm;
            font-family: 'Courier New', Courier, monospace;
            font-size: 13px;
            color: #000;
            line-height: 1.3;
          }
          .kot-badge {
            text-align: center;
            font-size: 16px;
            font-weight: 900;
            border: 2px solid #000;
            padding: 4px;
            margin-bottom: 8px;
            letter-spacing: 1px;
          }
          .info-table {
            width: 100%;
            margin-bottom: 8px;
            font-size: 13px;
          }
          .info-table td {
            padding: 2px 0;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 8px 0;
          }
          .double-divider {
            border-top: 2px solid #000;
            margin: 8px 0;
          }
          table.items-table {
            width: 100%;
            border-collapse: collapse;
          }
          .special-instructions {
            margin-top: 10px;
            padding: 6px;
            border: 1px solid #000;
            font-size: 13px;
          }
          .footer-time {
            text-align: center;
            font-size: 11px;
            margin-top: 12px;
          }
        </style>
      </head>
      <body>
        <div class="kot-badge">*** KITCHEN ORDER TICKET (KOT) ***</div>
        
        <table class="info-table">
          <tr>
            <td><strong>ORDER:</strong> #${data.orderNumber}</td>
            <td style="text-align: right;"><strong>TYPE:</strong> ${data.orderType.replace('_', ' ')}</td>
          </tr>
          <tr>
            <td><strong>TABLE:</strong> ${data.tableNumber ? `Table ${data.tableNumber}` : 'Takeaway / Counter'}</td>
            <td style="text-align: right;"><strong>TIME:</strong> ${timeStr}</td>
          </tr>
          <tr>
            <td><strong>SERVER:</strong> ${data.serverName || 'Staff'}</td>
            <td style="text-align: right;"><strong>DATE:</strong> ${dateStr}</td>
          </tr>
        </table>

        <div class="double-divider"></div>

        <table class="items-table">
          <thead>
            <tr style="border-bottom: 1px solid #000; text-align: left;">
              <th style="padding-bottom: 4px; width: 40px;">QTY</th>
              <th style="padding-bottom: 4px;">ITEM &amp; SPECIFICATIONS</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        ${
          data.customerNotes
            ? `
          <div class="special-instructions">
            <strong>KITCHEN / CUSTOMER INSTRUCTIONS:</strong><br/>
            ${data.customerNotes}
          </div>
        `
            : ''
        }

        <div class="divider"></div>
        <div class="footer-time">Printed for Kitchen Display • Krunnex POS</div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

/**
 * Print Official Customer Bill / Tax Invoice / Payment Receipt
 * Shows all financial details, GST taxes, discounts, totals, and payment records.
 */
export async function printCustomerBill(
  data: CustomerBillPrintData,
  options: { allowBrowserPrintDialog?: boolean } = { allowBrowserPrintDialog: true }
): Promise<boolean> {
  const allowBrowserPrintDialog = options?.allowBrowserPrintDialog ?? true;

  // 1. Attempt Direct Hardware Thermal Printer (WebUSB / WebSerial)
  try {
    const { buildCustomerBillESCPOS, sendRawToPrinter, getThermalPrinterConfig } = await import('../services/thermalPrinterService');
    const config = getThermalPrinterConfig();
    if (config.connection !== 'BROWSER_POPUP') {
      const bytes = buildCustomerBillESCPOS(data, config);
      const printed = await sendRawToPrinter(bytes);
      if (printed) {
        return true; // Successfully printed directly to physical thermal printer!
      }
    }
  } catch (err) {
    console.warn('Direct thermal print for customer bill failed or not connected, falling back to browser dialog:', err);
  }

  // If browser dialog is disabled, do not trigger OS dialog
  if (!allowBrowserPrintDialog) {
    return false;
  }

  // 2. Render bill HTML and dispatch via invisible iframe
  const isPaid = data.balanceDue <= 0.01;
  const itemsHtml = data.items
    .map(
      (item) => `
      <tr style="border-bottom: 1px dotted #000;">
        <td style="padding: 6px 0; vertical-align: top; font-weight: 800; font-size: 14.5px; color: #000;">
          <span style="font-weight: 950; font-size: 15px;">${item.quantity}x</span> ${item.name}
          ${item.variantName ? `<div style="font-size: 12.5px; font-weight: 700; color: #000;">• ${item.variantName}</div>` : ''}
        </td>
        <td style="text-align: right; padding: 6px 0; vertical-align: top; white-space: nowrap; font-weight: 950; font-size: 15px; color: #000;">
          ₹${item.lineTotal.toFixed(2)}
        </td>
      </tr>
    `
    )
    .join('');

  const paymentsHtml = data.payments.length > 0
    ? data.payments
        .map(
          (p) => `
        <tr style="font-weight: 800;">
          <td style="padding: 3px 0; color: #000;">Paid via ${p.method}${p.transactionRef ? ` (${p.transactionRef})` : ''}:</td>
          <td style="text-align: right; padding: 3px 0; font-weight: 950; color: #000;">₹${p.amount.toFixed(2)}</td>
        </tr>
      `
        )
        .join('')
    : '<tr><td colspan="2" style="padding: 3px 0; font-weight: 800; color: #000;">No payment recorded yet</td></tr>';

  const billHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice #${data.invoiceNumber || data.orderNumber}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          html, body {
            margin: 0;
            padding: 4mm 3mm 20mm 3mm;
            width: 74mm;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 14.5px;
            font-weight: 700;
            color: #000000;
            line-height: 1.35;
          }
          .center { text-align: center; }
          .bold { font-weight: 900; }
          .outlet-name {
            font-size: 28px;
            font-weight: 950;
            letter-spacing: 0.08em;
            color: #000000;
            text-transform: uppercase;
            margin-bottom: 2px;
            line-height: 1.1;
          }
          .outlet-sub {
            font-size: 13px;
            font-weight: 800;
            color: #000000;
            margin-bottom: 4px;
          }
          .bill-title {
            font-size: 16px;
            font-weight: 950;
            color: #000000;
            border-top: 2.5px solid #000000;
            border-bottom: 2.5px solid #000000;
            padding: 5px 0;
            margin: 8px 0;
            letter-spacing: 0.05em;
          }
          .divider { border-top: 2px dashed #000000; margin: 8px 0; }
          .double-divider { border-top: 3px solid #000000; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; color: #000000; }
          .totals-table td { padding: 4px 0; font-size: 14.5px; font-weight: 800; }
          .grand-total {
            font-size: 18.5px;
            font-weight: 950;
            color: #000000;
            border-top: 2.5px solid #000000;
            border-bottom: 2.5px solid #000000;
          }
          .balance-due {
            font-size: 15px;
            font-weight: 900;
          }
          .status-stamp {
            text-align: center;
            font-size: 16px;
            font-weight: 950;
            padding: 6px;
            margin: 12px 0;
            border: 3px solid #000000;
            color: #000000;
            letter-spacing: 0.05em;
          }
          .footer-msg {
            text-align: center;
            font-size: 13px;
            font-weight: 800;
            color: #000000;
            margin-top: 14px;
            line-height: 1.4;
          }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="outlet-name">${data.outletName || "DUPPATI"}</div>
          <div class="outlet-sub">${data.outletAddress || 'Textiles & Boutiques • Flagship Store'}</div>
          <div style="font-size: 13px; font-weight: 800;">GSTIN: 36AABCU9603R1ZM</div>
          <div class="bill-title">${isPaid ? 'TAX INVOICE & CASH MEMO' : 'BILL ESTIMATE (UNPAID)'}</div>
        </div>

        <table style="margin: 6px 0; font-size: 13.5px; font-weight: 800;">
          <tr>
            <td><strong>Invoice:</strong> #${data.invoiceNumber || data.orderNumber}</td>
            <td style="text-align: right;"><strong>Date:</strong> ${new Date(data.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
          </tr>
          <tr>
            <td><strong>Counter:</strong> #01</td>
            <td style="text-align: right;"><strong>Time:</strong> ${new Date(data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
          </tr>
        </table>

        <div class="double-divider"></div>

        <table>
          <thead>
            <tr style="border-bottom: 2px solid #000; text-align: left; font-size: 13.5px; font-weight: 950;">
              <th style="padding-bottom: 5px;">ITEM &amp; DETAILS</th>
              <th style="text-align: right; padding-bottom: 5px;">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="divider"></div>

        <table class="totals-table">
          <tr>
            <td>Subtotal:</td>
            <td style="text-align: right; font-weight: 900;">₹${data.subtotal.toFixed(2)}</td>
          </tr>
          ${
            data.discountAmount > 0
              ? `
            <tr>
              <td>Discount:</td>
              <td style="text-align: right; font-weight: 900;">-₹${data.discountAmount.toFixed(2)}</td>
            </tr>
          `
              : ''
          }
          <tr>
            <td>CGST (2.5%):</td>
            <td style="text-align: right; font-weight: 900;">₹${(data.taxAmount / 2).toFixed(2)}</td>
          </tr>
          <tr>
            <td>SGST (2.5%):</td>
            <td style="text-align: right; font-weight: 900;">₹${(data.taxAmount / 2).toFixed(2)}</td>
          </tr>
          <tr class="grand-total">
            <td style="padding: 7px 0;">NET PAYABLE:</td>
            <td style="text-align: right; padding: 7px 0;">₹${data.totalAmount.toFixed(2)}</td>
          </tr>
          ${paymentsHtml}
          <tr class="balance-due">
            <td style="padding-top: 5px;">BALANCE DUE:</td>
            <td style="text-align: right; padding-top: 5px;">
              ₹${data.balanceDue.toFixed(2)}
            </td>
          </tr>
        </table>

        <div class="status-stamp">
          ${isPaid ? '✓ PAID IN FULL' : '⚠ PAYMENT PENDING'}
        </div>

        <div class="footer-msg">
          <div>Thank you for shopping at DUPPATI!</div>
          <div>🌿 7 Days Return / Size Exchange with this bill.</div>
          <div>Please visit us again.</div>
        </div>
      </body>
    </html>
  `;

  printHtmlViaHiddenIframe(billHtml);
  return true;
}

export interface KOTModificationPrintData {
  orderNumber: string;
  tableNumber?: string;
  productName: string;
  variantName?: string;
  action: 'QUANTITY_CHANGE' | 'VOID' | 'NOTES_CHANGE';
  previousQty: number;
  newQty: number;
  reason: string;
  newNotes?: string;
  timestamp?: string;
}

/**
 * Print Kitchen Order Ticket Modification / Cancellation Slip
 * Alerts kitchen staff immediately when an item quantity is changed, notes altered, or item voided.
 */
export function printKOTModificationSlip(data: KOTModificationPrintData): void {
  const printWindow = window.open('', '_blank', 'width=380,height=580');
  if (!printWindow) return;

  const timeStr = data.timestamp
    ? new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const isVoid = data.action === 'VOID' || data.newQty === 0;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>KOT MODIFICATION #${data.orderNumber}</title>
        <style>
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 13px;
            color: #000;
            margin: 10px;
            line-height: 1.3;
          }
          .mod-banner {
            text-align: center;
            font-size: 14px;
            font-weight: 900;
            border: 2px dashed ${isVoid ? '#dc2626' : '#ea580c'};
            background: ${isVoid ? '#fef2f2' : '#fff7ed'};
            color: ${isVoid ? '#b91c1c' : '#c2410c'};
            padding: 6px;
            margin-bottom: 10px;
          }
          .title {
            text-align: center;
            font-size: 17px;
            font-weight: 900;
            margin-bottom: 2px;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 8px 0;
          }
          .item-box {
            padding: 8px 0;
            font-size: 14px;
          }
          .reason-box {
            background: #f1f5f9;
            padding: 6px 8px;
            border-left: 3px solid #000;
            margin-top: 8px;
            font-size: 12px;
          }
          .urgent-notice {
            margin-top: 12px;
            text-align: center;
            font-weight: 900;
            font-size: 13px;
          }
        </style>
      </head>
      <body>
        <div class="mod-banner">
          ${isVoid ? '⚠ KITCHEN VOID TICKET ⚠' : '⚡ KITCHEN MODIFICATION TICKET ⚡'}
        </div>
        <div class="title">${data.tableNumber ? `TABLE ${data.tableNumber}` : 'DIRECT ORDER'}</div>
        <div style="text-align: center; font-size: 12px; margin-bottom: 8px;">Order #${data.orderNumber} • ${timeStr}</div>

        <div class="divider"></div>

        <div class="item-box">
          <div style="font-weight: 900; font-size: 15px;">
            ${isVoid ? '❌ VOID ITEM:' : '✏️ QUANTITY / NOTE CHANGE:'}
          </div>
          <div style="font-size: 15px; font-weight: 800; margin-top: 4px;">
            ${data.productName} ${data.variantName ? `(${data.variantName})` : ''}
          </div>
          <div style="font-size: 13px; margin-top: 4px;">
            ${isVoid ? `Cancelled Quantity: <strong>${data.previousQty}x</strong> (STOP PREPARATION)` : `Previous Qty: <strong>${data.previousQty}x</strong> ➔ New Qty: <strong>${data.newQty}x</strong>`}
          </div>
          ${data.newNotes ? `<div style="font-size: 12px; font-weight: bold; margin-top: 4px; color: #b45309;">Special Note: ${data.newNotes}</div>` : ''}
        </div>

        <div class="reason-box">
          <strong>Operational Reason:</strong><br />
          ${data.reason}
        </div>

        <div class="divider"></div>
        <div class="urgent-notice">
          ${isVoid ? 'ATTENTION CHEF: DO NOT PREPARE THIS ITEM.' : 'CHEF: UPDATE PORTION TO MATCH NEW QUANTITY.'}
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}
