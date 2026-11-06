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

  // Fetch all admin data for current outlet
  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cats, prods, adds] = await Promise.all([
        posApiClient.getCategories(),
        posApiClient.getProducts(),
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch admin data');
    } finally {
      setLoading(false);
    }
  }, [selectedOutletId]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // Handlers for menu management
  const handleCreateCategory = async (req: CategoryRequest) => {
    await posApiClient.createCategory(req);
    await loadAdminData();
  };

  const handleDeactivateCategory = async (id: string) => {
    await posApiClient.deactivateCategory(id);
    await loadAdminData();
  };

  const handleCreateProduct = async (req: ProductRequest) => {
    await posApiClient.createProduct(req);
    await loadAdminData();
  };

  const handleDeactivateProduct = async (id: string) => {
    await posApiClient.deactivateProduct(id);
    await loadAdminData();
  };

  const handleCreateAddOn = async (req: AddOnRequest) => {
    await posApiClient.createAddOn(req);
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
