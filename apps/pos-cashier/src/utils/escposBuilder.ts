/**
 * ESC/POS Binary Command Generator for Thermal Printers
 * Supports 80mm (48 columns) and 58mm (32 columns) paper rolls.
 */

export interface ESCPOSOptions {
  paperWidth?: '80mm' | '58mm';
  characterSet?: 'PC437_USA' | 'PC850_MULTILINGUAL' | 'WPC1252';
}

export class ESCPOSBuilder {
  private buffer: number[] = [];
  private readonly columns: number;

  constructor(options: ESCPOSOptions = {}) {
    this.columns = options.paperWidth === '58mm' ? 32 : 48;
    this.init();
  }

  /** Initialize printer to default settings */
  init(): this {
    this.buffer.push(0x1b, 0x40); // ESC @
    return this;
  }

  /** Set text alignment: 'left', 'center', 'right' */
  align(alignment: 'left' | 'center' | 'right'): this {
    const val = alignment === 'center' ? 1 : alignment === 'right' ? 2 : 0;
    this.buffer.push(0x1b, 0x61, val); // ESC a n
    return this;
  }

  /** Set bold text */
  bold(enable = true): this {
    this.buffer.push(0x1b, 0x45, enable ? 1 : 0); // ESC E n
    return this;
  }

  /** Set double height & double width text */
  size(doubleWidth = false, doubleHeight = false): this {
    let n = 0;
    if (doubleWidth) n |= 0x20;
    if (doubleHeight) n |= 0x01;
    this.buffer.push(0x1d, 0x21, n); // GS ! n
    return this;
  }

  /** Set inverted colors (white text on black background) */
  invert(enable = true): this {
    this.buffer.push(0x1d, 0x42, enable ? 1 : 0); // GS B n
    return this;
  }

  /** Feed lines */
  feed(lines = 1): this {
    if (lines <= 0) return this;
    this.buffer.push(0x1b, 0x64, lines); // ESC d n
    return this;
  }

  /** Raw string encoding to ASCII/ISO-8859-1 byte array */
  text(str: string): this {
    // Replace non-ASCII characters with safe substitutes for POS thermal fonts
    const sanitized = str
      .replace(/₹/g, 'Rs.')
      .replace(/[^\x20-\x7E\r\n]/g, '?');

    for (let i = 0; i < sanitized.length; i++) {
      this.buffer.push(sanitized.charCodeAt(i));
    }
    return this;
  }

  /** Add text followed by newline */
  textLine(str = ''): this {
    this.text(str);
    this.buffer.push(0x0a); // LF
    return this;
  }

  /** Prints a line of dashes or characters spanning the full paper width */
  divider(char = '-'): this {
    this.textLine(char.repeat(this.columns));
    return this;
  }

  /** Prints left-aligned and right-aligned columns on a single line */
  twoColumns(left: string, right: string, padChar = ' '): this {
    const safeLeft = left.replace(/₹/g, 'Rs.');
    const safeRight = right.replace(/₹/g, 'Rs.');
    const spaceNeeded = this.columns - (safeLeft.length + safeRight.length);

    if (spaceNeeded <= 0) {
      // If combined length exceeds line, truncate or multi-line
      const truncatedLeft = safeLeft.slice(0, Math.max(10, this.columns - safeRight.length - 1));
      const remainingSpace = Math.max(1, this.columns - (truncatedLeft.length + safeRight.length));
      this.textLine(truncatedLeft + padChar.repeat(remainingSpace) + safeRight);
    } else {
      this.textLine(safeLeft + padChar.repeat(spaceNeeded) + safeRight);
    }
    return this;
  }

  /** Prints a 3-column row (e.g. Qty, Name, Total) */
  itemRow(qty: number, name: string, total: string): this {
    const qtyStr = `${qty}x `;
    const totalStr = total.replace(/₹/g, 'Rs.');
    const nameMaxLen = this.columns - (qtyStr.length + totalStr.length + 1);

    const safeName = name.replace(/₹/g, 'Rs.').slice(0, Math.max(5, nameMaxLen));
    const padding = Math.max(1, this.columns - (qtyStr.length + safeName.length + totalStr.length));

    this.textLine(`${qtyStr}${safeName}${' '.repeat(padding)}${totalStr}`);
    return this;
  }

  /** Beep buzzer / sound alarm on printer */
  beep(count = 2, time = 2): this {
    this.buffer.push(0x1b, 0x42, count, time); // ESC B n t
    return this;
  }

  /** Pulse cash drawer (RJ11 kick out) */
  cashDrawerPulse(): this {
    // ESC p 0 25 250 (Pin 2, 50ms ON, 500ms OFF)
    this.buffer.push(0x1b, 0x70, 0x00, 0x19, 0xfa);
    return this;
  }

  /** Partial or full cut paper command */
  cut(full = false): this {
    this.feed(3); // Feed paper past tear bar / blade
    this.buffer.push(0x1d, 0x56, full ? 0 : 1); // GS V 0 (full) or GS V 1 (partial)
    return this;
  }

  /** Returns raw binary buffer */
  getBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}
