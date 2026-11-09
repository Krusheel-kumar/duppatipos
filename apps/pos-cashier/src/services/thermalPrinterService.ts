import { ESCPOSBuilder } from '../utils/escposBuilder';
import type { CustomerBillPrintData, KOTPrintData } from '../utils/printReceipt';

export type ThermalPrinterConnection = 'WEB_USB' | 'WEB_SERIAL' | 'BROWSER_POPUP';

export interface ThermalPrinterConfig {
  connection: ThermalPrinterConnection;
  paperWidth: '80mm' | '58mm';
  autoCut: boolean;
  openCashDrawerOnCash: boolean;
  buzzerOnKOT: boolean;
}

const STORAGE_KEY = 'krunnex_pos_thermal_printer_config';

export function getThermalPrinterConfig(): ThermalPrinterConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return {
    connection: 'WEB_USB',
    paperWidth: '80mm',
    autoCut: true,
    openCashDrawerOnCash: true,
    buzzerOnKOT: true,
  };
}

export function saveThermalPrinterConfig(config: ThermalPrinterConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save printer config', err);
  }
}

// Active WebUSB / WebSerial hardware references
let activeUsbDevice: any = null;
let activeSerialPort: any = null;

/**
 * Check if WebUSB is supported in the current browser
 */
export function isWebUSBSupported(): boolean {
  return typeof navigator !== 'undefined' && 'usb' in (navigator as any);
}

/**
 * Check if Web Serial is supported in current browser
 */
export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in (navigator as any);
}

/**
 * Request user to pick and pair a USB thermal printer
 */
export async function pairWebUsbPrinter(): Promise<string> {
  if (!isWebUSBSupported()) {
    throw new Error('WebUSB is not supported in this browser. Please use Chrome or Edge.');
  }

  // Request any USB device
  const navUsb = (navigator as any).usb;
  const device = await navUsb.requestDevice({ filters: [] });
  
  try {
    await device.open();
    if (device.configuration === null) {
      try {
        await device.selectConfiguration(1);
      } catch (e) {
        console.warn('Could not select configuration 1, proceeding:', e);
      }
    }

    // Try claiming interface (may fail on Windows if usbprint.sys has locked it)
    const iface = device.configuration?.interfaces?.[0];
    if (iface) {
      try {
        await device.claimInterface(iface.interfaceNumber);
      } catch (e) {
        console.warn('Interface claim restricted by OS driver:', e);
      }
    }
  } catch (err: any) {
    if (err.name === 'SecurityError' || err.message?.includes('access') || err.message?.includes('claim')) {
      throw new Error(
        `Windows is holding this printer via 'usbprint' driver. You can switch to 'Browser Dialog' mode to print immediately, or connect via Serial/COM mode.`
      );
    }
    throw err;
  }

  activeUsbDevice = device;
  return device.productName || `USB Device (${device.vendorId}:${device.productId})`;
}

/**
 * Request user to pick and pair a Serial/COM thermal printer
 */
export async function pairWebSerialPrinter(): Promise<string> {
  if (!isWebSerialSupported()) {
    throw new Error('Web Serial is not supported in this browser. Please use Chrome or Edge.');
  }

  const port = await (navigator as any).serial.requestPort();
  await port.open({ baudRate: 9600 });
  activeSerialPort = port;
  return 'Serial Thermal Printer (Connected)';
}

/**
 * Send raw binary bytes to the paired physical thermal printer
 */
