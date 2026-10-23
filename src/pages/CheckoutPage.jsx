import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiShoppingBag, FiMapPin, FiMail, FiPhone, FiUser, FiInfo, FiCheckCircle, FiCreditCard } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';
import { createOrder } from '../services/orderService';
import { createPaymentOrder, verifyPayment, reportPaymentFailed } from '../services/paymentService';
import restaurantConfig from '../config/restaurantConfig';
import BrandLogo from '../components/BrandLogo';
import '../pizza-page.css';

// Helper to safely load Razorpay Checkout JS SDK dynamically
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function CheckoutPage() {
  const { cartItems, cartSubtotal, cartTotal, clearCart } = useCart();
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentStatusText, setPaymentStatusText] = useState('');

  // Payment choice state ('COD' or 'online')
  const [paymentMethod, setPaymentMethod] = useState('COD');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { state: { message: 'Please login to place your order.' } });
    }
  }, [isAuthenticated, loading, navigate]);

  // Redirect to cart if empty
  useEffect(() => {
    if (cartItems.length === 0) {
      // Check if we already have an order placed in this cycle (to avoid race-condition redirection)
      const lastOrder = localStorage.getItem('craveHouseLastOrder');
      if (!lastOrder) {
        navigate('/cart');
      }
    }
  }, [cartItems, navigate]);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [orderType, setOrderType] = useState('delivery'); // 'delivery', 'pickup', or 'dine-in'
  
  // Delivery address states
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [deliveryState, setDeliveryState] = useState('');
  const [pincode, setPincode] = useState('');
  const [instructions, setInstructions] = useState('');

  // Dine In states
  const [tableNumber, setTableNumber] = useState('');
  const [numberOfGuests, setNumberOfGuests] = useState(1);
  const [dineInInstructions, setDineInInstructions] = useState('');

  // Pre-fill if customer is logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      setFullName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [isAuthenticated, user]);

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full Name is required.';
    }

    if (!email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required.';
    } else if (!/^\d{10}$/.test(phone.trim())) {
      newErrors.phone = 'Please enter a valid 10-digit phone number.';
    }

    if (orderType === 'delivery') {
      if (!address.trim()) {
        newErrors.address = 'Delivery address is required.';
      }
      if (!city.trim()) {
        newErrors.city = 'City is required.';
      }
      if (!pincode.trim()) {
        newErrors.pincode = 'Pincode is required.';
      } else if (!/^\d{6}$/.test(pincode.trim())) {
        newErrors.pincode = 'Please enter a valid 6-digit pincode.';
      }
    } else if (orderType === 'dine-in') {
      if (!tableNumber) {
        newErrors.tableNumber = 'Table Number is required.';
      }
      const guestsVal = parseInt(numberOfGuests, 10);
      if (isNaN(guestsVal) || guestsVal < 1) {
        newErrors.numberOfGuests = 'Number of guests must be at least 1.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    if (!validate()) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');
    setPaymentStatusText('');

    const orderPayload = {
      orderType,
      customer: {
        name: fullName,
        email: email,
        phone: phone
      },
      address: orderType === 'delivery' ? {
        address,
        city,
        state: deliveryState,
        pincode,
        instructions
      } : undefined,
      dineInDetails: orderType === 'dine-in' ? {
        tableNumber,
        numberOfGuests: parseInt(numberOfGuests, 10) || 1,
        dineInInstructions
      } : undefined,
      items: cartItems.map(item => ({
        menuItem: item.id,
        quantity: item.quantity
      })),
      payment: {
        method: paymentMethod === 'online' ? 'online' : 'COD',
        status: 'Pending'
      }
    };

    try {
      if (paymentMethod === 'COD') {
        // --- CASH ON DELIVERY FLOW ---
        setPaymentStatusText('Placing your order...');
        const data = await createOrder(orderPayload);
        if (data.success && data.order) {
          const successOrder = {
            orderId: data.order.orderNumber,
            total: data.order.pricing.total,
            orderType: data.order.orderType,
            address: data.order.address,
            dineInDetails: data.order.dineInDetails,
            paymentMethod: 'Cash on Delivery',
            paymentStatus: 'Pending'
          };
          localStorage.setItem('craveHouseLastOrder', JSON.stringify(successOrder));
          clearCart();
          navigate('/order-success');
        } else {
          setErrorMessage(data.message || 'Unable to place your order. Please try again.');
        }
      } else {
        // --- RAZORPAY ONLINE PAYMENT FLOW ---
        setPaymentStatusText('Initializing Razorpay Checkout...');
        
        // 1. Load Razorpay Checkout Script
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          setErrorMessage('Failed to load Razorpay payment SDK. Please check your network connection.');
          setIsSubmitting(false);
          return;
        }

        // 2. Create Order in MongoDB backend
        setPaymentStatusText('Creating your order...');
        const orderData = await createOrder(orderPayload);
        if (!orderData.success || !orderData.order) {
          setErrorMessage(orderData.message || 'Failed to create order. Please try again.');
          setIsSubmitting(false);
          return;
        }

        const createdOrder = orderData.order;

        // 3. Request Razorpay Order from backend
        setPaymentStatusText('Preparing payment gateway...');
        const rzpData = await createPaymentOrder(createdOrder._id || createdOrder.id);
        if (!rzpData.success) {
          setErrorMessage(rzpData.message || 'Failed to initialize payment gateway.');
          setIsSubmitting(false);
          return;
        }

        // 4. Configure Razorpay Checkout options
        setPaymentStatusText('Opening payment window...');
        const options = {
          key: rzpData.keyId,
          amount: rzpData.amount,
          currency: rzpData.currency || restaurantConfig.pricing.currencyCode,
          name: restaurantConfig.name,
          description: `Order #${createdOrder.orderNumber}`,
          order_id: rzpData.razorpayOrderId,
          prefill: {
            name: fullName,
            email: email,
            contact: phone
          },
          theme: {
            color: restaurantConfig.theme.accent
          },
          handler: async function (response) {
            try {
              setIsSubmitting(true);
              setPaymentStatusText('Verifying payment server-side...');
              
              // 5. Verify Razorpay signature server-side
              const verifyRes = await verifyPayment({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                orderId: createdOrder._id || createdOrder.id
              });

              if (verifyRes.success) {
                const successOrder = {
                  orderId: createdOrder.orderNumber,
                  total: createdOrder.pricing.total,
                  orderType: createdOrder.orderType,
                  address: createdOrder.address,
                  dineInDetails: createdOrder.dineInDetails,
                  paymentMethod: 'Online Payment (Razorpay)',
                  paymentStatus: 'Paid'
                };
                localStorage.setItem('craveHouseLastOrder', JSON.stringify(successOrder));
                clearCart();
                navigate('/order-success');
              } else {
                setErrorMessage(verifyRes.message || 'Payment verification failed.');
              }
            } catch (verErr) {
              console.error('Error verifying payment:', verErr);
              setErrorMessage(verErr.message || 'Payment verification failed. Please try again.');
            } finally {
              setIsSubmitting(false);
              setPaymentStatusText('');
            }
          },
          modal: {
            ondismiss: function () {
              setIsSubmitting(false);
              setPaymentStatusText('');
              reportPaymentFailed({
                razorpay_order_id: rzpData.razorpayOrderId,
                reason: 'Checkout closed by user'
              }).catch(() => {});
              setErrorMessage('Payment cancelled. You can retry payment or select Cash on Delivery.');
            }
          }
        };

        // Open Razorpay Checkout modal
        const razorpayObject = new window.Razorpay(options);
        
        razorpayObject.on('payment.failed', function (failureResponse) {
          setIsSubmitting(false);
          setPaymentStatusText('');
          const desc = failureResponse.error?.description || 'Transaction declined';
          reportPaymentFailed({
            razorpay_order_id: rzpData.razorpayOrderId,
            reason: desc
          }).catch(() => {});
          setErrorMessage(`Payment failed: ${desc}`);
        });

        razorpayObject.open();
      }
    } catch (error) {
      console.error('Error placing order:', error);
      const errMsg = error.message || 'Unable to place your order. Please try again.';
      setErrorMessage(errMsg);
      setIsSubmitting(false);
      setPaymentStatusText('');
    }
  };


  return (
    <main className="pizza-page">
      {/* Header */}
      <header className="pizza-nav">
        <BrandLogo />

        <Link to="/cart" className="pizza-back">
          <FiArrowLeft /> Back to Cart
        </Link>

        <div className="pizza-cart-header-indicator">
          <FiShoppingBag /> Checkout
        </div>
      </header>

      {/* Banner */}
      <section className="pizza-hero" style={{ background: '#26150f' }}>
        <p className="eyebrow">FINAL STEP</p>
        <h1>
          Complete Your
          <br />
          <em>Checkout.</em>
        </h1>
        <p>Review details, choose fulfillment type, and place your simulated order.</p>
      </section>

      {/* Checkout Content Grid */}
      <div className="product-details-container" style={{ padding: '60px max(6vw, 24px) 80px' }}>
        <form onSubmit={handlePlaceOrder} className="cart-grid checkout-grid-layout" noValidate>
          
          {/* Left Column: Forms */}
          <div className="checkout-form-column">
            
            {/* Section 1: Customer Info */}
            <div className="checkout-section-card">
              <h3>1. Customer Information</h3>
              <div className="summary-divider" />
              
              <div className="form-grid-two">
                <div className="form-group">
                  <label htmlFor="fullName">Full Name</label>
                  <div className="input-icon-wrapper">
                    <FiUser className="input-icon" />
                    <input
                      type="text"
                      id="fullName"
                      placeholder="Jane Doe"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (errors.fullName) setErrors(p => ({ ...p, fullName: '' }));
                      }}
                      className={errors.fullName ? 'input-error' : ''}
                    />
                  </div>
                  {errors.fullName && <span className="inline-error-msg">{errors.fullName}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <div className="input-icon-wrapper">
                    <FiPhone className="input-icon" />
                    <input
                      type="tel"
                      id="phone"
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (errors.phone) setErrors(p => ({ ...p, phone: '' }));
                      }}
                      className={errors.phone ? 'input-error' : ''}
                    />
                  </div>
                  {errors.phone && <span className="inline-error-msg">{errors.phone}</span>}
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '15px' }}>
                <label htmlFor="email">Email Address</label>
                <div className="input-icon-wrapper">
                  <FiMail className="input-icon" />
                  <input
                    type="email"
                    id="email"
                    placeholder="jane.doe@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors(p => ({ ...p, email: '' }));
                    }}
                    className={errors.email ? 'input-error' : ''}
                  />
                </div>
                {errors.email && <span className="inline-error-msg">{errors.email}</span>}
              </div>
            </div>

            {/* Section 2: Order Type */}
            <div className="checkout-section-card" style={{ marginTop: '30px' }}>
              <h3>2. Order Fulfillment</h3>
              <div className="summary-divider" />

              <div className="fulfillment-selection">
                <label className="fulfillment-card">
                  <input
                    type="radio"
                    name="orderType"
                    value="delivery"
                    checked={orderType === 'delivery'}
                    onChange={() => {
                      setOrderType('delivery');
                      setErrors(p => ({ ...p, address: '', city: '', pincode: '', tableNumber: '', numberOfGuests: '' }));
                    }}
                  />
                  <div className="fulfillment-card-content">
                    <span className="radio-circle"></span>
                    <div>
                      <strong>Delivery</strong>
                      <p>Doorstep delivery within 30-45 mins</p>
                    </div>
                  </div>
                </label>

                <label className="fulfillment-card">
                  <input
                    type="radio"
                    name="orderType"
                    value="pickup"
                    checked={orderType === 'pickup'}
                    onChange={() => {
                      setOrderType('pickup');
                      setErrors(p => ({ ...p, address: '', city: '', pincode: '', tableNumber: '', numberOfGuests: '' }));
                    }}
                  />
                  <div className="fulfillment-card-content">
                    <span className="radio-circle"></span>
                    <div>
                      <strong>Takeaway / Pickup</strong>
                      <p>Pick up from restaurant in 20 mins</p>
                    </div>
                  </div>
                </label>

                <label className="fulfillment-card">
                  <input
                    type="radio"
                    name="orderType"
                    value="dine-in"
                    checked={orderType === 'dine-in'}
                    onChange={() => {
                      setOrderType('dine-in');
                      setErrors(p => ({ ...p, address: '', city: '', pincode: '', tableNumber: '', numberOfGuests: '' }));
                    }}
                  />
                  <div className="fulfillment-card-content">
                    <span className="radio-circle"></span>
                    <div>
                      <strong>Dine In</strong>
                      <p>Order directly from your table inside restaurant</p>
                    </div>
                  </div>
                </label>
              </div>

              {/* Fulfillment Option Specific Fields */}
              {orderType === 'delivery' ? (
                <div className="delivery-fields-wrapper">
                  <div className="form-group">
                    <label htmlFor="address">Street Address</label>
                    <div className="input-icon-wrapper">
                      <FiMapPin className="input-icon" />
                      <input
                        type="text"
                        id="address"
                        placeholder="House no, Building, Street name"
                        value={address}
                        onChange={(e) => {
                          setAddress(e.target.value);
                          if (errors.address) setErrors(p => ({ ...p, address: '' }));
                        }}
                        className={errors.address ? 'input-error' : ''}
                      />
                    </div>
                    {errors.address && <span className="inline-error-msg">{errors.address}</span>}
                  </div>

                  <div className="form-grid-three" style={{ marginTop: '15px' }}>
                    <div className="form-group">
                      <label htmlFor="city">City</label>
                      <input
                        type="text"
                        id="city"
                        placeholder="New Delhi"
                        value={city}
                        onChange={(e) => {
                          setCity(e.target.value);
                          if (errors.city) setErrors(p => ({ ...p, city: '' }));
                        }}
                        className={errors.city ? 'input-error' : ''}
                      />
                      {errors.city && <span className="inline-error-msg">{errors.city}</span>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="state">State</label>
                      <input
                        type="text"
                        id="state"
                        placeholder="Delhi"
                        value={deliveryState}
                        onChange={(e) => setDeliveryState(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="pincode">Pincode</label>
                      <input
                        type="text"
                        id="pincode"
                        placeholder="110001"
                        value={pincode}
                        onChange={(e) => {
                          setPincode(e.target.value);
                          if (errors.pincode) setErrors(p => ({ ...p, pincode: '' }));
                        }}
                        className={errors.pincode ? 'input-error' : ''}
                      />
                      {errors.pincode && <span className="inline-error-msg">{errors.pincode}</span>}
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '15px' }}>
                    <label htmlFor="instructions">Delivery Instructions (Optional)</label>
                    <textarea
                      id="instructions"
                      placeholder="E.g. Leave at gate, ring bell, call on arrival..."
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      className="checkout-textarea"
                    />
                  </div>
                </div>
              ) : orderType === 'dine-in' ? (
                <div className="dine-in-fields-wrapper" style={{ marginTop: '20px' }}>
                  <div className="form-grid-two">
                    <div className="form-group">
                      <label htmlFor="tableNumber">Table Number *</label>
                      <select
                        id="tableNumber"
                        value={tableNumber}
                        onChange={(e) => {
                          setTableNumber(e.target.value);
                          if (errors.tableNumber) setErrors(p => ({ ...p, tableNumber: '' }));
                        }}
                        className={`checkout-select ${errors.tableNumber ? 'input-error' : ''}`}
                        style={{
                          width: '100%',
                          padding: '12px 15px',
                          borderRadius: '8px',
                          border: errors.tableNumber ? '1px solid #e53935' : '1px solid #decfc6',
                          background: '#fff',
                          fontSize: '14px',
                          color: '#333'
                        }}
                      >
                        <option value="">-- Select Table Number --</option>
                        {Array.from({ length: 12 }, (_, i) => `Table ${i + 1}`).map((tbl) => (
                          <option key={tbl} value={tbl}>{tbl}</option>
                        ))}
                      </select>
                      {errors.tableNumber && <span className="inline-error-msg">{errors.tableNumber}</span>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="numberOfGuests">Number of Guests *</label>
                      <input
                        type="number"
                        id="numberOfGuests"
                        min="1"
                        placeholder="e.g. 2"
                        value={numberOfGuests}
                        onChange={(e) => {
                          setNumberOfGuests(e.target.value);
                          if (errors.numberOfGuests) setErrors(p => ({ ...p, numberOfGuests: '' }));
                        }}
                        className={errors.numberOfGuests ? 'input-error' : ''}
                      />
                      {errors.numberOfGuests && <span className="inline-error-msg">{errors.numberOfGuests}</span>}
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '15px' }}>
                    <label htmlFor="dineInInstructions">Dine-In Instructions (Optional)</label>
                    <textarea
                      id="dineInInstructions"
                      placeholder="E.g. Less spicy, no onions, extra napkins..."
                      value={dineInInstructions}
                      onChange={(e) => setDineInInstructions(e.target.value)}
                      className="checkout-textarea"
                    />
                  </div>
                </div>
              ) : (
                /* Pickup Card */
                <div className="pickup-info-card">
                  <FiInfo className="pickup-info-icon" />
                  <div>
                    <strong>{restaurantConfig.contact.pickupLocationName}</strong>
                    <p>{restaurantConfig.contact.address.fullAddress}</p>
                    <span className="pickup-timing">Fulfillment Time: approx. 20-25 mins</span>
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Payment Method */}
            <div className="checkout-section-card" style={{ marginTop: '30px' }}>
              <h3>3. Payment Method</h3>
              <div className="summary-divider" />

              <div className="fulfillment-selection">
                <label className={`fulfillment-card ${paymentMethod === 'COD' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="COD"
                    checked={paymentMethod === 'COD'}
                    onChange={() => setPaymentMethod('COD')}
                  />
                  <div className="fulfillment-card-content">
                    <span className="radio-circle"></span>
                    <div>
                      <strong>Cash on Delivery (COD)</strong>
                      <p>Pay cash when your order arrives or at pickup</p>
                    </div>
                  </div>
                </label>

                <label className={`fulfillment-card ${paymentMethod === 'online' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="online"
                    checked={paymentMethod === 'online'}
                    onChange={() => setPaymentMethod('online')}
                  />
                  <div className="fulfillment-card-content">
                    <span className="radio-circle"></span>
                    <div>
                      <strong>Online Payment (Razorpay Test Mode)</strong>
                      <p>Pay securely via Cards, UPI, NetBanking (Test Mode)</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Place Order */}
          <div className="checkout-summary-column">
            <div className="cart-summary-card">
              <h3>Order Review</h3>
              <div className="summary-divider" />
              
              {/* Item List */}
              <div className="checkout-items-list">
                {cartItems.map((item) => (
                  <div key={`${item.category}-${item.id}`} className="checkout-item-row">
                    <img src={item.image} alt={item.name} className="checkout-item-thumb" />
                    <div className="checkout-item-info">
                      <h4>{item.name}</h4>
                      <span>Qty: {item.quantity} × ₹{item.price}</span>
                    </div>
                    <strong className="checkout-item-row-total">₹{item.price * item.quantity}</strong>
                  </div>
                ))}
              </div>

              <div className="summary-divider" />
              
              <div className="summary-row">
                <span>Subtotal</span>
                <strong>₹{cartSubtotal}</strong>
              </div>

              <div className="summary-row">
                <span>Delivery Charges</span>
                <span className="free-delivery">FREE</span>
              </div>

              <div className="summary-divider" />
              
              <div className="summary-row total-row">
                <span>Order Total</span>
                <strong>₹{cartTotal}</strong>
              </div>

              {paymentStatusText && (
                <div className="auth-alert info" style={{ marginTop: '15px', padding: '10px 15px', display: 'flex', alignItems: 'center', gap: '8px', background: '#eef6fc', border: '1px solid #b8daff', color: '#004085', borderRadius: '4px', fontSize: '14px' }}>
                  <FiInfo /> <span>{paymentStatusText}</span>
                </div>
              )}

              {errorMessage && (
                <div className="auth-alert error" style={{ marginTop: '15px', padding: '10px 15px', display: 'flex', alignItems: 'center', gap: '8px', background: '#fff2f2', border: '1px solid #f5c6cb', color: '#9b3a3a', borderRadius: '4px', fontSize: '14px' }}>
                  <FiInfo /> <span>{errorMessage}</span>
                </div>
              )}

              {/* Dev notification info */}
              <div className="demo-credentials-info" style={{ marginTop: '15px', background: '#fdfcf9' }}>
                <p>💡 Placing an order clears the cart and saves details to local order history.</p>
              </div>

              <button
                type="submit"
                className="checkout-btn"
                style={{ marginTop: '20px' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span>{paymentStatusText || 'Processing...'}</span>
                ) : paymentMethod === 'online' ? (
                  <>
                    <FiCreditCard /> Pay Online (₹{cartTotal})
                  </>
                ) : (
                  <>
                    <FiCheckCircle /> Place Order (₹{cartTotal})
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>

      <Footer />
    </main>
  );
}
