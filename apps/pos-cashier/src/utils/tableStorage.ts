import type { TableStatus } from '../types/pos';

export interface RestaurantTable {
  id: string;
  tableNumber: string;
  name?: string;
  capacity?: number;
  status?: TableStatus;
  currentOrderId?: string;
  orderNumber?: string;
  durationMinutes?: number;
  currentTotal?: number;
  amountPaid?: number;
  amountDue?: number;
}

export const DEFAULT_TABLES: RestaurantTable[] = [
  { id: 'tbl-1', tableNumber: '1', name: 'Table 1', capacity: 2, status: 'AVAILABLE' },
  { id: 'tbl-2', tableNumber: '2', name: 'Table 2', capacity: 4, status: 'AVAILABLE' },
  { id: 'tbl-3', tableNumber: '3', name: 'Table 3', capacity: 4, status: 'AVAILABLE' },
  { id: 'tbl-4', tableNumber: '4', name: 'Table 4', capacity: 6, status: 'AVAILABLE' },
  { id: 'tbl-5', tableNumber: '5', name: 'Table 5', capacity: 2, status: 'AVAILABLE' },
  { id: 'tbl-6', tableNumber: '6', name: 'Table 6', capacity: 8, status: 'AVAILABLE' },
  { id: 'tbl-7', tableNumber: '7', name: 'Table 7', capacity: 4, status: 'AVAILABLE' },
  { id: 'tbl-8', tableNumber: '8', name: 'Table 8', capacity: 6, status: 'AVAILABLE' },
];

const STORAGE_KEY = 'krunnex_restaurant_tables';

export function getStoredTables(): RestaurantTable[] {
  if (typeof window === 'undefined') return DEFAULT_TABLES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TABLES));
      return DEFAULT_TABLES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((t, idx) => {
        let tbl = t;
        if (tbl.tableNumber === 'Im' || !tbl.tableNumber) {
          tbl = { ...tbl, tableNumber: String(idx + 1), name: `Table ${idx + 1}` };
        }
        // Settled tables must be immediately AVAILABLE
        if (tbl.status === 'PAID_CLEARING' || (tbl.amountDue === 0 && tbl.amountPaid && tbl.amountPaid > 0)) {
          tbl = {
            ...tbl,
            status: 'AVAILABLE' as const,
            currentOrderId: undefined,
            orderNumber: undefined,
            currentTotal: 0,
            amountPaid: 0,
            amountDue: 0,
          };
        }
        return tbl;
      });
    }
    return DEFAULT_TABLES;
  } catch {
    return DEFAULT_TABLES;
  }
}

export function saveTables(tables: RestaurantTable[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
  } catch {
    // ignore
  }
}