export async function sendRawToPrinter(bytes: Uint8Array): Promise<boolean> {
  const config = getThermalPrinterConfig();

  // 1. WebUSB
  if (config.connection === 'WEB_USB') {
    if (!activeUsbDevice) {
      if (isWebUSBSupported()) {
        const paired = await (navigator as any).usb.getDevices();
        if (paired.length > 0) {
          activeUsbDevice = paired[0];
          await activeUsbDevice.open();
          if (activeUsbDevice.configuration === null) {
            await activeUsbDevice.selectConfiguration(1);
          }
          const iface = activeUsbDevice.configuration?.interfaces?.[0];
          if (iface) {
            await activeUsbDevice.claimInterface(iface.interfaceNumber);
          }
        }
      }
    }

    if (activeUsbDevice && activeUsbDevice.opened) {
      try {
        const iface = activeUsbDevice.configuration?.interfaces?.[0];
        const alternate = iface?.alternates?.[0];
        const outEndpoint = alternate?.endpoints?.find((ep: any) => ep.direction === 'out');
        const endpointNumber = outEndpoint ? outEndpoint.endpointNumber : 1;

        await activeUsbDevice.transferOut(endpointNumber, bytes);
        return true;
      } catch (err) {
        console.warn('WebUSB transferOut failed, possibly locked by Windows usbprint:', err);
        return false;
      }
    }
  }

  // 2. WebSerial
  if (config.connection === 'WEB_SERIAL' && activeSerialPort) {
    const writer = activeSerialPort.writable.getWriter();
    await writer.write(bytes);
    writer.releaseLock();
    return true;
  }

  return false;
}

/**
 * Build ESC/POS bytes for Customer Bill
 */
