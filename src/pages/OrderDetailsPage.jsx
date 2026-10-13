import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiShoppingBag, FiClock, FiMapPin, FiMail, FiPhone, FiUser, FiInfo, FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { getOrderById } from '../services/orderService';
import Footer from '../components/Footer';
import '../pizza-page.css';

// Vite image resolution module loader (same as menuService.js)
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

const STAGES = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed'];

const getStageStatus = (stage, currentStatus) => {
  if (currentStatus === 'Cancelled') {
    return 'inactive';
  }
  const currentIndex = STAGES.indexOf(currentStatus);
  const stageIndex = STAGES.indexOf(stage);

  if (stageIndex < currentIndex) return 'completed';
  if (stageIndex === currentIndex) return 'active';
  return 'inactive';
};

const STATUS_DETAILS = {
  Pending: 'Your order has been received and is waiting for confirmation.',
  Confirmed: 'Your order has been confirmed and will be prepared shortly.',
  Preparing: 'Our chef is preparing your fresh meal right now.',
  Ready: 'Your food is ready! It is hot and waiting for delivery or pickup.',
  Completed: 'Order completed. Enjoy your delicious food!',
  Cancelled: 'This order has been cancelled.'
};

export default function OrderDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cartCount } = useCart();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [order, setOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [error, setError] = useState('');

  // 1. Session verification
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { state: { message: 'Please login to track your order.' } });
    }
  }, [isAuthenticated, authLoading, navigate]);

  // 2. Fetch order data
  const fetchOrderDetails = async () => {
    setLoadingOrder(true);
    setError('');
    try {
      const data = await getOrderById(id);
      if (data.success && data.order) {
        setOrder(data.order);
      } else {
        setError('Order not found');
      }
    } catch (err) {
      console.error('Error fetching order details:', err);
      // Safe error messages (avoid exposing raw stack traces or internal systems)
      if (err.message.includes('404') || err.message.includes('not found') || err.message.includes('Cast to ObjectId failed')) {
        setError('Order not found');
      } else {
        setError('Connection error. Failed to retrieve order details.');
      }
    } finally {
      setLoadingOrder(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && id) {
      fetchOrderDetails();
    }
  }, [isAuthenticated, id]);

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
    <main className="pizza-page">
      {/* Header */}
      <header className="pizza-nav">
        <Link to="/" className="pizza-brand">
          <span>CH</span>
          <i>Crave House</i>
        </Link>

        <Link to="/orders" className="pizza-back">
          <FiArrowLeft /> Back to Orders
        </Link>

        <Link to="/cart" className="pizza-cart" aria-label="Shopping cart">
          <FiShoppingBag /> Cart <b>{cartCount}</b>
        </Link>
      </header>

      {/* Hero Banner */}
      <section className="pizza-hero" style={{ background: '#26150f' }}>
        <p className="eyebrow">ORDER TRACKING</p>
        <h1>
          Track Your
          <br />
          <em>Cravings.</em>
        </h1>
        <p>Live preparation state and order details retrieved directly from our kitchen.</p>
      </section>

      {/* Main Container */}
      <div className="product-details-container" style={{ padding: '60px max(6vw, 24px) 80px' }}>
        {authLoading || loadingOrder ? (
          /* Loading State */
          <div className="empty-cart-wrapper">
            <h2>Loading order details...</h2>
            <p>Gathering status data from the server.</p>
          </div>
        ) : error ? (
          /* Error State */
          <div className="empty-cart-wrapper">
            <div className="empty-cart-icon" style={{ background: '#fdf2f2', color: '#9b3a3a' }}>
              <FiAlertCircle />
            </div>
            <h2>{error}</h2>
            <p>Please check the URL or try reloading your page.</p>
            {error.includes('Connection') && (
              <button onClick={fetchOrderDetails} className="explore-menu-btn" style={{ marginTop: '15px' }}>
                Retry
              </button>
            )}
            <Link to="/orders" className="explore-menu-btn" style={{ marginTop: '10px' }}>
              Back to My Orders
            </Link>
          </div>
        ) : !order ? (
          <div className="empty-cart-wrapper">
            <h2>Order not found</h2>
            <Link to="/orders" className="explore-menu-btn">
              Back to My Orders
            </Link>
          </div>
        ) : (
          /* Order details present */
          <div className="my-orders-layout-container">
            
            {/* Status Tracking Progress Stepper */}
            <div className="checkout-section-card" style={{ marginBottom: '30px', padding: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0 }}>Fulfillment Tracking</h3>
                <span className="order-date-tag" style={{ margin: 0 }}><FiClock /> Updated: {formatDate(order.updatedAt)}</span>
              </div>
              <div className="summary-divider" />

              {/* Cancelled Banner */}
              {order.status === 'Cancelled' ? (
                <div style={{
                  background: '#fff2f2',
                  border: '1px solid #f5c6cb',
                  color: '#9b3a3a',
                  padding: '15px',
                  borderRadius: '6px',
                  marginTop: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <FiAlertCircle size={20} />
                  <div>
                    <strong style={{ fontSize: '15px' }}>This order has been Cancelled.</strong>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#721c24' }}>
                      Operational status shows the order was aborted. Please check details or contact customer service.
                    </p>
                  </div>
                </div>
              ) : (
                /* Stepper Representation */
                <div style={{ margin: '30px 0 10px' }}>
                  <div className="tracking-steps-wrapper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                    
                    {/* Stepper bar background */}
                    <div style={{
                      position: 'absolute',
                      top: '15px',
                      left: '4%',
                      right: '4%',
                      height: '4px',
                      background: '#e0e0e0',
                      zIndex: 1
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${(STAGES.indexOf(order.status) / (STAGES.length - 1)) * 100}%`,
                        background: '#d4a373',
                        transition: 'width 0.4s ease-in-out'
                      }} />
                    </div>

                    {/* Stepper Circles */}
                    {STAGES.map((stage, idx) => {
                      const status = getStageStatus(stage, order.status);
                      const isCompleted = status === 'completed';
                      const isActive = status === 'active';

                      return (
                        <div key={stage} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, position: 'relative', width: '18%' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: isCompleted || isActive ? '#d4a373' : '#fff',
                            border: `2px solid ${isCompleted || isActive ? '#d4a373' : '#e0e0e0'}`,
                            color: isCompleted || isActive ? '#fff' : '#757575',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '13px',
                            boxShadow: isActive ? '0 0 0 4px rgba(212, 163, 115, 0.25)' : 'none',
                            transition: 'all 0.3s ease'
                          }}>
                            {isCompleted ? '✓' : idx + 1}
                          </div>
                          <span style={{
                            marginTop: '10px',
                            fontSize: '11px',
                            fontWeight: isActive ? '700' : '600',
                            color: isActive ? '#d4a373' : '#757575',
                            textAlign: 'center',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            {stage}
                          </span>
                        </div>
                      );
                    })}

                  </div>

                  {/* Status Helper Text */}
                  <div style={{ marginTop: '25px', textAlign: 'center', background: '#fdfcf9', padding: '12px', borderRadius: '4px', border: '1px dashed #e0d5c1' }}>
                    <p style={{ margin: 0, fontSize: '14px', color: '#7a5c3e', fontWeight: '500' }}>
                      💡 {STATUS_DETAILS[order.status]}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Layout Grid */}
            <div className="cart-grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: '30px' }}>
              
              {/* Left Column: Items details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                
                {/* Items Summaries */}
                <div className="checkout-section-card" style={{ padding: '30px' }}>
                  <h3>Items Summary</h3>
                  <div className="summary-divider" />
                  <div className="order-items-grid" style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '15px' }}>
                    {order.items.map((item, idx) => (
                      <div key={idx} className="order-item-detail-row" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <img src={resolveImage(item.image)} alt={item.name} className="order-item-thumb" style={{ width: '60px', height: '60px', borderRadius: '4px', objectFit: 'cover' }} />
                        <div className="order-item-detail-info" style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 4px', fontSize: '15px' }}>{item.name}</h4>
                          <span className="order-item-meta-txt" style={{ fontSize: '13px', color: '#666' }}>
                            Qty: {item.quantity} &bull; Price: ₹{item.price}
                          </span>
                        </div>
                        <strong className="order-item-subtotal-price" style={{ fontSize: '16px', color: '#222' }}>₹{item.price * item.quantity}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delivery Information Block */}
                {order.orderType === 'delivery' && order.address && (
                  <div className="checkout-section-card" style={{ padding: '30px' }}>
                    <h3>Delivery Address</h3>
                    <div className="summary-divider" />
                    <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                      <FiMapPin style={{ color: '#d4a373', marginTop: '3px' }} />
                      <div>
                        <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5', color: '#333' }}>
                          {order.address.address}, {order.address.city}, {order.address.state || ''} - {order.address.pincode}
                        </p>
                        {order.address.instructions && (
                          <p style={{ margin: '10px 0 0', padding: '10px', background: '#fcf8f2', borderLeft: '3px solid #d4a373', borderRadius: '0 4px 4px 0', fontSize: '13px', color: '#7a5c3e', fontStyle: 'italic' }}>
                            <strong>Note:</strong> {order.address.instructions}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Dine In Information Block */}
                {order.orderType === 'dine-in' && (
                  <div className="checkout-section-card" style={{ padding: '30px' }}>
                    <h3>Dine In Details</h3>
                    <div className="summary-divider" />
                    <div style={{ marginTop: '15px' }}>
                      <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5', color: '#333' }}>
                        <strong>Table Number:</strong> {order.dineInDetails?.tableNumber || 'Table N/A'}
                      </p>
                      <p style={{ margin: '6px 0 0', fontSize: '14px', lineHeight: '1.5', color: '#333' }}>
                        <strong>Number of Guests:</strong> {order.dineInDetails?.numberOfGuests || 1}
                      </p>
                      {order.dineInDetails?.dineInInstructions && (
                        <p style={{ margin: '10px 0 0', padding: '10px', background: '#fcf8f2', borderLeft: '3px solid #d4a373', borderRadius: '0 4px 4px 0', fontSize: '13px', color: '#7a5c3e', fontStyle: 'italic' }}>
                          <strong>Note:</strong> {order.dineInDetails.dineInInstructions}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Summaries & Payment */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                
                {/* Pricing summary */}
                <div className="cart-summary-card" style={{ padding: '30px' }}>
                  <h3>Order Summary</h3>
                  <div className="summary-divider" />
                  
                  <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', margin: '12px 0', fontSize: '14px' }}>
                    <span>Order ID</span>
                    <strong>{order.orderNumber || order.orderId}</strong>
                  </div>
                  
                  <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', margin: '12px 0', fontSize: '14px' }}>
                    <span>Placed On</span>
                    <span>{formatDate(order.createdAt)}</span>
                  </div>

                  <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', margin: '12px 0', fontSize: '14px' }}>
                    <span>Fulfillment</span>
                    <strong style={{ textTransform: 'capitalize' }}>{order.orderType}</strong>
                  </div>

                  <div className="summary-divider" />
                  
                  <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', margin: '12px 0', fontSize: '14px' }}>
                    <span>Subtotal</span>
                    <span>₹{order.pricing?.subtotal || order.subtotal}</span>
                  </div>

                  <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', margin: '12px 0', fontSize: '14px' }}>
                    <span>Delivery Charges</span>
                    <span className="free-delivery" style={{ color: '#2e7d32', fontWeight: 'bold' }}>FREE</span>
                  </div>

                  <div className="summary-divider" />

                  <div className="summary-row total-row" style={{ display: 'flex', justifyContent: 'space-between', margin: '15px 0 0', fontSize: '18px', fontWeight: 'bold', color: '#1a1a1a' }}>
                    <span>Total Amount</span>
                    <strong>₹{order.pricing?.total || order.total}</strong>
                  </div>
                </div>

                {/* Customer and Payment summaries */}
                <div className="checkout-section-card" style={{ padding: '30px' }}>
                  <h3>Fulfillment & Payment</h3>
                  <div className="summary-divider" />
                  
                  <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    
                    {/* Customer */}
                    <div>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#888', fontWeight: 'bold', letterSpacing: '0.5px' }}>Customer Details</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '13px' }}>
                        <FiUser style={{ color: '#757575' }} />
                        <strong>{order.customer.name}</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '13px', color: '#555' }}>
                        <FiMail style={{ color: '#757575' }} />
                        <span>{order.customer.email}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '13px', color: '#555' }}>
                        <FiPhone style={{ color: '#757575' }} />
                        <span>{order.customer.phone}</span>
                      </div>
                    </div>

                    <div className="summary-divider" style={{ margin: '5px 0' }} />

                    {/* Payment Info */}
                    <div>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#888', fontWeight: 'bold', letterSpacing: '0.5px' }}>Payment Mode</span>
                      <div style={{ marginTop: '4px', fontSize: '14px' }}>
                        <strong>{order.payment.method}</strong> &bull; Status: <span style={{
                          fontWeight: 'bold',
                          color: order.payment.status === 'Paid' ? '#2e7d32' : order.payment.status === 'Refunded' ? '#d32f2f' : '#b08200'
                        }}>{order.payment.status}</span>
                      </div>
                    </div>

                  </div>
                </div>

              </div>

            </div>

          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
