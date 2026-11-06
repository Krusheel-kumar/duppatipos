import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KitchenDisplay } from './KitchenDisplay';
import { posApiClient } from '../api/posApiClient';
import type { KitchenTicket, PageResponse } from '../types/pos';

const mockKitchenTickets: KitchenTicket[] = [
  {
    id: 'ticket-1',
    ticketNumber: 'KOT-2026-001',
    status: 'QUEUED',
    orderNumberSnapshot: 'ORD-101',
    orderTypeSnapshot: 'DINE_IN',
    customerNotesSnapshot: 'Extra hot please',
    items: [
      {
        id: 'item-1',
        productNameSnapshot: 'Brown Sugar Milk Tea',
        variantNameSnapshot: 'Large 500ml',
        quantity: 2,
        itemNotesSnapshot: '50% Sugar',
        status: 'QUEUED',
        addOns: [
          { id: 'addon-1', addOnNameSnapshot: 'Tapioca Pearls' },
        ],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ticket-2',
    ticketNumber: 'KOT-2026-002',
    status: 'PREPARING',
    orderNumberSnapshot: 'ORD-102',
    orderTypeSnapshot: 'TAKEAWAY',
    items: [
      {
        id: 'item-2',
        productNameSnapshot: 'Iced Latte',
        quantity: 1,
        status: 'PREPARING',
        addOns: [],
      },
    ],
    createdAt: new Date(Date.now() - 300000).toISOString(), // 5 mins ago
    updatedAt: new Date().toISOString(),
  },
];

const mockPageResponse: PageResponse<KitchenTicket> = {
  content: mockKitchenTickets,
  totalElements: 2,
  totalPages: 1,
  size: 50,
  number: 0,
};

describe('Kitchen Display System (KDS)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    posApiClient.updateConfig({
      baseUrl: 'http://localhost:8080',
      tenantId: 'tenant-123',
      outletId: 'outlet-456',
    });
  });

  it('loads and displays active kitchen tickets with items, variants, and notes', async () => {
    vi.spyOn(posApiClient, 'getKitchenTickets').mockResolvedValue(mockPageResponse);

    render(<KitchenDisplay />);

    expect(screen.getByText(/Loading tickets from kitchen queue.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('KOT-2026-001')).toBeInTheDocument();
      expect(screen.getByText('Order: ORD-101')).toBeInTheDocument();
      expect(screen.getByText('DINE_IN')).toBeInTheDocument();
      expect(screen.getByText(/Extra hot please/i)).toBeInTheDocument();
      expect(screen.getByText('Brown Sugar Milk Tea')).toBeInTheDocument();
      expect(screen.getByText('(Large 500ml)')).toBeInTheDocument();
      expect(screen.getByText(/Note: 50% Sugar/i)).toBeInTheDocument();
      expect(screen.getByText(/\+ Tapioca Pearls/i)).toBeInTheDocument();

      expect(screen.getByText('KOT-2026-002')).toBeInTheDocument();
      expect(screen.getByText('Iced Latte')).toBeInTheDocument();
    });
  });

  it('updates ticket status to PREPARING when Start All is clicked', async () => {
    vi.spyOn(posApiClient, 'getKitchenTickets').mockResolvedValue(mockPageResponse);

    const updatedTicket: KitchenTicket = {
      ...mockKitchenTickets[0],
      status: 'PREPARING',
    };
    const updateSpy = vi.spyOn(posApiClient, 'updateKitchenTicketStatus').mockResolvedValue(updatedTicket);

    render(<KitchenDisplay />);

    await waitFor(() => {
      expect(screen.getByText('KOT-2026-001')).toBeInTheDocument();
    });

    const startBtn = screen.getByRole('button', { name: /Start All \(PREPARING\)/i });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('ticket-1', 'PREPARING', undefined);
    });
  });

  it('updates individual item preparation status independently', async () => {
    vi.spyOn(posApiClient, 'getKitchenTickets').mockResolvedValue(mockPageResponse);

    const updatedItem = {
      ...mockKitchenTickets[0].items[0],
      status: 'PREPARING' as const,
    };
    const updateItemSpy = vi.spyOn(posApiClient, 'updateKitchenTicketItemStatus').mockResolvedValue(updatedItem);

    render(<KitchenDisplay />);

    await waitFor(() => {
      expect(screen.getByText('Brown Sugar Milk Tea')).toBeInTheDocument();
    });

    const cookBtn = screen.getByRole('button', { name: /Start preparing Brown Sugar Milk Tea/i });
    fireEvent.click(cookBtn);

    await waitFor(() => {
      expect(updateItemSpy).toHaveBeenCalledWith('item-1', 'PREPARING');
    });
  });

  it('handles API error states with retry action', async () => {
    vi.spyOn(posApiClient, 'getKitchenTickets').mockRejectedValue(new Error('User is not authorized for outlet: 403'));

    render(<KitchenDisplay />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/User is not authorized for outlet: 403/i);
    });

    // Mock successful retry
    vi.spyOn(posApiClient, 'getKitchenTickets').mockResolvedValue(mockPageResponse);
    const retryBtn = screen.getByRole('button', { name: /Retry Connection/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('KOT-2026-001')).toBeInTheDocument();
    });
  });
});
