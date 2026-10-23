import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import {
  FiGrid, FiList, FiShoppingBag, FiCalendar, FiUsers, FiBarChart2,
  FiTrendingUp, FiTrendingDown, FiDollarSign, FiEdit2, FiTrash2,
  FiToggleLeft, FiToggleRight, FiSearch, FiPlus, FiClock, FiMapPin,
  FiMail, FiPhone, FiUser, FiAlertCircle, FiCreditCard, FiFolder
} from 'react-icons/fi';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import StatCard from '../components/dashboard/StatCard';
import StatusBadge from '../components/dashboard/StatusBadge';
import CategoryManagement from '../components/dashboard/CategoryManagement';
import { getAdminReservations, updateReservationStatus } from '../services/reservationService';
import { getAdminAnalytics } from '../services/analyticsService';
import { getAdminOrders, getAdminOrderById, updateOrderStatus, updateOrderPaymentStatus } from '../services/orderService';
import { getAdminPayments } from '../services/paymentService';
import { getUsers, getUserById, updateUser, updateUserStatus } from '../services/userService';
import {
  getAdminMenuItems, createMenuItem, updateMenuItem,
  updateMenuAvailability, deleteMenuItem as apiDeleteMenuItem
} from '../services/menuService';
import { getCategories } from '../services/menuService';
import '../pizza-page.css';


// ─── Shared nav items for Admin ───────────────────────────────────────────────
const adminNav = [
  { label: 'Dashboard',   to: '/admin',               icon: <FiGrid /> },
  { label: 'Orders',      to: '/admin/orders',         icon: <FiShoppingBag /> },
  { label: 'Payments',    to: '/admin/payments',       icon: <FiCreditCard /> },
  { label: 'Reservations',to: '/admin/reservations',   icon: <FiCalendar /> },
  { label: 'Menu',        to: '/admin/menu',           icon: <FiList /> },
  { label: 'Categories',  to: '/admin/categories',     icon: <FiFolder /> },
  { label: 'Customers',   to: '/admin/customers',      icon: <FiUsers /> },
  { label: 'Analytics',   to: '/admin/analytics',      icon: <FiBarChart2 /> },
];

