import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';
import { posApiClient } from './api/posApiClient';
import type { Product, ProductCategory, Order } from './types/pos';

const mockCategories: ProductCategory[] = [
  { id: 'cat-1', name: 'Boba Tea' },
  { id: 'cat-2', name: 'Coffee' },
];

const mockProducts: Product[] = [
  {
    id: 'prod-boba-1',
    name: 'Roasted Milk Tea',
    description: 'Fresh boba with roasted brown sugar milk.',
    sku: 'BOBA-RMT',
    basePrice: 5.5,
    isActive: true,
    category: mockCategories[0],
    variants: [
      { id: 'var-1', name: 'Large 500ml', sizeLabel: '500 ml', price: 6.5, isActive: true },
    ],
    addOns: [
      { id: 'addon-1', name: 'Brown Sugar Jelly', price: 0.75, isActive: true },
    ],
  },
  {
    id: 'prod-snack-1',
    name: 'Butter Croissant',
    description: 'Fresh French pastry.',
    sku: 'SNK-BC',
    basePrice: 3.5,
    isActive: true,
    variants: [],
    addOns: [],
  },
];

describe('Frontend–Backend Integration (Cashier POS)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    posApiClient.updateConfig({
      baseUrl: 'http://localhost:8080',
      tenantId: '11111111-1111-1111-1111-111111111111',
      outletId: '22222222-2222-2222-2222-222222222222',
    });
  });

  it('loads and renders categories and products from backend API', async () => {
    vi.spyOn(posApiClient, 'getCategories').mockResolvedValue(mockCategories);
    vi.spyOn(posApiClient, 'getProducts').mockResolvedValue(mockProducts);

    render(<App />);

    // Initially displays loading
    expect(screen.getByText(/Loading menu from server.../i)).toBeInTheDocument();

    // After API resolves
    await waitFor(() => {
      expect(screen.getByText('Boba Tea')).toBeInTheDocument();
      expect(screen.getByText('Coffee')).toBeInTheDocument();
      expect(screen.getByText('Roasted Milk Tea')).toBeInTheDocument();
      expect(screen.getByText('Butter Croissant')).toBeInTheDocument();
    });
  });

  it('displays API error notice when backend is unreachable', async () => {
    vi.spyOn(posApiClient, 'getCategories').mockRejectedValue(new Error('Network error (Connection refused)'));
    vi.spyOn(posApiClient, 'getProducts').mockResolvedValue([]);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Network error \(Connection refused\)/i);
    });
  });

  it('submits order matching exact CreateOrderRequest DTO to backend POST /api/v1/orders', async () => {
    vi.spyOn(posApiClient, 'getCategories').mockResolvedValue(mockCategories);
    vi.spyOn(posApiClient, 'getProducts').mockResolvedValue(mockProducts);

    const mockCreatedOrder: Order = {
      id: 'ord-uuid-1',
      orderNumber: 'ORD-2026-0001',
      orderType: 'DINE_IN',
      status: 'CREATED',
      subtotal: 7.25,
      discountAmount: 0,
      taxableAmount: 7.25,
      taxAmount: 0.36,
      totalAmount: 7.61,
      createdAt: new Date().toISOString(),
    };

    const createOrderSpy = vi.spyOn(posApiClient, 'createOrder').mockResolvedValue(mockCreatedOrder);

    render(<App />);

    // Wait for catalog load
    await waitFor(() => {
      expect(screen.getByText('Roasted Milk Tea')).toBeInTheDocument();
    });

    // 1. Select product to open modal
    fireEvent.click(screen.getByLabelText('Select Roasted Milk Tea'));

    // 2. Select Large Variant & AddOn
    fireEvent.click(screen.getByRole('button', { name: /Large 500ml/i }));
    fireEvent.click(screen.getByRole('button', { name: /Brown Sugar Jelly/i }));

    // 3. Add to cart
    fireEvent.click(screen.getByRole('button', { name: /Add to Cart/i }));

    // 4. Set customer notes
    const notesInput = screen.getByLabelText(/Customer \/ Kitchen Instructions:/i);
    fireEvent.change(notesInput, { target: { value: 'Table #3' } });

    // 5. Open review modal
    fireEvent.click(screen.getByRole('button', { name: /Review & Place Order/i }));

    // 6. Confirm order
    const confirmBtn = screen.getByRole('button', { name: /Confirm & Place Order/i });
    fireEvent.click(confirmBtn);

    // 7. Verify API call arguments
    await waitFor(() => {
      expect(createOrderSpy).toHaveBeenCalledTimes(1);
      const callArg = createOrderSpy.mock.calls[0][0];
      expect(callArg.outletId).toBe('22222222-2222-2222-2222-222222222222');
      expect(callArg.orderType).toBe('DINE_IN');
      expect(callArg.customerNotes).toBe('Table #3');
      expect(callArg.idempotencyKey).toMatch(/^POS-/);
      expect(callArg.items).toHaveLength(1);
      expect(callArg.items[0]).toEqual({
        productId: 'prod-boba-1',
        variantId: 'var-1',
        addOnIds: ['addon-1'],
        quantity: 1,
        itemNotes: undefined,
      });
    });

    // 8. Order success notification displays persisted order number & server total
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/Order #ORD-2026-0001 placed! Total: ₹7.61/i);
    });

    // 9. Cart is cleared
    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument();
  });

  it('handles order creation errors from backend', async () => {
    vi.spyOn(posApiClient, 'getCategories').mockResolvedValue(mockCategories);
    vi.spyOn(posApiClient, 'getProducts').mockResolvedValue(mockProducts);
    vi.spyOn(posApiClient, 'createOrder').mockRejectedValue(new Error('User is not authorized for outlet'));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Butter Croissant')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Select Butter Croissant'));
    fireEvent.click(screen.getByRole('button', { name: /Add to Cart/i }));

    fireEvent.click(screen.getByRole('button', { name: /Review & Place Order/i }));
    fireEvent.click(screen.getByRole('button', { name: /Confirm & Place Order/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/User is not authorized for outlet/i);
    });
  });
});

