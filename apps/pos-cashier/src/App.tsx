import { useState, useMemo, useEffect, useCallback } from 'react';
import type { Product, ProductVariant, CartItem, OrderType, CalculationResponse, CreateOrderRequest, Order, Bill, PaymentMethod, OrderItem } from './types/pos';
import { ProductCard } from './components/ProductCard';
import { ProductModal } from './components/ProductModal';
import { CartPanel } from './components/CartPanel';
import { OrderReviewModal } from './components/OrderReviewModal';
import { TableSelectorModal } from './components/TableSelectorModal';
import { TableCheckoutModal } from './components/TableCheckoutModal';
import { PrinterSettingsModal } from './components/PrinterSettingsModal';
import { RunningOrdersView } from './components/RunningOrdersView';
import { KitchenDisplay } from './components/KitchenDisplay';
import { AdminLayout } from './components/admin/AdminLayout';
import { CameraBarcodeScannerModal } from './components/CameraBarcodeScannerModal';
import { BarcodeLabelModal } from './components/BarcodeLabelModal';
import { RetailCheckoutModal } from './components/RetailCheckoutModal';
import { DigitalBillView } from './components/DigitalBillView';
import { DailyClosingReportModal } from './components/DailyClosingReportModal';
import { ReturnsExchangesModal } from './components/ReturnsExchangesModal';
import { MobileScannerApp } from './components/MobileScannerApp';
import { MobileScannerPairModal } from './components/MobileScannerPairModal';
import { subscribeToScannedBarcodes } from './utils/scannerSyncBus';
import { posApiClient } from './api/posApiClient';
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from './data/mockCatalog';
import { getStoredTables, saveTables, type RestaurantTable } from './utils/tableStorage';
import {
  CategoryIcon,
  IconOrders,
  IconReports,
  IconSettings,
  IconLogout,
  IconPlus,
  IconCamera,
  IconBarcode,
  IconTag,
  IconSync,
  IconChart,
  IconPrinter,
  IconShoppingBag,
  IconEnter,
  IconPhone,
} from './components/icons';
import { printKOT } from './utils/printReceipt';
import './App.css';