// ─── Overview page ────────────────────────────────────────────────────────────
function AdminOverview() {
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentReservations, setRecentReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    revenue: 0,
    customers: 0,
    reservations: 64, // Static fallback matching mock
    pendingOrders: 0,
    completedOrders: 0,
    avgOrderValue: 0,
    cancelledOrders: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    async function loadRecent() {
      try {
        const res = await getAdminOrders({ limit: 5 });
        if (res.success && res.orders) {
          setRecentOrders(res.orders);
        }
      } catch (e) {
        console.error('Error loading recent orders:', e);
      } finally {
        setLoading(false);
      }
    }
    async function loadRecentReservations() {
      try {
        const res = await getAdminReservations();
        if (res.success && res.reservations) {
          setRecentReservations(res.reservations.slice(0, 4));
        }
      } catch (e) {
        console.error('Error loading overview reservations:', e);
      }
    }
    async function loadStats() {
      try {
        const res = await getAdminAnalytics();
        if (res.success && res.data?.kpis) {
          setStats(res.data.kpis);
        }
      } catch (e) {
        console.error('Error loading admin overview stats:', e);
      } finally {
        setStatsLoading(false);
      }
    }
    loadRecent();
    loadStats();
    loadRecentReservations();
  }, []);

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <h1>Dashboard Overview</h1>
        <span className="dash-page-subtitle">Welcome back — here's what's happening today.</span>
      </div>

      {/* KPI Stats */}
      <div className="stat-cards-grid">
        <StatCard label="Total Orders"  value={statsLoading ? '...' : stats.totalOrders}  icon={<FiShoppingBag />} accent="#d4a373" />
        <StatCard label="Total Revenue" value={statsLoading ? '...' : stats.revenue}       icon={<FiDollarSign />}  accent="#4caf50" prefix="₹" />
        <StatCard label="Customers"     value={statsLoading ? '...' : stats.customers}     icon={<FiUsers />}       accent="#2196f3" />
        <StatCard label="Reservations"  value={statsLoading ? '...' : stats.reservations}  icon={<FiCalendar />}    accent="#9c27b0" />
      </div>

      {/* Secondary stats */}
      <div className="stat-cards-grid" style={{ marginTop: 16 }}>
        <StatCard label="Pending Orders"   value={statsLoading ? '...' : stats.pendingOrders}   icon={<FiTrendingUp />}   accent="#ff9800" />
        <StatCard label="Completed Orders" value={statsLoading ? '...' : stats.completedOrders} icon={<FiTrendingDown />} accent="#4caf50" />
        <StatCard label="Avg Order Value"  value={statsLoading ? '...' : stats.avgOrderValue}   icon={<FiDollarSign />}   accent="#d4a373" prefix="₹" />
        <StatCard label="Cancelled Orders" value={statsLoading ? '...' : stats.cancelledOrders} icon={<FiTrash2 />}       accent="#f44336" />
      </div>

      {/* Recent Orders + Reservations */}
      <div className="dash-two-col" style={{ marginTop: 32 }}>
        {/* Recent Orders */}
        <div className="dash-section-card">
          <div className="dash-section-header">
            <h2>Recent Orders</h2>
            <Link to="/admin/orders" className="dash-see-all">See All</Link>
          </div>
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="dash-empty-row">Loading...</td>
                  </tr>
                ) : (
                  recentOrders.map((o) => (
                    <tr key={o._id || o.id}>
                      <td className="dash-id-cell">{o.orderNumber || o.id}</td>
                      <td>{o.customer?.name || o.customer}</td>
                      <td>₹{o.pricing?.total || o.amount}</td>
                      <td><StatusBadge status={o.status} /></td>
                    </tr>
                  ))
                )}
                {!loading && recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="dash-empty-row">No orders recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Reservations */}
        <div className="dash-section-card">
          <div className="dash-section-header">
            <h2>Recent Reservations</h2>
            <Link to="/admin/reservations" className="dash-see-all">See All</Link>
          </div>
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentReservations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="dash-empty-row">No reservations recorded.</td>
                  </tr>
                ) : (
                  recentReservations.map((r) => (
                    <tr key={r._id || r.id}>
                      <td className="dash-id-cell">{r.reservationId || r.id}</td>
                      <td>{r.customerName || r.customer}</td>
                      <td>{r.date}</td>
                      <td><StatusBadge status={r.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Orders page ──────────────────────────────────────────────────────────────
function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [filter, setFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [modalError, setModalError] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);

  const statuses = ['All', 'Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Cancelled'];

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [filter]);

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit: 10,
        status: filter === 'All' ? undefined : filter
      };
      const res = await getAdminOrders(params);
      if (res.success) {
        setOrders(res.orders || []);
        setTotalPages(res.pagination?.totalPages || 1);
        setTotalOrders(res.pagination?.total || 0);
      } else {
        setError('Failed to retrieve orders.');
      }
    } catch (err) {
      console.error('Error fetching admin orders:', err);
      setError(err.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, filter]);

  // Load detail order
  useEffect(() => {
    if (!selectedOrderId) {
      setSelectedOrder(null);
      return;
    }
    async function fetchDetail() {
      setLoadingDetail(true);
      setModalError('');
      try {
        const res = await getAdminOrderById(selectedOrderId);
        if (res.success && res.order) {
          setSelectedOrder(res.order);
        } else {
          setModalError('Order not found.');
        }
      } catch (err) {
        console.error('Error fetching admin order detail:', err);
        setModalError(err.message || 'Failed to fetch details.');
      } finally {
        setLoadingDetail(false);
      }
    }
    fetchDetail();
  }, [selectedOrderId]);

  const handleStatusChange = async (orderId, newStatus) => {
    setIsUpdatingStatus(true);
    setModalError('');
    try {
      const res = await updateOrderStatus(orderId, newStatus);
      if (res.success && res.order) {
        setSelectedOrder(res.order);
        setOrders(prev => prev.map(o => (o.id === orderId || o._id === orderId) ? { ...o, status: newStatus } : o));
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setModalError(err.message || 'Failed to update operational status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handlePaymentStatusChange = async (orderId, newPaymentStatus) => {
    setIsUpdatingPayment(true);
    setModalError('');
    try {
      const res = await updateOrderPaymentStatus(orderId, newPaymentStatus);
      if (res.success && res.order) {
        setSelectedOrder(res.order);
        setOrders(prev => prev.map(o => (o.id === orderId || o._id === orderId) ? { ...o, payment: { ...o.payment, status: newPaymentStatus } } : o));
      }
    } catch (err) {
      console.error('Error updating payment status:', err);
      setModalError(err.message || 'Failed to update payment status.');
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <h1>Orders</h1>
        <span className="dash-page-subtitle">Real-time order management dashboard connected to database.</span>
      </div>

      <div className="dash-filter-row">
        {statuses.map((s) => (
          <button
            key={s}
            className={`dash-filter-btn ${filter === s ? 'active' : ''}`}
            onClick={() => setFilter(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="dash-section-card">
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Type</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="dash-empty-row">Loading orders...</td></tr>
              ) : error ? (
                <tr><td colSpan={7} className="dash-empty-row" style={{ color: '#9b3a3a' }}>{error}</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="dash-empty-row">No orders match this filter.</td></tr>
              ) : (
                orders.map((o) => (
                  <tr key={o._id || o.id}>
                    <td
                      className="dash-id-cell"
                      style={{ cursor: 'pointer', textDecoration: 'underline', color: '#d4a373', fontWeight: 'bold' }}
                      onClick={() => setSelectedOrderId(o._id || o.id)}
                    >
                      {o.orderNumber || o.id}
                    </td>
                    <td>{o.customer?.name || o.customer}</td>
                    <td>{o.items?.length || 0} item{(o.items?.length || 0) !== 1 ? 's' : ''}</td>
                    <td>₹{o.pricing?.total || o.amount}</td>
                    <td style={{ textTransform: 'capitalize' }}>{o.orderType || o.type}</td>
                    <td className="dash-muted">{formatDate(o.createdAt)}</td>
                    <td><StatusBadge status={o.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loading && !error && totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '15px' }}>
            <span style={{ fontSize: '14px', color: '#666' }}>
              Page {page} of {totalPages} (Total: {totalOrders} orders)
            </span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="dash-filter-btn"
                style={{ margin: 0, opacity: page === 1 ? 0.5 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="dash-filter-btn"
                style={{ margin: 0, opacity: page === totalPages ? 0.5 : 1, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedOrderId && (
        <OrderDetailsModal
          selectedOrderId={selectedOrderId}
          selectedOrder={selectedOrder}
          loadingDetail={loadingDetail}
          modalError={modalError}
          isUpdatingStatus={isUpdatingStatus}
          isUpdatingPayment={isUpdatingPayment}
          handleStatusChange={handleStatusChange}
          handlePaymentStatusChange={handlePaymentStatusChange}
          handleClose={() => setSelectedOrderId(null)}
          role="admin"
        />
      )}
    </div>
  );
}

// ─── Reservations page ────────────────────────────────────────────────────────
function AdminReservations() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAll = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getAdminReservations();
      if (res.success && res.reservations) {
        setReservations(res.reservations);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load reservations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleUpdateStatus = async (id, currentStatus) => {
    const order = ['Pending', 'Confirmed', 'Cancelled'];
    const nextStatus = order[(order.indexOf(currentStatus) + 1) % order.length];
    try {
      const res = await updateReservationStatus(id, nextStatus);
      if (res.success && res.reservation) {
        setReservations(prev =>
          prev.map(r => r._id === id ? { ...r, status: nextStatus } : r)
        );
      }
    } catch (err) {
      console.error('Failed to update reservation status:', err);
      alert(err.message || 'Failed to update reservation status.');
    }
  };

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <h1>Reservations</h1>
        <span className="dash-page-subtitle">Live table reservations from database.</span>
      </div>

      {error && (
        <div style={{ marginBottom: '20px', padding: '10px 15px', background: '#fff2f2', border: '1px solid #f5c6cb', color: '#9b3a3a', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      <div className="dash-section-card">
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Reservation ID</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Time</th>
                <th>Guests</th>
                <th>Table</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="dash-empty-row">Loading reservations...</td>
                </tr>
              ) : reservations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="dash-empty-row">No reservations recorded.</td>
                </tr>
              ) : (
                reservations.map((r) => (
                  <tr key={r._id}>
                    <td className="dash-id-cell">{r.reservationId || r.id}</td>
                    <td>{r.customerName || r.customer}</td>
                    <td>{r.date}</td>
                    <td>{r.time}</td>
                    <td>{r.guests}</td>
                    <td>{r.table || 'T-TBD'}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>
                      <button className="dash-action-btn" onClick={() => handleUpdateStatus(r._id, r.status)}>
                        Update
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Menu Item Form Modal ─────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: '', slug: '', description: '', price: '',
  category: '', image: '', isAvailable: true, isPopular: false,
  ingredients: '', tags: ''
};

export function MenuItemModal({ mode, item, categories, onClose, onSaved }) {
  const isEdit = mode === 'edit';
  const [form, setForm] = useState(() =>
    isEdit ? {
      name:        item.name || '',
      slug:        item.slug || '',
      description: item.description || '',
      price:       item.price != null ? String(item.price) : '',
      category:    item.category?.id || item.category?._id || item.category || '',
      image:       item.image || '',
      isAvailable: item.isAvailable !== false,
      isPopular:   item.isPopular === true,
      ingredients: Array.isArray(item.ingredients) ? item.ingredients.join(', ') : (item.ingredients || ''),
      tags:        Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || '')
    } : { ...EMPTY_FORM }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.slug.trim() || !form.price || !form.category || !form.image.trim() || !form.description.trim()) {
      setError('Name, slug, description, price, image, and category are required.');
      return;
    }
    const priceNum = parseFloat(form.price);
    if (isNaN(priceNum) || priceNum < 0) {
      setError('Price must be a non-negative number.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name:        form.name.trim(),
        slug:        form.slug.trim(),
        description: form.description.trim(),
        price:       priceNum,
        category:    form.category,
        image:       form.image.trim(),
        isAvailable: form.isAvailable,
        isPopular:   form.isPopular,
        ingredients: form.ingredients ? form.ingredients.split(',').map(s => s.trim()).filter(Boolean) : [],
        tags:        form.tags ? form.tags.split(',').map(s => s.trim()).filter(Boolean) : []
      };
      if (isEdit) {
        await updateMenuItem(item.id || item._id, payload);
      } else {
        await createMenuItem(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.message || 'Save failed.');
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
    background: '#fff', borderRadius: '8px', width: '100%', maxWidth: '600px',
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
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '20px', border: 'none', background: 'none', fontSize: '22px', cursor: 'pointer', color: '#666' }} aria-label="Close">&times;</button>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', margin: '0 0 20px', color: '#1a1a1a' }}>
          {isEdit ? 'Edit Menu Item' : 'Add New Menu Item'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={fieldStyle}><label style={labelStyle}>Name *</label><input style={inputStyle} name="name" value={form.name} onChange={handleChange} placeholder="e.g. Margherita Pizza" required /></div>
          <div style={fieldStyle}><label style={labelStyle}>Slug * (URL-safe, unique)</label><input style={inputStyle} name="slug" value={form.slug} onChange={handleChange} placeholder="e.g. margherita-pizza" required /></div>
          <div style={fieldStyle}><label style={labelStyle}>Description *</label><textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} name="description" value={form.description} onChange={handleChange} placeholder="Short description" required /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={fieldStyle}><label style={labelStyle}>Price (₹) *</label><input style={inputStyle} type="number" min="0" step="0.01" name="price" value={form.price} onChange={handleChange} placeholder="249" required /></div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Category *</label>
              <select style={inputStyle} name="category" value={form.category} onChange={handleChange} required>
                <option value="">-- Select Category --</option>
                {categories.map(c => <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div style={fieldStyle}><label style={labelStyle}>Image Path * (e.g. /src/assets/images/margherita.jpg)</label><input style={inputStyle} name="image" value={form.image} onChange={handleChange} placeholder="/src/assets/images/filename.jpg" required /></div>
          <div style={fieldStyle}><label style={labelStyle}>Ingredients (comma-separated)</label><input style={inputStyle} name="ingredients" value={form.ingredients} onChange={handleChange} placeholder="Tomato, Mozzarella, Basil" /></div>
          <div style={fieldStyle}><label style={labelStyle}>Tags (comma-separated)</label><input style={inputStyle} name="tags" value={form.tags} onChange={handleChange} placeholder="veg, popular" /></div>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
              <input type="checkbox" name="isAvailable" checked={form.isAvailable} onChange={handleChange} />
              Available
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
              <input type="checkbox" name="isPopular" checked={form.isPopular} onChange={handleChange} />
              Mark as Popular
            </label>
          </div>

          {error && <div style={{ marginBottom: '12px', padding: '8px 12px', background: '#fff2f2', border: '1px solid #f5c6cb', color: '#9b3a3a', borderRadius: '4px', fontSize: '13px' }}>{error}</div>}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="dash-filter-btn" style={{ margin: 0 }}>Cancel</button>
            <button type="submit" className="dash-primary-btn" disabled={saving}>
              {saving ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Item')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Menu Management page ─────────────────────────────────────────────────────
function AdminMenu() {
  const [items, setItems]           = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState('All');
  const [modalMode, setModalMode]   = useState(null); // 'add' | 'edit'
  const [editItem, setEditItem]     = useState(null);
  const [toggling, setToggling]     = useState({});
  const [deleting, setDeleting]     = useState({});

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [menuRes, catRes] = await Promise.all([
        getAdminMenuItems({ limit: 100 }),
        getCategories()
      ]);
      setItems(menuRes.items || []);
      setCategories(catRes || []);
    } catch (err) {
      console.error('AdminMenu load error:', err);
      setError(err.message || 'Failed to load menu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const categoryNames = ['All', ...categories.map(c => c.name)];

  const visible = items.filter(m => {
    const catName = m.category?.name || '';
    const matchCat = catFilter === 'All' || catName === catFilter;
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleToggle = async (item) => {
    const id = item.id || item._id;
    setToggling(prev => ({ ...prev, [id]: true }));
    try {
      await updateMenuAvailability(id, !item.isAvailable);
      setItems(prev => prev.map(m =>
        (m.id === id || m._id === id) ? { ...m, isAvailable: !item.isAvailable } : m
      ));
    } catch (err) {
      alert(`Toggle failed: ${err.message}`);
    } finally {
      setToggling(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleDelete = async (item) => {
    const id = item.id || item._id;
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    setDeleting(prev => ({ ...prev, [id]: true }));
    try {
      await apiDeleteMenuItem(id);
      setItems(prev => prev.filter(m => m.id !== id && m._id !== id));
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeleting(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setModalMode('edit');
  };

  const handleModalSaved = () => {
    setModalMode(null);
    setEditItem(null);
    loadAll();
  };

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <h1>Menu Management</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/admin/categories" className="dash-action-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fff', color: '#444', border: '1px solid #ddd', padding: '8px 14px', borderRadius: '6px', textDecoration: 'none' }}>
            <FiFolder /> Manage Categories
          </Link>
          <button className="dash-primary-btn" onClick={() => setModalMode('add')}><FiPlus /> Add Food Item</button>
        </div>
      </div>

      <div className="dash-toolbar">
        <div className="dash-search-wrap">
          <FiSearch className="dash-search-icon" />
          <input
            type="text"
            placeholder="Search food items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="dash-search-input"
          />
        </div>
        <div className="dash-filter-row" style={{ margin: 0 }}>
          {categoryNames.map((c) => (
            <button
              key={c}
              className={`dash-filter-btn ${catFilter === c ? 'active' : ''}`}
              onClick={() => setCatFilter(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="dash-section-card">
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Food Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Rating</th>
                <th>Availability</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="dash-empty-row">Loading menu...</td></tr>
              ) : error ? (
                <tr><td colSpan={6} className="dash-empty-row" style={{ color: '#9b3a3a' }}>{error}</td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan={6} className="dash-empty-row">No items match your search.</td></tr>
              ) : (
                visible.map((m) => {
                  const id = m.id || m._id;
                  return (
                    <tr key={id}>
                      <td><strong>{m.name}</strong></td>
                      <td>{m.category?.name || '—'}</td>
                      <td>₹{m.price}</td>
                      <td>⭐ {m.rating?.toFixed(1) || '—'}</td>
                      <td>
                        <button
                          className={`dash-toggle-btn ${m.isAvailable ? 'on' : 'off'}`}
                          onClick={() => handleToggle(m)}
                          disabled={!!toggling[id]}
                          aria-label={`Toggle availability for ${m.name}`}
                        >
                          {toggling[id] ? '...' : m.isAvailable ? <><FiToggleRight /> Available</> : <><FiToggleLeft /> Unavailable</>}
                        </button>
                      </td>
                      <td className="dash-actions-cell">
                        <button className="dash-icon-btn edit" onClick={() => handleEdit(m)} aria-label={`Edit ${m.name}`}><FiEdit2 /></button>
                        <button className="dash-icon-btn delete" onClick={() => handleDelete(m)} disabled={!!deleting[id]} aria-label={`Delete ${m.name}`}><FiTrash2 /></button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalMode && (
        <MenuItemModal
          mode={modalMode}
          item={modalMode === 'edit' ? editItem : null}
          categories={categories}
          onClose={() => { setModalMode(null); setEditItem(null); }}
          onSaved={handleModalSaved}
        />
      )}
    </div>
  );
}
// ─── Customers page ───────────────────────────────────────────────────────────
function AdminCustomers() {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [limit] = useState(20);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected user for detail modal
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [modalError, setModalError] = useState('');
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Modal edit states
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editStatus, setEditStatus] = useState('');

  // Fetch users list
  useEffect(() => {
    async function loadUsers() {
      setLoading(true);
      setError('');
      try {
        const res = await getUsers({ page, limit });
        if (res.success && res.users) {
          setUsers(res.users);
          setTotalPages(res.pagination.totalPages);
          setTotalUsers(res.pagination.total);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
        setError(err.message || 'Failed to fetch users list.');
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, [page, limit]);

  // Fetch individual user details when modal opens
  useEffect(() => {
    if (!selectedUserId) {
      setSelectedUser(null);
      setModalError('');
      return;
    }

    async function loadUserDetail() {
      setLoadingDetail(true);
      setModalError('');
      try {
        const res = await getUserById(selectedUserId);
        if (res.success && res.user) {
          setSelectedUser(res.user);
          setEditName(res.user.name || '');
          setEditEmail(res.user.email || '');
          setEditPhone(res.user.phone || '');
          setEditRole(res.user.role || '');
          setEditStatus(res.user.status || '');
        }
      } catch (err) {
        console.error('Error fetching user detail:', err);
        setModalError(err.message || 'Failed to fetch user details.');
      } finally {
        setLoadingDetail(false);
      }
    }
    loadUserDetail();
  }, [selectedUserId]);

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setModalError('');
    
    if (!editName.trim()) {
      setModalError('Name is required.');
      return;
    }
    if (!editEmail.trim()) {
      setModalError('Email is required.');
      return;
    }

    setIsSavingUser(true);
    try {
      const res = await updateUser(selectedUserId, {
        name: editName.trim(),
        email: editEmail.toLowerCase().trim(),
        phone: editPhone.trim(),
        role: editRole,
        status: editStatus
      });

      if (res.success && res.user) {
        setUsers(prev => prev.map(u => u.id === selectedUserId ? res.user : u));
        setSelectedUserId(null); // Close modal
      }
    } catch (err) {
      console.error('Error updating user:', err);
      setModalError(err.message || 'Failed to update user details.');
    } finally {
      setIsSavingUser(false);
    }
  };

  const visible = users.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <h1>Customers & Users</h1>
        <span className="dash-page-subtitle">{totalUsers} registered users</span>
      </div>

      <div className="dash-toolbar">
        <div className="dash-search-wrap">
          <FiSearch className="dash-search-icon" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="dash-search-input"
          />
        </div>
      </div>

      {error && (
        <div className="auth-alert error" style={{ margin: '15px 0', padding: '12px 18px', background: '#fff2f2', border: '1px solid #f5c6cb', color: '#9b3a3a', borderRadius: '4px' }}>
          <span>{error}</span>
        </div>
      )}

      <div className="dash-section-card">
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Joined Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="dash-empty-row">Loading users...</td></tr>
              ) : (
                visible.map((c) => (
                  <tr key={c.id} onClick={() => setSelectedUserId(c.id)} style={{ cursor: 'pointer' }}>
                    <td><strong>{c.name}</strong></td>
                    <td className="dash-muted">{c.email}</td>
                    <td className="dash-muted">{c.phone || 'Not provided'}</td>
                    <td><span className={`profile-badge ${c.role}`} style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', textTransform: 'capitalize', fontSize: '11px', background: c.role === 'admin' ? '#fed7d7' : c.role === 'owner' ? '#feebc8' : '#e2e8f0', color: c.role === 'admin' ? '#9b2c2c' : c.role === 'owner' ? '#9c4221' : '#4a5568' }}>{c.role}</span></td>
                    <td className="dash-muted">{new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td><StatusBadge status={c.status || 'Active'} /></td>
                  </tr>
                ))
              )}
              {!loading && visible.length === 0 && (
                <tr><td colSpan={6} className="dash-empty-row">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '15px' }}>
            <span style={{ fontSize: '14px', color: '#666' }}>
              Page {page} of {totalPages} (Total: {totalUsers} users)
            </span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="dash-filter-btn"
                style={{ margin: 0, opacity: page === 1 ? 0.5 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="dash-filter-btn"
                style={{ margin: 0, opacity: page === totalPages ? 0.5 : 1, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Details & Edit Modal */}
      {selectedUserId && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 1000 }}>
          <div className="modal-card" style={{ maxWidth: '500px', width: '90%' }}>
            <div className="modal-header">
              <h2>User Management</h2>
              <button className="modal-close" onClick={() => setSelectedUserId(null)}>&times;</button>
            </div>

            {loadingDetail ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading user details...</div>
            ) : (
              selectedUser && (
                <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {modalError && (
                    <div className="auth-alert error" style={{ padding: '8px 12px', fontSize: '13px', background: '#fff2f2', border: '1px solid #f5c6cb', color: '#9b3a3a', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FiAlertCircle style={{ flexShrink: 0 }} /> <span>{modalError}</span>
                    </div>
                  )}

                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: '600' }}>Full Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd', background: '#fff', color: '#333' }}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: '600' }}>Email Address</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd', background: '#fff', color: '#333' }}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: '600' }}>Phone Number</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd', background: '#fff', color: '#333' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '15px' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px', fontWeight: '600' }}>Account Role</label>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd', background: '#fff', color: '#333' }}
                      >
                        <option value="customer">Customer</option>
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px', fontWeight: '600' }}>Account Status</label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd', background: '#fff', color: '#333' }}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="modal-footer" style={{ border: 'none', padding: 0, marginTop: '10px', display: 'flex', gap: '10px' }}>
                    <button type="submit" disabled={isSavingUser} className="dash-filter-btn" style={{ flex: 1, margin: 0, background: '#2f855a', color: 'white', borderColor: '#2f855a' }}>
                      {isSavingUser ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button type="button" onClick={() => setSelectedUserId(null)} className="dash-filter-btn" style={{ flex: 1, margin: 0 }}>
                      Cancel
                    </button>
                  </div>
                </form>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Analytics page ───────────────────────────────────────────────────────────
function AdminAnalytics() {
  const [data, setData] = useState({
    kpis: {
      revenue: 0,
      avgOrderValue: 0,
      totalOrders: 0,
      completedOrders: 0
    },
    revenueByDay: [],
    ordersByCategory: [],
    topFoods: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const res = await getAdminAnalytics();
        if (res.success && res.data) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Error fetching admin analytics:', err);
        setError(err.message || 'Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  const maxRevenue = data.revenueByDay.length > 0
    ? Math.max(...data.revenueByDay.map((d) => d.amount))
    : 0;

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <h1>Analytics</h1>
        <span className="dash-page-subtitle">Live analytics from MongoDB database.</span>
      </div>

      {error && (
        <div style={{ marginBottom: '20px', padding: '10px 15px', background: '#fff2f2', border: '1px solid #f5c6cb', color: '#9b3a3a', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {/* Summary KPIs */}
      <div className="stat-cards-grid">
        <StatCard label="Total Revenue"     value={loading ? '...' : data.kpis.revenue}       icon={<FiDollarSign />}  accent="#4caf50" prefix="₹" />
        <StatCard label="Avg Order Value"   value={loading ? '...' : data.kpis.avgOrderValue}  icon={<FiTrendingUp />}  accent="#d4a373" prefix="₹" />
        <StatCard label="Total Orders"      value={loading ? '...' : data.kpis.totalOrders}    icon={<FiShoppingBag />} accent="#2196f3" />
        <StatCard label="Completed Orders"  value={loading ? '...' : data.kpis.completedOrders}icon={<FiBarChart2 />}   accent="#9c27b0" />
      </div>

      <div className="dash-two-col" style={{ marginTop: 32 }}>
        {/* Revenue by Day bar chart */}
        <div className="dash-section-card">
          <div className="dash-section-header"><h2>Revenue — Last 7 Days</h2></div>
          <div className="analytics-bar-chart">
            {loading ? (
              <div style={{ margin: 'auto', color: '#888' }}>Loading chart...</div>
            ) : data.revenueByDay.length === 0 ? (
              <div style={{ margin: 'auto', color: '#888' }}>No data available</div>
            ) : (
              data.revenueByDay.map((d) => (
                <div key={d.day} className="analytics-bar-col">
                  <span className="analytics-bar-value">₹{(d.amount / 1000).toFixed(1)}k</span>
                  <div
                    className="analytics-bar"
                    style={{ height: `${maxRevenue > 0 ? Math.round((d.amount / maxRevenue) * 160) : 0}px` }}
                  />
                  <span className="analytics-bar-label">{d.day}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Orders by Category */}
        <div className="dash-section-card">
          <div className="dash-section-header"><h2>Orders by Category</h2></div>
          <div className="analytics-progress-list">
            {loading ? (
              <div style={{ padding: '20px', color: '#888', textAlign: 'center' }}>Loading breakdown...</div>
            ) : data.ordersByCategory.length === 0 ? (
              <div style={{ padding: '20px', color: '#888', textAlign: 'center' }}>No category data</div>
            ) : (
              data.ordersByCategory.map((c) => (
                <div key={c.category} className="analytics-progress-row">
                  <div className="analytics-progress-label">
                    <span>{c.category}</span>
                    <span>{c.orders} orders ({c.percentage}%)</span>
                  </div>
                  <div className="analytics-progress-track">
                    <div className="analytics-progress-fill" style={{ width: `${c.percentage}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Top foods */}
      <div className="dash-section-card" style={{ marginTop: 24 }}>
        <div className="dash-section-header"><h2>Top Performing Items</h2></div>
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Food Item</th>
                <th>Orders</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="dash-empty-row">Loading top performing items...</td></tr>
              ) : data.topFoods.length === 0 ? (
                <tr><td colSpan={4} className="dash-empty-row">No items recorded yet.</td></tr>
              ) : (
                data.topFoods.map((f, i) => (
                  <tr key={f.name}>
                    <td className="dash-muted">{i + 1}</td>
                    <td><strong>{f.name}</strong></td>
                    <td>{f.orders}</td>
                    <td>₹{f.revenue.toLocaleString('en-IN')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Payments page ────────────────────────────────────────────────────────────
function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPayments = async (p = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await getAdminPayments({ page: p, limit: 15 });
      if (res.success) {
        setPayments(res.payments || []);
        setTotalPages(res.totalPages || 1);
        setPage(res.page || 1);
      } else {
        setError(res.message || 'Failed to fetch payments');
      }
    } catch (e) {
      setError(e.message || 'Error loading payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments(page);
  }, [page]);

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <h1>Payment Management</h1>
        <span className="dash-page-subtitle">Track and inspect online payment transactions stored in MongoDB.</span>
      </div>

      <div className="dash-section-card" style={{ marginTop: 24 }}>
        <div className="dash-section-header">
          <h2>All Payment Transactions</h2>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: '#fff2f2', border: '1px solid #f5c6cb', color: '#9b3a3a', borderRadius: '4px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Razorpay Payment ID</th>
                <th>Order Number</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Razorpay Order ID</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="dash-empty-row">Loading payment records...</td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="dash-empty-row">No payment records found.</td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p._id || p.id}>
                    <td className="dash-id-cell">
                      {p.razorpayPaymentId || <span style={{ color: '#999', fontStyle: 'italic' }}>Pending</span>}
                    </td>
                    <td><strong>{p.order?.orderNumber || 'N/A'}</strong></td>
                    <td>
                      <div><strong>{p.user?.name || 'N/A'}</strong></div>
                      <div style={{ fontSize: '11px', color: '#888' }}>{p.user?.email || ''}</div>
                    </td>
                    <td><strong>₹{p.amount}</strong></td>
                    <td style={{ textTransform: 'capitalize' }}>{p.method}</td>
                    <td className="dash-muted" style={{ fontSize: '12px' }}>{p.razorpayOrderId}</td>
                    <td>
                      <span className={`status-badge ${p.status === 'Paid' ? 'status-completed' : p.status === 'Failed' ? 'status-cancelled' : 'status-pending'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px' }}>{formatDate(p.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="dash-filter-btn"
            >
              Previous
            </button>
            <span style={{ alignSelf: 'center', fontSize: '13px' }}>Page {page} of {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="dash-filter-btn"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Root export with nested routing ─────────────────────────────────────────
export default function AdminDashboard() {
  return (
    <DashboardLayout role="admin" title="Admin Panel" navItems={adminNav}>
      <Routes>
        <Route index element={<AdminOverview />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="reservations" element={<AdminReservations />} />
        <Route path="menu" element={<AdminMenu />} />
        <Route path="categories" element={<CategoryManagement />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </DashboardLayout>
  );
}

// Vite image resolution module loader
const imageModules = import.meta.glob('../assets/images/*.{png,jpg,jpeg,svg,webp}', {
  eager: true,
  import: 'default'
});

const resolveImage = (imagePath) => {
  if (imagePath && typeof imagePath === 'string') {
    const filename = imagePath.split('/').pop();
    const mapKey = `../assets/images/${filename}`;
    if (imageModules[mapKey]) {
      return imageModules[mapKey];
    }
  }
  return imagePath;
};

// ─── Shared Order Details Modal ──────────────────────────────────────────────
export function OrderDetailsModal({
  selectedOrderId,
  selectedOrder,
  loadingDetail,
  modalError,
  isUpdatingStatus,
  isUpdatingPayment,
  handleStatusChange,
  handlePaymentStatusChange,
  handleClose,
  role
}) {
  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="dash-modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      zIndex: 9999,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px'
    }} onClick={handleClose}>
      <div className="dash-modal-content" style={{
        background: '#fff',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '750px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '30px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        position: 'relative',
        color: '#333'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Close Button */}
        <button onClick={handleClose} style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          border: 'none',
          background: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          color: '#666',
          lineHeight: 1
        }} aria-label="Close modal">&times;</button>

        {loadingDetail ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <h3 style={{ margin: 0 }}>Loading order details...</h3>
          </div>
        ) : modalError ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9b3a3a' }}>
            <FiAlertCircle size={40} style={{ marginBottom: '10px' }} />
            <h3 style={{ margin: 0 }}>{modalError}</h3>
            <button onClick={handleClose} className="dash-filter-btn" style={{ marginTop: '15px' }}>Close</button>
          </div>
        ) : !selectedOrder ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <h3 style={{ margin: 0 }}>No order selected.</h3>
          </div>
        ) : (
          <>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', margin: '0 0 15px', color: '#1a1a1a' }}>
              Order ID: {selectedOrder.orderNumber}
            </h2>
            <div className="summary-divider" style={{ margin: '15px 0', height: '1px', background: '#eee' }} />

            {/* Grid details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '25px', textAlign: 'left' }}>
              
              {/* Left Side: Items & Fulfillment */}
              <div>
                <h4 style={{ margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', color: '#888', letterSpacing: '0.5px' }}>Fulfillment Status</h4>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  <select
                    value={selectedOrder.status}
                    onChange={(e) => handleStatusChange(selectedOrder._id || selectedOrder.id, e.target.value)}
                    disabled={isUpdatingStatus}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                      background: '#fff',
                      fontSize: '14px',
                      width: '100%',
                      cursor: 'pointer'
                    }}
                  >
                    {['Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Cancelled'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <h4 style={{ margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', color: '#888', letterSpacing: '0.5px' }}>Items Summary</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                      <img src={resolveImage(item.image)} alt={item.name} style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '4px' }} />
                      <div style={{ flex: 1 }}>
                        <strong style={{ display: 'block', color: '#1a1a1a' }}>{item.name}</strong>
                        <span style={{ color: '#666' }}>Qty: {item.quantity} &bull; Price: ₹{item.price}</span>
                      </div>
                      <strong style={{ color: '#1a1a1a' }}>₹{item.price * item.quantity}</strong>
                    </div>
                  ))}
                </div>

                {selectedOrder.orderType === 'delivery' && selectedOrder.address && (
                  <div>
                    <h4 style={{ margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', color: '#888', letterSpacing: '0.5px' }}>Delivery Address</h4>
                    <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.4', color: '#333' }}>
                      {selectedOrder.address.address}, {selectedOrder.address.city}, {selectedOrder.address.state || ''} - {selectedOrder.address.pincode}
                    </p>
                    {selectedOrder.address.instructions && (
                      <p style={{ margin: '8px 0 0', padding: '6px 10px', background: '#fefcf8', borderLeft: '3px solid #d4a373', fontSize: '12px', color: '#7a5c3e', fontStyle: 'italic', borderRadius: '0 4px 4px 0' }}>
                        <strong>Note:</strong> {selectedOrder.address.instructions}
                      </p>
                    )}
                  </div>
                )}

                {selectedOrder.orderType === 'dine-in' && (
                  <div>
                    <h4 style={{ margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', color: '#888', letterSpacing: '0.5px' }}>Dine In Information</h4>
                    <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.4', color: '#333' }}>
                      <strong>DINE IN</strong><br />
                      {selectedOrder.dineInDetails?.tableNumber || 'Table N/A'}<br />
                      Guests: {selectedOrder.dineInDetails?.numberOfGuests || 1}
                    </p>
                    {selectedOrder.dineInDetails?.dineInInstructions && (
                      <p style={{ margin: '8px 0 0', padding: '6px 10px', background: '#fefcf8', borderLeft: '3px solid #d4a373', fontSize: '12px', color: '#7a5c3e', fontStyle: 'italic', borderRadius: '0 4px 4px 0' }}>
                        <strong>Note:</strong> {selectedOrder.dineInDetails.dineInInstructions}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Right Side: Pricing & Customer */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h4 style={{ margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', color: '#888', letterSpacing: '0.5px' }}>Customer Details</h4>
                  <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                    <div><strong>Name:</strong> {selectedOrder.customer.name}</div>
                    <div><strong>Email:</strong> {selectedOrder.customer.email}</div>
                    <div><strong>Phone:</strong> {selectedOrder.customer.phone}</div>
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', color: '#888', letterSpacing: '0.5px' }}>Payment & Billing</h4>
                  <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                    <div><strong>Method:</strong> {selectedOrder.payment.method}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <strong>Status:</strong>
                      {role === 'admin' ? (
                        <select
                          value={selectedOrder.payment.status}
                          onChange={(e) => handlePaymentStatusChange(selectedOrder._id || selectedOrder.id, e.target.value)}
                          disabled={isUpdatingPayment}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                            background: '#fff',
                            fontSize: '13px',
                            cursor: 'pointer'
                          }}
                        >
                          {['Pending', 'Paid', 'Failed', 'Refunded'].map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      ) : (
                        <span style={{
                          fontWeight: 'bold',
                          color: selectedOrder.payment.status === 'Paid' ? '#2e7d32' : selectedOrder.payment.status === 'Refunded' ? '#d32f2f' : '#b08200'
                        }}>{selectedOrder.payment.status}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ background: '#fdfcf9', padding: '15px', borderRadius: '4px', border: '1px solid #e0d5c1' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', color: '#888', letterSpacing: '0.5px' }}>Pricing Breakdowns</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Subtotal:</span>
                      <span>₹{selectedOrder.pricing?.subtotal || selectedOrder.subtotal}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Delivery:</span>
                      <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>FREE</span>
                    </div>
                    <div className="summary-divider" style={{ margin: '5px 0', height: '1px', background: '#e0d5c1' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '15px', color: '#1a1a1a' }}>
                      <span>Total Amount:</span>
                      <span>₹{selectedOrder.pricing?.total || selectedOrder.total}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {modalError && (
              <div style={{ marginTop: '20px', padding: '10px 15px', background: '#fff2f2', border: '1px solid #f5c6cb', color: '#9b3a3a', borderRadius: '4px', fontSize: '13px', textAlign: 'center' }}>
                {modalError}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
