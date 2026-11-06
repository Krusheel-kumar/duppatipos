import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminLayout } from './AdminLayout';
import { posApiClient } from '../../api/posApiClient';
import type { ProductCategory, Product, AddOn, Order, Bill, Outlet } from '../../types/pos';

vi.mock('../../api/posApiClient', () => ({
  posApiClient: {
    getConfig: vi.fn(),
    updateConfig: vi.fn(),
    getOutlets: vi.fn(),
    getCategories: vi.fn(),
    getProducts: vi.fn(),
    getAddOns: vi.fn(),
    getOutletOrders: vi.fn(),
    getOutletBills: vi.fn(),
    createCategory: vi.fn(),
    deactivateCategory: vi.fn(),
    createProduct: vi.fn(),
    deactivateProduct: vi.fn(),
    createAddOn: vi.fn(),
  },
}));

describe('Admin Dashboard and Owner Portal', () => {
  const mockOutlets: Outlet[] = [
    { id: 'outlet-1', name: 'Downtown Branch' },
    { id: 'outlet-2', name: 'Uptown Branch' },
  ];

  const mockCategories: ProductCategory[] = [
    { id: 'cat-1', name: 'Coffee', description: 'Freshly roasted', displayOrder: 1, isActive: true },
    { id: 'cat-2', name: 'Tea', description: 'Artisanal loose leaf', displayOrder: 2, isActive: true },
  ];

  const mockProducts: Product[] = [
    {
      id: 'prod-1',
      name: 'Caramel Macchiato',
      description: 'Espresso with vanilla and caramel drizzle',
      sku: 'CM-01',
      basePrice: 5.5,
      isActive: true,
      category: mockCategories[0],
      variants: [{ id: 'var-1', name: 'Large 16oz', price: 6.5, isActive: true }],
      addOns: [{ id: 'add-1', name: 'Extra Shot', price: 1.0, isActive: true }],
    },
  ];

  const mockAddOns: AddOn[] = [
    { id: 'add-1', name: 'Extra Shot', price: 1.0, isActive: true },
    { id: 'add-2', name: 'Oat Milk', price: 0.8, isActive: true },
  ];

  const mockOrders: Order[] = [
    {
      id: 'ord-1',
      orderNumber: 'ORD-101',
      orderType: 'DINE_IN',
      status: 'CONFIRMED',
      subtotal: 10.0,
      discountAmount: 0.0,
      taxableAmount: 10.0,
      taxAmount: 1.0,
      totalAmount: 11.0,
      createdAt: '2026-10-13T10:00:00Z',
      items: [
        {
          id: 'item-1',
          productNameSnapshot: 'Caramel Macchiato',
          quantity: 2,
          unitPriceSnapshot: 5.5,
          lineTotalSnapshot: 11.0,
        },
      ],
    },
  ];

  const mockBills: Bill[] = [
    {
      id: 'bill-1',
      invoiceNumber: 'INV-2026-001',
      status: 'PAID',
      subtotal: 10.0,
      discountAmount: 0.0,
      taxableAmount: 10.0,
      taxAmount: 1.0,
      totalAmount: 11.0,
      paidAmount: 11.0,
      createdAt: '2026-10-13T10:05:00Z',
      payments: [
        {
          id: 'pay-1',
          paymentMethod: 'UPI',
          status: 'SUCCESSFUL',
          amount: 11.0,
          transactionReference: 'UPI-REF-999',
          createdAt: '2026-10-13T10:05:00Z',
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(posApiClient.getConfig).mockReturnValue({
      baseUrl: 'http://localhost:8080',
      tenantId: 'tenant-1',
      outletId: 'outlet-1',
    });
    vi.mocked(posApiClient.getOutlets).mockResolvedValue(mockOutlets);
    vi.mocked(posApiClient.getCategories).mockResolvedValue(mockCategories);
    vi.mocked(posApiClient.getProducts).mockResolvedValue(mockProducts);
    vi.mocked(posApiClient.getAddOns).mockResolvedValue(mockAddOns);
    vi.mocked(posApiClient.getOutletOrders).mockResolvedValue(mockOrders);
    vi.mocked(posApiClient.getOutletBills).mockResolvedValue(mockBills);
  });

  it('renders dashboard with authentic calculated metrics from real bills and orders', async () => {
    render(<AdminLayout />);

    expect(await screen.findByText('Real-Time Performance Metrics')).toBeInTheDocument();
    expect(screen.getByText('Downtown Branch')).toBeInTheDocument();

    // Total revenue is derived strictly from bills (₹11.00)
    expect(screen.getAllByText('₹11.00').length).toBeGreaterThan(0);
    expect(screen.getByText('From 1 fully/partially settled bills')).toBeInTheDocument();
    expect(screen.getByText('ORD-101')).toBeInTheDocument();
  });

  it('navigates to Menu Catalog and renders products and categories', async () => {
    render(<AdminLayout />);

    const menuTabBtn = await screen.findByRole('button', { name: /Menu Catalog/i });
    fireEvent.click(menuTabBtn);

    expect(await screen.findByText('Catalog Products')).toBeInTheDocument();
    expect(screen.getByText('Caramel Macchiato')).toBeInTheDocument();
    expect(screen.getByText('SKU: CM-01')).toBeInTheDocument();
  });

  it('supports creating a new category via modal', async () => {
    vi.mocked(posApiClient.createCategory).mockResolvedValue({
      id: 'cat-3',
      name: 'Desserts',
      description: 'Pastries & cakes',
      isActive: true,
    });

    render(<AdminLayout />);

    const menuTabBtn = await screen.findByRole('button', { name: /Menu Catalog/i });
    fireEvent.click(menuTabBtn);

    const categoriesTab = screen.getByRole('button', { name: /Categories/i });
    fireEvent.click(categoriesTab);

    const addCatBtn = screen.getByRole('button', { name: /\+ Add Category/i });
    fireEvent.click(addCatBtn);

    const inputName = screen.getByPlaceholderText(/Specialty Beverages/i);
    fireEvent.change(inputName, { target: { value: 'Desserts' } });

    const submitBtn = screen.getByRole('button', { name: /^Create$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(posApiClient.createCategory).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Desserts' })
      );
    });
  });

  it('navigates to Orders tab and displays order snapshots', async () => {
    render(<AdminLayout />);

    const ordersTabBtn = await screen.findByRole('button', { name: /Orders/i });
    fireEvent.click(ordersTabBtn);

    expect(await screen.findByRole('heading', { level: 2, name: 'Order Management' })).toBeInTheDocument();
    expect(screen.getByText('ORD-101')).toBeInTheDocument();
    expect(screen.getByText('₹11.00')).toBeInTheDocument();

    const viewItemsBtn = screen.getByRole('button', { name: /View Items/i });
    fireEvent.click(viewItemsBtn);

    expect(screen.getByText('Item Snapshots')).toBeInTheDocument();
    expect(screen.getByText('Caramel Macchiato')).toBeInTheDocument();
  });

  it('navigates to Billing tab and inspects payments', async () => {
    render(<AdminLayout />);

    const billingTabBtn = await screen.findByRole('button', { name: /Billing & Invoices/i });
    fireEvent.click(billingTabBtn);

    expect(await screen.findByText('Billing & Invoicing')).toBeInTheDocument();
    expect(screen.getByText('INV-2026-001')).toBeInTheDocument();

    const viewPaymentsBtn = screen.getByRole('button', { name: /View \(1\)/i });
    fireEvent.click(viewPaymentsBtn);

    expect(screen.getByText('Payment Transactions')).toBeInTheDocument();
    expect(screen.getByText('UPI-REF-999')).toBeInTheDocument();
  });

  it('handles outlet change and fetches corresponding data', async () => {
    render(<AdminLayout />);

    await screen.findByText('Real-Time Performance Metrics');
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'outlet-2' } });

    expect(posApiClient.updateConfig).toHaveBeenCalledWith({ outletId: 'outlet-2' });
  });
});


