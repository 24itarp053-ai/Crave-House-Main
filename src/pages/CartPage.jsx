import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMinus, FiPlus, FiTrash2, FiShoppingBag, FiArrowLeft, FiArrowRight, FiAlertTriangle } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import Footer from '../components/Footer';
import BrandLogo from '../components/BrandLogo';
import '../pizza-page.css';

export default function CartPage() {
  const navigate = useNavigate();
  const {
    cartItems,
    cartCount,
    cartSubtotal,
    cartTotal,
    updateQuantity,
    removeFromCart,
    clearCart
  } = useCart();

  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const handleDecrement = (item) => {
    if (item.quantity > 1) {
      updateQuantity(item.id, item.category, item.quantity - 1);
    }
  };

  const handleIncrement = (item) => {
    updateQuantity(item.id, item.category, item.quantity + 1);
  };

  const handleCheckoutMock = () => {
    navigate('/checkout');
  };

  return (
    <main className="pizza-page">
      {/* Navbar Header */}
      <header className="pizza-nav">
        <BrandLogo />

        <Link to="/order" className="pizza-back">
          <FiArrowLeft /> Back to Menu
        </Link>

        <div className="pizza-cart-header-indicator">
          <FiShoppingBag /> Cart <b>{cartCount}</b>
        </div>
      </header>

      {/* Hero Header Banner */}
      <section className="pizza-hero" style={{ background: '#26150f' }}>
        <p className="eyebrow">YOUR CRAVINGS SO FAR</p>
        <h1>
          Your Shopping
          <br />
          <em>Cart.</em>
        </h1>
        <p>Review your selected items, adjust quantities, and proceed to satisfy your cravings.</p>
      </section>

      {/* Cart Container */}
      <div className="product-details-container cart-page-container">
        <AnimatePresence mode="wait">
          {cartItems.length === 0 ? (
            <motion.div
              className="empty-cart-wrapper"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <div className="empty-cart-icon">
                <FiShoppingBag />
              </div>
              <h2>Your Cart is Empty</h2>
              <p>Looks like you haven't added anything yet. Explore our delicious categories to satisfy your cravings!</p>
              <Link to="/order" className="explore-menu-btn">
                Explore Menu <FiArrowRight />
              </Link>
            </motion.div>
          ) : (
            <motion.div
              className="cart-grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Left Column: Items List */}
              <div className="cart-items-list">
                <div className="cart-list-header">
                  <h2>MY CART <span>({cartCount} {cartCount === 1 ? 'item' : 'items'})</span></h2>
                </div>

                <div className="cart-items-container">
                  <AnimatePresence>
                    {cartItems.map((item) => (
                      <motion.div
                        key={`${item.category}-${item.id}`}
                        className="cart-item-card"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="cart-item-image">
                          <img src={item.image} alt={item.name} />
                          <span className="cart-item-badge">● VEG</span>
                        </div>

                        <div className="cart-item-details">
                          <span className="cart-item-category">{item.category.toUpperCase()}</span>
                          <h3>{item.name}</h3>
                          <div className="cart-item-price-row">
                            <span className="cart-item-unit-price">₹{item.price}</span>
                          </div>
                        </div>

                        <div className="cart-item-controls">
                          <div className="qty-selector cart-qty">
                            <button
                              onClick={() => handleDecrement(item)}
                              disabled={item.quantity <= 1}
                              aria-label="Decrease quantity"
                              style={{ opacity: item.quantity <= 1 ? 0.35 : 1, cursor: item.quantity <= 1 ? 'not-allowed' : 'pointer' }}
                            >
                              <FiMinus />
                            </button>
                            <span>{item.quantity}</span>
                            <button
                              onClick={() => handleIncrement(item)}
                              aria-label="Increase quantity"
                            >
                              <FiPlus />
                            </button>
                          </div>
                          
                          <div className="cart-item-subtotal">
                            Subtotal: <strong>₹{item.price * item.quantity}</strong>
                          </div>
                        </div>

                        <div className="cart-item-actions">
                          <button
                            className="cart-remove-btn"
                            onClick={() => removeFromCart(item.id, item.category)}
                            aria-label={`Remove ${item.name} from cart`}
                          >
                            <FiTrash2 /> <span>Remove</span>
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Right Column: Order Summary */}
              <div className="cart-summary-wrapper">
                <div className="cart-summary-card">
                  <h3>Order Summary</h3>
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
                    <span>Total Amount</span>
                    <strong>₹{cartTotal}</strong>
                  </div>

                  <button
                    className="checkout-btn"
                    onClick={handleCheckoutMock}
                  >
                    Proceed to Checkout <FiArrowRight />
                  </button>

                  <div className="summary-actions-divider" />

                  {/* Clear Cart Actions with inline confirmation */}
                  {!showConfirmClear ? (
                    <button
                      className="clear-cart-trigger"
                      onClick={() => setShowConfirmClear(true)}
                    >
                      Clear Shopping Cart
                    </button>
                  ) : (
                    <motion.div
                      className="clear-cart-confirm-box"
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p><FiAlertTriangle /> Are you sure you want to clear your cart?</p>
                      <div className="clear-confirm-buttons">
                        <button
                          className="confirm-btn"
                          onClick={() => {
                            clearCart();
                            setShowConfirmClear(false);
                          }}
                        >
                          Yes, Clear
                        </button>
                        <button
                          className="cancel-btn"
                          onClick={() => setShowConfirmClear(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}

                  <Link to="/order" className="continue-shopping-link">
                    <FiArrowLeft /> Continue Shopping
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Footer />
    </main>
  );
}
