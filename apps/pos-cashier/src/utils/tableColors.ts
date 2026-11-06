import type { TableStatus } from '../types/pos';
import type { RestaurantTable } from './tableStorage';

export interface TableStatusMeta {
  status: TableStatus;
  label: string;
  badgeBg: string;
  badgeColor: string;
  badgeBorder: string;
  cardBg: string;
  cardBorder: string;
  chipBg: string;
  chipBorder: string;
  chipColor: string;
  icon: string;
}

/**
 * Color palette specifications:
 * - AVAILABLE: Green
 * - RUNNING: Orange
 * - BILL_REQUESTED / PAYMENT_DUE: Yellow
 * - PAID_CLEARING: Blue
 * - CLOSED: Gray
 */
export function getTableStatusMeta(tbl: RestaurantTable): TableStatusMeta {
  const status: TableStatus = tbl.status || (tbl.currentOrderId ? 'RUNNING' : 'AVAILABLE');

  switch (status) {
    case 'RUNNING':
      return {
        status: 'RUNNING',
        label: 'OCCUPIED / RUNNING',
        badgeBg: '#ffedd5',       // warm light orange
        badgeColor: '#c2410c',    // orange-700
        badgeBorder: '#fed7aa',   // orange-200
        cardBg: '#fffaf5',        // subtle orange tint
        cardBorder: '#f97316',    // orange-500
        chipBg: '#fff7ed',        // orange-50
        chipBorder: '#f97316',    // orange-500
        chipColor: '#c2410c',     // orange-700
        icon: '🟠',
      };

    case 'BILL_REQUESTED':
    case 'PAYMENT_DUE':
      return {
        status,
        label: status === 'BILL_REQUESTED' ? 'Bill Issued' : 'Payment Due',
        badgeBg: '#fef9c3',       // yellow-100
        badgeColor: '#a16207',    // yellow-700
        badgeBorder: '#fde047',   // yellow-300
        cardBg: '#fefce8',        // yellow-50
        cardBorder: '#eab308',    // yellow-500
        chipBg: '#fefce8',        // yellow-50
        chipBorder: '#eab308',    // yellow-500
        chipColor: '#854d0e',     // yellow-800
        icon: '⚠️',
      };

    case 'PAID_CLEARING':
    case 'AVAILABLE':
    default:
      return {
        status: 'AVAILABLE',
        label: 'Available',
        badgeBg: '#dcfce7',       // green-100
        badgeColor: '#15803d',    // green-700
        badgeBorder: '#bbf7d0',   // green-200
        cardBg: '#ffffff',
        cardBorder: '#22c55e',    // green-500
        chipBg: '#f0fdf4',        // green-50
        chipBorder: '#86efac',    // green-300
        chipColor: '#166534',     // green-800
        icon: '🟢',
      };

    case 'CLOSED':
      return {
        status: 'CLOSED',
        label: 'Closed',
        badgeBg: '#f1f5f9',
        badgeColor: '#64748b',
        badgeBorder: '#cbd5e1',
        cardBg: '#f8fafc',
        cardBorder: '#94a3b8',
        chipBg: '#f8fafc',
        chipBorder: '#cbd5e1',
        chipColor: '#64748b',
        icon: '🔒',
      };
  }
}
