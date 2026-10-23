import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import {
  FiGrid, FiList, FiShoppingBag, FiCalendar, FiDollarSign,
  FiTrendingUp, FiEdit2, FiToggleLeft, FiToggleRight, FiClock, FiMapPin,
  FiMail, FiPhone, FiUser, FiAlertCircle, FiSearch, FiPlus,
  FiTrash2, FiRefreshCw, FiCheckCircle, FiFolder
} from 'react-icons/fi';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import StatCard from '../components/dashboard/StatCard';
import StatusBadge from '../components/dashboard/StatusBadge';
import CategoryManagement from '../components/dashboard/CategoryManagement';
import {
  getTables, createTable, updateTable, toggleTableStatus, deleteTable
} from '../services/tableService';
import { getAdminReservations, updateReservationStatus } from '../services/reservationService';
import { getOwnerAnalytics } from '../services/analyticsService';
import { getOwnerOrders, getOwnerOrderById, updateOrderStatus } from '../services/orderService';
import { OrderDetailsModal, MenuItemModal } from './AdminDashboard';
import {
  getAdminMenuItems, createMenuItem, updateMenuItem,
  updateMenuAvailability
} from '../services/menuService';
import { getCategories } from '../services/menuService';
import '../pizza-page.css';

// ─── Shared nav items for Owner ───────────────────────────────────────────────
const ownerNav = [
  { label: 'Dashboard',    to: '/owner',                icon: <FiGrid /> },
  { label: 'Orders',       to: '/owner/orders',          icon: <FiShoppingBag /> },
  { label: 'Menu',         to: '/owner/menu',            icon: <FiList /> },
  { label: 'Categories',   to: '/owner/categories',      icon: <FiFolder /> },
  { label: 'Tables',       to: '/owner/tables',          icon: <FiGrid /> },
  { label: 'Reservations', to: '/owner/reservations',    icon: <FiCalendar /> },
  { label: 'Sales',        to: '/owner/sales',           icon: <FiDollarSign /> },
];

