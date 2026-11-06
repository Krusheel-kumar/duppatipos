import React, { useState } from 'react';
import type { ProductCategory, Product, AddOn, CategoryRequest, ProductRequest, AddOnRequest } from '../../types/pos';
import { BarcodeLabelModal } from '../BarcodeLabelModal';

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

  // Barcode Label Modal State
  const [selectedProductForBarcode, setSelectedProductForBarcode] = useState<Product | null>(null);

  // New Category State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');

  // New Product State (Textile Specialized)
  const [showProductModal, setShowProductModal] = useState(false);
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodFabric, setProdFabric] = useState('100% Egyptian Cotton (400TC)');
  const [prodHsn, setProdHsn] = useState('6302');
  const [prodBarcode, setProdBarcode] = useState('');
  const [prodMrp, setProdMrp] = useState('3499');
  const [prodPrice, setProdPrice] = useState('2699');
  const [prodCategoryId, setProdCategoryId] = useState('');

  // Variant States
  const [prodVariantName, setProdVariantName] = useState('King Size (108"x108")');
  const [prodVariantColor, setProdVariantColor] = useState('Sage Olive');
  const [prodVariantPrice, setProdVariantPrice] = useState('2699');

  // New Add-On State
  const [showAddOnModal, setShowAddOnModal] = useState(false);
  const [addOnName, setAddOnName] = useState('');
  const [addOnPrice, setAddOnPrice] = useState('0');

  // Auto-generate barcode helper
  const handleAutoGenerateBarcode = () => {
    const prefix = prodCategoryId.includes('kurti') ? 'KRN-KT' : prodCategoryId.includes('bedcover') ? 'KRN-BC' : 'KRN-BS';
    const randNum = Math.floor(100 + Math.random() * 900);
    setProdBarcode(`${prefix}-${randNum}`);
  };

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
      const generatedBarcode = prodBarcode.trim() || `KRN-PROD-${Math.floor(100 + Math.random() * 900)}`;

      const variants = prodVariantName ? [
        {
          name: `${prodVariantName} - ${prodVariantColor}`,
          sizeLabel: prodVariantName,
          sku: generatedBarcode,
          barcode: generatedBarcode,
          color: prodVariantColor,
          mrp: parseFloat(prodMrp) || 0,
          price: parseFloat(prodVariantPrice) || parseFloat(prodPrice) || 0,
          isActive: true,
          displayOrder: 1,
        }
      ] : undefined;

      await onCreateProduct({
        categoryId: prodCategoryId || categories[0]?.id,
        name: prodName,
        description: prodDesc,
        sku: generatedBarcode,
        barcode: generatedBarcode,
        fabric: prodFabric,
        hsnCode: prodHsn,
        mrp: parseFloat(prodMrp) || 0,
        basePrice: parseFloat(prodPrice) || 0,
        variants,
        isActive: true,
      });

      setProdName('');
      setProdDesc('');
      setProdBarcode('');
      setProdPrice('2699');
      setProdMrp('3499');
      setShowProductModal(false);
      setSuccessMsg(`Product "${prodName}" created with barcode ${generatedBarcode}!`);
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
          👗 Boutique Products ({products.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          🏷️ Categories ({categories.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'addons' ? 'active' : ''}`}
          onClick={() => setActiveTab('addons')}
        >
          ✨ Services / Packaging ({addOns.length})
        </button>
      </div>

      {errorMsg && <div className="error-banner">{errorMsg}</div>}
      {successMsg && <div className="success-banner">{successMsg}</div>}

      {/* PRODUCTS TAB */}
      {activeTab === 'products' && (
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0 }}>Textile Catalog &amp; Barcode Management</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                Manage premium bedsheets, bed covers, kids kurtis &amp; print tags
              </p>
            </div>
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
                  handleAutoGenerateBarcode();
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
                    <th>Product &amp; Fabric</th>
                    <th>Category</th>
                    <th>Barcode / SKU</th>
                    <th>MRP / Sale Price</th>
                    <th>HSN</th>
                    <th>Variants</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const barcode = p.barcode || p.sku || p.variants?.[0]?.barcode || 'KRN-001';
                    const mrp = p.mrp || (p.basePrice ? p.basePrice * 1.3 : 1999);
                    return (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.name}</strong>
                          {p.fabric && (
                            <div style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 600 }}>
                              {p.fabric}
                            </div>
                          )}
                        </td>
                        <td>{p.category?.name || '-'}</td>
                        <td>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              background: '#f1f5f9',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                            }}
                          >
                            {barcode}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>₹{p.basePrice.toFixed(2)}</div>
                          <div style={{ fontSize: '0.75rem', textDecoration: 'line-through', color: '#94a3b8' }}>
                            MRP: ₹{mrp.toFixed(2)}
                          </div>
                        </td>
                        <td>{p.hsnCode || '6302'}</td>
                        <td>{p.variants?.length ? `${p.variants.length} variant(s)` : 'Standard'}</td>
                        <td>
                          <span className={`badge ${p.isActive ? 'badge-success' : 'badge-neutral'}`}>
                            {p.isActive ? 'Active' : 'Archived'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              title="Print Barcode Tag"
                              onClick={() => setSelectedProductForBarcode(p)}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <span>🏷️</span>
                              <span>Tag</span>
                            </button>
                            {p.isActive && (
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => onDeactivateProduct(p.id)}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
            <h3 style={{ margin: 0 }}>Product Categories</h3>
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

      {/* ADDONS / SERVICES TAB */}
      {activeTab === 'addons' && (
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Add-on Services &amp; Packaging</h3>
            <div className="admin-header-actions">
              <button type="button" className="btn btn-secondary btn-sm" onClick={onRefresh}>
                Refresh
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShowAddOnModal(true)}
              >
                + Add Service / Box
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="loading-spinner">Loading services...</div>
          ) : addOns.length === 0 ? (
            <div className="empty-state">No add-on services configured.</div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Service / Packaging Name</th>
                    <th>Price (₹)</th>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', width: '400px', maxWidth: '90%' }}>
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
                  placeholder="e.g. Silk Sarees &amp; Dupattas"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={categoryDesc}
                  onChange={(e) => setCategoryDesc(e.target.value)}
                  placeholder="e.g. Handwoven festive wear"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCategoryModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE PRODUCT MODAL (TEXTILE & BARCODE SPECIALIZED) */}
      {showProductModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: 'white', padding: '1.75rem', borderRadius: '16px', width: '560px', maxWidth: '92%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>Add Textile / Apparel Product</h3>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
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
                  placeholder="e.g. Pure Linen Sateen Bedsheet (King)"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Fabric / Material</label>
                  <input
                    type="text"
                    className="form-input"
                    value={prodFabric}
                    onChange={(e) => setProdFabric(e.target.value)}
                    placeholder="e.g. 100% Cotton (400TC)"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">HSN Code</label>
                  <select
                    className="form-select"
                    value={prodHsn}
                    onChange={(e) => setProdHsn(e.target.value)}
                  >
                    <option value="6302">6302 (Bed linen &amp; covers)</option>
                    <option value="6104">6104 (Kids &amp; women kurtis)</option>
                    <option value="6304">6304 (Cushions &amp; throws)</option>
                    <option value="5208">5208 (Cotton woven fabric)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Maximum Retail Price (MRP ₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    required
                    value={prodMrp}
                    onChange={(e) => setProdMrp(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Our Selling Price (₹)</label>
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
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label">Barcode / SKU</label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateBarcode}
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    ⚡ Auto-Generate
                  </button>
                </div>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={prodBarcode}
                  onChange={(e) => setProdBarcode(e.target.value)}
                  placeholder="e.g. KRN-BS-KNG-042"
                />
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '1rem 0' }} />
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
                Initial Variant Specification (Size &amp; Color):
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Size Label</label>
                  <input
                    type="text"
                    className="form-input"
                    value={prodVariantName}
                    onChange={(e) => setProdVariantName(e.target.value)}
                    placeholder="e.g. King (108x108) or 4-5Y"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Color / Design</label>
                  <input
                    type="text"
                    className="form-input"
                    value={prodVariantColor}
                    onChange={(e) => setProdVariantColor(e.target.value)}
                    placeholder="e.g. Sage Olive or Mustard"
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
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowProductModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#047857', border: 'none' }}>
                  Save &amp; Generate Barcode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE ADDON / SERVICE MODAL */}
      {showAddOnModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginTop: 0 }}>Add Service / Packaging</h3>
            <form onSubmit={handleCreateAddOn}>
              <div className="form-group">
                <label className="form-label">Service Name</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={addOnName}
                  onChange={(e) => setAddOnName(e.target.value)}
                  placeholder="e.g. Festive Boutique Gift Box"
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
                  Create Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BARCODE LABEL MODAL */}
      {selectedProductForBarcode && (
        <BarcodeLabelModal
          isOpen={Boolean(selectedProductForBarcode)}
          onClose={() => setSelectedProductForBarcode(null)}
          products={products}
          selectedProduct={selectedProductForBarcode}
        />
      )}
    </div>
  );
};
