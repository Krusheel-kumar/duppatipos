import React, { useState } from 'react';
import type { ProductCategory, Product, AddOn, CategoryRequest, ProductRequest, AddOnRequest } from '../../types/pos';

interface AdminMenuManagementProps {
  categories: ProductCategory[];
  products: Product[];
  addOns: AddOn[];
  isLoading: boolean;
  onRefresh: () => void;
  onCreateCategory: (req: CategoryRequest) => Promise<void>;
  onDeactivateCategory: (id: string) => Promise<void>;
  onCreateProduct: (req: ProductRequest) => Promise<void>;
  onDeactivateProduct: (id: string) => Promise<void>;
  onCreateAddOn: (req: AddOnRequest) => Promise<void>;
}

export const AdminMenuManagement: React.FC<AdminMenuManagementProps> = ({
  categories,
  products,
  addOns,
  isLoading,
  onRefresh,
  onCreateCategory,
  onDeactivateCategory,
  onCreateProduct,
  onDeactivateProduct,
  onCreateAddOn,
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'addons'>('products');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Category State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');

  // New Product State
  const [showProductModal, setShowProductModal] = useState(false);
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodPrice, setProdPrice] = useState('0');
  const [prodCategoryId, setProdCategoryId] = useState('');
  const [prodVariantName, setProdVariantName] = useState('');
  const [prodVariantPrice, setProdVariantPrice] = useState('');

  // New Add-On State
  const [showAddOnModal, setShowAddOnModal] = useState(false);
  const [addOnName, setAddOnName] = useState('');
  const [addOnPrice, setAddOnPrice] = useState('0');

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await onCreateCategory({
        name: categoryName,
        description: categoryDesc,
        displayOrder: categories.length + 1,
        isActive: true,
      });
      setCategoryName('');
      setCategoryDesc('');
      setShowCategoryModal(false);
      setSuccessMsg('Category created successfully');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create category');
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!prodCategoryId && categories.length > 0) {
      setErrorMsg('Please select a category');
      return;
    }
    try {
      const variants = prodVariantName && prodVariantPrice ? [
        {
          name: prodVariantName,
          price: parseFloat(prodVariantPrice),
          isActive: true,
          displayOrder: 1,
        }
      ] : undefined;

      await onCreateProduct({
        categoryId: prodCategoryId || categories[0]?.id,
        name: prodName,
        description: prodDesc,
        sku: prodSku || undefined,
        basePrice: parseFloat(prodPrice) || 0,
        variants,
        isActive: true,
      });
      setProdName('');
      setProdDesc('');
      setProdSku('');
      setProdPrice('0');
      setProdVariantName('');
      setProdVariantPrice('');
      setShowProductModal(false);
      setSuccessMsg('Product created successfully');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create product');
    }
  };

  const handleCreateAddOn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await onCreateAddOn({
        name: addOnName,
        price: parseFloat(addOnPrice) || 0,
        isActive: true,
      });
      setAddOnName('');
      setAddOnPrice('0');
      setShowAddOnModal(false);
      setSuccessMsg('Add-on created successfully');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create add-on');
    }
  };

  return (
    <div>
      <div className="tabs-header">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          Products ({products.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          Categories ({categories.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'addons' ? 'active' : ''}`}
          onClick={() => setActiveTab('addons')}
        >
          Add-ons ({addOns.length})
        </button>
      </div>

      {errorMsg && <div className="error-banner">{errorMsg}</div>}
      {successMsg && <div className="success-banner">{successMsg}</div>}

      {/* PRODUCTS TAB */}
      {activeTab === 'products' && (
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Catalog Products</h3>
            <div className="admin-header-actions">
              <button type="button" className="btn btn-secondary btn-sm" onClick={onRefresh}>
                Refresh
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  if (categories.length > 0 && !prodCategoryId) {
                    setProdCategoryId(categories[0].id);
                  }
                  setShowProductModal(true);
                }}
              >
                + Add Product
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="loading-spinner">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="empty-state">No products found. Click "+ Add Product" to add one.</div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Base Price</th>
                    <th>Variants</th>
                    <th>Add-ons</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.name}</strong>
                        {p.sku && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>SKU: {p.sku}</div>}
                      </td>
                      <td>{p.category?.name || '-'}</td>
                      <td>₹{p.basePrice.toFixed(2)}</td>
                      <td>{p.variants?.length ? `${p.variants.length} variant(s)` : 'None'}</td>
                      <td>{p.addOns?.length ? `${p.addOns.length} add-on(s)` : 'None'}</td>
                      <td>
                        <span className={`badge ${p.isActive ? 'badge-success' : 'badge-neutral'}`}>
                          {p.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        {p.isActive && (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => onDeactivateProduct(p.id)}
                          >
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CATEGORIES TAB */}
      {activeTab === 'categories' && (
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Menu Categories</h3>
            <div className="admin-header-actions">
              <button type="button" className="btn btn-secondary btn-sm" onClick={onRefresh}>
                Refresh
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShowCategoryModal(true)}
              >
                + Add Category
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="loading-spinner">Loading categories...</div>
          ) : categories.length === 0 ? (
            <div className="empty-state">No categories configured.</div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Category Name</th>
                    <th>Description</th>
                    <th>Display Order</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id}>
                      <td><strong>{c.name}</strong></td>
                      <td>{c.description || '-'}</td>
                      <td>{c.displayOrder ?? 0}</td>
                      <td>
                        <span className={`badge ${c.isActive !== false ? 'badge-success' : 'badge-neutral'}`}>
                          {c.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        {c.isActive !== false && (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => onDeactivateCategory(c.id)}
                          >
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ADD-ONS TAB */}
      {activeTab === 'addons' && (
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Customization Add-ons</h3>
            <div className="admin-header-actions">
              <button type="button" className="btn btn-secondary btn-sm" onClick={onRefresh}>
                Refresh
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShowAddOnModal(true)}
              >
                + Add Add-on
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="loading-spinner">Loading add-ons...</div>
          ) : addOns.length === 0 ? (
            <div className="empty-state">No add-ons created.</div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Add-on Name</th>
                    <th>Price</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {addOns.map((a) => (
                    <tr key={a.id}>
                      <td><strong>{a.name}</strong></td>
                      <td>₹{a.price.toFixed(2)}</td>
                      <td>
                        <span className={`badge ${a.isActive ? 'badge-success' : 'badge-neutral'}`}>
                          {a.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CREATE CATEGORY MODAL */}
      {showCategoryModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginTop: 0 }}>Create Category</h3>
            <form onSubmit={handleCreateCategory}>
              <div className="form-group">
                <label className="form-label">Category Name</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g. Specialty Beverages"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={categoryDesc}
                  onChange={(e) => setCategoryDesc(e.target.value)}
                  placeholder="e.g. Hot and iced artisanal coffees"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCategoryModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE PRODUCT MODAL */}
      {showProductModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', width: '500px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>Create Product</h3>
            <form onSubmit={handleCreateProduct}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={prodCategoryId}
                  onChange={(e) => setProdCategoryId(e.target.value)}
                  required
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Product Name</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="e.g. Cold Brew Reserve"
                />
              </div>
              <div className="form-group">
                <label className="form-label">SKU (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={prodSku}
                  onChange={(e) => setProdSku(e.target.value)}
                  placeholder="e.g. CBR-01"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Base Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  required
                  value={prodPrice}
                  onChange={(e) => setProdPrice(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                />
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '1rem 0' }} />
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Optional Initial Variant (e.g. Large)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Variant Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={prodVariantName}
                    onChange={(e) => setProdVariantName(e.target.value)}
                    placeholder="e.g. Large 16oz"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Variant Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    value={prodVariantPrice}
                    onChange={(e) => setProdVariantPrice(e.target.value)}
                    placeholder="e.g. 5.50"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowProductModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE ADDON MODAL */}
      {showAddOnModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginTop: 0 }}>Create Add-on</h3>
            <form onSubmit={handleCreateAddOn}>
              <div className="form-group">
                <label className="form-label">Add-on Name</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={addOnName}
                  onChange={(e) => setAddOnName(e.target.value)}
                  placeholder="e.g. Oat Milk"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  required
                  value={addOnPrice}
                  onChange={(e) => setAddOnPrice(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddOnModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Add-on
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};