// ─── Overview ─────────────────────────────────────────────────────────────────
function OwnerOverview() {
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(null);
  const [isAuthError, setIsAuthError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [stats, setStats] = useState({
    todayOrders: 0,
    todayRevenue: 0,
    pendingOrders: 0,
    todayReservations: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    avgOrderValue: 0
  });

  const fetchOverviewData = async () => {
    setIsRetrying(true);
    setDashboardError(null);
    setIsAuthError(false);
    setLoading(true);
    setStatsLoading(true);

    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('craveHouseToken') : null;
    if (!token) {
      setDashboardError('No active session token found. Please log in with restaurant owner credentials.');
      setIsAuthError(true);
      setLoading(false);
      setStatsLoading(false);
      setIsRetrying(false);
      return;
    }

    try {
      const [statsResult, ordersResult] = await Promise.allSettled([
        getOwnerAnalytics(),
        getOwnerOrders({ limit: 5 })
      ]);

      let errorMsg = null;
      let hasAuthRejection = false;

      if (statsResult.status === 'fulfilled' && statsResult.value?.success && statsResult.value?.data?.kpis) {
        setStats(statsResult.value.data.kpis);
      } else if (statsResult.status === 'rejected') {
        const msg = statsResult.reason?.message || '';
        if (msg.includes('401') || msg.toLowerCase().includes('auth') || msg.toLowerCase().includes('token')) {
          hasAuthRejection = true;
        }
        errorMsg = msg;
      }

      if (ordersResult.status === 'fulfilled' && ordersResult.value?.success && ordersResult.value?.orders) {
        setRecentOrders(ordersResult.value.orders);
      } else if (ordersResult.status === 'rejected') {
        const msg = ordersResult.reason?.message || '';
        if (msg.includes('401') || msg.toLowerCase().includes('auth') || msg.toLowerCase().includes('token')) {
          hasAuthRejection = true;
        }
        if (!errorMsg) errorMsg = msg;
      }

      if (hasAuthRejection) {
        setIsAuthError(true);
        setDashboardError('Your session has expired or is unauthorized. Please log in again with restaurant owner credentials.');
      } else if (errorMsg) {
        setDashboardError(errorMsg);
      }
    } catch (err) {
      setDashboardError(err.message || 'Failed to connect to backend server.');
    } finally {
      setLoading(false);
      setStatsLoading(false);
      setIsRetrying(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, []);

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <div className="dash-page-title-wrap">
          <h1>Restaurant Overview</h1>
          <span className="dash-page-subtitle">Today's live snapshot — real database orders.</span>
        </div>
        <button
          onClick={fetchOverviewData}
          className="dash-primary-btn"
          disabled={isRetrying || loading}
          style={{ cursor: isRetrying || loading ? 'not-allowed' : 'pointer' }}
        >
          {isRetrying || loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {dashboardError && (
        <div className="dash-alert dash-alert-error">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FiAlertCircle style={{ fontSize: '18px', flexShrink: 0 }} />
            <span>{dashboardError}</span>
          </div>
          {isAuthError ? (
            <Link to="/staff-login" className="dash-alert-retry-btn" style={{ textDecoration: 'none' }}>
              Staff Login
            </Link>
          ) : (
            <button onClick={fetchOverviewData} className="dash-alert-retry-btn" disabled={isRetrying}>
              {isRetrying ? 'Retrying...' : 'Retry'}
            </button>
          )}
        </div>
      )}

      <div className="stat-cards-grid">
        <StatCard label="Today's Orders"       value={statsLoading ? '...' : stats.todayOrders}       icon={<FiShoppingBag />} accent="#d4a373" />
        <StatCard label="Today's Revenue"      value={statsLoading ? '...' : stats.todayRevenue}       icon={<FiDollarSign />}  accent="#4caf50" prefix="₹" />
        <StatCard label="Pending Orders"       value={statsLoading ? '...' : stats.pendingOrders}      icon={<FiTrendingUp />}  accent="#ff9800" />
        <StatCard label="Today's Reservations" value={statsLoading ? '...' : stats.todayReservations}  icon={<FiCalendar />}    accent="#9c27b0" />
      </div>

      <div className="dash-section-card" style={{ marginTop: 32 }}>
        <div className="dash-section-header">
          <h2>Recent Orders</h2>
          <Link to="/owner/orders" className="dash-see-all">See All</Link>
        </div>
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="dash-empty-row">Loading orders...</td>
                </tr>
              ) : recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="dash-empty-row">
                    <div className="dash-empty-state">
                      <span className="dash-empty-state-title">No Orders in Database</span>
                      <p className="dash-empty-state-desc">No customer orders have been recorded in MongoDB yet. As customers order, they will appear here in real time.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                recentOrders.map((o) => (
                  <tr key={o._id || o.id}>
                    <td className="dash-id-cell">{o.orderNumber || o.id}</td>
                    <td>{o.customer?.name || o.customer}</td>
                    <td>{o.items?.length || 0} item{(o.items?.length || 0) !== 1 ? 's' : ''}</td>
                    <td>₹{o.pricing?.total || o.amount}</td>
                    <td><StatusBadge status={o.status} /></td>
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

// ─── Orders page ──────────────────────────────────────────────────────────────
function OwnerOrders() {
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
      const res = await getOwnerOrders(params);
      if (res.success) {
        setOrders(res.orders || []);
        setTotalPages(res.pagination?.totalPages || 1);
        setTotalOrders(res.pagination?.total || 0);
      } else {
        setError('Failed to retrieve orders.');
      }
    } catch (err) {
      console.error('Error fetching owner orders:', err);
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
        const res = await getOwnerOrderById(selectedOrderId);
        if (res.success && res.order) {
          setSelectedOrder(res.order);
        } else {
          setModalError('Order not found.');
        }
      } catch (err) {
        console.error('Error fetching owner order detail:', err);
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
        <div className="dash-page-title-wrap">
          <h1>Orders</h1>
          <span className="dash-page-subtitle">Restaurant operational control and status dispatching.</span>
        </div>
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
          isUpdatingPayment={false}
          handleStatusChange={handleStatusChange}
          handlePaymentStatusChange={() => {}}
          handleClose={() => setSelectedOrderId(null)}
          role="owner"
        />
      )}
    </div>
  );
}

// ─── Owner Menu Item Edit Modal ───────────────────────────────────────────────
// OwnerMenuEditModal removed, using exported MenuItemModal from AdminDashboard

// ─── Menu page ──────────────────────────────────────────────────────────────────
function OwnerMenu() {
  const [items, setItems]           = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState('All');
  const [modalMode, setModalMode]   = useState(null); // 'add' | 'edit'
  const [editItem, setEditItem]     = useState(null);
  const [toggling, setToggling]     = useState({});

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
      console.error('OwnerMenu load error:', err);
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
        <h1>Menu</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/owner/categories" className="dash-action-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fff', color: '#444', border: '1px solid #ddd', padding: '8px 14px', borderRadius: '6px', textDecoration: 'none' }}>
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
            onChange={e => setSearch(e.target.value)}
            className="dash-search-input"
          />
        </div>
        <div className="dash-filter-row" style={{ margin: 0 }}>
          {categoryNames.map(c => (
            <button
              key={c}
              className={`dash-filter-btn ${catFilter === c ? 'active' : ''}`}
              onClick={() => setCatFilter(c)}
            >{c}</button>
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
                <th>Action</th>
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
                visible.map(m => {
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
                          aria-label={`Toggle ${m.name}`}
                        >
                          {toggling[id] ? '...' : m.isAvailable ? <><FiToggleRight /> Available</> : <><FiToggleLeft /> Unavailable</>}
                        </button>
                      </td>
                      <td>
                        <button className="dash-icon-btn edit" onClick={() => handleEdit(m)} aria-label={`Edit ${m.name}`}><FiEdit2 /></button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal — no delete for owner, but create permitted by backend */}
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

// ─── Tables Management ────────────────────────────────────────────────────────
const TABLE_STATUSES = ['Available', 'Reserved', 'Occupied', 'Maintenance'];
const TABLE_AREAS = ['All', 'Main Hall', 'Outdoor Patio', 'Terrace', 'Private Dining', 'Bar Area', 'Balcony'];

export function TableModal({ mode, table, onClose, onSaved }) {
  const isEdit = mode === 'edit';
  const [form, setForm] = useState(() =>
    isEdit && table ? {
      tableNumber: table.tableNumber || '',
      name: table.name || '',
      capacity: table.capacity != null ? String(table.capacity) : '4',
      area: table.area || 'Main Hall',
      isActive: table.isActive !== false,
      description: table.description || '',
    } : {
      tableNumber: '',
      name: '',
      capacity: '4',
      area: 'Main Hall',
      isActive: true,
      description: '',
    }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.tableNumber.trim()) {
      setError('Table number is required.');
      return;
    }
    const cap = parseInt(form.capacity, 10);
    if (isNaN(cap) || cap < 1 || cap > 50) {
      setError('Capacity must be an integer between 1 and 50.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        tableNumber: form.tableNumber.trim().toUpperCase(),
        name: form.name.trim(),
        capacity: cap,
        area: form.area,
        isActive: form.isActive,
        description: form.description.trim(),
      };

      if (isEdit) {
        await updateTable(table._id, payload);
      } else {
        await createTable(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.message || 'Failed to save table.');
    } finally {
      setSaving(false);
    }
  };

  const overlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', zIndex: 9999,
    display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 'clamp(10px, 3vw, 20px)'
  };
  const contentStyle = {
    background: '#fff', borderRadius: '8px', width: '100%', maxWidth: '520px',
    maxHeight: '92vh', overflowY: 'auto', padding: 'clamp(18px, 4vw, 30px)',
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
          {isEdit ? `Edit Table ${table?.tableNumber || ''}` : 'Add New Table'}
        </h2>

        {error && (
          <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#fff2f2', border: '1px solid #f5c6cb', color: '#9b3a3a', borderRadius: '4px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Table Identifier / Number *</label>
              <input
                style={inputStyle}
                name="tableNumber"
                value={form.tableNumber}
                onChange={handleChange}
                placeholder="e.g. T01, PATIO-01"
                required
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Friendly Name (Optional)</label>
              <input
                style={inputStyle}
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Window Booth"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Seating Capacity *</label>
              <input
                style={inputStyle}
                type="number"
                min="1"
                max="50"
                name="capacity"
                value={form.capacity}
                onChange={handleChange}
                required
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Area / Section *</label>
              <select style={inputStyle} name="area" value={form.area} onChange={handleChange} required>
                <option value="Main Hall">Main Hall</option>
                <option value="Outdoor Patio">Outdoor Patio</option>
                <option value="Terrace">Terrace</option>
                <option value="Private Dining">Private Dining</option>
                <option value="Bar Area">Bar Area</option>
                <option value="Balcony">Balcony</option>
              </select>
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Description (Optional)</label>
            <textarea
              style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="e.g. Quiet booth table with garden view."
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <input
              type="checkbox"
              id="isActiveTable"
              name="isActive"
              checked={form.isActive}
              onChange={handleChange}
            />
            <label htmlFor="isActiveTable" style={{ fontSize: '14px', cursor: 'pointer', color: '#333' }}>
              Active table (available for guest reservations)
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
              {saving ? 'Saving...' : (isEdit ? 'Update Table' : 'Create Table')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OwnerTables() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedArea, setSelectedArea] = useState('All');
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit' | null
  const [editTable, setEditTable] = useState(null);
  const [actionId, setActionId] = useState(null);

  const loadTables = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getTables();
      if (res.success && res.tables) {
        setTables(res.tables);
      }
    } catch (err) {
      console.error('Failed to load tables:', err);
      setError(err.message || 'Failed to load tables from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleToggle = async (table) => {
    try {
      setActionId(table._id);
      setError('');
      const res = await toggleTableStatus(table._id);
      if (res.success && res.table) {
        showSuccess(`Table ${table.tableNumber} is now ${res.table.isActive ? 'Active' : 'Deactivated'}.`);
        await loadTables();
      }
    } catch (err) {
      console.error('Failed to toggle table status:', err);
      setError(err.message || 'Failed to update table status.');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (table) => {
    if (!window.confirm(`Are you sure you want to permanently delete Table ${table.tableNumber}? (If this table has existing reservations, deletion will be blocked to safeguard audit history).`)) {
      return;
    }
    try {
      setActionId(table._id);
      setError('');
      const res = await deleteTable(table._id);
      if (res.success) {
        showSuccess(`Table ${table.tableNumber} deleted successfully.`);
        await loadTables();
      }
    } catch (err) {
      console.error('Failed to delete table:', err);
      setError(err.message || 'Failed to delete table.');
    } finally {
      setActionId(null);
    }
  };

  const filteredTables = selectedArea === 'All'
    ? tables
    : tables.filter(t => t.area === selectedArea);

  const statusCounts = {
    Available: tables.filter(t => t.liveStatus === 'Available').length,
    Reserved: tables.filter(t => t.liveStatus === 'Reserved').length,
    Occupied: tables.filter(t => t.liveStatus === 'Occupied').length,
    Maintenance: tables.filter(t => t.liveStatus === 'Maintenance').length,
  };

  return (
    <div className="dash-page">
      <div className="dash-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1>Table Management</h1>
          <span className="dash-page-subtitle">Real database-backed restaurant tables and live reservation occupancy.</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="dash-action-btn"
            onClick={loadTables}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', color: '#444', border: '1px solid #ddd', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}
          >
            <FiRefreshCw className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button
            type="button"
            className="dash-action-btn"
            onClick={() => { setEditTable(null); setModalMode('add'); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--color-primary, #b8381e)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
          >
            <FiPlus /> Add Table
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
        {TABLE_STATUSES.map((s) => (
          <StatCard
            key={s}
            label={`${s} Tables`}
            value={statusCounts[s]}
            icon={<FiGrid />}
            accent={s === 'Available' ? '#4caf50' : s === 'Reserved' ? '#ff9800' : s === 'Occupied' ? '#2196f3' : '#f44336'}
          />
        ))}
      </div>

      {/* Filter Tabs by Area */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 24, marginBottom: 16 }}>
        {TABLE_AREAS.map((area) => (
          <button
            key={area}
            type="button"
            onClick={() => setSelectedArea(area)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: selectedArea === area ? '1px solid var(--color-primary, #b8381e)' : '1px solid #ddd',
              background: selectedArea === area ? 'var(--color-primary, #b8381e)' : '#fff',
              color: selectedArea === area ? '#fff' : '#555',
              fontWeight: selectedArea === area ? 600 : 400,
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            {area} {area === 'All' ? `(${tables.length})` : `(${tables.filter(t => t.area === area).length})`}
          </button>
        ))}
      </div>

      {/* Table grid */}
      {loading && tables.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#777' }}>
          <FiRefreshCw className="spin" style={{ fontSize: '24px', marginBottom: '10px' }} />
          <div>Loading restaurant tables...</div>
        </div>
      ) : filteredTables.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px dashed #ddd', marginTop: 20 }}>
          <FiGrid style={{ fontSize: '32px', color: '#aaa', marginBottom: '12px' }} />
          <h3 style={{ margin: '0 0 8px', color: '#333' }}>No tables found</h3>
          <p style={{ margin: '0 0 16px', color: '#777', fontSize: '14px' }}>
            {selectedArea === 'All' ? "You haven't added any tables yet." : `No tables configured in ${selectedArea}.`}
          </p>
          <button
            type="button"
            onClick={() => { setEditTable(null); setModalMode('add'); }}
            style={{ background: 'var(--color-primary, #b8381e)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
          >
            + Add Table
          </button>
        </div>
      ) : (
        <div className="tables-grid" style={{ marginTop: 20 }}>
          {filteredTables.map((t) => {
            const isBusy = actionId === t._id;
            const currentStatus = t.liveStatus || (t.isActive ? 'Available' : 'Maintenance');
            return (
              <div key={t._id} className={`table-card status-${currentStatus.toLowerCase()}`}>
                <div className="table-card-top">
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="table-label" style={{ fontSize: '16px' }}>{t.tableNumber}</span>
                    {t.name && <span style={{ fontSize: '12px', color: '#777' }}>{t.name}</span>}
                  </div>
                  <StatusBadge status={currentStatus} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <span className="table-card-capacity">
                    Capacity: <strong>{t.capacity}</strong> guests
                  </span>
                  <span style={{ fontSize: '11px', background: '#f5f0ec', color: '#664d42', padding: '2px 8px', borderRadius: '10px' }}>
                    {t.area}
                  </span>
                </div>

                {t.description && (
                  <p style={{ fontSize: '12px', color: '#666', margin: '6px 0 0', lineHeight: 1.3 }}>
                    {t.description}
                  </p>
                )}

                {t.activeReservation && (
                  <div style={{ margin: '6px 0 0', padding: '6px 8px', background: '#fff9e6', borderRadius: '4px', fontSize: '11px', color: '#855d00', border: '1px solid #ffeeba' }}>
                    <strong>{t.activeReservation.customerName}</strong> &bull; {t.activeReservation.time} ({t.activeReservation.guests} guests)
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', marginTop: 14, paddingTop: 10, borderTop: '1px solid #f0eae6' }}>
                  <button
                    type="button"
                    title="Edit table details"
                    onClick={() => { setEditTable(t); setModalMode('edit'); }}
                    disabled={isBusy}
                    style={{ flex: 1, padding: '6px 8px', fontSize: '12px', border: '1px solid #ddd', background: '#fff', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#444' }}
                  >
                    <FiEdit2 /> Edit
                  </button>

                  <button
                    type="button"
                    title={t.isActive ? 'Deactivate table (remove from booking engine)' : 'Activate table (allow bookings)'}
                    onClick={() => handleToggle(t)}
                    disabled={isBusy}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      fontSize: '12px',
                      border: '1px solid ' + (t.isActive ? '#ffe0b2' : '#c8e6c9'),
                      background: t.isActive ? '#fff8e1' : '#e8f5e9',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      color: t.isActive ? '#e65100' : '#2e7d32'
                    }}
                  >
                    {t.isActive ? <FiToggleRight /> : <FiToggleLeft />}
                    {t.isActive ? 'Deactivate' : 'Activate'}
                  </button>

                  <button
                    type="button"
                    title="Delete table permanently (if no reservations exist)"
                    onClick={() => handleDelete(t)}
                    disabled={isBusy}
                    style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #ffcdd2', background: '#ffebee', color: '#c62828', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Table Modal */}
      {modalMode && (
        <TableModal
          mode={modalMode}
          table={modalMode === 'edit' ? editTable : null}
          onClose={() => { setModalMode(null); setEditTable(null); }}
          onSaved={() => {
            setModalMode(null);
            setEditTable(null);
            showSuccess(modalMode === 'edit' ? 'Table updated successfully.' : 'Table created successfully.');
            loadTables();
          }}
        />
      )}
    </div>
  );
}

// ─── Reservations page ────────────────────────────────────────────────────────
function OwnerReservations() {
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
                      <button className="dash-action-btn" onClick={() => handleUpdateStatus(r._id, r.status)}>Update</button>
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

// ─── Sales page ───────────────────────────────────────────────────────────────
function OwnerSales() {
  const [data, setData] = useState({
    kpis: {
      todayRevenue: 0,
      weeklyRevenue: 0,
      monthlyRevenue: 0,
      avgOrderValue: 0
    },
    revenueByDay: [],
    ordersByCategory: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadSalesAnalytics() {
      try {
        const res = await getOwnerAnalytics();
        if (res.success && res.data) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Error fetching owner sales analytics:', err);
        setError(err.message || 'Failed to load sales analytics.');
      } finally {
        setLoading(false);
      }
    }
    loadSalesAnalytics();
  }, []);

  const maxRevenue = data.revenueByDay.length > 0
    ? Math.max(...data.revenueByDay.map((d) => d.amount))
    : 0;

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <h1>Sales</h1>
        <span className="dash-page-subtitle">Live owner sales and performance data.</span>
      </div>

      {error && (
        <div style={{ marginBottom: '20px', padding: '10px 15px', background: '#fff2f2', border: '1px solid #f5c6cb', color: '#9b3a3a', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      <div className="stat-cards-grid">
        <StatCard label="Today's Revenue"  value={loading ? '...' : data.kpis.todayRevenue}   icon={<FiDollarSign />}  accent="#4caf50" prefix="₹" />
        <StatCard label="Weekly Revenue"   value={loading ? '...' : data.kpis.weeklyRevenue}   icon={<FiTrendingUp />}  accent="#d4a373" prefix="₹" />
        <StatCard label="Monthly Revenue"  value={loading ? '...' : data.kpis.monthlyRevenue}  icon={<FiDollarSign />}  accent="#2196f3" prefix="₹" />
        <StatCard label="Avg Order Value"  value={loading ? '...' : data.kpis.avgOrderValue}   icon={<FiDollarSign />}  accent="#9c27b0" prefix="₹" />
      </div>

      {/* Revenue Bar Chart */}
      <div className="dash-section-card" style={{ marginTop: 28 }}>
        <div className="dash-section-header"><h2>Daily Revenue — Last 7 Days</h2></div>
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

      {/* Category breakdown */}
      <div className="dash-section-card" style={{ marginTop: 24 }}>
        <div className="dash-section-header"><h2>Sales by Category</h2></div>
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
  );
}

// ─── Root export with nested routing ─────────────────────────────────────────
export default function OwnerDashboard() {
  return (
    <DashboardLayout role="owner" title="Owner Panel" navItems={ownerNav}>
      <Routes>
        <Route index element={<OwnerOverview />} />
        <Route path="orders" element={<OwnerOrders />} />
        <Route path="menu" element={<OwnerMenu />} />
        <Route path="categories" element={<CategoryManagement />} />
        <Route path="tables" element={<OwnerTables />} />
        <Route path="reservations" element={<OwnerReservations />} />
        <Route path="sales" element={<OwnerSales />} />
        <Route path="*" element={<Navigate to="/owner" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
