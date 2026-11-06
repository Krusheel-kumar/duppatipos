import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RunningOrdersView } from './RunningOrdersView';
import type { Order, Bill } from '../types/pos';
import type { RestaurantTable } from '../utils/tableStorage';

describe('RunningOrdersView Component (Billing & Cashier Dashboard)', () => {
  const mockTables: RestaurantTable[] = [
    {
      id: 'table-1',
      tableNumber: '1',
      name: 'Window Table',
      capacity: 4,
      status: 'RUNNING',
      currentOrderId: 'ord-1',
      amountDue: 25.5,
      amountPaid: 0,
    },
  ];

  const mockOrders: Order[] = [
    {
      id: 'ord-1',
      orderNumber: 'ORD-101',
      orderType: 'DINE_IN',
      status: 'PREPARING',
      subtotal: 25.5,
      discountAmount: 0,
      taxableAmount: 25.5,
      taxAmount: 0,
      totalAmount: 25.5,
      table: mockTables[0],
      customerNotes: '[Table: 1] Extra ice',
      createdAt: new Date().toISOString(),
      items: [
        {
          id: 'item-1',
          productNameSnapshot: 'Brown Sugar Boba',
          variantNameSnapshot: 'Large 24oz',
          quantity: 2,
          unitPriceSnapshot: 6.75,
          lineTotalSnapshot: 13.5,
        },
      ],
    },
    {
      id: 'ord-2',
      orderNumber: 'ORD-102',
      orderType: 'TAKEAWAY',
      status: 'READY',
      subtotal: 12.0,
      discountAmount: 0,
      taxableAmount: 12.0,
      taxAmount: 0,
      totalAmount: 12.0,
      customerNotes: 'Pack securely',
      createdAt: new Date().toISOString(),
      items: [
        {
          id: 'item-2',
          productNameSnapshot: 'Matcha Latte',
          quantity: 1,
          unitPriceSnapshot: 12.0,
          lineTotalSnapshot: 12.0,
        },
      ],
    },
  ];

  const mockBills: Bill[] = [
    {
      id: 'bill-2',
      invoiceNumber: 'INV-102',
      status: 'PAID',
      subtotal: 12.0,
      discountAmount: 0,
      taxableAmount: 12.0,
      taxAmount: 0,
      totalAmount: 12.0,
      paidAmount: 12.0,
      order: {
        id: 'ord-2',
        orderNumber: 'ORD-102',
      },
      payments: [
        {
          id: 'pay-1',
          paymentMethod: 'UPI',
          status: 'SUCCESSFUL',
          amount: 12.0,
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
    },
  ];

  it('renders payment status (UNPAID vs PAID) clearly for cashier billing', () => {
    const onRefresh = vi.fn();
    const onOpenCheckout = vi.fn();
    const onSwitchToNewOrder = vi.fn();

    render(
      <RunningOrdersView
        orders={mockOrders}
        tables={mockTables}
        bills={mockBills}
        isLoading={false}
        onRefresh={onRefresh}
        onOpenCheckout={onOpenCheckout}
        onSwitchToNewOrder={onSwitchToNewOrder}
      />
    );

    // Verify order numbers
    expect(screen.getByText('#ORD-101')).toBeDefined();
    expect(screen.getByText('#ORD-102')).toBeDefined();

    // Verify UNPAID badge on ord-1
    expect(screen.getByText(/🔴 UNPAID/)).toBeDefined();

    // Verify PAID badge on ord-2
    expect(screen.getByText(/✓ PAID/)).toBeDefined();

    // Verify cleaned notes: "[Table: 1]" tag is removed, showing only "Extra ice"
    expect(screen.getByText('Extra ice')).toBeDefined();
    expect(screen.queryByText('[Table: 1]')).toBeNull();
  });

  it('allows filtering by payment status (Unpaid only)', () => {
    const onRefresh = vi.fn();
    const onOpenCheckout = vi.fn();
    const onSwitchToNewOrder = vi.fn();

    render(
      <RunningOrdersView
        orders={mockOrders}
        tables={mockTables}
        bills={mockBills}
        isLoading={false}
        onRefresh={onRefresh}
        onOpenCheckout={onOpenCheckout}
        onSwitchToNewOrder={onSwitchToNewOrder}
      />
    );

    // Click Unpaid filter pill
    fireEvent.click(screen.getByRole('button', { name: /🔴 Unpaid/ }));

    // ORD-101 (unpaid) should be visible, ORD-102 (paid) should not
    expect(screen.getByText('#ORD-101')).toBeDefined();
    expect(screen.queryByText('#ORD-102')).toBeNull();
  });

  it('opens checkout modal when clicking Settle Bill on an unpaid order', () => {
    const onRefresh = vi.fn();
    const onOpenCheckout = vi.fn();
    const onSwitchToNewOrder = vi.fn();

    render(
      <RunningOrdersView
        orders={mockOrders}
        tables={mockTables}
        bills={mockBills}
        isLoading={false}
        onRefresh={onRefresh}
        onOpenCheckout={onOpenCheckout}
        onSwitchToNewOrder={onSwitchToNewOrder}
      />
    );

    const settleBtn = screen.getByText(/Settle Bill/);
    fireEvent.click(settleBtn);

    expect(onOpenCheckout).toHaveBeenCalledWith(mockOrders[0], mockTables[0]);
  });

  it('provides Print Receipt on a paid order', () => {
    const onRefresh = vi.fn();
    const onOpenCheckout = vi.fn();
    const onSwitchToNewOrder = vi.fn();

    render(
      <RunningOrdersView
        orders={mockOrders}
        tables={mockTables}
        bills={mockBills}
        isLoading={false}
        onRefresh={onRefresh}
        onOpenCheckout={onOpenCheckout}
        onSwitchToNewOrder={onSwitchToNewOrder}
      />
    );

    expect(screen.getByText('Print Receipt')).toBeDefined();
  });
});
