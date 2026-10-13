import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import {
  FiGrid, FiList, FiShoppingBag, FiCalendar, FiDollarSign,
  FiTrendingUp, FiEdit2, FiToggleLeft, FiToggleRight, FiClock, FiMapPin,
  FiMail, FiPhone, FiUser, FiAlertCircle, FiSearch, FiPlus
} from 'react-icons/fi';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import StatCard from '../components/dashboard/StatCard';
import StatusBadge from '../components/dashboard/StatusBadge';
import {
  mockTables
} from '../data/adminMockData';
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
  { label: 'Tables',       to: '/owner/tables',          icon: <FiGrid /> },
  { label: 'Reservations', to: '/owner/reservations',    icon: <FiCalendar /> },
  { label: 'Sales',        to: '/owner/sales',           icon: <FiDollarSign /> },
];

// ─── Overview ─────────────────────────────────────────────────────────────────
function OwnerOverview() {
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayOrders: 0,
    todayRevenue: 0,
    pendingOrders: 0,
    todayReservations: 11, // Static fallback matching mock
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    avgOrderValue: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    async function loadRecent() {
      try {
        const res = await getOwnerOrders({ limit: 5 });
        if (res.success && res.orders) {
          setRecentOrders(res.orders);
        }
      } catch (e) {
        console.error('Error loading recent owner orders:', e);
      } finally {
        setLoading(false);
      }
    }
    async function loadStats() {
      try {
        const res = await getOwnerAnalytics();
        if (res.success && res.data?.kpis) {
          setStats(res.data.kpis);
        }
      } catch (e) {
        console.error('Error loading owner overview stats:', e);
      } finally {
        setStatsLoading(false);
      }
    }
    loadRecent();
    loadStats();
  }, []);

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <h1>Restaurant Overview</h1>
        <span className="dash-page-subtitle">Today's live snapshot — real database orders.</span>
      </div>

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
                  <td colSpan={5} className="dash-empty-row">Loading...</td>
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
              {!loading && recentOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="dash-empty-row">No orders recorded yet.</td>
                </tr>
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
        <h1>Orders</h1>
        <span className="dash-page-subtitle">Restaurant operational control and status dispatching.</span>
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
        <button className="dash-primary-btn" onClick={() => setModalMode('add')}><FiPlus /> Add Food Item</button>
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

// ─── Tables page ──────────────────────────────────────────────────────────────
const TABLE_STATUSES = ['Available', 'Reserved', 'Occupied', 'Maintenance'];

function OwnerTables() {
  const [tables, setTables] = useState(mockTables);

  const cycleStatus = (id) => {
    setTables((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next = TABLE_STATUSES[(TABLE_STATUSES.indexOf(t.status) + 1) % TABLE_STATUSES.length];
        return { ...t, status: next };
      })
    );
  };

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <h1>Tables</h1>
        <span className="dash-page-subtitle">Frontend-only status cycling — connect to API later.</span>
      </div>

      {/* Summary */}
      <div className="stat-cards-grid">
        {TABLE_STATUSES.map((s) => (
          <StatCard
            key={s}
            label={`${s} Tables`}
            value={tables.filter((t) => t.status === s).length}
            icon={<FiGrid />}
            accent={s === 'Available' ? '#4caf50' : s === 'Reserved' ? '#ff9800' : s === 'Occupied' ? '#2196f3' : '#f44336'}
          />
        ))}
      </div>

      {/* Table cards */}
      <div className="tables-grid" style={{ marginTop: 28 }}>
        {tables.map((t) => (
          <div key={t.id} className={`table-card status-${t.status.toLowerCase()}`}>
            <div className="table-card-top">
              <span className="table-label">{t.label}</span>
              <StatusBadge status={t.status} />
            </div>
            <div className="table-card-capacity">
              Capacity: <strong>{t.capacity}</strong> guests
            </div>
            <button
              className="dash-action-btn"
              onClick={() => cycleStatus(t.id)}
              style={{ marginTop: 12, width: '100%' }}
            >
              Change Status
            </button>
          </div>
        ))}
      </div>
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
        <Route path="tables" element={<OwnerTables />} />
        <Route path="reservations" element={<OwnerReservations />} />
        <Route path="sales" element={<OwnerSales />} />
        <Route path="*" element={<Navigate to="/owner" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
