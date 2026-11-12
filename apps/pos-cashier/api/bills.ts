// Vercel Serverless Function: Real-time Digital Bill & WhatsApp Dispatch Generator
export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      const billData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const invoiceNumber = billData.invoiceNumber || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // Construct dynamic host & protocol
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'krunnex-pos.vercel.app';
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      
      // Encode bill data for universal zero-database mobile viewing
      const encodedData = Buffer.from(JSON.stringify(billData)).toString('base64');
      const billUrl = `${protocol}://${host}/bill?id=${invoiceNumber}&data=${encodeURIComponent(encodedData)}`;

      // WhatsApp formatted message template
      const cleanPhone = billData.customerPhone ? String(billData.customerPhone).replace(/\D/g, '') : '';
      const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

      const itemsSummary = (billData.items || [])
        .map((it: any) => `• ${it.quantity}x ${it.name} (${it.variantName || 'Standard'}) - ₹${Number(it.lineTotal || 0).toFixed(2)}`)
        .join('\n');

      const whatsappText = `✨ *${billData.storeName || 'KRUNNEX LUXE RETAIL'}* ✨\n` +
        `📍 Road No. 36, Jubilee Hills, Hyderabad\n` +
        `GSTIN: 36AABCU9603R1ZM\n` +
        `────────────────────────────\n` +
        `🧾 *Tax Invoice:* #${invoiceNumber}\n` +
        `👤 *Customer:* ${billData.customerName || 'Valued Guest'}\n` +
        `📅 *Date:* ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}\n` +
        `────────────────────────────\n` +
        `🛍️ *ITEMS PURCHASED:*\n${itemsSummary}\n` +
        `────────────────────────────\n` +
        `💰 *Subtotal:* ₹${Number(billData.subtotal || 0).toFixed(2)}\n` +
        `🏷️ *GST (5% Textile):* ₹${Number(billData.taxAmount || 0).toFixed(2)}\n` +
        (billData.discountAmount > 0 ? `🎉 *Savings / MRP Discount:* -₹${Number(billData.discountAmount).toFixed(2)}\n` : '') +
        `⭐ *TOTAL AMOUNT PAID:* ₹${Number(billData.totalAmount || 0).toFixed(2)} (${billData.paymentMode || 'PAID'})\n` +
        `────────────────────────────\n` +
        `👉 *View & Download Digital Tax Invoice:*\n${billUrl}\n\n` +
        `🌿 7 Days Return / Size Exchange with this digital e-bill.\n` +
        `🙏 *Thank you for shopping with us! Visit again.*`;

      const whatsappUrl = targetPhone
        ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(whatsappText)}`
        : `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

      return res.status(200).json({
        success: true,
        invoiceNumber,
        billUrl,
        whatsappUrl,
        whatsappText,
        bill: billData,
      });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err?.message || 'Invalid bill payload' });
    }
  }

  return res.status(200).json({ status: 'ok', service: 'Krunnex Real-Time Digital Bill Serverless API' });
}
