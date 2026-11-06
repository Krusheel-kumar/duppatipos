import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TableCheckoutModal } from './TableCheckoutModal';
import { posApiClient } from '../api/posApiClient';
import type { Order, Bill, Payment, RestaurantTable } from '../types/pos';

const mockOrder: Order = {
  id: 'order-123',
  orderNumber: 'ORD-20261015-001',
  orderType: 'DINE_IN',
  status: 'CREATED',
  subtotal: 100,
  discountAmount: 10,
  taxableAmount: 90,
  taxAmount: 9,
  totalAmount: 99,
  items: [
    {
      id: 'item-1',
      productNameSnapshot: 'Brown Sugar Milk Tea',
      variantNameSnapshot: 'Large',
      quantity: 2,
      unitPriceSnapshot: 50,
      lineTotalSnapshot: 100,
    },
  ],
  createdAt: '2026-10-15T10:00:00Z',
};

const mockTable: RestaurantTable = {
  id: 'tbl-1',
  tableNumber: '4',
  name: 'Table 4',
  capacity: 4,
  status: 'RUNNING',
  currentOrderId: 'order-123',
  orderNumber: 'ORD-20261015-001',
  currentTotal: 99,
  amountPaid: 0,
  amountDue: 99,
};

const mockBill: Bill = {
  id: 'bill-123',
  invoiceNumber: 'INV-20261015-001',
  status: 'ISSUED',
  subtotal: 100,
  discountAmount: 10,
  taxableAmount: 90,
  taxAmount: 9,
  totalAmount: 99,
  paidAmount: 0,
  createdAt: '2026-10-15T10:05:00Z',
};

const mockPayment: Payment = {
  id: 'pay-123',
  paymentMethod: 'CASH',
  status: 'SUCCESSFUL',
  amount: 99,
  createdAt: '2026-10-15T10:10:00Z',
};

