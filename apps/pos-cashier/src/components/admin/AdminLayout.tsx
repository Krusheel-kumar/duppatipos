import React, { useState, useEffect, useCallback } from 'react';
import type {
  Outlet,
  ProductCategory,
  Product,
  AddOn,
  Order,
  Bill,
  CategoryRequest,
  ProductRequest,
  AddOnRequest,
} from '../../types/pos';
import { posApiClient } from '../../api/posApiClient';
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from '../../data/mockCatalog';
import { AdminDashboard } from './AdminDashboard';
import { AdminMenuManagement } from './AdminMenuManagement';
import { AdminOrdersView } from './AdminOrdersView';
import { AdminBillingView } from './AdminBillingView';
import './Admin.css';

type AdminTab = 'dashboard' | 'menu' | 'orders' | 'billing';

export const AdminLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState<string>(() => {
    return posApiClient.getConfig().outletId || '';
  });

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial outlets
  useEffect(() => {
    let isMounted = true;
    const loadOutlets = async () => {
      try {
        const outletList = await posApiClient.getOutlets();
        if (isMounted) {
          setOutlets(outletList);
          if (outletList.length > 0) {
            const currentOutlet = posApiClient.getConfig().outletId;
            const defaultOutlet = outletList.find((o) => o.id === currentOutlet) || outletList[0];
            setSelectedOutletId(defaultOutlet.id);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          // If outlets endpoint fails or returns error, fallback to configured outlet
          const currentOutlet = posApiClient.getConfig().outletId;
          if (currentOutlet) {
            setSelectedOutletId(currentOutlet);
          }
          console.warn('Failed to load outlets list:', err);
        }
      }
    };

    loadOutlets();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch all admin data for current outlet with offline fallback
  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cats, prods, adds] = await Promise.all([
        posApiClient.getCategories().catch(() => {
          const stored = localStorage.getItem('krunnex_admin_categories');
          return stored ? JSON.parse(stored) : MOCK_CATEGORIES;
        }),
        posApiClient.getProducts().catch(() => {
          const stored = localStorage.getItem('krunnex_admin_products');
          return stored ? JSON.parse(stored) : MOCK_PRODUCTS;
        }),
        posApiClient.getAddOns().catch(() => [] as AddOn[]),
      ]);
      setCategories(cats);
      setProducts(prods);
      setAddOns(adds);

      if (selectedOutletId) {
        const [ordList, billList] = await Promise.all([
          posApiClient.getOutletOrders(selectedOutletId).catch(() => [] as Order[]),
          posApiClient.getOutletBills(selectedOutletId).catch(() => [] as Bill[]),
        ]);
        setOrders(ordList);
        setBills(billList);
      }
    } catch {
      // Graceful offline fallback
      const storedProds = localStorage.getItem('krunnex_admin_products');
      const storedCats = localStorage.getItem('krunnex_admin_categories');
      setProducts(storedProds ? JSON.parse(storedProds) : MOCK_PRODUCTS);
      setCategories(storedCats ? JSON.parse(storedCats) : MOCK_CATEGORIES);
    } finally {
      setLoading(false);
    }
  }, [selectedOutletId]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // Handlers for menu management
  const handleCreateCategory = async (req: CategoryRequest) => {
    try {
      await posApiClient.createCategory(req);
    } catch {
      // Offline fallback: save locally
      const newCat: ProductCategory = {
        id: `cat-local-${Date.now()}`,
        name: req.name,
        description: req.description,
        isActive: true,
      };
      const updated = [...categories, newCat];
      setCategories(updated);
      localStorage.setItem('krunnex_admin_categories', JSON.stringify(updated));
    }
    await loadAdminData();
  };

  const handleDeactivateCategory = async (id: string) => {
    try {
      await posApiClient.deactivateCategory(id);
    } catch {
      const updated = categories.filter((c) => c.id !== id);
      setCategories(updated);
      localStorage.setItem('krunnex_admin_categories', JSON.stringify(updated));
    }
    await loadAdminData();
  };

  const handleCreateProduct = async (req: ProductRequest) => {
    try {
      await posApiClient.createProduct(req);
    } catch {
      // Offline fallback: create product locally
      const cat = categories.find((c) => c.id === req.categoryId);
      const newProd: Product = {
        id: `prod-local-${Date.now()}`,
        name: req.name,
        description: req.description,
        sku: req.sku,
        barcode: req.barcode || req.sku,
        fabric: req.fabric,
        hsnCode: req.hsnCode,
        mrp: req.mrp,
        basePrice: req.basePrice,
        isActive: true,
        category: cat,
        variants: req.variants?.map((v, i) => ({
          id: `var-local-${Date.now()}-${i}`,
          name: v.name,
          sizeLabel: v.sizeLabel,
          sku: v.sku || req.sku,
          barcode: v.barcode || v.sku || req.sku,
          mrp: v.mrp || req.mrp,
          color: v.color,
          threadCount: v.threadCount,
          price: v.price,
          isActive: true,
        })) || [],
        addOns: [],
      };
      const updated = [newProd, ...products];
      setProducts(updated);
      localStorage.setItem('krunnex_admin_products', JSON.stringify(updated));
    }
    await loadAdminData();
  };

  const handleDeactivateProduct = async (id: string) => {
    try {
      await posApiClient.deactivateProduct(id);
    } catch {
      const updated = products.filter((p) => p.id !== id);
      setProducts(updated);
      localStorage.setItem('krunnex_admin_products', JSON.stringify(updated));
    }
    await loadAdminData();
  };

  const handleCreateAddOn = async (req: AddOnRequest) => {
    try {
      await posApiClient.createAddOn(req);
    } catch {
      const newAddOn: AddOn = {
        id: `addon-local-${Date.now()}`,
        name: req.name,
        price: req.price,
        isActive: true,
      };
      const updated = [...addOns, newAddOn];
      setAddOns(updated);
    }
    await loadAdminData();
  };

  const handleOutletChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedOutletId(newId);
    posApiClient.updateConfig({ outletId: newId });
  };

  return (
    <div className="admin-container">
      {/* SIDEBAR NAVIGATION */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-logo">K</div>
          <h2>Krunnex POS</h2>
          <span className="admin-brand-tag">Owner</span>
        </div>

        <nav className="admin-nav">
          <button
            type="button"
            className={`admin-nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span>📊</span> Dashboard
          </button>
          <button
            type="button"
            className={`admin-nav-btn ${activeTab === 'menu' ? 'active' : ''}`}
            onClick={() => setActiveTab('menu')}
          >
            <span>🍽️</span> Menu Catalog
          </button>
          <button
            type="button"
            className={`admin-nav-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <span>🧾</span> Orders
          </button>
          <button
            type="button"
            className={`admin-nav-btn ${activeTab === 'billing' ? 'active' : ''}`}
            onClick={() => setActiveTab('billing')}
          >
            <span>💳</span> Billing & Invoices
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          <a href="/" className="admin-link-btn">
            ← Cashier POS
          </a>
          <a href="/kitchen" className="admin-link-btn">
            👨‍🍳 Kitchen Display
          </a>
        </div>
      </aside>

      {/* MAIN VIEW */}
      <main className="admin-main">
        <header className="admin-header">
          <div className="admin-title-area">
            <h1>
              {activeTab === 'dashboard' && 'Restaurant Dashboard'}
              {activeTab === 'menu' && 'Menu & Catalog Management'}
              {activeTab === 'orders' && 'Order Management'}
              {activeTab === 'billing' && 'Billing & Payment Records'}
            </h1>
          </div>

          <div className="admin-outlet-selector">
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Outlet:</span>
            {outlets.length > 0 ? (
              <select
                className="admin-outlet-select"
                value={selectedOutletId}
                onChange={handleOutletChange}
              >
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            ) : (
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Default Outlet</span>
            )}
          </div>
        </header>

        <div className="admin-content">
          {error && <div className="error-banner">{error}</div>}

          {activeTab === 'dashboard' && (
            <AdminDashboard
              orders={orders}
              bills={bills}
              isLoading={loading}
              onRefresh={loadAdminData}
            />
          )}

          {activeTab === 'menu' && (
            <AdminMenuManagement
              categories={categories}
              products={products}
              addOns={addOns}
              isLoading={loading}
              onRefresh={loadAdminData}
              onCreateCategory={handleCreateCategory}
              onDeactivateCategory={handleDeactivateCategory}
              onCreateProduct={handleCreateProduct}
              onDeactivateProduct={handleDeactivateProduct}
              onCreateAddOn={handleCreateAddOn}
            />
          )}

          {activeTab === 'orders' && (
            <AdminOrdersView
              orders={orders}
              isLoading={loading}
              onRefresh={loadAdminData}
            />
          )}

          {activeTab === 'billing' && (
            <AdminBillingView
              bills={bills}
              isLoading={loading}
              onRefresh={loadAdminData}
            />
          )}
        </div>
      </main>
    </div>
  );
};
