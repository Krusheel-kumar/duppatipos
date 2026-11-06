export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'COUNTER';

export type KitchenTicketStatus = 'QUEUED' | 'PREPARING' | 'READY' | 'CANCELLED';

export type BillStatus = 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'OTHER';

export type PaymentStatus = 'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'REFUNDED';

export interface Outlet {
  id: string;
  name: string;
}

export interface KitchenTicketItemAddOn {
  id: string;
  addOnNameSnapshot: string;
}

export interface KitchenTicketItem {
  id: string;
  orderItemId?: string;
  productNameSnapshot: string;
  variantNameSnapshot?: string;
  quantity: number;
  itemNotesSnapshot?: string;
  status: KitchenTicketStatus;
  addOns: KitchenTicketItemAddOn[];
}

export interface KitchenTicket {
  id: string;
  ticketNumber: string;
  status: KitchenTicketStatus;
  orderNumberSnapshot: string;
  orderTypeSnapshot: string;
  customerNotesSnapshot?: string;
  cancellationReason?: string;
  items: KitchenTicketItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface TaxRate {
  id: string;
  name: string;
  ratePercent: number;
  isInclusive: boolean;
}

export interface AddOn {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
}

export interface ProductVariant {
  id?: string;
  name: string;
  sizeLabel?: string;
  sku?: string;
  price: number;
  isActive: boolean;
  displayOrder?: number;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  imageUrl?: string;
  basePrice: number;
  isActive: boolean;
  category?: ProductCategory;
  taxRate?: TaxRate;
  variants: ProductVariant[];
  addOns: AddOn[];
}

export interface ProductRequest {
  categoryId: string;
  name: string;
  description?: string;
  sku?: string;
  imageUrl?: string;
  basePrice: number;
  isActive?: boolean;
  variants?: {
    name: string;
    sizeLabel?: string;
    sku?: string;
    price: number;
    isActive?: boolean;
    displayOrder?: number;
  }[];
  addOnIds?: string[];
}

export interface CategoryRequest {
  name: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface AddOnRequest {
  name: string;
  price: number;
  isActive?: boolean;
}

export interface CartItem {
  id: string; // client temporary uuid
  product: Product;
  selectedVariant?: ProductVariant;
  selectedAddOns: AddOn[];
  quantity: number;
  itemNotes: string;
  unitPrice: number;
  lineTotal: number;
}

export interface CalculationItemDetail {
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  taxRatePercent: number;
  isTaxInclusive: boolean;
  itemTax: number;
}

export interface CalculationResponse {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
  items: CalculationItemDetail[];
}

export interface CreateOrderRequest {
  outletId: string;
  orderType: OrderType;
  idempotencyKey?: string;
  customerNotes?: string;
  discountId?: string;
  items: {
    productId: string;
    variantId?: string;
    addOnIds: string[];
    quantity: number;
    itemNotes?: string;
  }[];
}

export interface OrderItem {
  id: string;
  productNameSnapshot: string;
  variantNameSnapshot?: string;
  quantity: number;
  unitPriceSnapshot: number;
  lineTotalSnapshot: number;
  itemNotes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  orderType: OrderType;
  status: string;
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
  items?: OrderItem[];
  customerNotes?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  transactionReference?: string;
  createdAt: string;
}

export interface Bill {
  id: string;
  invoiceNumber: string;
  status: BillStatus;
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  order?: {
    id: string;
    orderNumber: string;
  };
  payments?: Payment[];
  createdAt: string;
}