describe('TableCheckoutModal Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders order details, items, and financial balance accurately', async () => {
    vi.spyOn(posApiClient, 'getBillByOrderId').mockResolvedValue(mockBill);
    vi.spyOn(posApiClient, 'getBillPayments').mockResolvedValue([]);

    render(
      <TableCheckoutModal
        isOpen={true}
        onClose={vi.fn()}
        order={mockOrder}
        table={mockTable}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Checkout & Settle Bill')).toBeInTheDocument();
      expect(screen.getByText('Table 4')).toBeInTheDocument();
      expect(screen.getByText(/2x/i)).toBeInTheDocument();
      expect(screen.getByText(/Brown Sugar Milk Tea/i)).toBeInTheDocument();
      expect(screen.getAllByText('₹100.00').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('-₹10.00')).toBeInTheDocument();
      expect(screen.getByText('₹9.00')).toBeInTheDocument();
      expect(screen.getAllByText('₹99.00').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('calculates cash change due accurately based on customer tendered amount', async () => {
    vi.spyOn(posApiClient, 'getBillByOrderId').mockResolvedValue(mockBill);
    vi.spyOn(posApiClient, 'getBillPayments').mockResolvedValue([]);

    render(
      <TableCheckoutModal
        isOpen={true}
        onClose={vi.fn()}
        order={mockOrder}
        table={mockTable}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /CASH/i })).toBeInTheDocument();
    });

    // Select CASH mode to reveal cash tendered input
    fireEvent.click(screen.getByRole('button', { name: /CASH/i }));

    const cashInput = screen.getByPlaceholderText('e.g. 500');
    fireEvent.change(cashInput, { target: { value: '200' } });

    // Change Due = 200 - 99 = 101.00
    expect(screen.getByText('₹101.00')).toBeInTheDocument();
  });

  it('records payment on backend and confirms payment status to SUCCESSFUL', async () => {
    vi.spyOn(posApiClient, 'getBillByOrderId').mockResolvedValue(mockBill);
    vi.spyOn(posApiClient, 'getBillPayments').mockResolvedValue([]);
    const recordPaymentSpy = vi.spyOn(posApiClient, 'recordPayment').mockResolvedValue({
      id: 'pay-pending-1',
      paymentMethod: 'CASH',
      status: 'PENDING',
      amount: 99,
      createdAt: '2026-10-15T10:15:00Z',
    });
    const updatePaymentSpy = vi.spyOn(posApiClient, 'updatePaymentStatus').mockResolvedValue(mockPayment);
    const onPaymentSettledMock = vi.fn();

    render(
      <TableCheckoutModal
        isOpen={true}
        onClose={vi.fn()}
        order={mockOrder}
        table={mockTable}
        onPaymentSettled={onPaymentSettledMock}
      />
    );

    // Settle button is initially disabled without selecting a payment mode
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /CASH/i })).toBeInTheDocument();
    });

    // Select payment mode
    fireEvent.click(screen.getByRole('button', { name: /CASH/i }));

    const settleBtn = screen.getByRole('button', { name: /Confirm Payment & Settle Bill|Settle via CASH/i });
    expect(settleBtn).toBeEnabled();
    fireEvent.click(settleBtn);

    await waitFor(() => {
      expect(recordPaymentSpy).toHaveBeenCalledWith(
        'bill-123',
        99,
        'CASH',
        expect.stringMatching(/^pay-bill-123-/),
        undefined
      );
      expect(updatePaymentSpy).toHaveBeenCalledWith('pay-pending-1', 'SUCCESSFUL');
      expect(onPaymentSettledMock).toHaveBeenCalled();
    });
  });

  it('allows Close Table only when balance is settled or with authorized exception', async () => {
    vi.spyOn(posApiClient, 'getBillByOrderId').mockResolvedValue(mockBill);
    vi.spyOn(posApiClient, 'getBillPayments').mockResolvedValue([]);
    const onCloseTableMock = vi.fn();

    render(
      <TableCheckoutModal
        isOpen={true}
        onClose={vi.fn()}
        order={mockOrder}
        table={mockTable}
        onCloseTable={onCloseTableMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Close Table \(Unsettled\)/i })).toBeInTheDocument();
    });

    // Clicking while unsettled prompts for authorized exception reason
    fireEvent.click(screen.getByRole('button', { name: /Close Table \(Unsettled\)/i }));

    expect(screen.getByText(/Table has an unpaid balance of ₹99.00/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Manager Void \/ Guest Walkout/i)).toBeInTheDocument();

    // Fill exception reason and confirm
    fireEvent.change(screen.getByPlaceholderText(/Manager Void \/ Guest Walkout/i), {
      target: { value: 'Manager authorized void' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Confirm Authorized Close/i }));

    await waitFor(() => {
      expect(onCloseTableMock).toHaveBeenCalledWith(mockTable, 'Manager authorized void');
    });
  });

  it('validates manager approval PIN and cancels bill with policy reason', async () => {
    vi.spyOn(posApiClient, 'getBillByOrderId').mockResolvedValue(mockBill);
    vi.spyOn(posApiClient, 'getBillPayments').mockResolvedValue([]);
    const cancelBillSpy = vi.spyOn(posApiClient, 'cancelBill').mockResolvedValue({
      ...mockBill,
      status: 'CANCELLED',
    });
    vi.spyOn(posApiClient, 'updateOrderStatus').mockResolvedValue(mockOrder);
    const onCloseTableMock = vi.fn();

    render(
      <TableCheckoutModal
        isOpen={true}
        onClose={vi.fn()}
        order={mockOrder}
        table={mockTable}
        onCloseTable={onCloseTableMock}
      />
    );

    // Cancel Bill button is displayed in header
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Cancel Bill/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Cancel Bill/i }));

    // Policy dialog opens
    expect(screen.getByText(/Cancel Bill & Void Order/i)).toBeInTheDocument();
    expect(screen.getByText(/Cancellation Policy & Audit Trail:/i)).toBeInTheDocument();

    const pinInput = screen.getByPlaceholderText(/Enter Manager PIN/i);
    const authorizeBtn = screen.getByRole('button', { name: /Authorize & Cancel Bill/i });

    // Wrong PIN check
    fireEvent.change(pinInput, { target: { value: '0000' } });
    fireEvent.click(authorizeBtn);
    expect(screen.getByText(/Invalid Manager PIN/i)).toBeInTheDocument();

    // Valid PIN check (1234)
    fireEvent.change(pinInput, { target: { value: '1234' } });
    fireEvent.click(authorizeBtn);

    await waitFor(() => {
      expect(cancelBillSpy).toHaveBeenCalledWith(
        'bill-123',
        expect.stringContaining('Customer Walkout')
      );
      expect(onCloseTableMock).toHaveBeenCalledWith(
        mockTable,
        expect.stringContaining('Bill Cancelled')
      );
    });
  });

  it('automatically frees up table upon settling payment without secondary popups', async () => {
    vi.spyOn(posApiClient, 'getBillByOrderId').mockResolvedValue(mockBill);
    vi.spyOn(posApiClient, 'getBillPayments').mockResolvedValue([]);
    vi.spyOn(posApiClient, 'recordPayment').mockResolvedValue({
      id: 'pay-pending-1',
      paymentMethod: 'UPI',
      status: 'PENDING',
      amount: 99,
      createdAt: '2026-10-15T10:15:00Z',
    });
    vi.spyOn(posApiClient, 'updatePaymentStatus').mockResolvedValue(mockPayment);
    const onCloseTableMock = vi.fn();
    const onPaymentSettledMock = vi.fn();

    render(
      <TableCheckoutModal
        isOpen={true}
        onClose={vi.fn()}
        order={mockOrder}
        table={mockTable}
        onCloseTable={onCloseTableMock}
        onPaymentSettled={onPaymentSettledMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /UPI/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /UPI/i }));

    const settleBtn = screen.getByRole('button', { name: /Confirm Payment & Settle Bill|Settle via UPI/i });
    fireEvent.click(settleBtn);

    await waitFor(() => {
      // Table is automatically closed/freed up upon full settlement
      expect(onCloseTableMock).toHaveBeenCalledWith(mockTable);
      expect(onPaymentSettledMock).toHaveBeenCalled();
      expect(screen.getByText(/Payment Settled! Table 4 released & bill saved/i)).toBeInTheDocument();
    });
  });
});
