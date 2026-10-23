import React, { useState, useEffect } from 'react';
import {
  FiFolder, FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight,
  FiRefreshCw, FiAlertCircle, FiCheckCircle, FiSearch, FiLayers
} from 'react-icons/fi';
import StatCard from './StatCard';
import StatusBadge from './StatusBadge';
import {
  getAdminCategories,
  createCategory,
  updateCategory,
  updateCategoryStatus,
  deleteCategory,
  resolveImage
} from '../../services/menuService';

export function CategoryModal({ mode, category, onClose, onSaved }) {
  const isEdit = mode === 'edit';
  const [form, setForm] = useState(() =>
    isEdit && category ? {
      name: category.name || '',
      slug: category.slug || '',
      description: category.description || '',
      image: category.image || '',
      displayOrder: category.displayOrder != null ? String(category.displayOrder) : '0',
      isActive: category.isActive !== false
    } : {
      name: '',
      slug: '',
      description: '',
      image: '',
      displayOrder: '0',
      isActive: true
    }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => {
      const next = { ...prev, [name]: type === 'checkbox' ? checked : value };
      // Auto-generate slug when name changes if not in edit mode or if slug was untouched
      if (name === 'name' && !isEdit) {
        next.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Category name is required.');
      return;
    }

    const cleanSlug = form.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!cleanSlug) {
      setError('Category slug is required (URL-friendly string).');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: cleanSlug,
        description: form.description.trim(),
        image: form.image.trim(),
        displayOrder: parseInt(form.displayOrder, 10) || 0,
        isActive: form.isActive
      };

      if (isEdit) {
        await updateCategory(category.id || category._id, payload);
      } else {
        await createCategory(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.message || 'Failed to save category.');
    } finally {
      setSaving(false);
    }
  };

  const overlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', zIndex: 9999,
    display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
  };
  const contentStyle = {
    background: '#fff', borderRadius: '8px', width: '100%', maxWidth: '520px',
    maxHeight: '90vh', overflowY: 'auto', padding: '30px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)', position: 'relative', color: '#333'
  };
  const fieldStyle = {
    display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px'
  };
  const labelStyle = { fontSize: '12px', fontWeight: '600', color: '#555', textTransform: 'uppercase', letterSpacing: '0.4px' };
  const inputStyle = {
    padding: '8px 12px', borderRadius: '4px', border: '1px solid #ccc',
    fontSize: '14px', width: '100%', boxSizing: 'border-box'
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={contentStyle} onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '20px', border: 'none', background: 'none', fontSize: '22px', cursor: 'pointer', color: '#666' }}
          aria-label="Close"
        >
          &times;
        </button>

        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', margin: '0 0 20px', color: '#1a1a1a' }}>
          {isEdit ? `Edit Category: ${category?.name}` : 'Add New Category'}
        </h2>

        {error && (
          <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#fff2f2', border: '1px solid #f5c6cb', color: '#9b3a3a', borderRadius: '4px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Category Name *</label>
              <input
                style={inputStyle}
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Starters, Beverages"
                required
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Slug (URL-safe) *</label>
              <input
                style={inputStyle}
                name="slug"
                value={form.slug}
                onChange={handleChange}
                placeholder="e.g. starters, beverages"
                required
              />
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Description</label>
            <textarea
              style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Short description for guests exploring this category."
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Image Asset / Path</label>
              <input
                style={inputStyle}
                name="image"
                value={form.image}
                onChange={handleChange}
                placeholder="/src/assets/images/pizza.png"
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Display Order</label>
              <input
                style={inputStyle}
                type="number"
                name="displayOrder"
                value={form.displayOrder}
                onChange={handleChange}
                placeholder="0"
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <input
              type="checkbox"
              id="isActiveCategory"
              name="isActive"
              checked={form.isActive}
              onChange={handleChange}
            />
            <label htmlFor="isActiveCategory" style={{ fontSize: '14px', cursor: 'pointer', color: '#333' }}>
              Active category (visible in menu & available for items)
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="dash-action-btn"
              style={{ padding: '8px 20px', background: 'var(--color-primary, #b8381e)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              {saving ? 'Saving...' : (isEdit ? 'Update Category' : 'Create Category')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CategoryManagement() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit' | null
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [actionId, setActionId] = useState(null);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getAdminCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load categories:', err);
      setError(err.message || 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleToggle = async (cat) => {
    const id = cat.id || cat._id;
    try {
      setActionId(id);
      setError('');
      await updateCategoryStatus(id, !cat.isActive);
      showSuccess(`Category "${cat.name}" is now ${!cat.isActive ? 'Active' : 'Inactive'}.`);
      await loadCategories();
    } catch (err) {
      console.error('Failed to toggle category status:', err);
      setError(err.message || 'Failed to update category status.');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (cat) => {
    const id = cat.id || cat._id;
    if (!window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
      return;
    }
    try {
      setActionId(id);
      setError('');
      await deleteCategory(id);
      showSuccess(`Category "${cat.name}" deleted successfully.`);
      await loadCategories();
    } catch (err) {
      console.error('Failed to delete category:', err);
      setError(err.message || 'Failed to delete category.');
    } finally {
      setActionId(null);
    }
  };

  const filteredCategories = categories.filter(c => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q);
  });

  const totalItemsCount = categories.reduce((acc, c) => acc + (c.itemCount || 0), 0);
  const activeCount = categories.filter(c => c.isActive).length;
  const inactiveCount = categories.length - activeCount;

  return (
    <div className="dash-page">
      <div className="dash-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1>Menu Categories</h1>
          <span className="dash-page-subtitle">Manage dynamic menu categories, display ordering, and visibility.</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="dash-action-btn"
            onClick={loadCategories}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', color: '#444', border: '1px solid #ddd', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}
          >
            <FiRefreshCw className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button
            type="button"
            className="dash-action-btn"
            onClick={() => { setSelectedCategory(null); setModalMode('add'); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--color-primary, #b8381e)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
          >
            <FiPlus /> Add Category
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: '20px', padding: '12px 16px', background: '#fff2f2', border: '1px solid #f5c6cb', color: '#9b3a3a', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiAlertCircle /> <span>{error}</span>
          </div>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9b3a3a', fontWeight: 'bold' }}>&times;</button>
        </div>
      )}

      {successMsg && (
        <div style={{ marginBottom: '20px', padding: '12px 16px', background: '#e8f5e9', border: '1px solid #c8e6c9', color: '#2e7d32', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiCheckCircle /> <span>{successMsg}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="stat-cards-grid">
        <StatCard
          label="Total Categories"
          value={categories.length}
          icon={<FiFolder />}
          accent="#4e342e"
        />
        <StatCard
          label="Active Categories"
          value={activeCount}
          icon={<FiCheckCircle />}
          accent="#4caf50"
        />
        <StatCard
          label="Inactive Categories"
          value={inactiveCount}
          icon={<FiAlertCircle />}
          accent="#f44336"
        />
        <StatCard
          label="Categorized Items"
          value={totalItemsCount}
          icon={<FiLayers />}
          accent="#2196f3"
        />
      </div>

      {/* Search & Filter Bar */}
      <div style={{ marginTop: 24, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
          <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '8px 12px 8px 36px', borderRadius: '6px', border: '1px solid #ddd', width: '100%', boxSizing: 'border-box', fontSize: '13px' }}
          />
        </div>
      </div>

      {/* Categories Table */}
      <div className="dash-section-card" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #eee3dd', overflow: 'hidden' }}>
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Order</th>
                <th style={{ width: '60px' }}>Icon</th>
                <th>Category Name</th>
                <th>Slug</th>
                <th>Assigned Items</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && categories.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
                    <FiRefreshCw className="spin" style={{ fontSize: '20px', marginBottom: '8px' }} />
                    <div>Loading menu categories...</div>
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
                    {search ? 'No categories matching your search.' : 'No categories configured yet.'}
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat) => {
                  const id = cat.id || cat._id;
                  const isBusy = actionId === id;
                  const resolvedImg = resolveImage(cat.image);
                  return (
                    <tr key={id}>
                      <td style={{ fontWeight: 600, color: '#666' }}>
                        #{cat.displayOrder ?? 0}
                      </td>
                      <td>
                        {resolvedImg ? (
                          <img
                            src={resolvedImg}
                            alt={cat.name}
                            style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '6px', background: '#f8f5ed', padding: '2px' }}
                          />
                        ) : (
                          <div style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f0ec', borderRadius: '6px', color: '#888' }}>
                            <FiFolder />
                          </div>
                        )}
                      </td>
                      <td>
                        <strong style={{ color: '#26150f', fontSize: '14px' }}>{cat.name}</strong>
                        {cat.description && (
                          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#777', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {cat.description}
                          </p>
                        )}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '13px', color: '#6d4c41' }}>
                        {cat.slug}
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', fontWeight: 600, background: '#f0f4f8', color: '#1565c0', padding: '3px 8px', borderRadius: '12px' }}>
                          {cat.itemCount ?? 0} items
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={cat.isActive ? 'Active' : 'Inactive'} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            title="Edit Category"
                            onClick={() => { setSelectedCategory(cat); setModalMode('edit'); }}
                            disabled={isBusy}
                            style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #ddd', background: '#fff', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: '#444' }}
                          >
                            <FiEdit2 /> Edit
                          </button>

                          <button
                            type="button"
                            title={cat.isActive ? 'Deactivate Category' : 'Activate Category'}
                            onClick={() => handleToggle(cat)}
                            disabled={isBusy}
                            style={{
                              padding: '6px 10px',
                              fontSize: '12px',
                              border: '1px solid ' + (cat.isActive ? '#ffe0b2' : '#c8e6c9'),
                              background: cat.isActive ? '#fff8e1' : '#e8f5e9',
                              color: cat.isActive ? '#e65100' : '#2e7d32',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            {cat.isActive ? <FiToggleRight /> : <FiToggleLeft />}
                            {cat.isActive ? 'Deactivate' : 'Activate'}
                          </button>

                          <button
                            type="button"
                            title="Delete Category"
                            onClick={() => handleDelete(cat)}
                            disabled={isBusy}
                            style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #ffcdd2', background: '#ffebee', color: '#c62828', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Category Modal */}
      {modalMode && (
        <CategoryModal
          mode={modalMode}
          category={modalMode === 'edit' ? selectedCategory : null}
          onClose={() => { setModalMode(null); setSelectedCategory(null); }}
          onSaved={() => {
            setModalMode(null);
            setSelectedCategory(null);
            showSuccess(modalMode === 'edit' ? 'Category updated successfully.' : 'Category created successfully.');
            loadCategories();
          }}
        />
      )}
    </div>
  );
}
