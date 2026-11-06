import { useState, useMemo, useEffect, useCallback } from 'react';
import type {
  Product,
  CartItem,
  OrderType,
  CalculationResponse,
  CreateOrderRequest,
  RestaurantTable,
  TableStatus,
  PaymentPolicy,
  Bill,
  PaymentMethod,
  Order,
} from './types/pos';
import { ProductCard } from './components/ProductCard';
import { ProductModal } from './components/ProductModal';
import { CartPanel } from './components/CartPanel';
import { OrderReviewModal } from './components/OrderReviewModal';
import { TableManagementView } from './components/TableManagementView';
import { PaymentCollectModal } from './components/PaymentCollectModal';
import { KitchenDisplay } from './components/KitchenDisplay';
import { AdminLayout } from './components/admin/AdminLayout';
import { posApiClient } from './api/posApiClient';
import './App.css';

type ActiveTab = 'MENU' | 'TABLES';

export function App() {
  const [currentPath, setCurrentPath] = useState<string>(
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  const [activeTab, setActiveTab] = useState<ActiveTab>('MENU');

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('cat-all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeModalProduct, setActiveModalProduct] = useState<Product | null>(null);

  // Table Management State
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);

  // Running Order State (When adding items to an existing running dine-in order)
  const [runningOrder, setRunningOrder] = useState<Order | null>(null);

  // Payment Collection Modal State
  const [activePaymentOrder, setActivePaymentOrder] = useState<Order | null>(null);
  const [activePaymentBill, setActivePaymentBill] = useState<Bill | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);

  // Outlet & Payment Policy
  const [paymentPolicy, setPaymentPolicy] = useState<PaymentPolicy>('FLEXIBLE');

  // Loading & Error States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('DINE_IN');
  const [customerNotes, setCustomerNotes] = useState<string>('');
  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [orderSuccessMessage, setOrderSuccessMessage] = useState<string | null>(null);

  // Backend calculation state (null indicates fallback local estimate)
  const [backendCalculation, setBackendCalculation] = useState<CalculationResponse | null>(null);

  // Load Tables
  const loadTables = useCallback(async () => {
    try {
      const outletId = posApiClient.getConfig().outletId;
      if (!outletId) return;
      const data = await posApiClient.getTables(outletId);
      setTables(data);
    } catch (err: unknown) {
      console.warn('Could not fetch tables:', err);
    }
  }, []);

  // Load Real Catalog Data from Backend
  const loadCatalog = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const [catData, prodData] = await Promise.all([
        posApiClient.getCategories(),
        posApiClient.getProducts(),
      ]);
      setCategories([{ id: 'cat-all', name: 'All Items' }, ...catData]);
      setProducts(prodData);
      await loadTables();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to backend';
      setApiError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [loadTables]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // Recalculate totals with backend pricing when cart items change
  useEffect(() => {
    if (cartItems.length === 0) {
      setBackendCalculation(null);
      return;
    }

    const calcItems = cartItems.map((item) => ({
      productId: item.product.id,
      variantId: item.selectedVariant?.id,
      addOnIds: item.selectedAddOns.map((a) => a.id),
      quantity: item.quantity,
    }));

    posApiClient
      .calculatePricing(calcItems)
      .then((calc) => {
        if (calc) {
          setBackendCalculation(calc);
        }
      })
      .catch(() => {
        // Silent catch: falls back to item line totals
      });
  }, [cartItems]);

  // Filter products by category and search query
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory =
        selectedCategoryId === 'cat-all' ||
        product.category?.id === selectedCategoryId;
      const matchesSearch =
        searchQuery.trim() === '' ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategoryId, searchQuery]);

  // Cart Management
  const handleAddToCart = (item: Omit<CartItem, 'id' | 'lineTotal'>) => {
    const newItem: CartItem = {
      ...item,
      id: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      lineTotal: item.unitPrice * item.quantity,
    };
    setCartItems((prev) => [...prev, newItem]);
  };

  const handleUpdateQuantity = (cartItemId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id === cartItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0
              ? {
                  ...item,
                  quantity: newQty,
                  lineTotal: item.unitPrice * newQty,
                }
              : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const handleRemoveItem = (cartItemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== cartItemId));
  };

  const handleClearCart = () => {
    setCartItems([]);
    setCustomerNotes('');
    setBackendCalculation(null);
    setRunningOrder(null);
  };

  // Table Selection & Actions
  const handleSelectTable = (table: RestaurantTable) => {
    setSelectedTable(table);
    setOrderType('DINE_IN');
    setRunningOrder(null);
    setActiveTab('MENU');
  };

  const handleOpenRunningOrder = async (orderId: string) => {
    try {
      setIsLoading(true);
      const order = await posApiClient.getOrderById(orderId);
      setRunningOrder(order);
      setOrderType('DINE_IN');
      if (order.table) {
        setSelectedTable(order.table);
      }
      setActiveTab('MENU');
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Failed to load running order');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTable = async (tableNumber: string, capacity: number) => {
    const outletId = posApiClient.getConfig().outletId || '00000000-0000-0000-0000-000000000000';
    await posApiClient.createTable({
      outletId,
      tableNumber,
      capacity,
    });
    await loadTables();
  };

  const handleDeleteTable = async (tableId: string) => {
    await posApiClient.deleteTable(tableId);
    if (selectedTable?.id === tableId) {
      setSelectedTable(null);
    }
    await loadTables();
  };

  const handleUpdateTableStatus = async (tableId: string, status: TableStatus, reason?: string) => {
    await posApiClient.updateTableStatus(tableId, { status, reason });
    await loadTables();
  };

  // Billing & Payment Actions
  const handleOpenPayment = async (orderId: string) => {
    try {
      setIsProcessingPayment(true);
      const order = await posApiClient.getOrderById(orderId);
      let bill = await posApiClient.getBillByOrderId(orderId);
      if (!bill) {
        bill = await posApiClient.issueBill(orderId);
      }
      setActivePaymentOrder(order);
      setActivePaymentBill(bill);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Failed to open payment');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleGenerateBill = async (orderId: string) => {
    try {
      const bill = await posApiClient.issueBill(orderId);
      setOrderSuccessMessage(`Bill #${bill.invoiceNumber} generated! Total: ₹${bill.totalAmount.toFixed(2)}`);
      await loadTables();
      setTimeout(() => setOrderSuccessMessage(null), 5000);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Failed to generate bill');
    }
  };

  const handleRecordPayment = async (amount: number, method: PaymentMethod, ref?: string) => {
    if (!activePaymentBill || !activePaymentOrder) return;
    setIsProcessingPayment(true);
    try {
      const pmtKey = `PMT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const payment = await posApiClient.recordPayment(activePaymentBill.id, amount, method, pmtKey, ref);
      // Confirm payment to SUCCESSFUL
      await posApiClient.updatePaymentStatus(payment.id, 'SUCCESSFUL');

      setOrderSuccessMessage(`Payment of ₹${amount.toFixed(2)} recorded successfully!`);
      setActivePaymentBill(null);
      setActivePaymentOrder(null);
      await loadTables();
      setTimeout(() => setOrderSuccessMessage(null), 5000);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Failed to record payment');
      throw err;
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Policy Switcher
  const handlePolicyChange = async (newPolicy: PaymentPolicy) => {
    const outletId = posApiClient.getConfig().outletId;
    if (!outletId) return;
    try {
      await posApiClient.updatePaymentPolicy(outletId, newPolicy);
      setPaymentPolicy(newPolicy);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Failed to change payment policy');
    }
  };

  // Submit flow: Either create new order or add items to running order
  const handleConfirmOrder = async () => {
    setIsSubmitting(true);
    setApiError(null);

    // If adding items to an existing running order
    if (runningOrder) {
      try {
        const idempotencyKey = `ADD-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
        const updated = await posApiClient.addOrderItems(runningOrder.id, {
          idempotencyKey,
          items: cartItems.map((item) => ({
            productId: item.product.id,
            variantId: item.selectedVariant?.id,
            addOnIds: item.selectedAddOns.map((a) => a.id),
            quantity: item.quantity,
            itemNotes: item.itemNotes.trim() !== '' ? item.itemNotes : undefined,
          })),
        });

        setOrderSuccessMessage(
          `Items added to Order #${updated.orderNumber}! New Total: ₹${updated.totalAmount.toFixed(2)} (Add-on KOT dispatched)`
        );
        setIsReviewOpen(false);
        setCartItems([]);
        setCustomerNotes('');
        setBackendCalculation(null);
        setRunningOrder(null);
        await loadTables();
        setTimeout(() => setOrderSuccessMessage(null), 6000);
      } catch (err: unknown) {
        setApiError(err instanceof Error ? err.message : 'Failed to add items to running order');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Normal Create Order flow
    const outletId = posApiClient.getConfig().outletId || '00000000-0000-0000-0000-000000000000';
    const idempotencyKey = `POS-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    const orderPayload: CreateOrderRequest = {
      outletId,
      orderType,
      idempotencyKey,
      tableId: orderType === 'DINE_IN' && selectedTable ? selectedTable.id : undefined,
      tableNumber: orderType === 'DINE_IN' && selectedTable ? selectedTable.tableNumber : undefined,
      customerNotes: customerNotes.trim() !== '' ? customerNotes : undefined,
      items: cartItems.map((item) => ({
        productId: item.product.id,
        variantId: item.selectedVariant?.id,
        addOnIds: item.selectedAddOns.map((a) => a.id),
        quantity: item.quantity,
        itemNotes: item.itemNotes.trim() !== '' ? item.itemNotes : undefined,
      })),
    };

    try {
      const createdOrder = await posApiClient.createOrder(orderPayload);
      setIsReviewOpen(false);
      setCartItems([]);
      setCustomerNotes('');
      setBackendCalculation(null);
      await loadTables();

      // If Payment Policy is PAY_FIRST, prompt payment modal immediately
      if (paymentPolicy === 'PAY_FIRST') {
        setOrderSuccessMessage(
          `Order #${createdOrder.orderNumber} created. Awaiting payment to release KOT.`
        );
        await handleOpenPayment(createdOrder.id);
      } else {
        setOrderSuccessMessage(
          `Order #${createdOrder.orderNumber} placed! Total: ₹${createdOrder.totalAmount.toFixed(2)}`
        );
      }

      setTimeout(() => {
        setOrderSuccessMessage(null);
      }, 6000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to place order';
      setApiError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (currentPath === '/admin') {
    return <AdminLayout />;
  }

  if (currentPath === '/kitchen') {
    return (
      <KitchenDisplay
        onBackToPos={() => {
          window.history.pushState({}, '', '/');
          setCurrentPath('/');
        }}
      />
    );
  }

  return (
    <div className="pos-app-root">
      {/* Top Bar */}
      <header className="pos-topbar">
        <div className="topbar-branding">
          <h1>Krunnex POS</h1>
          <span className="cashier-tag">Register #1 • Live POS</span>
        </div>

        {/* View Switcher: Menu vs Tables */}
        <div className="topbar-view-switcher" style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
          <button
            type="button"
            className={`view-tab-btn ${activeTab === 'MENU' ? 'active' : ''}`}
            onClick={() => setActiveTab('MENU')}
            style={{
              padding: '6px 14px',
              border: 'none',
              borderRadius: '6px',
              background: activeTab === 'MENU' ? '#2563eb' : 'transparent',
              color: activeTab === 'MENU' ? '#fff' : '#475569',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            🍽 Menu POS
          </button>
          <button
            type="button"
            className={`view-tab-btn ${activeTab === 'TABLES' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('TABLES');
              loadTables();
            }}
            style={{
              padding: '6px 14px',
              border: 'none',
              borderRadius: '6px',
              background: activeTab === 'TABLES' ? '#2563eb' : 'transparent',
              color: activeTab === 'TABLES' ? '#fff' : '#475569',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            🪑 Tables
            {tables.filter((t) => t.status === 'RUNNING').length > 0 && (
              <span style={{ background: '#ef4444', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '0.72rem' }}>
                {tables.filter((t) => t.status === 'RUNNING').length}
              </span>
            )}
          </button>
        </div>

        {/* Payment Policy Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#475569' }}>
          <span>Policy:</span>
          <select
            value={paymentPolicy}
            onChange={(e) => handlePolicyChange(e.target.value as PaymentPolicy)}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: '#fff',
              color: '#0f172a',
            }}
          >
            <option value="PAY_FIRST">Pay First (QSR/Cafe)</option>
            <option value="PAY_LATER">Pay Later (Dine-in)</option>
            <option value="FLEXIBLE">Flexible</option>
          </select>
        </div>

        {orderSuccessMessage && (
          <div className="topbar-success-alert" role="status">
            ✓ {orderSuccessMessage}
          </div>
        )}

        {apiError && (
          <div className="topbar-error-alert" role="alert">
            ⚠ {apiError}
            <button type="button" className="retry-btn" onClick={loadCatalog}>
              Retry
            </button>
          </div>
        )}

        {activeTab === 'MENU' && (
          <div className="topbar-search">
            <input
              type="search"
              placeholder="Search items, boba, coffee, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              aria-label="Search items"
            />
          </div>
        )}

        <div className="topbar-nav-links">
          <button
            type="button"
            className="kds-nav-btn"
            style={{ marginRight: '0.5rem', background: '#3b82f6' }}
            onClick={() => {
              window.history.pushState({}, '', '/admin');
              setCurrentPath('/admin');
            }}
          >
            ⚙️ Admin Dashboard
          </button>
          <button
            type="button"
            className="kds-nav-btn"
            onClick={() => {
              window.history.pushState({}, '', '/kitchen');
              setCurrentPath('/kitchen');
            }}
          >
            🍳 Kitchen Display (KDS)
          </button>
        </div>
      </header>

      {/* Main Container: Either Table View OR Menu POS View */}
      {activeTab === 'TABLES' ? (
        <div style={{ flex: 1, overflowY: 'auto', background: '#f8fafc' }}>
          <TableManagementView
            tables={tables}
            selectedTableId={selectedTable?.id ?? null}
            onSelectTable={handleSelectTable}
            onOpenRunningOrder={handleOpenRunningOrder}
            onCollectPayment={handleOpenPayment}
            onGenerateBill={handleGenerateBill}
            onCreateTable={handleCreateTable}
            onDeleteTable={handleDeleteTable}
            onUpdateTableStatus={handleUpdateTableStatus}
            onRefresh={loadTables}
          />
        </div>
      ) : (
        <div className="pos-main-container">
          {/* Category Navigation Sidebar */}
          <nav className="pos-category-nav" aria-label="Menu categories">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`category-pill ${selectedCategoryId === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategoryId(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </nav>

          {/* Product Catalog Grid */}
          <section className="pos-catalog-section" aria-label="Product Catalog">
            {isLoading ? (
              <div className="loading-state">
                <p>Loading menu from server...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="no-products-view">
                <p>
                  {apiError
                    ? 'Unable to load catalog from server. Check backend connection.'
                    : `No products found matching "${searchQuery}"`}
                </p>
              </div>
            ) : (
              <div className="product-grid">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={(p) => setActiveModalProduct(p)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Right Cart Sidebar */}
          <CartPanel
            items={cartItems}
            orderType={orderType}
            onOrderTypeChange={(t) => {
              setOrderType(t);
              if (t !== 'DINE_IN') {
                setSelectedTable(null);
                setRunningOrder(null);
              }
            }}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            customerNotes={customerNotes}
            onCustomerNotesChange={setCustomerNotes}
            backendCalculation={backendCalculation}
            onReviewOrder={() => setIsReviewOpen(true)}
            selectedTableNumber={orderType === 'DINE_IN' && selectedTable ? selectedTable.tableNumber : null}
            runningOrderId={runningOrder ? runningOrder.id : null}
            onCancelRunningOrder={() => setRunningOrder(null)}
          />
        </div>
      )}

      {/* Product Customization Modal */}
      {activeModalProduct && (
        <ProductModal
          product={activeModalProduct}
          isOpen={Boolean(activeModalProduct)}
          onClose={() => setActiveModalProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* Order Review Modal */}
      <OrderReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        onConfirmOrder={handleConfirmOrder}
        items={cartItems}
        orderType={orderType}
        customerNotes={customerNotes}
        calculation={backendCalculation}
        isSubmitting={isSubmitting}
        tableNumber={selectedTable?.tableNumber}
        isAddingToRunningOrder={Boolean(runningOrder)}
      />

      {/* Payment Collection Modal */}
      {activePaymentOrder && (
        <PaymentCollectModal
          isOpen={Boolean(activePaymentOrder)}
          onClose={() => {
            setActivePaymentOrder(null);
            setActivePaymentBill(null);
          }}
          order={activePaymentOrder}
          bill={activePaymentBill}
          onRecordPayment={handleRecordPayment}
          isProcessing={isProcessingPayment}
        />
      )}
    </div>
  );
}

export default App;
