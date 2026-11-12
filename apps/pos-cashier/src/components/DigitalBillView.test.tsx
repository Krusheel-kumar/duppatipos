import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DigitalBillView, type DigitalBillData } from './DigitalBillView';

describe('DigitalBillView Component (Mobile Digital Tax Invoice)', () => {
  const mockBill: DigitalBillData = {
    invoiceNumber: 'INV-2026-9999',
    createdAt: new Date().toISOString(),
    storeName: 'KRUNNEX LUXE RETAIL',
    storeAddress: 'Road No. 36, Jubilee Hills, Hyderabad',
    storeGstin: '36AABCU9603R1ZM',
    storePhone: '+91 98765 43210',
    customerName: 'Ananya Sharma',
    customerPhone: '9876543210',
    items: [
      {
        name: 'Pure Mulberry Silk Saree',
        variantName: 'Temple Border • Crimson Red',
        hsnCode: '5007',
        quantity: 1,
        unitPrice: 5999,
        lineTotal: 5999,
      },
    ],
    subtotal: 5999,
    taxAmount: 299.95,
    discountAmount: 1000,
    totalAmount: 6298.95,
    paymentMode: 'UPI',
  };

  it('renders store branding, customer name, and item details accurately', () => {
    render(<DigitalBillView initialData={mockBill} />);

    expect(screen.getByText(/KRUNNEX LUXE RETAIL/i)).toBeInTheDocument();
    expect(screen.getAllByText(/INV-2026-9999/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Ananya Sharma/i)).toBeInTheDocument();
    expect(screen.getByText(/Pure Mulberry Silk Saree/i)).toBeInTheDocument();
    expect(screen.getByText(/₹6298.95/i)).toBeInTheDocument();
  });

  it('renders WhatsApp and PDF download actions', () => {
    render(<DigitalBillView initialData={mockBill} />);

    expect(screen.getByText(/Print \/ Save PDF/i)).toBeInTheDocument();
    expect(screen.getByText(/Send to WhatsApp/i)).toBeInTheDocument();
  });
});
