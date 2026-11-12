import JsBarcode from 'jsbarcode';

export function generateBarcodeSvg(code: string, width = 1.6, height = 36): string {
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