export function buildCustomerBillESCPOS(data: CustomerBillPrintData, config = getThermalPrinterConfig()): Uint8Array {
  const builder = new ESCPOSBuilder({ paperWidth: config.paperWidth });

  const hasCash = data.payments.some((p: any) => p.method.toUpperCase().includes('CASH'));
  if (config.openCashDrawerOnCash && hasCash) {
    builder.cashDrawerPulse();
  }

  const isPaid = data.balanceDue <= 0.01;

  // Header
  builder
    .align('center')
    .size(true, true)
    .bold(true)
    .textLine(data.outletName || "POP O' BOB")
    .size(false, false)
    .bold(false)
    .textLine(data.outletAddress || 'Boba Tea & Cafe - Downtown Flagship')
    .textLine('GSTIN: 29ABCDE1234F1Z5')
    .feed(1)
    .bold(true)
    .textLine(isPaid ? '*** TAX INVOICE & RECEIPT ***' : '*** BILL ESTIMATE (UNPAID) ***')
    .bold(false)
    .feed(1);

  // Metadata
  builder
    .align('left')
    .twoColumns(`Order: #${data.orderNumber}`, `Inv: #${data.invoiceNumber || data.orderNumber}`)
    .twoColumns(`Type: ${data.orderType.replace('_', ' ')}`, data.tableNumber ? `Table: ${data.tableNumber}` : '')
    .twoColumns(
      `Date: ${new Date(data.createdAt).toLocaleDateString()}`,
      `Time: ${new Date(data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    )
    .divider('=');

  // Items Header
  builder.bold(true).twoColumns('QTY ITEM', 'AMOUNT').bold(false).divider('-');

  // Items
  for (const item of data.items) {
    const itemTitle = `${item.quantity}x ${item.name}${item.variantName ? ` (${item.variantName})` : ''}`;
    builder.twoColumns(itemTitle, `Rs.${item.lineTotal.toFixed(2)}`);
  }

  builder.divider('-');

  // Totals
  builder.twoColumns('Subtotal:', `Rs.${data.subtotal.toFixed(2)}`);
  if (data.discountAmount > 0) {
    builder.twoColumns('Discount:', `-Rs.${data.discountAmount.toFixed(2)}`);
  }
  builder.twoColumns('CGST (2.5%):', `Rs.${(data.taxAmount / 2).toFixed(2)}`);
  builder.twoColumns('SGST (2.5%):', `Rs.${(data.taxAmount / 2).toFixed(2)}`);
  builder.divider('=');

  // Grand Total
  builder
    .size(false, true)
    .bold(true)
    .twoColumns('TOTAL BILL:', `Rs.${data.totalAmount.toFixed(2)}`)
    .size(false, false)
    .bold(false)
    .divider('=');

  // Payments
  for (const p of data.payments) {
    builder.twoColumns(`Paid (${p.method}):`, `Rs.${p.amount.toFixed(2)}`);
  }
  builder.twoColumns('Balance Due:', `Rs.${data.balanceDue.toFixed(2)}`).feed(1);

  // Status Stamp & Footer
  builder
    .align('center')
    .bold(true)
    .textLine(isPaid ? '[ PAID IN FULL ]' : '[ PAYMENT PENDING ]')
    .bold(false)
    .feed(1)
    .textLine('Thank you for dining with us!')
    .textLine('Please visit us again.')
    .feed(1);

  if (config.autoCut) {
    builder.cut();
  }

  return builder.getBytes();
}

/**
 * Build ESC/POS bytes for Kitchen Order Ticket (KOT)
 */
export function buildKOTESCPOS(data: KOTPrintData, config = getThermalPrinterConfig()): Uint8Array {
  const builder = new ESCPOSBuilder({ paperWidth: config.paperWidth });

  if (config.buzzerOnKOT) {
    builder.beep(2, 2);
  }

  const timeStr = data.createdAt
    ? new Date(data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  builder
    .align('center')
    .size(true, true)
    .bold(true)
    .textLine('*** KITCHEN ORDER ***')
    .size(false, false)
    .bold(false)
    .feed(1)
    .align('left')
    .twoColumns(`ORDER: #${data.orderNumber}`, `TYPE: ${data.orderType.replace('_', ' ')}`)
    .twoColumns(data.tableNumber ? `TABLE: ${data.tableNumber}` : 'Takeaway / Counter', `TIME: ${timeStr}`)
    .twoColumns(`SERVER: ${data.serverName || 'Staff'}`, `DATE: ${new Date().toLocaleDateString()}`)
    .divider('=')
    .bold(true)
    .textLine('QTY  ITEM & SPECIFICATIONS')
    .bold(false)
    .divider('-');

  for (const item of data.items) {
    builder
      .bold(true)
      .size(false, true)
      .textLine(`${item.quantity}x  ${item.name}`)
      .size(false, false)
      .bold(false);

    if (item.variantName) {
      builder.textLine(`    Size: ${item.variantName}`);
    }
    if (item.addOns && item.addOns.length > 0) {
      builder.textLine(`    + ${item.addOns.join(', ')}`);
    }
    if (item.notes) {
      builder.bold(true).textLine(`    * NOTE: ${item.notes}`).bold(false);
    }
    builder.divider('.');
  }

  if (data.customerNotes) {
    builder
      .feed(1)
      .bold(true)
      .textLine('INSTRUCTIONS:')
      .textLine(data.customerNotes)
      .bold(false);
  }

  builder
    .feed(1)
    .align('center')
    .textLine('Printed for Kitchen Display - Krunnex POS');

  if (config.autoCut) {
    builder.cut();
  }

  return builder.getBytes();
}

/**
 * Print a test slip on the thermal printer
 */
export async function printTestReceipt(): Promise<boolean> {
  const config = getThermalPrinterConfig();
  const builder = new ESCPOSBuilder({ paperWidth: config.paperWidth });

  builder
    .align('center')
    .size(true, true)
    .bold(true)
    .textLine('KRUNNEX POS')
    .size(false, false)
    .bold(false)
    .textLine('Thermal Printer Test Page')
    .feed(1)
    .divider('=')
    .align('left')
    .twoColumns('Status:', 'CONNECTED [OK]')
    .twoColumns('Width:', config.paperWidth)
    .twoColumns('Date:', new Date().toLocaleDateString())
    .twoColumns('Time:', new Date().toLocaleTimeString())
    .divider('-')
    .align('center')
    .textLine('1234567890 ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    .textLine('Auto-Cut Test & Feed Test Successful!')
    .feed(1);

  if (config.autoCut) {
    builder.cut();
  }

  return await sendRawToPrinter(builder.getBytes());
}

/**
 * Print customer bill directly to paired thermal printer via ESC/POS (Zero OS Dialogs)
 */
export async function printCustomerBillESCPOS(data: CustomerBillPrintData): Promise<boolean> {
  const config = getThermalPrinterConfig();
  const bytes = buildCustomerBillESCPOS(data, config);
  return await sendRawToPrinter(bytes);
}

