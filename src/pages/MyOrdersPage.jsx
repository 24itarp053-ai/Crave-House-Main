import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiShoppingBag, FiInfo, FiClock, FiTrash2, FiMapPin, FiPackage } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import Footer from '../components/Footer';
import { getMyOrders } from '../services/orderService';
import '../pizza-page.css';

const STATUS_STYLES = {
  Pending:     { bg: '#fff9e6', color: '#b08200', border: '#ffeeba' },
  Confirmed:   { bg: '#e8f5e9', color: '#2e7d32', border: '#c8e6c9' },
  Preparing:   { bg: '#e3f2fd', color: '#1565c0', border: '#bbdefb' },
  Ready:       { bg: '#f3e5f5', color: '#6a1b9a', border: '#e1bee7' },
  Completed:   { bg: '#f1f8e9', color: '#33691e', border: '#dcedc8' },
  Cancelled:   { bg: '#fdf2f2', color: '#9b3a3a', border: '#f5c6cb' },
};

export default function MyOrdersPage() {
  const { cartCount } = useCart();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMyOrders();
      if (data.success) {
        setOrders(data.orders || []);
      } else {
        setError(data.message || 'Failed to load orders.');
      }
    } catch (err) {
      console.error('Error loading orders:', err);
      setError(err.message || 'Connection error. Failed to load orders.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    try {
      localStorage.removeItem('craveHouseLastOrder');
      alert('Local order cache cleared. Real orders are fetched from the server and persist on refresh.');
    } catch (e) {
      console.error('Error clearing order history:', e);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <main className="pizza-page">
      {/* Header */}
      <header className="pizza-nav">
        <Link to="/" className="pizza-brand">
          <span>CH</span>
          <i>Crave House</i>
        </Link>

        <Link to="/order" className="pizza-back">
          <FiArrowLeft /> Back to Menu
        </Link>

        <Link to="/cart" className="pizza-cart" aria-label="Shopping cart">
          <FiShoppingBag /> Cart <b>{cartCount}</b>
        </Link>
      </header>

      {/* Hero Banner */}
      <section className="pizza-hero" style={{ background: '#26150f' }}>
        <p className="eyebrow">ORDER HISTORY</p>
        <h1>
          Your Recent
          <br />
          <em>Orders.</em>
        </h1>
        <p>View your temporary simulated checkout order, active preparation status, and items.</p>
      </section>

      {/* Orders Container */}
      <div className="product-details-container" style={{ padding: '60px max(6vw, 24px) 80px' }}>
        {loading ? (
          <div className="empty-cart-wrapper">
            <h2>Loading your orders...</h2>
            <p>Please wait while we connect to the server.</p>
          </div>
        ) : error ? (
          <div className="empty-cart-wrapper">
            <h2>Failed to load orders</h2>
            <p>{error}</p>
            <button onClick={fetchOrders} className="explore-menu-btn" style={{ marginTop: '15px' }}>
              Retry
            </button>
          </div>
        ) : orders.length === 0 ? (
          /* Empty Orders State */
          <div className="empty-cart-wrapper">
            <div className="empty-cart-icon">
              <FiPackage />
            </div>
            <h2>No orders yet</h2>
            <p>You haven't placed any orders yet. Start exploring our categories and place your first order!</p>
            <Link to="/order" className="explore-menu-btn">
              Start Ordering &rarr;
            </Link>
          </div>
        ) : (
          /* Orders Present List */
          <div className="my-orders-layout-container">
            <div className="my-orders-header-row">
              <h2>Recent Orders ({orders.length})</h2>
              <button onClick={handleClearHistory} className="clear-history-btn" title="Clear local success cache">
                <FiTrash2 /> Clear Local Order Cache
              </button>
            </div>

            {orders.map((o) => {
              const badgeStyle = STATUS_STYLES[o.status] || { bg: '#f5f5f5', color: '#555', border: '#ddd' };
              return (
                <Link
                  to={`/my-orders/${o.id || o._id}`}
                  key={o.id || o._id}
                  style={{ textDecoration: 'none', display: 'block', color: 'inherit' }}
                  className="order-history-card-link"
                >
                  <div className="order-history-card" style={{ marginBottom: '30px', cursor: 'pointer' }}>
                    {/* Card Title Header */}
                    <div className="order-card-header">
                      <div>
                        <span className="order-number-tag">Order ID: <strong>{o.orderNumber || o.orderId}</strong></span>
                        <span className="order-date-tag"><FiClock /> {formatDate(o.createdAt || o.date)}</span>
                      </div>
                      <div className="order-badges-wrapper">
                        <span className="order-type-badge">{o.orderType === 'delivery' ? 'Delivery' : o.orderType === 'dine-in' ? 'Dine In' : 'Pickup'}</span>
                        <span
                          className="order-status-badge"
                          style={{
                            background: badgeStyle.bg,
                            color: badgeStyle.color,
                            borderColor: badgeStyle.border,
                          }}
                        >
                          {o.status}
                        </span>
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="order-card-body">
                      <h3>Items Summary</h3>
                      <div className="order-items-grid">
                        {o.items.map((item, idx) => (
                          <div key={idx} className="order-item-detail-row">
                            <img src={item.image} alt={item.name} className="order-item-thumb" />
                            <div className="order-item-detail-info">
                              <h4>{item.name}</h4>
                              <span className="order-item-meta-txt">
                                Qty: {item.quantity} &bull; Price: ₹{item.price}
                              </span>
                            </div>
                            <strong className="order-item-subtotal-price">₹{item.price * item.quantity}</strong>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Delivery Address or Dine-In Details */}
                    {o.orderType === 'delivery' && o.address && (
                      <div className="order-card-address-block">
                        <h4><FiMapPin /> Delivery Address</h4>
                        <p>{o.address.address}, {o.address.city}, {o.address.state || ''} - {o.address.pincode}</p>
                        {o.address.instructions && (
                          <p className="order-address-instructions">Note: {o.address.instructions}</p>
                        )}
                      </div>
                    )}

                    {o.orderType === 'dine-in' && (
                      <div className="order-card-address-block">
                        <h4>Dine In Details</h4>
                        <p>{o.dineInDetails?.tableNumber || 'Table N/A'} &bull; Guests: {o.dineInDetails?.numberOfGuests || 1}</p>
                        {o.dineInDetails?.dineInInstructions && (
                          <p className="order-address-instructions">Note: {o.dineInDetails.dineInInstructions}</p>
                        )}
                      </div>
                    )}

                    {/* Summary Totals */}
                    <div className="order-card-footer">
                      <div className="order-totals-box">
                        <div className="totals-row">
                          <span>Subtotal:</span>
                          <span>₹{o.pricing?.subtotal || o.subtotal}</span>
                        </div>
                        <div className="totals-row">
                          <span>Delivery Charges:</span>
                          <span className="free-delivery">FREE</span>
                        </div>
                        <div className="summary-divider" />
                        <div className="totals-row grand-total">
                          <span>Grand Total:</span>
                          <strong>₹{o.pricing?.total || o.total}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}

            {/* Dev helper notice banner */}
            <div className="demo-credentials-info" style={{ marginTop: '30px' }}>
              <p>💡 <strong>Development Phase Note</strong>: This panel displays live orders retrieved directly from the backend database server.</p>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