export function App() {
  const [currentPath, setCurrentPath] = useState<string>(
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('cat-all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeModalProduct, setActiveModalProduct] = useState<Product | null>(null);

  // Retail Billing Mode: 'scan' (Clean Barcode Scanning Hub) vs 'catalog' (Product Grid)
  const [billingMode, setBillingMode] = useState<'scan' | 'catalog'>('scan');
  const [manualBarcodeCode, setManualBarcodeCode] = useState<string>('');

  // Left Sidebar active nav item
  const [activeNav, setActiveNav] = useState<string>('new-order');

  // Retail Specific Modals State
  const [isCameraModalOpen, setIsCameraModalOpen] = useState<boolean>(false);
  const [isBarcodeStudioOpen, setIsBarcodeStudioOpen] = useState<boolean>(false);
  const [isDailyReportOpen, setIsDailyReportOpen] = useState<boolean>(false);
  const [isReturnsModalOpen, setIsReturnsModalOpen] = useState<boolean>(false);
  const [isRetailCheckoutOpen, setIsRetailCheckoutOpen] = useState<boolean>(false);
  const [isMobilePairModalOpen, setIsMobilePairModalOpen] = useState<boolean>(false);
  const [lastMobileScannedItem, setLastMobileScannedItem] = useState<{ name: string; barcode: string; time: number } | null>(null);

  // Table Management State
  const [tables, setTables] = useState<RestaurantTable[]>(() => getStoredTables());
  const [selectedTableNumber, setSelectedTableNumber] = useState<string>('');
  const [runningOrder, setRunningOrder] = useState<Order | null>(null);
  const [isTableModalOpen, setIsTableModalOpen] = useState<boolean>(false);

  // Table Checkout & Settlement State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [checkoutTable, setCheckoutTable] = useState<RestaurantTable | null>(null);
  const [checkoutOrder, setCheckoutOrder] = useState<Order | null>(null);

  // Loading & Error States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('COUNTER');
  const [customerNotes, setCustomerNotes] = useState<string>('');
  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [orderSuccessMessage, setOrderSuccessMessage] = useState<string | null>(null);

  // Orders & Bills State (for Live Running Orders & Payment Status across Dine-in, Takeaway, Counter)
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(false);

  // Backend calculation state (null indicates fallback local estimate)
  const [backendCalculation, setBackendCalculation] = useState<CalculationResponse | null>(null);

  // Collapsible sidebar state (Hamburger menu)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Running orders count across all active orders (Dine-in, Takeaway, Counter)
  const runningOrdersCount = useMemo(() => {
    return allOrders.filter(
      (o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED'
    ).length;
  }, [allOrders]);

  // Active Bill for currently viewed running order
  const activeRunningBill = useMemo(() => {
    if (!runningOrder) return null;
    return bills.find((b) => b.order?.id === runningOrder.id || b.order?.orderNumber === runningOrder.orderNumber) || null;
  }, [bills, runningOrder]);

  // Load Real Catalog Data from Backend or Local Admin Storage (Syncs with Admin Portal)
  const loadCatalog = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      // 1. Automatically purge any cached cafe/food items from localStorage
      try {
        const storedCats = localStorage.getItem('krunnex_admin_categories');
        if (storedCats) {
          const parsed = JSON.parse(storedCats);
          const hasFood = Array.isArray(parsed) && parsed.some((c: any) => {
            const name = (c.name || '').toLowerCase();
            return name.includes('coffee') || name.includes('boba') || name.includes('tea') ||
                   name.includes('beverage') || name.includes('snack') || name.includes('bakery') ||
                   name.includes('dessert') || name.includes('food');
          });
          if (hasFood) {
            localStorage.removeItem('krunnex_admin_categories');
            localStorage.removeItem('krunnex_admin_products');
          }
        }
      } catch {
        // ignore JSON parse errors
      }

      const [catData, prodData] = await Promise.all([
        posApiClient.getCategories().catch(() => {
          const stored = localStorage.getItem('krunnex_admin_categories');
          return stored ? JSON.parse(stored) : MOCK_CATEGORIES;
        }),
        posApiClient.getProducts().catch(() => {
          const stored = localStorage.getItem('krunnex_admin_products');
          return stored ? JSON.parse(stored) : MOCK_PRODUCTS;
        }),
      ]);

      // Filter out any food categories returned by backend
      const nonFoodCats = (catData || []).filter((c: any) => {
        const name = (c.name || '').toLowerCase();
        return !name.includes('coffee') && !name.includes('boba') && !name.includes('beverage') &&
               !name.includes('snack') && !name.includes('bakery') && !name.includes('dessert') &&
               !name.includes('food');
      });

      const finalCategories = nonFoodCats.length >= 3 ? nonFoodCats : MOCK_CATEGORIES;
      const finalProducts = (prodData && prodData.length >= 3) ? prodData : MOCK_PRODUCTS;

      setCategories(finalCategories);
      setProducts(finalProducts);
    } catch {
      // Offline fallback: load pure boutique mock catalog
      setProducts(MOCK_PRODUCTS);
      setCategories(MOCK_CATEGORIES);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load Real Tables with Live Status & Running Order Details
  const loadTables = useCallback(async () => {
    try {
      const liveTables = await posApiClient.getTables();
      if (liveTables && liveTables.length > 0) {
        // Any settled / PAID_CLEARING tables are immediately marked AVAILABLE
        const normalized = liveTables.map((t) => {
          if (t.status === 'PAID_CLEARING' || (t.amountDue === 0 && t.amountPaid && t.amountPaid > 0)) {
            if (!t.id.startsWith('tbl-')) {
              posApiClient.updateTableStatus(t.id, { status: 'AVAILABLE' }).catch(() => {});
            }
            return {
              ...t,
              status: 'AVAILABLE' as const,
              currentOrderId: undefined,
              orderNumber: undefined,
              currentTotal: 0,
              amountPaid: 0,
              amountDue: 0,
            };
          }
          return t;
        });
        setTables(normalized);
        saveTables(normalized);
      }
    } catch {
      setTables(getStoredTables());
    }
  }, []);

  // Load All Orders and Bills from backend across all order types
  const loadAllOrders = useCallback(async () => {
    setIsLoadingOrders(true);
    try {
      const [ordersList, billsList] = await Promise.all([
        posApiClient.getOrders(),
        posApiClient.getBills().catch(() => []),
      ]);
      if (ordersList) {
        setAllOrders(ordersList);
      }
      if (billsList) {
        setBills(billsList);
      }
    } catch {
      // Fallback silently if offline
    } finally {
      setIsLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
    loadTables();
    loadAllOrders();
    const interval = setInterval(() => {
      loadTables();
      loadAllOrders();
    }, 15000); // 15s live refresh
    return () => clearInterval(interval);
  }, [loadCatalog, loadTables, loadAllOrders]);

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

    posApiClient.calculatePricing(calcItems)
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
        product.category?.id === selectedCategoryId ||
        (selectedCategoryId.startsWith('cat-def-') &&
          product.category?.name?.toLowerCase().includes(selectedCategoryId.replace('cat-def-', '')));
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
  };

  // Retail Barcode Resolution Engine (Works for Camera Scanner & USB Barcode Guns)
  const handleBarcodeDetected = useCallback((code: string) => {
    const clean = code.trim().toLowerCase();
    let foundProduct: Product | null = null;
    let foundVariant: ProductVariant | undefined = undefined;

    for (const p of products) {
      if (p.barcode?.toLowerCase() === clean || p.sku?.toLowerCase() === clean) {
        foundProduct = p;
        foundVariant = p.variants?.[0];
        break;
      }
      for (const v of p.variants || []) {
        if (v.barcode?.toLowerCase() === clean || v.sku?.toLowerCase() === clean) {
          foundProduct = p;
          foundVariant = v;
          break;
        }
      }
      if (foundProduct) break;
    }

    if (foundProduct) {
      const unitPrice = foundVariant ? foundVariant.price : foundProduct.basePrice;
      const mrp = foundVariant?.mrp || foundProduct.mrp || unitPrice * 1.3;

      // Check if already in cart -> increment quantity
      setCartItems((prev) => {
        const existingIndex = prev.findIndex(
          (item) =>
            item.product.id === foundProduct!.id &&
            item.selectedVariant?.id === foundVariant?.id
        );

        if (existingIndex >= 0) {
          const updated = [...prev];
          const existing = updated[existingIndex];
          const newQty = existing.quantity + 1;
          updated[existingIndex] = {
            ...existing,
            quantity: newQty,
            lineTotal: existing.unitPrice * newQty,
          };
          return updated;
        }

        const newItem: CartItem = {
          id: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          product: foundProduct!,
          selectedVariant: foundVariant,
          selectedAddOns: [],
          quantity: 1,
          itemNotes: '',
          unitPrice,
          mrp,
          lineTotal: unitPrice,
        };
        return [...prev, newItem];
      });

      setOrderSuccessMessage(`✓ Scanned: ${foundProduct.name}${foundVariant ? ` (${foundVariant.name})` : ''} - ₹${unitPrice}`);
      setTimeout(() => setOrderSuccessMessage(null), 3000);
    } else {
      setApiError(`Barcode "${code}" not found in textile catalog.`);
      setTimeout(() => setApiError(null), 3500);
    }
  }, [products]);

  // Global Hardware Barcode Gun Keydown Listener (HID Keyboard Emulation)
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      if (isInput && !target.classList.contains('main-ref-search-input')) {
        return; // Don't intercept when user is typing in regular modals
      }

      const now = Date.now();
      if (now - lastKeyTime > 160) {
        barcodeBuffer = ''; // Reset buffer if keystrokes are slow
      }
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (barcodeBuffer.trim().length >= 3) {
          handleBarcodeDetected(barcodeBuffer.trim());
          barcodeBuffer = '';
          e.preventDefault();
        }
      } else if (e.key.length === 1) {
        barcodeBuffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBarcodeDetected]);

  // Wireless Mobile Scanner Event Listener (Instant Phone-to-Counter Billing Sync)
  useEffect(() => {
    const unsubscribe = subscribeToScannedBarcodes((payload) => {
      handleBarcodeDetected(payload.barcode);
      setLastMobileScannedItem({
        name: payload.productName || payload.barcode,
        barcode: payload.barcode,
        time: Date.now(),
      });
      setOrderSuccessMessage(`📱 Phone Scanned: ${payload.productName || payload.barcode} added to bill`);
      setTimeout(() => setOrderSuccessMessage(null), 4000);
    });
    return () => {
      unsubscribe();
    };
  }, [handleBarcodeDetected]);

  // Table Handlers
  const handleAddTable = async (tableNumber: string, capacity = 4) => {
    const outletId = posApiClient.getConfig().outletId || '00000000-0000-0000-0000-000000000000';
    try {
      await posApiClient.createTable({
        outletId,
        tableNumber,
        capacity,
        status: 'AVAILABLE',
      });
      await loadTables();
    } catch {
      const newTbl: RestaurantTable = {
        id: `tbl-${Date.now()}`,
        tableNumber,
        capacity,
        status: 'AVAILABLE',
      };
      const updated = [...tables, newTbl];
      setTables(updated);
      saveTables(updated);
    }
    setSelectedTableNumber(tableNumber);
  };

  const handleDeleteTable = async (tableId: string) => {
    const tableToDelete = tables.find((t) => t.id === tableId);
    try {
      if (!tableId.startsWith('tbl-')) {
        await posApiClient.deleteTable(tableId);
      }
      await loadTables();
    } catch {
      const updated = tables.filter((t) => t.id !== tableId);
      setTables(updated);
      saveTables(updated);
    }
    if (tableToDelete && selectedTableNumber === tableToDelete.tableNumber) {
      setSelectedTableNumber('');
    }
  };

  const handleCloseTable = async (table: RestaurantTable, reason?: string) => {
    try {
      // 1. Resolve real backend table ID if fallback ID was used
      const backendTable = tables.find(
        (t) => (t.id === table.id || t.tableNumber.toLowerCase() === table.tableNumber.toLowerCase()) && !t.id.startsWith('tbl-')
      );
      const targetId = !table.id.startsWith('tbl-') ? table.id : backendTable?.id;
      if (targetId) {
        await posApiClient.updateTableStatus(targetId, {
          status: 'AVAILABLE',
          reason: reason || 'Table cleared and cleaned after payment',
        });
      }

      // 2. Immediately mark table AVAILABLE in local state and persisted storage
      const updated = tables.map((t) =>
        t.id === table.id || t.tableNumber.toLowerCase() === table.tableNumber.toLowerCase()
          ? {
              ...t,
              status: 'AVAILABLE' as const,
              currentOrderId: undefined,
              orderNumber: undefined,
              currentTotal: 0,
              amountPaid: 0,
              amountDue: 0,
            }
          : t
      );
      setTables(updated);
      saveTables(updated);

      // 3. Disassociate and complete the order for this table locally so it does not linger as active
      setAllOrders((prev) =>
        prev.map((o) =>
          (o.tableId === targetId || o.tableId === table.id || o.tableNumber === table.tableNumber || o.customerNotes?.includes(`Table: ${table.tableNumber}`))
            ? { ...o, status: 'COMPLETED' }
            : o
        )
      );

      // 4. Clear current active dine-in table if it matches the closed table
      if (selectedTableNumber.toLowerCase() === table.tableNumber.toLowerCase()) {
        setSelectedTableNumber('');
        setRunningOrder(null);
      }

      // 5. Refresh live state from backend
      await Promise.all([loadTables(), loadAllOrders()]);
      setOrderSuccessMessage(`Table ${table.tableNumber} is now Available.`);
      setTimeout(() => setOrderSuccessMessage(null), 4000);
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : 'Failed to close table');
    }
  };

  const handleCancelBill = async (billId: string, reason: string) => {
    try {
      await posApiClient.cancelBill(billId, reason);
      if (checkoutOrder) {
        try {
          await posApiClient.updateOrderStatus(checkoutOrder.id, 'CANCELLED', reason);
        } catch {
          // ignore non-blocking
        }
      }
      if (checkoutTable) {
        await handleCloseTable(checkoutTable, `Bill Cancelled: ${reason}`);
      } else {
        await Promise.all([loadTables(), loadAllOrders()]);
      }
      setOrderSuccessMessage(`Bill cancelled successfully. Table is now Available.`);
      setTimeout(() => setOrderSuccessMessage(null), 4000);
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : 'Failed to cancel bill');
    }
  };

  const handleOpenCheckout = async (targetTable?: RestaurantTable | null, targetOrder?: Order | null) => {
    // If Counter / Retail mode: opens specialized retail checkout modal
    if (orderType !== 'DINE_IN' && !targetTable && !targetOrder) {
      if (cartItems.length === 0 && !runningOrder) return;
      setIsRetailCheckoutOpen(true);
      return;
    }

    // If Dine-in: if there are unsent items in cart, send them as KOT first so kitchen & bill have all items
    if (orderType === 'DINE_IN' && cartItems.length > 0) {
      await handleConfirmOrder();
    }

    let orderToCheckout = targetOrder || null;
    const activeTbl =
      targetTable ||
      (orderToCheckout?.table ? orderToCheckout.table : null) ||
      tables.find((t) => t.tableNumber.toLowerCase() === selectedTableNumber.toLowerCase()) ||
      null;
    setCheckoutTable(activeTbl);

    if (!orderToCheckout) {
      if (activeTbl && activeTbl.currentOrderId) {
        try {
          orderToCheckout = await posApiClient.getOrderById(activeTbl.currentOrderId);
        } catch {
          orderToCheckout = runningOrder;
        }
      } else {
        orderToCheckout = runningOrder;
      }
    }
    setCheckoutOrder(orderToCheckout);
    setIsCheckoutOpen(true);
  };

  const handlePaymentSettled = async () => {
    await Promise.all([loadTables(), loadAllOrders()]);
    if (checkoutOrder) {
      try {
        const refreshedOrder = await posApiClient.getOrderById(checkoutOrder.id);
        setCheckoutOrder(refreshedOrder);
        if (runningOrder && runningOrder.id === refreshedOrder.id) {
          setRunningOrder(refreshedOrder);
        }
      } catch {
        // ignore
      }
    }
  };


  const handleSelectRunningTable = async (table: RestaurantTable) => {
    setSelectedTableNumber(table.tableNumber);
    setOrderType('DINE_IN');
    setCartItems([]);
    if (table.currentOrderId) {
      try {
        const order = await posApiClient.getOrderById(table.currentOrderId);
        setRunningOrder(order);
        setOrderSuccessMessage(`Loaded Table ${table.tableNumber} (Order #${order.orderNumber}).`);
        setTimeout(() => setOrderSuccessMessage(null), 3000);
      } catch {
        setRunningOrder(null);
      }
    } else if (table.status && table.status !== 'AVAILABLE') {
      // Find active order from allOrders matching this occupied table
      const activeForTable = allOrders.find(
        (o) =>
          o.orderType === 'DINE_IN' &&
          o.status !== 'COMPLETED' &&
          o.status !== 'CANCELLED' &&
          (o.tableId === table.id ||
            o.tableNumber === table.tableNumber ||
            o.customerNotes?.includes(`Table: ${table.tableNumber}`))
      );
      if (activeForTable) {
        setRunningOrder(activeForTable);
        setOrderSuccessMessage(`Loaded Table ${table.tableNumber} (Order #${activeForTable.orderNumber}).`);
        setTimeout(() => setOrderSuccessMessage(null), 3000);
      } else {
        setRunningOrder(null);
      }
    } else {
      setRunningOrder(null);
    }
  };

  // Handler: Modify, reduce quantity, or void a kitchen-confirmed item on a running table order
  const handleModifyRunningItem = async (
    orderItem: OrderItem,
    newQty: number,
    reason: string,
    newNotes?: string
  ) => {
    if (!runningOrder) return;

    const orderItems = runningOrder.items || [];

    // Case 1: If order only has 1 item and user sets quantity to 0, void the whole order and free table
    if (newQty === 0 && orderItems.length <= 1) {
      try {
        await posApiClient.updateOrderStatus(runningOrder.id, 'CANCELLED', reason);
      } catch (err) {
        console.warn('Failed to update order status to CANCELLED on backend:', err);
      }
      const matchedTable = tables.find(
        (t) => t.tableNumber.toLowerCase() === selectedTableNumber.toLowerCase()
      );
      if (matchedTable) {
        await handleCloseTable(matchedTable, `Item voided: ${reason}`);
      } else {
        setRunningOrder(null);
        setSelectedTableNumber('');
        await Promise.all([loadTables(), loadAllOrders()]);
      }
      setOrderSuccessMessage(`Item voided. Table ${selectedTableNumber} order cancelled and table released.`);
      setTimeout(() => setOrderSuccessMessage(null), 5000);
      return;
    }

    // Case 2: Update item quantity or notes in running order
    const remainingItemsPayload: Array<{
      productId: string;
      variantId?: string;
      addOnIds?: string[];
      quantity: number;
      itemNotes?: string;
    }> = [];

    for (const it of orderItems) {
      if (it.id === orderItem.id) {
        if (newQty === 0) {
          // Skip/remove this item (voided)
          continue;
        }
        const matchedProduct = products.find(
          (p) => p.name.toLowerCase() === it.productNameSnapshot.toLowerCase()
        );
        const resolvedProductId = it.productId || it.product?.id || matchedProduct?.id || '';
        const matchedVariant = matchedProduct?.variants?.find(
          (v) => v.name.toLowerCase() === (it.variantNameSnapshot || '').toLowerCase()
        );
        const resolvedVariantId = it.variantId || it.variant?.id || matchedVariant?.id;

        remainingItemsPayload.push({
          productId: resolvedProductId,
          variantId: resolvedVariantId,
          addOnIds: it.addOns
            ? it.addOns.map((a) => a.addOn?.id || a.id || '').filter(Boolean)
            : [],
          quantity: newQty,
          itemNotes: newNotes !== undefined ? newNotes : it.itemNotes,
        });
      } else {
        const matchedProduct = products.find(
          (p) => p.name.toLowerCase() === it.productNameSnapshot.toLowerCase()
        );
        const resolvedProductId = it.productId || it.product?.id || matchedProduct?.id || '';
        const matchedVariant = matchedProduct?.variants?.find(
          (v) => v.name.toLowerCase() === (it.variantNameSnapshot || '').toLowerCase()
        );
        const resolvedVariantId = it.variantId || it.variant?.id || matchedVariant?.id;

        remainingItemsPayload.push({
          productId: resolvedProductId,
          variantId: resolvedVariantId,
          addOnIds: it.addOns
            ? it.addOns.map((a) => a.addOn?.id || a.id || '').filter(Boolean)
            : [],
          quantity: it.quantity,
          itemNotes: it.itemNotes,
        });
      }
    }

    try {
      const updatedOrder = await posApiClient.updateOrderItems(runningOrder.id, remainingItemsPayload);
      setRunningOrder(updatedOrder);

      if (selectedTableNumber) {
        const updatedTables = tables.map((t) =>
          t.tableNumber.toLowerCase() === selectedTableNumber.toLowerCase()
            ? {
                ...t,
                currentTotal: updatedOrder.totalAmount,
                amountDue: updatedOrder.totalAmount,
              }
            : t
        );
        setTables(updatedTables);
        saveTables(updatedTables);
      }

      setOrderSuccessMessage(
        newQty === 0
          ? `Voided "${orderItem.productNameSnapshot}". Kitchen modification slip generated!`
          : `Updated "${orderItem.productNameSnapshot}" to ${newQty} pcs. Kitchen modification slip generated!`
      );
      await Promise.all([loadTables(), loadAllOrders()]);
      setTimeout(() => setOrderSuccessMessage(null), 5000);
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update order items');
    }
  };

  // Handle "New Order" action: reset to starting Dine-in tables screen
  const handleNewOrder = () => {
    setActiveNav('new-order');
    setOrderType('DINE_IN');
    setSelectedTableNumber('');
    setRunningOrder(null);
    handleClearCart();
    setSearchQuery('');
    setSelectedCategoryId('cat-all');
    setOrderSuccessMessage(null);
    setApiError(null);
  };

  // Global POS Terminal Keyboard Shortcuts (F2: New Bill, F4: Focus Scan)
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        handleNewOrder();
      } else if (e.key === 'F4') {
        e.preventDefault();
        const input = document.querySelector('.hero-scanner-input') as HTMLInputElement | null;
        if (input) {
          input.focus();
          input.select();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, []);

  // Handle Order Type Switching (Dine-in <-> Takeaway <-> Counter)
  // Preserves already added cart items so staff can convert order type before sending to kitchen!
  const handleOrderTypeChange = (newType: OrderType) => {
    setOrderType(newType);
    if (newType !== 'DINE_IN') {
      // Unlink table & running order when switching to Takeaway or Counter,
      // while keeping all existing cart items intact
      setSelectedTableNumber('');
      setRunningOrder(null);
    }
  };

  // Handler: Send KOT to Kitchen without collecting payment (Requirement 2)
  // Keeps all items under the same running table visit & bill, allows staff to add more items later!
  const handleConfirmOrder = async () => {
    if (cartItems.length === 0) return;
    setIsSubmitting(true);
    setApiError(null);

    const outletId = posApiClient.getConfig().outletId || '00000000-0000-0000-0000-000000000000';
    const idempotencyKey = `POS-KOT-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // Flow A: Add items to an existing running table order
    if (runningOrder) {
      try {
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

        // Dedicated KOT Print (strictly kitchen items, NO prices)
        printKOT({
          orderNumber: updated.orderNumber,
          orderType: 'DINE_IN',
          tableNumber: selectedTableNumber,
          items: cartItems.map((it) => ({
            name: it.product.name,
            variantName: it.selectedVariant?.name,
            addOns: it.selectedAddOns.map((a) => a.name),
            quantity: it.quantity,
            notes: it.itemNotes.trim() !== '' ? it.itemNotes : undefined,
          })),
          customerNotes,
        });

        setOrderSuccessMessage(`KOT sent to kitchen for Table ${selectedTableNumber}! (Order #${updated.orderNumber})`);
        setIsReviewOpen(false);
        setRunningOrder(updated);
        setCartItems([]);
        setCustomerNotes('');
        setBackendCalculation(null);

        if (selectedTableNumber) {
          const updatedTbls = tables.map((t) =>
            t.tableNumber.toLowerCase() === selectedTableNumber.toLowerCase()
              ? {
                  ...t,
                  status: 'RUNNING' as const,
                  currentOrderId: updated.id,
                  orderNumber: updated.orderNumber,
                  currentTotal: updated.totalAmount,
                  amountDue: updated.totalAmount,
                }
              : t
          );
          setTables(updatedTbls);
          saveTables(updatedTbls);
        }

        await Promise.all([loadTables(), loadAllOrders()]);
        setTimeout(() => setOrderSuccessMessage(null), 5000);
      } catch (err: unknown) {
        setApiError(err instanceof Error ? err.message : 'Failed to send KOT to kitchen');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Flow B: Start new order for Dine-in Table (or fallback)
    let finalNotes: string | undefined = customerNotes.trim() !== '' ? customerNotes.trim() : undefined;
    if (orderType === 'DINE_IN' && selectedTableNumber) {
      const tableTag = `[Table: ${selectedTableNumber}]`;
      if (!finalNotes) {
        finalNotes = tableTag;
      } else if (!finalNotes.includes(tableTag)) {
        finalNotes = `${tableTag} ${finalNotes}`;
      }
    }

    const matchedTable = tables.find((t) => t.tableNumber.toLowerCase() === selectedTableNumber.toLowerCase());
    const validTableId = matchedTable && !matchedTable.id.startsWith('tbl-') ? matchedTable.id : undefined;

    const orderPayload: CreateOrderRequest = {
      outletId,
      orderType,
      idempotencyKey,
      tableId: orderType === 'DINE_IN' ? validTableId : undefined,
      tableNumber: orderType === 'DINE_IN' && selectedTableNumber ? selectedTableNumber : undefined,
      customerNotes: finalNotes,
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

      // Dedicated KOT Print
      printKOT({
        orderNumber: createdOrder.orderNumber,
        orderType,
        tableNumber: selectedTableNumber,
        items: cartItems.map((it) => ({
          name: it.product.name,
          variantName: it.selectedVariant?.name,
          addOns: it.selectedAddOns.map((a) => a.name),
          quantity: it.quantity,
          notes: it.itemNotes.trim() !== '' ? it.itemNotes : undefined,
        })),
        customerNotes,
      });

      setOrderSuccessMessage(
        `Order #${createdOrder.orderNumber} placed! Total: ₹${createdOrder.totalAmount.toFixed(2)} (KOT sent to kitchen for Table ${selectedTableNumber})`
      );
      setIsReviewOpen(false);
      setCartItems([]);
      setCustomerNotes('');
      setBackendCalculation(null);

      if (orderType === 'DINE_IN' && selectedTableNumber) {
        setRunningOrder(createdOrder);
        const updatedTables = tables.map((t) =>
          t.tableNumber.toLowerCase() === selectedTableNumber.toLowerCase()
            ? {
                ...t,
                status: 'RUNNING' as const,
                currentOrderId: createdOrder.id,
                orderNumber: createdOrder.orderNumber,
                currentTotal: createdOrder.totalAmount,
                amountDue: createdOrder.totalAmount,
                amountPaid: 0,
              }
            : t
        );
        setTables(updatedTables);
        saveTables(updatedTables);
      } else {
        setRunningOrder(null);
      }

      await Promise.all([loadTables(), loadAllOrders()]);
      setTimeout(() => setOrderSuccessMessage(null), 5000);
    } catch {
      // Offline fallback: Generate local order & proceed with KOT print
      const localOrderNum = `ORD-${Date.now().toString().slice(-4)}`;
      const subtotal = cartItems.reduce((acc, it) => acc + it.lineTotal, 0);
      const taxAmount = subtotal * 0.05;
      const totalAmount = subtotal + taxAmount;

      const localOrder: Order = {
        id: `local-ord-${Date.now()}`,
        orderNumber: localOrderNum,
        orderType,
        status: 'CONFIRMED',
        subtotal,
        taxableAmount: subtotal,
        taxAmount,
        discountAmount: 0,
        totalAmount,
        createdAt: new Date().toISOString(),
        items: cartItems.map((it, idx) => ({
          id: `item-${Date.now()}-${idx}`,
          productId: it.product.id,
          productNameSnapshot: it.product.name,
          variantNameSnapshot: it.selectedVariant?.name,
          unitPriceSnapshot: it.unitPrice,
          quantity: it.quantity,
          lineTotalSnapshot: it.lineTotal,
          itemNotes: it.itemNotes,
        })),
      };

      // Always print physical KOT
      printKOT({
        orderNumber: localOrderNum,
        orderType,
        tableNumber: selectedTableNumber,
        items: cartItems.map((it) => ({
          name: it.product.name,
          variantName: it.selectedVariant?.name,
          addOns: it.selectedAddOns.map((a) => a.name),
          quantity: it.quantity,
          notes: it.itemNotes.trim() !== '' ? it.itemNotes : undefined,
        })),
        customerNotes,
      });

      setOrderSuccessMessage(`KOT #${localOrderNum} generated & printed for Table ${selectedTableNumber}!`);
      setIsReviewOpen(false);
      setCartItems([]);
      setCustomerNotes('');
      setBackendCalculation(null);

      if (orderType === 'DINE_IN' && selectedTableNumber) {
        setRunningOrder(localOrder);
        const updatedTables = tables.map((t) =>
          t.tableNumber.toLowerCase() === selectedTableNumber.toLowerCase()
            ? {
                ...t,
                status: 'RUNNING' as const,
                currentOrderId: localOrder.id,
                orderNumber: localOrder.orderNumber,
                currentTotal: localOrder.totalAmount,
                amountDue: localOrder.totalAmount,
                amountPaid: 0,
              }
            : t
        );
        setTables(updatedTables);
        saveTables(updatedTables);
      }
      setTimeout(() => setOrderSuccessMessage(null), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Takeaway / Counter payment-first success
  const handleTakeawayPaymentSuccess = async (createdOrder: Order, paymentMethod: PaymentMethod, amount: number) => {
    setOrderSuccessMessage(`Payment of ₹${amount.toFixed(2)} received via ${paymentMethod}! Order #${createdOrder.orderNumber} sent to kitchen.`);
    setCartItems([]);
    setCustomerNotes('');
    setBackendCalculation(null);
    setIsCheckoutOpen(false);
    setCheckoutOrder(null);
    setCheckoutTable(null);
    await Promise.all([loadTables(), loadAllOrders()]);
    setTimeout(() => setOrderSuccessMessage(null), 5000);
  };

  // Toggle Fullscreen helper
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
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

  if (currentPath.startsWith('/bill') || currentPath.startsWith('/invoice')) {
    return (
      <DigitalBillView
        onBackToPos={() => {
          window.history.pushState({}, '', '/');
          setCurrentPath('/');
        }}
      />
    );
  }

  // Dedicated Mobile Handheld Barcode Scanner App View
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isMobileScannerMode =
    (searchParams && searchParams.get('mode') === 'mobile-scanner') ||
    currentPath === '/scanner' ||
    currentPath === '/mobile-scanner';

  if (isMobileScannerMode) {
    return (
      <MobileScannerApp
        products={products.length > 0 ? products : MOCK_PRODUCTS}
        onExit={() => {
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.delete('mode');
            window.location.href = url.pathname;
          }
        }}
      />
    );
  }

  // Derive live floor-plan state for a table (shared by legend counts + cards)
  const getTableState = (tbl: RestaurantTable) => {
    // A table is occupied ONLY if it has an active, unpaid order currently running
    const isExplicitlyOccupied =
      tbl.status === 'RUNNING' ||
      tbl.status === 'OCCUPIED' ||
      tbl.status === 'BILL_REQUESTED' ||
      tbl.status === 'PAYMENT_DUE';

    const activeOrder = isExplicitlyOccupied
      ? allOrders.find(
          (o) =>
            o.orderType === 'DINE_IN' &&
            o.status !== 'COMPLETED' &&
            o.status !== 'CANCELLED' &&
            (o.id === tbl.currentOrderId ||
              (tbl.currentOrderId ? false : (o.tableId === tbl.id || o.tableNumber === tbl.tableNumber)))
        )
      : undefined;

    // Settled tables (PAID_CLEARING or ₹0 balance) are AVAILABLE
    const isOccupied =
      tbl.status !== 'PAID_CLEARING' &&
      tbl.status !== 'AVAILABLE' &&
      isExplicitlyOccupied &&
      Boolean(activeOrder || (tbl.amountDue && tbl.amountDue > 0));

    const isReserved = !isOccupied && (tbl.status as string) === 'RESERVED';

    return { activeOrder, isOccupied, isReserved };
  };

  const _tableCounts = tables.reduce(
    (acc, tbl) => {
      const s = getTableState(tbl);
      if (s.isOccupied) acc.occupied += 1;
      else if (s.isReserved) acc.reserved += 1;
      else acc.available += 1;
      return acc;
    },
    { available: 0, occupied: 0, reserved: 0 }
  );
  void _tableCounts;

  return (
    <div className="pos-app-layout">
      {/* Off-canvas Backdrop for Collapsible Sidebar on smaller screens */}
      {isSidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Close navigation menu backdrop"
        />
      )}

      {/* TOP HEADER: Matches exact Reference Image */}
      <header className="pos-ref-top-header">
        {/* Left: Brand Logo & Hamburger */}
        <div className="pos-header-left">
          <button
            type="button"
            className={`header-hamburger-btn ${isSidebarOpen ? 'active' : ''}`}
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            title={isSidebarOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            aria-label="Toggle navigation menu"
            aria-expanded={isSidebarOpen}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          <div className="brand-badge-box">
            <span className="brand-badge-letter">K</span>
          </div>

          <div className="brand-text-block">
            <div className="brand-main-title">KRUNNEX LUXE RETAIL</div>
            <div className="brand-subtitle">Textile &amp; Boutique Flagship</div>
          </div>
        </div>

        {/* Center: Retail Quick Action Tools */}
        <div className="pos-header-center-modes" role="tablist" aria-label="Retail Tools">
          <button
            type="button"
            className="mode-pill-btn camera-btn"
            onClick={() => setIsCameraModalOpen(true)}
            title="Scan tag with Phone/Tablet Camera"
          >
            <IconCamera size={16} />
            <span>Camera Scan</span>
          </button>

          <button
            type="button"
            className="mode-pill-btn mobile-scanner-btn"
            onClick={() => setIsMobilePairModalOpen(true)}
            title="Connect Phone as Wireless Handheld Scanner Gun"
            style={{
              background: '#064e3b',
              color: '#6ee7b7',
              borderColor: '#059669',
            }}
          >
            <IconPhone size={15} />
            <span>Mobile Scanner</span>
          </button>

          <button
            type="button"
            className="mode-pill-btn studio-btn"
            onClick={() => setIsBarcodeStudioOpen(true)}
            title="Generate & Print 50x25mm Barcode Stickers"
          >
            <IconTag size={16} />
            <span>Barcode Studio</span>
          </button>

          <button
            type="button"
            className="mode-pill-btn inventory-btn"
            onClick={() => {
              if (activeNav === 'admin') {
                loadCatalog();
                setActiveNav('new-order');
              } else {
                setActiveNav('admin');
              }
            }}
            title="Create Categories, Add Products & Manage Inventory"
            style={{
              background: activeNav === 'admin' ? '#064e3b' : '#f8fafc',
              color: activeNav === 'admin' ? '#6ee7b7' : '#334155',
              borderColor: activeNav === 'admin' ? '#059669' : '#cbd5e1',
            }}
          >
            <span>📦</span>
            <span>{activeNav === 'admin' ? '← Back to POS' : '+ Add Products'}</span>
          </button>

          <button
            type="button"
            className="mode-pill-btn returns-btn"
            onClick={() => setIsReturnsModalOpen(true)}
            title="Size / Item Exchanges & Store Credit"
          >
            <IconSync size={16} />
            <span>Returns / Exchanges</span>
          </button>

          <button
            type="button"
            className="mode-pill-btn reports-btn"
            onClick={() => setIsDailyReportOpen(true)}
            title="Day-end Daily Sales Closing Z-Report"
          >
            <IconChart size={16} />
            <span>Daily Sales (Z)</span>
          </button>
        </div>

        {/* Right: Counter Status, New Bill, Live Invoices, Admin, Printer, Fullscreen, Cashier JD */}
        <div className="pos-header-right-actions">
          {/* Counter Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0', fontSize: '0.78rem', color: '#065f46', fontWeight: 700 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
            <span>Counter #01</span>
          </div>

          {/* + New Bill Button */}
          <button
            type="button"
            className="header-ref-new-order-btn"
            onClick={handleNewOrder}
            title="Start fresh bill for next customer"
            aria-label="Start New Order"
          >
            <span className="plus-icon"><IconPlus size={16} /></span>
            <span>New Bill</span>
          </button>

          {/* Live Invoices Button */}
          <button
            type="button"
            className={`header-ref-live-orders-btn ${activeNav === 'running-orders' ? 'active' : ''} ${runningOrdersCount > 0 ? 'has-live' : ''}`}
            onClick={() => {
              setActiveNav('running-orders');
              loadAllOrders();
            }}
            title="View Live Today's Invoices"
            aria-label={`Live Orders: ${runningOrdersCount} active`}
          >
            <span className="live-icon" aria-hidden="true"></span>
            <span className="live-text">Invoices</span>
            {runningOrdersCount > 0 && <span className="live-count-badge">{runningOrdersCount}</span>}
          </button>

          {/* Admin & Inventory Toggle Button */}
          <button
            type="button"
            className={`header-icon-pill-btn ${activeNav === 'admin' ? 'active' : ''}`}
            onClick={() => {
              if (activeNav === 'admin') {
                loadCatalog();
                setActiveNav('new-order');
              } else {
                setActiveNav('admin');
              }
            }}
            title={activeNav === 'admin' ? 'Back to POS Cashier' : 'Open Admin & Inventory Management'}
            aria-label="Admin & Inventory Management"
            style={{
              fontWeight: 700,
              fontSize: '0.8rem',
              padding: '0 12px',
              width: 'auto',
              background: activeNav === 'admin' ? '#0f172a' : '#f1f5f9',
              color: activeNav === 'admin' ? '#ffffff' : '#0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {activeNav === 'admin' ? (
              <>
                <IconShoppingBag size={15} />
                <span>Back to POS</span>
              </>
            ) : (
              <>
                <span>📦</span>
                <span>Inventory &amp; Stock</span>
              </>
            )}
          </button>

          {/* Thermal Printer Hardware Settings */}
          <button
            type="button"
            className="header-icon-pill-btn"
            onClick={() => setIsPrinterModalOpen(true)}
            title="Thermal Printer & Hardware Settings"
            aria-label="Thermal Printer & Hardware Settings"
          >
            <IconPrinter size={16} />
          </button>

          {/* Toggle Fullscreen Button */}
          <button
            type="button"
            className="header-icon-pill-btn"
            onClick={handleToggleFullscreen}
            title="Toggle Fullscreen"
            aria-label="Toggle Fullscreen"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9"></polyline>
              <polyline points="9 21 3 21 3 15"></polyline>
              <line x1="21" y1="3" x2="14" y2="10"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          </button>

          {/* Cashier Profile Pill */}
          <div className="header-cashier-pill">
            <div className="cashier-avatar-jd">JD</div>
            <div className="cashier-meta">
              <div className="cashier-name-text">John Doe</div>
              <div className="cashier-role-text">Cashier</div>
            </div>
          </div>
        </div>
      </header>

      {/* Success or Error Alert Toasts */}
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

      {/* MAIN CONTAINER: LEFT SIDEBAR + CENTER (CATALOG/TABLES) + RIGHT CART */}
      <div className="pos-ref-main-container">
        {/* 1. LEFT NAVIGATION SIDEBAR (Boutique Retail Navigation + Collections) */}
        <aside
          className={`pos-sidebar ${isSidebarOpen ? 'open' : ''}`}
          aria-label="Navigation Sidebar"
        >
          {/* Close Button for mobile / drawer */}
          <div className="sidebar-mobile-header">
            <button
              type="button"
              className="sidebar-close-btn"
              onClick={() => setIsSidebarOpen(false)}
              title="Close Menu"
              aria-label="Close navigation menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Quick Counter Modes */}
          <div className="sidebar-system-nav" style={{ paddingTop: '8px' }}>
            <button
              type="button"
              className={`sidebar-nav-btn ${activeNav === 'new-order' && billingMode === 'scan' ? 'active' : ''}`}
              onClick={() => {
                setActiveNav('new-order');
                setBillingMode('scan');
                setIsSidebarOpen(false);
              }}
              title="Quick Barcode Scanner Billing"
            >
              <span className="sidebar-nav-icon"><IconBarcode size={17} /></span>
              <span className="sidebar-nav-label">Barcode Billing</span>
            </button>

            <button
              type="button"
              className={`sidebar-nav-btn ${activeNav === 'new-order' && billingMode === 'catalog' ? 'active' : ''}`}
              onClick={() => {
                setActiveNav('new-order');
                setBillingMode('catalog');
                setSelectedCategoryId('cat-all');
                setIsSidebarOpen(false);
              }}
              title="Browse Product Collections"
            >
              <span className="sidebar-nav-icon"><IconShoppingBag size={17} /></span>
              <span className="sidebar-nav-label">Browse Catalog</span>
            </button>

            <button
              type="button"
              className={`sidebar-nav-btn ${activeNav === 'running-orders' ? 'active' : ''}`}
              onClick={() => {
                setActiveNav('running-orders');
                loadAllOrders();
                setIsSidebarOpen(false);
              }}
              title="View Today's Invoices"
            >
              <span className="sidebar-nav-icon"><IconOrders size={17} /></span>
              <span className="sidebar-nav-label">Invoices</span>
              {runningOrdersCount > 0 && (
                <span className="sidebar-count-badge">{runningOrdersCount}</span>
              )}
            </button>

            <button
              type="button"
              className="sidebar-nav-btn"
              onClick={() => {
                setIsDailyReportOpen(true);
                setIsSidebarOpen(false);
              }}
              title="Day-End Z-Report & GST Summary"
            >
              <span className="sidebar-nav-icon"><IconReports size={17} /></span>
              <span className="sidebar-nav-label">Daily Sales (Z)</span>
            </button>

            <button
              type="button"
              className="sidebar-nav-btn"
              onClick={() => {
                setIsReturnsModalOpen(true);
                setIsSidebarOpen(false);
              }}
              title="Garment Returns & Size Exchanges"
            >
              <span className="sidebar-nav-icon"><IconSync size={17} /></span>
              <span className="sidebar-nav-label">Returns & Exch.</span>
            </button>

            <button
              type="button"
              className="sidebar-nav-btn"
              onClick={() => {
                setIsBarcodeStudioOpen(true);
                setIsSidebarOpen(false);
              }}
              title="Print Thermal Barcode Stickers (50x25mm)"
            >
              <span className="sidebar-nav-icon"><IconTag size={17} /></span>
              <span className="sidebar-nav-label">Print Labels</span>
            </button>

            <button
              type="button"
              className={`sidebar-nav-btn ${activeNav === 'admin' ? 'active' : ''}`}
              onClick={() => {
                setActiveNav('admin');
                setIsSidebarOpen(false);
              }}
              title="Inventory & Product Management"
            >
              <span className="sidebar-nav-icon"><IconSettings size={17} /></span>
              <span className="sidebar-nav-label">Admin & Stock</span>
            </button>
          </div>

          {/* Divider */}
          <div className="sidebar-menu-divider" style={{ margin: '10px 14px' }}></div>

          {/* Section Heading: Collections */}
          <div style={{ padding: '0 16px 6px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: '#94a3b8', textTransform: 'uppercase' }}>
            Collections
          </div>

          {/* Categories Section */}
          <div className="sidebar-categories-group">
            {categories.map((cat) => {
              const isSelected = activeNav === 'new-order' && billingMode === 'catalog' && selectedCategoryId === cat.id;
              const catLabel = cat.id === 'cat-all' ? 'All Items' : cat.name;

              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`sidebar-cat-btn ${isSelected ? 'active' : ''}`}
                  aria-pressed={isSelected}
                  title={catLabel}
                  onClick={() => {
                    setSelectedCategoryId(cat.id);
                    setBillingMode('catalog');
                    setActiveNav('new-order');
                    setIsSidebarOpen(false);
                  }}
                >
                  <span className="sidebar-cat-icon"><CategoryIcon name={cat.id === 'cat-all' ? 'all' : cat.name} size={17} /></span>
                  <span className="sidebar-cat-label">{catLabel}</span>
                </button>
              );
            })}

            <button
              type="button"
              className="sidebar-cat-btn"
              style={{
                color: '#047857',
                fontWeight: 700,
                border: '1px dashed #a7f3d0',
                background: '#ecfdf5',
                marginTop: '6px',
              }}
              onClick={() => {
                setActiveNav('admin');
                setIsSidebarOpen(false);
              }}
              title="Add New Category or Product"
            >
              <span className="sidebar-cat-icon">➕</span>
              <span className="sidebar-cat-label">+ Add Category / Item</span>
            </button>
          </div>

          {/* Register Status & Logout at bottom */}
          <div className="sidebar-bottom-action" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ padding: '6px 12px', background: '#f1f5f9', borderRadius: '8px', fontSize: '0.75rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
              <span><strong>Counter #01</strong> · Ready</span>
            </div>
            <button
              type="button"
              className="sidebar-logout-ref-btn"
              onClick={() => {
                if (window.confirm('Do you want to log out of Krunnex POS?')) {
                  handleClearCart();
                  setSelectedTableNumber('');
                  setIsSidebarOpen(false);
                }
              }}
            >
              <span className="logout-icon"><IconLogout size={17} /></span>
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* 2. CENTER CONTENT (Admin OR Tracker OR Search + Products/Tables) */}
        {activeNav === 'admin' ? (
          <div className="pos-ref-center-content" style={{ padding: '20px', background: '#f8fafc', overflowY: 'auto' }}>
            <AdminLayout onBackToPos={() => { loadCatalog(); setActiveNav('new-order'); }} />
          </div>
        ) : activeNav === 'running-orders' ? (
          <div className="pos-ref-center-content running-orders-body">
            <RunningOrdersView
              orders={allOrders}
              tables={tables}
              bills={bills}
              isLoading={isLoadingOrders}
              onRefresh={loadAllOrders}
              onOpenCheckout={(ord, tbl) => handleOpenCheckout(tbl, ord)}
              onSelectRunningTable={(tbl, ord) => {
                setSelectedTableNumber(tbl.tableNumber);
                setOrderType('DINE_IN');
                setRunningOrder(ord);
                setActiveNav('new-order');
              }}
              onCloseTable={handleCloseTable}
              onSwitchToNewOrder={handleNewOrder}
            />
          </div>
        ) : (
          <>
            <main className="pos-ref-center-content boutique-billing-main">
              {/* TOP DUAL-MODE HEADER TABS */}
              <div className="billing-top-mode-row">
                <div className="billing-mode-tabs" role="tablist">
                  <button
                    type="button"
                    className={`billing-mode-tab-btn ${billingMode === 'scan' ? 'active' : ''}`}
                    onClick={() => setBillingMode('scan')}
                    role="tab"
                    aria-selected={billingMode === 'scan'}
                  >
                    <span className="mode-tab-icon"><IconBarcode size={17} /></span>
                    <span className="mode-tab-title">Barcode Scanner Billing</span>
                  </button>

                  <button
                    type="button"
                    className={`billing-mode-tab-btn ${billingMode === 'catalog' ? 'active' : ''}`}
                    onClick={() => setBillingMode('catalog')}
                    role="tab"
                    aria-selected={billingMode === 'catalog'}
                  >
                    <span className="mode-tab-icon"><IconShoppingBag size={17} /></span>
                    <span className="mode-tab-title">Browse Collections ({filteredProducts.length})</span>
                  </button>
                </div>
              </div>

              {billingMode === 'scan' ? (
                /* ============================================================
                   MODE A: DEDICATED BARCODE SCANNING HUB (CLEAN & FAST BILLING)
                   ============================================================ */
                <div className="barcode-scan-hub-view">
                  {/* HERO SCANNER SEARCH DECK */}
                  <div className="hero-scanner-deck">
                    <div className="hero-scanner-input-wrap">
                      <span className="hero-barcode-icon" aria-hidden="true">
                        <IconBarcode size={24} />
                      </span>
                      <input
                        type="text"
                        className="hero-scanner-input"
                        placeholder="Scan tag with Barcode Gun / Camera, or type barcode (e.g. KRN-BS-KNG-001) & Enter..."
                        value={manualBarcodeCode}
                        onChange={(e) => setManualBarcodeCode(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && manualBarcodeCode.trim()) {
                            e.preventDefault();
                            handleBarcodeDetected(manualBarcodeCode);
                            setManualBarcodeCode('');
                          }
                        }}
                        autoFocus
                      />
                      {manualBarcodeCode && (
                        <button
                          type="button"
                          className="scanner-clear-btn"
                          onClick={() => setManualBarcodeCode('')}
                          title="Clear input"
                        >
                          ✕
                        </button>
                      )}
                      <button
                        type="button"
                        className="hero-scan-submit-btn"
                        onClick={() => {
                          if (manualBarcodeCode.trim()) {
                            handleBarcodeDetected(manualBarcodeCode);
                            setManualBarcodeCode('');
                          }
                        }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      >
                        <IconEnter size={14} />
                        <span>Add</span>
                      </button>
                      <button
                        type="button"
                        className="hero-scan-submit-btn"
                        onClick={() => setIsCameraModalOpen(true)}
                        title="Scan garment tags using phone/webcam camera"
                        style={{ background: '#047857', borderLeft: '1px solid rgba(255,255,255,0.25)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <IconCamera size={15} />
                        <span>Camera Scan</span>
                      </button>
                      <button
                        type="button"
                        className="hero-scan-submit-btn"
                        onClick={() => setIsMobilePairModalOpen(true)}
                        title="Pair phone as wireless handheld barcode gun"
                        style={{ background: '#1e40af', borderLeft: '1px solid rgba(255,255,255,0.25)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <IconPhone size={15} />
                        <span>Mobile Scanner</span>
                      </button>
                    </div>
                  </div>

                  {/* EMPTY STATE / READY TO BILL */}
                  {cartItems.length === 0 ? (
                    <div className="scanner-ready-empty-card">
                      <div className="ready-badge-pill">● Scanner Ready</div>
                      <div className="ready-icon-big" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '76px', height: '76px', borderRadius: '50%', background: '#ecfdf5', color: '#047857', border: '2px solid #a7f3d0', margin: '0 auto 16px' }}>
                        <IconBarcode size={44} />
                      </div>
                      <h2 className="ready-title">Ready for Garment Scanning</h2>
                      <p className="ready-subtitle">
                        Point your handheld USB barcode scanner gun at any garment price tag, or click <strong>Camera Scan</strong> to scan using phone/tablet camera. Items will be ringed up immediately into the bill.
                      </p>

                      <div className="ready-bottom-switch">
                        <span>Prefer visual photos?</span>
                        <button
                          type="button"
                          className="ready-switch-catalog-btn"
                          onClick={() => setBillingMode('catalog')}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <IconShoppingBag size={16} />
                          <span>Browse Full Product Collections</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* SCANNED ITEMS ACTIVE DECK */
                    <div className="scanned-items-active-deck">
                      <div className="scanned-deck-header">
                        <div className="deck-title-box">
                          <h3 className="deck-title">Scanned Garment Tags ({cartItems.length} lines)</h3>
                          <span className="deck-sub">Ringing up into active bill · Staff: Cashier</span>
                        </div>
                        <div className="deck-total-pill">
                          <span>Total: </span>
                          <strong>₹{cartItems.reduce((acc, it) => acc + it.lineTotal, 0).toLocaleString('en-IN')}</strong>
                        </div>
                      </div>

                      <div className="scanned-cards-list">
                        {cartItems.map((item) => (
                          <div key={item.id} className="scanned-garment-card">
                            <img
                              src={item.product.imageUrl || 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500&auto=format&fit=crop&q=80'}
                              alt={item.product.name}
                              className="garment-card-thumb"
                            />
                            <div className="garment-card-info">
                              <div className="garment-card-name">{item.product.name}</div>
                              <div className="garment-card-tags">
                                {item.selectedVariant && (
                                  <span className="garment-tag-pill variant-pill">{item.selectedVariant.name}</span>
                                )}
                                {item.product.fabric && (
                                  <span className="garment-tag-pill fabric-pill">{item.product.fabric}</span>
                                )}
                                <span className="garment-tag-pill sku-pill">{item.product.sku || item.product.barcode}</span>
                              </div>
                            </div>

                            <div className="garment-card-pricing">
                              {item.mrp && item.mrp > item.unitPrice && (
                                <span className="garment-mrp-strike">MRP ₹{item.mrp.toLocaleString('en-IN')}</span>
                              )}
                              <span className="garment-unit-price">₹{item.unitPrice.toLocaleString('en-IN')}</span>
                            </div>

                            <div className="garment-card-quantity">
                              <button
                                type="button"
                                className="qty-adj-btn minus"
                                onClick={() => handleUpdateQuantity(item.id, -1)}
                                title="Decrease quantity"
                              >
                                -
                              </button>
                              <span className="qty-adj-num">{item.quantity}</span>
                              <button
                                type="button"
                                className="qty-adj-btn plus"
                                onClick={() => handleUpdateQuantity(item.id, 1)}
                                title="Increase quantity"
                              >
                                +
                              </button>
                            </div>

                            <div className="garment-card-total">
                              ₹{item.lineTotal.toLocaleString('en-IN')}
                            </div>

                            <button
                              type="button"
                              className="garment-card-remove-btn"
                              onClick={() => handleRemoveItem(item.id)}
                              title="Remove item"
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* FAST SCAN NEXT ITEM CALLOUT */}
                      <div className="fast-scan-next-callout">
                        <span className="next-scan-icon">⚡</span>
                        <span>Scan next garment tag with barcode gun or click test tags below to add more items.</span>
                      </div>

                      {/* QUICK TEST CHIPS BELOW LIST FOR EASY DEMO */}
                      <div className="mini-demo-chips-row">
                        <button type="button" className="mini-chip-btn" onClick={() => handleBarcodeDetected('KRN-BS-KNG-001')}>
                          + 🛏️ King Egyptian Bedsheet
                        </button>
                        <button type="button" className="mini-chip-btn" onClick={() => handleBarcodeDetected('KRN-BC-DBU-006')}>
                          + 🛌 Dabu Bed Cover
                        </button>
                        <button type="button" className="mini-chip-btn" onClick={() => handleBarcodeDetected('KRN-DP-CHD-021')}>
                          + 🧣 Chanderi Silk Dupatta
                        </button>
                        <button type="button" className="mini-chip-btn" onClick={() => handleBarcodeDetected('KRN-KQ-DHR-025')}>
                          + 🧸 Kids Cloud Dohar
                        </button>
                        <button type="button" className="mini-chip-btn" onClick={() => handleBarcodeDetected('KRN-KT-04Y-010')}>
                          + 👘 Kids Mulmul Kurti
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ============================================================
                   MODE B: VISUAL PRODUCT CATALOG (BROWSE COLLECTIONS)
                   ============================================================ */
                <div className="catalog-or-tables-view">
                  {/* Top Search Bar */}
                  <div className="main-ref-search-row">
                    <div className="main-ref-search-box">
                      <span className="search-box-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8"></circle>
                          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                      </span>
                      <input
                        type="search"
                        placeholder="Search for bedsheets, dohars, dupattas, kurtis, SKU or barcode..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="main-ref-search-input"
                        aria-label="Search items"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="search-clear-btn"
                          title="Clear search"
                        >
                          ✕
                        </button>
                      )}
                      <span className="barcode-box-icon" title="Hardware Barcode Gun Active">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#047857" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 5v14"></path>
                          <path d="M8 5v14"></path>
                          <path d="M12 5v14"></path>
                          <path d="M17 5v14"></path>
                          <path d="M21 5v14"></path>
                        </svg>
                      </span>
                    </div>
                  </div>

                  {/* Subheader: Category Title & Count */}
                  <div className="main-ref-subheader-row">
                    <div className="subheader-title-count">
                      <h1 className="subheader-cat-title">
                        {selectedCategoryId === 'cat-all'
                          ? 'All Collections'
                          : categories.find((c) => c.id === selectedCategoryId)?.name || 'Items'}
                      </h1>
                      <span className="subheader-count-bracket">({filteredProducts.length})</span>
                    </div>

                    <div className="subheader-controls">
                      <button
                        type="button"
                        className="mode-pill-btn"
                        onClick={() => setBillingMode('scan')}
                        style={{ background: '#0f172a', color: '#ffffff', fontWeight: 600, fontSize: '0.8rem' }}
                      >
                        ⚡ Switch to Fast Barcode Scan Mode
                      </button>
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="loading-state">
                      <p>Loading boutique catalog...</p>
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="no-products-view">
                      <p>
                        {apiError
                          ? 'Unable to load catalog from server. Check backend connection.'
                          : `No items found matching "${searchQuery}"`}
                      </p>
                    </div>
                  ) : (
                    <div className="product-cards-grid">
                      {filteredProducts.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onSelect={(p) => setActiveModalProduct(p)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </main>

          {/* Right Sticky Cart Panel */}
          <CartPanel
            items={cartItems}
            orderType={orderType}
            onOrderTypeChange={handleOrderTypeChange}
            selectedTableNumber={selectedTableNumber}
            runningOrderId={runningOrder ? runningOrder.id : null}
            runningOrder={runningOrder}
            bill={activeRunningBill}
            tableAmountDue={
              tables.find((t) => t.tableNumber.toLowerCase() === selectedTableNumber.toLowerCase())?.amountDue
            }
            onCancelRunningOrder={() => setSelectedTableNumber('')}
            onOpenTableModal={() => setSelectedTableNumber('')}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            customerNotes={customerNotes}
            onCustomerNotesChange={setCustomerNotes}
            backendCalculation={backendCalculation}
            onSendKOT={handleConfirmOrder}
            onOpenCheckout={() => handleOpenCheckout()}
            onReviewOrder={handleConfirmOrder}
            onModifyRunningItem={handleModifyRunningItem}
          />
        </>
      )}
    </div>

      {/* Table Selector / Manager Modal */}
      <TableSelectorModal
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
        tables={tables}
        selectedTableNumber={selectedTableNumber}
        onSelectTable={(tblNum) => {
          setSelectedTableNumber(tblNum);
          setRunningOrder(null);
          if (tblNum && orderType !== 'DINE_IN') {
            setOrderType('DINE_IN');
          }
        }}
        onSelectRunningTable={handleSelectRunningTable}
        onCloseTable={handleCloseTable}
        onAddTable={handleAddTable}
        onDeleteTable={handleDeleteTable}
        onRefresh={loadTables}
        onOpenCheckout={(tbl) => handleOpenCheckout(tbl)}
      />

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
      />

      {/* Table Checkout & Settlement Modal */}
      <TableCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false);
          setCheckoutOrder(null);
          setCheckoutTable(null);
        }}
        order={checkoutOrder || runningOrder}
        table={
          checkoutTable ||
          tables.find((t) => t.tableNumber.toLowerCase() === selectedTableNumber.toLowerCase()) ||
          null
        }
        pendingCartItems={orderType !== 'DINE_IN' ? cartItems : undefined}
        pendingOrderType={orderType}
        pendingCustomerNotes={customerNotes}
        backendCalculation={backendCalculation}
        onTakeawayPaymentSuccess={handleTakeawayPaymentSuccess}
        onPaymentSettled={handlePaymentSettled}
        onCloseTable={handleCloseTable}
        onCancelBill={handleCancelBill}
      />

      {/* Hardware Printer & ESC/POS Settings Modal */}
      <PrinterSettingsModal
        isOpen={isPrinterModalOpen}
        onClose={() => setIsPrinterModalOpen(false)}
      />

      {/* Phone Camera Barcode Scanner Modal */}
      <CameraBarcodeScannerModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        products={products}
        onBarcodeDetected={handleBarcodeDetected}
      />

      {/* Wireless Mobile Handheld Scanner Pairing Modal */}
      <MobileScannerPairModal
        isOpen={isMobilePairModalOpen}
        onClose={() => setIsMobilePairModalOpen(false)}
        lastScannedItem={lastMobileScannedItem}
      />

      {/* Barcode Studio & Thermal Label Printing Modal */}
      <BarcodeLabelModal
        isOpen={isBarcodeStudioOpen}
        onClose={() => setIsBarcodeStudioOpen(false)}
        products={products}
      />

      {/* Retail Checkout & Settle Modal */}
      <RetailCheckoutModal
        isOpen={isRetailCheckoutOpen}
        onClose={() => setIsRetailCheckoutOpen(false)}
        cartItems={cartItems}
        backendCalculation={backendCalculation}
        onCheckoutSuccess={(data) => {
          handleClearCart();
          setOrderSuccessMessage(`✓ Bill #${data.invoiceNumber} paid via ${data.paymentMethod}! Receipt issued.`);
          setTimeout(() => setOrderSuccessMessage(null), 4000);
        }}
      />

      {/* Daily Sales Closing Z-Report Modal */}
      <DailyClosingReportModal
        isOpen={isDailyReportOpen}
        onClose={() => setIsDailyReportOpen(false)}
        orders={allOrders}
        bills={bills}
      />

      {/* Returns, Size Exchanges & Vendor Debit Notes Modal */}
      <ReturnsExchangesModal
        isOpen={isReturnsModalOpen}
        onClose={() => setIsReturnsModalOpen(false)}
        products={products}
      />
    </div>
  );
}

export default App;
