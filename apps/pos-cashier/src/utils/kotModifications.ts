export interface KotModificationRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  tableNumber?: string;
  productName: string;
  variantName?: string;
  action: 'QUANTITY_CHANGE' | 'VOID' | 'NOTES_CHANGE';
  previousQuantity: number;
  newQuantity: number;
  previousNotes?: string;
  newNotes?: string;
  reason: string;
  managerApproved: boolean;
  timestamp: string; // ISO string
}

const STORAGE_KEY = 'krunnex_kot_modifications';

export function getKotModifications(orderId?: string): KotModificationRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    if (orderId) {
      return parsed.filter((m: KotModificationRecord) => m.orderId === orderId);
    }
    return parsed;
  } catch {
    return [];
  }
}

export function saveKotModification(record: Omit<KotModificationRecord, 'id' | 'timestamp'>): KotModificationRecord {
  const newRecord: KotModificationRecord = {
    ...record,
    id: `kot-mod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      const existing = getKotModifications();
      const updated = [newRecord, ...existing];
      // Keep recent 100 modification logs
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, 100)));
    } catch {
      // ignore
    }
  }

  return newRecord;
}
