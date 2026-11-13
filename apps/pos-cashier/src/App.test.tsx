import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';
import { posApiClient } from './api/posApiClient';
import type { Product, ProductCategory } from './types/pos';

const mockCategories: ProductCategory[] = [
  { id: 'cat-bedsheets', name: 'Premium Bedsheets' },
  { id: 'cat-kurtis', name: 'Kids Kurtis' },
];

const mockProducts: Product[] = [
  {
    id: 'prod-bs-1',
    name: 'Egyptian Cotton Bedsheet (King 108"x108")',
    description: '400TC Egyptian cotton.',
    sku: 'KRN-BS-KNG-001',
    barcode: 'KRN-BS-KNG-001',
    fabric: '100% Egyptian Cotton (400TC)',
    hsnCode: '6302',
    mrp: 3499,
    basePrice: 2699,
    isActive: true,
    category: mockCategories[0],
    variants: [
      { id: 'var-1', name: 'King (108"x108") - Sage Olive', sizeLabel: 'King 108x108', price: 2699, mrp: 3499, isActive: true },
    ],
    addOns: [],
  },
  {
    id: 'prod-kt-1',
    name: "Kids' Handblock Mulmul Kurti",
    description: 'Mulmul cotton kurti.',
    sku: 'KRN-KT-04Y-010',
    barcode: 'KRN-KT-04Y-010',
    fabric: 'Pure Mulmul Cotton',
    hsnCode: '6104',
    mrp: 1299,
    basePrice: 899,
    isActive: true,
    category: mockCategories[1],
    variants: [
      { id: 'var-2', name: 'Size: 4-5 Years (Mustard Yellow)', sizeLabel: '4-5Y', price: 899, mrp: 1299, isActive: true },
    ],
    addOns: [],
  },
];

describe('Single-Store Textile Retail POS', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    posApiClient.updateConfig({
      baseUrl: 'http://localhost:8080',
      tenantId: '11111111-1111-1111-1111-111111111111',
      outletId: '22222222-2222-2222-2222-222222222222',
    });
  });

  it('renders Krunnex Luxe Retail branding and retail action tools', async () => {
    vi.spyOn(posApiClient, 'getCategories').mockResolvedValue(mockCategories);
    vi.spyOn(posApiClient, 'getProducts').mockResolvedValue(mockProducts);

    render(<App />);

    // Brand title
    expect(screen.getByText('KRUNNEX')).toBeInTheDocument();

    // Retail action buttons in header / sidebar
    expect(screen.getAllByText('Camera Scan')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Barcode Studio')[0]).toBeInTheDocument();
    expect(screen.getByText('Returns / Exchanges')).toBeInTheDocument();
    expect(screen.getAllByText('Daily Sales (Z)')[0]).toBeInTheDocument();
  });

  it('loads textile products and allows adding to cart via catalog or scan', async () => {
    vi.spyOn(posApiClient, 'getCategories').mockResolvedValue(mockCategories);
    vi.spyOn(posApiClient, 'getProducts').mockResolvedValue(mockProducts);

    render(<App />);

    // Switch to Browse Collections to view full product cards
    fireEvent.click(screen.getByText(/Browse Collections/i));

    await waitFor(() => {
      expect(screen.getByText('Egyptian Cotton Bedsheet (King 108"x108")')).toBeInTheDocument();
      expect(screen.getByText("Kids' Handblock Mulmul Kurti")).toBeInTheDocument();
    });

    // Click product to select
    fireEvent.click(screen.getByLabelText('Select Egyptian Cotton Bedsheet (King 108"x108")'));

    // Modal opens with variants
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Select Size \/ Variant/i })).toBeInTheDocument();
    });

    // Add to cart
    fireEvent.click(screen.getByRole('button', { name: /Add to Cart/i }));

    // Cart shows the item and Checkout button
    await waitFor(() => {
      expect(screen.getByText('Checkout')).toBeInTheDocument();
    });
  });

  it('opens Camera Barcode Scanner when Camera Scan is clicked', async () => {
    vi.spyOn(posApiClient, 'getCategories').mockResolvedValue(mockCategories);
    vi.spyOn(posApiClient, 'getProducts').mockResolvedValue(mockProducts);

    render(<App />);

    fireEvent.click(screen.getAllByText('Camera Scan')[0]);

    await waitFor(() => {
      expect(screen.getByText('Phone Camera Barcode Scanner')).toBeInTheDocument();
      expect(screen.getByText(/1-Click Quick Scan Buttons/i)).toBeInTheDocument();
    });
  });

  it('opens Barcode Label Studio when Barcode Studio is clicked', async () => {
    vi.spyOn(posApiClient, 'getCategories').mockResolvedValue(mockCategories);
    vi.spyOn(posApiClient, 'getProducts').mockResolvedValue(mockProducts);

    render(<App />);

    fireEvent.click(screen.getAllByText('Barcode Studio')[0]);

    await waitFor(() => {
      expect(screen.getByText('Barcode Label Studio & Generator')).toBeInTheDocument();
      expect(screen.getByText(/Print \d+ Label/i)).toBeInTheDocument();
    });
  });

  it('opens Daily Sales Closing Z-Report modal', async () => {
    vi.spyOn(posApiClient, 'getCategories').mockResolvedValue(mockCategories);
    vi.spyOn(posApiClient, 'getProducts').mockResolvedValue(mockProducts);

    render(<App />);

    fireEvent.click(screen.getAllByText('Daily Sales (Z)')[0]);

    await waitFor(() => {
      expect(screen.getByText('Daily Sales Closing Report (Z-Report)')).toBeInTheDocument();
      expect(screen.getByText(/PAYMENT MODE RECONCILIATION/i)).toBeInTheDocument();
    });
  });
});
