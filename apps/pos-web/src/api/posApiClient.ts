import type {
  Product,
  ProductCategory,
  CreateOrderRequest,
  Order,
  CalculationResponse,
  KitchenTicket,
  KitchenTicketItem,
  KitchenTicketStatus,
  PageResponse,
  Outlet,
  CategoryRequest,
  ProductRequest,
  AddOn,
  AddOnRequest,
  Bill,
  RestaurantTable,
  TableRequest,
  TableStatusUpdateRequest,
  AddOrderItemsRequest,
  Payment,
  PaymentMethod,
  PaymentStatus,
  PaymentPolicy,
} from '../types/pos';

export interface PosApiConfig {
  baseUrl: string;
  tenantId?: string;
  outletId?: string;
  authHeader?: string; // Basic auth or Bearer token
}

export class PosApiClient {
  private config: PosApiConfig;

  constructor(config?: Partial<PosApiConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
      tenantId: config?.tenantId || import.meta.env.VITE_TENANT_ID,
      outletId: config?.outletId || import.meta.env.VITE_OUTLET_ID,
      authHeader: config?.authHeader || import.meta.env.VITE_AUTH_HEADER,
    };
  }

  public updateConfig(newConfig: Partial<PosApiConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): PosApiConfig {
    return { ...this.config };
  }

  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (this.config.tenantId) {
      headers['X-Tenant-ID'] = this.config.tenantId;
    }

    if (this.config.authHeader) {
      headers['Authorization'] = this.config.authHeader;
    }

    return headers;
  }

  /**
   * Fetch active categories from backend: GET /api/v1/categories
   */
  public async getCategories(): Promise<ProductCategory[]> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/categories`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to load categories: ${res.status} ${res.statusText}`);
    }

    return res.json();
  }

  /**
   * Fetch products from backend: GET /api/v1/products
   */
  public async getProducts(categoryId?: string): Promise<Product[]> {
    const url = new URL(`${this.config.baseUrl}/api/v1/products`);
    if (categoryId && categoryId !== 'cat-all') {
      url.searchParams.set('categoryId', categoryId);
    }

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to load products: ${res.status} ${res.statusText}`);
    }

    return res.json();
  }

  /**
   * Optional server-side pricing calculation: POST /api/v1/pricing/calculate
   */
  public async calculatePricing(items: { productId: string; variantId?: string; addOnIds: string[]; quantity: number }[]): Promise<CalculationResponse | null> {
    if (!this.config.outletId) return null;

    const res = await fetch(`${this.config.baseUrl}/api/v1/pricing/calculate`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        outletId: this.config.outletId,
        items,
      }),
    });

    if (!res.ok) {
      return null;
    }

    return res.json();
  }

  /**
   * Create order in backend: POST /api/v1/orders
   */
  public async createOrder(orderRequest: CreateOrderRequest): Promise<Order> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/orders`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(orderRequest),
    });

    if (!res.ok) {
      let errorMsg = `Server error ${res.status}`;
      try {
        const errorJson = await res.json();
        if (errorJson.error) {
          errorMsg = errorJson.error;
        } else if (errorJson.message) {
          errorMsg = errorJson.message;
        }
      } catch {
        // use default error message
      }
      throw new Error(errorMsg);
    }

    return res.json();
  }

  /**
   * Get single order by ID: GET /api/v1/orders/{id}
   */
  public async getOrderById(orderId: string): Promise<Order> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/orders/${orderId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch order: ${res.status}`);
    }

    return res.json();
  }

  /**
   * Fetch kitchen tickets for an outlet: GET /api/v1/kitchen-tickets/outlet/{outletId}
   */
  public async getKitchenTickets(
    outletId?: string,
    status?: KitchenTicketStatus,
    page = 0,
    size = 50
  ): Promise<PageResponse<KitchenTicket>> {
    const targetOutletId = outletId || this.config.outletId;
    if (!targetOutletId) {
      throw new Error('Outlet ID is required to fetch kitchen tickets');
    }

    const url = new URL(`${this.config.baseUrl}/api/v1/kitchen-tickets/outlet/${targetOutletId}`);
    url.searchParams.set('page', page.toString());
    url.searchParams.set('size', size.toString());
    if (status) {
      url.searchParams.set('status', status);
    }

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      let errorMsg = `Server error ${res.status}`;
      try {
        const errorJson = await res.json();
        if (errorJson.error) errorMsg = errorJson.error;
        else if (errorJson.message) errorMsg = errorJson.message;
      } catch {
        // use default error message
      }
      throw new Error(errorMsg);
    }

    return res.json();
  }

  /**
   * Update ticket status: PATCH /api/v1/kitchen-tickets/{id}/status
   */
  public async updateKitchenTicketStatus(
    ticketId: string,
    status: KitchenTicketStatus,
    cancellationReason?: string
  ): Promise<KitchenTicket> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/kitchen-tickets/${ticketId}/status`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({
        status,
        cancellationReason,
      }),
    });

    if (!res.ok) {
      let errorMsg = `Server error ${res.status}`;
      try {
        const errorJson = await res.json();
        if (errorJson.error) errorMsg = errorJson.error;
        else if (errorJson.message) errorMsg = errorJson.message;
      } catch {
        // use default error message
      }
      throw new Error(errorMsg);
    }

    return res.json();
  }

  /**
   * Update item-level status: PATCH /api/v1/kitchen-tickets/items/{itemId}/status
   */
  public async updateKitchenTicketItemStatus(
    itemId: string,
    status: KitchenTicketStatus
  ): Promise<KitchenTicketItem> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/kitchen-tickets/items/${itemId}/status`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      let errorMsg = `Server error ${res.status}`;
      try {
        const errorJson = await res.json();
        if (errorJson.error) errorMsg = errorJson.error;
        else if (errorJson.message) errorMsg = errorJson.message;
      } catch {
        // use default error message
      }
      throw new Error(errorMsg);
    }

    return res.json();
  }

  /**
   * Fetch outlets: GET /api/v1/outlets
   */
  public async getOutlets(): Promise<Outlet[]> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/outlets`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to load outlets: ${res.status} ${res.statusText}`);
    }

    return res.json();
  }

  /**
   * Create category: POST /api/v1/categories
   */
  public async createCategory(req: CategoryRequest): Promise<ProductCategory> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/categories`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(req),
    });

    if (!res.ok) {
      let errorMsg = `Server error ${res.status}`;
      try {
        const err = await res.json();
        if (err.error || err.message) errorMsg = err.error || err.message;
      } catch {
        // use default
      }
      throw new Error(errorMsg);
    }

    return res.json();
  }

  /**
   * Deactivate category: PATCH /api/v1/categories/{id}/deactivate
   */
  public async deactivateCategory(id: string): Promise<ProductCategory> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/categories/${id}/deactivate`, {
      method: 'PATCH',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to deactivate category: ${res.status}`);
    }

    return res.json();
  }

  /**
   * Create product: POST /api/v1/products
   */
  public async createProduct(req: ProductRequest): Promise<Product> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/products`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(req),
    });

    if (!res.ok) {
      let errorMsg = `Server error ${res.status}`;
      try {
        const err = await res.json();
        if (err.error || err.message) errorMsg = err.error || err.message;
      } catch {
        // use default
      }
      throw new Error(errorMsg);
    }

    return res.json();
  }

  /**
   * Deactivate product: PATCH /api/v1/products/{id}/deactivate
   */
  public async deactivateProduct(id: string): Promise<Product> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/products/${id}/deactivate`, {
      method: 'PATCH',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to deactivate product: ${res.status}`);
    }

    return res.json();
  }

  /**
   * Fetch add-ons: GET /api/v1/addons
   */
  public async getAddOns(): Promise<AddOn[]> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/addons`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to load add-ons: ${res.status} ${res.statusText}`);
    }

    return res.json();
  }

  /**
   * Create add-on: POST /api/v1/addons
   */
  public async createAddOn(req: AddOnRequest): Promise<AddOn> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/addons`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(req),
    });

    if (!res.ok) {
      let errorMsg = `Server error ${res.status}`;
      try {
        const err = await res.json();
        if (err.error || err.message) errorMsg = err.error || err.message;
      } catch {
        // use default
      }
      throw new Error(errorMsg);
    }

    return res.json();
  }

  /**
   * Fetch outlet orders: GET /api/v1/orders/outlet/{outletId}
   */
  public async getOutletOrders(outletId?: string): Promise<Order[]> {
    const targetOutletId = outletId || this.config.outletId;
    if (!targetOutletId) {
      throw new Error('Outlet ID is required to fetch orders');
    }

    const res = await fetch(`${this.config.baseUrl}/api/v1/orders/outlet/${targetOutletId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to load orders: ${res.status} ${res.statusText}`);
    }

    return res.json();
  }

  /**
   * Fetch outlet bills: GET /api/v1/bills/outlet/{outletId}
   */
  public async getOutletBills(outletId?: string): Promise<Bill[]> {
    const targetOutletId = outletId || this.config.outletId;
    if (!targetOutletId) {
      throw new Error('Outlet ID is required to fetch bills');
    }

    const res = await fetch(`${this.config.baseUrl}/api/v1/bills/outlet/${targetOutletId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to load bills: ${res.status} ${res.statusText}`);
    }

    return res.json();
  }

  /**
   * Fetch restaurant tables for outlet: GET /api/v1/tables/outlet/{outletId}
   */
  public async getTables(outletId?: string): Promise<RestaurantTable[]> {
    const targetOutletId = outletId || this.config.outletId;
    if (!targetOutletId) {
      return [];
    }

    const res = await fetch(`${this.config.baseUrl}/api/v1/tables/outlet/${targetOutletId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to load tables: ${res.status} ${res.statusText}`);
    }

    return res.json();
  }

  /**
   * Create restaurant table: POST /api/v1/tables
   */
  public async createTable(req: TableRequest): Promise<RestaurantTable> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/tables`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(req),
    });

    if (!res.ok) {
      let errorMsg = `Server error ${res.status}`;
      try {
        const err = await res.json();
        if (err.error || err.message) errorMsg = err.error || err.message;
      } catch {
        // default
      }
      throw new Error(errorMsg);
    }

    return res.json();
  }

  /**
   * Update table status: PATCH /api/v1/tables/{id}/status
   */
  public async updateTableStatus(tableId: string, req: TableStatusUpdateRequest): Promise<RestaurantTable> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/tables/${tableId}/status`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(req),
    });

    if (!res.ok) {
      let errorMsg = `Server error ${res.status}`;
      try {
        const err = await res.json();
        if (err.error || err.message) errorMsg = err.error || err.message;
      } catch {
        // default
      }
      throw new Error(errorMsg);
    }

    return res.json();
  }

  /**
   * Delete table: DELETE /api/v1/tables/{id}
   */
  public async deleteTable(tableId: string): Promise<void> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/tables/${tableId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      let errorMsg = `Server error ${res.status}`;
      try {
        const err = await res.json();
        if (err.error || err.message) errorMsg = err.error || err.message;
      } catch {
        // default
      }
      throw new Error(errorMsg);
    }
  }

  /**
   * Submit additional items to running order: POST /api/v1/orders/{id}/add-items
   */
  public async addOrderItems(orderId: string, req: AddOrderItemsRequest): Promise<Order> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/orders/${orderId}/add-items`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(req),
    });

    if (!res.ok) {
      let errorMsg = `Server error ${res.status}`;
      try {
        const err = await res.json();
        if (err.error || err.message) errorMsg = err.error || err.message;
      } catch {
        // default
      }
      throw new Error(errorMsg);
    }

    return res.json();
  }

  /**
   * Issue Bill for Order: POST /api/v1/bills
   */
  public async issueBill(orderId: string, notes?: string): Promise<Bill> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/bills`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ orderId, notes }),
    });

    if (!res.ok) {
      let errorMsg = `Server error ${res.status}`;
      try {
        const err = await res.json();
        if (err.error || err.message) errorMsg = err.error || err.message;
      } catch {
        // default
      }
      throw new Error(errorMsg);
    }

    return res.json();
  }

  /**
   * Get Bill for Order: GET /api/v1/bills/order/{orderId}
   */
  public async getBillByOrderId(orderId: string): Promise<Bill | null> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/bills/order/${orderId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Failed to load bill: ${res.status}`);
    }

    return res.json();
  }

  /**
   * Record payment for Bill: POST /api/v1/bills/payments
   */
  public async recordPayment(
    billId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    idempotencyKey?: string,
    transactionReference?: string
  ): Promise<Payment> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/bills/payments`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        billId,
        amount,
        paymentMethod,
        idempotencyKey,
        transactionReference,
      }),
    });

    if (!res.ok) {
      let errorMsg = `Server error ${res.status}`;
      try {
        const err = await res.json();
        if (err.error || err.message) errorMsg = err.error || err.message;
      } catch {
        // default
      }
      throw new Error(errorMsg);
    }

    return res.json();
  }

  /**
   * Update payment status (e.g. confirm SUCCESSFUL): PATCH /api/v1/bills/payments/{id}/status
   */
  public async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    failureReason?: string,
    refundReason?: string
  ): Promise<Payment> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/bills/payments/${paymentId}/status`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({
        status,
        failureReason,
        refundReason,
      }),
    });

    if (!res.ok) {
      let errorMsg = `Server error ${res.status}`;
      try {
        const err = await res.json();
        if (err.error || err.message) errorMsg = err.error || err.message;
      } catch {
        // default
      }
      throw new Error(errorMsg);
    }

    return res.json();
  }

  /**
   * Update outlet payment policy: PATCH /api/v1/outlets/{id}/payment-policy
   */
  public async updatePaymentPolicy(outletId: string, policy: PaymentPolicy): Promise<Outlet> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/outlets/${outletId}/payment-policy?policy=${policy}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to update payment policy: ${res.status}`);
    }

    return res.json();
  }
}

export const posApiClient = new PosApiClient();
