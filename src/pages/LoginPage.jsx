import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FiArrowLeft, FiShoppingBag, FiMail, FiLock, FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import Footer from '../components/Footer';
import '../pizza-page.css';

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  // If already logged in, redirect to respective dashboard
  React.useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'customer') navigate('/account');
      if (user.role === 'admin') navigate('/admin');
      if (user.role === 'owner') navigate('/owner');
    }
  }, [isAuthenticated, user, navigate]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Validation and error states
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState(location.state?.message || '');

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address.';
    }
    
    if (!password) {
      newErrors.password = 'Password is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMessage('');

    if (!validate()) return;

    // Call async login function
    const result = await login(email, password, 'customer');

    if (result.success) {
      navigate('/account');
    } else {
      setFormError(result.error);
    }
  };

  return (
    <main className="pizza-page">
      {/* Header Navigation */}
      <header className="pizza-nav">
        <Link to="/" className="pizza-brand">
          <span>CH</span>
          <i>Crave House</i>
        </Link>

        <Link to="/" className="pizza-back">
          <FiArrowLeft /> Back to home
        </Link>

        <Link to="/cart" className="pizza-cart" aria-label="Shopping cart">
          <FiShoppingBag /> Cart <b>{cartCount}</b>
        </Link>
      </header>

      {/* Main Authentication Container */}
      <section className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <span className="logo-badge">CH</span>
            <h2>CRAVE HOUSE</h2>
            <p className="auth-subtitle">Welcome Back</p>
          </div>

          {successMessage && (
            <div className="auth-alert success">
              <span>{successMessage}</span>
            </div>
          )}

          {formError && (
            <div className="auth-alert error">
              <FiAlertCircle />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            {/* Email Field */}
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-icon-wrapper">
                <FiMail className="input-icon" />
                <input
                  type="email"
                  id="email"
                  placeholder="name@cravehouse.demo"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                  }}
                  className={errors.email ? 'input-error' : ''}
                />
              </div>
              {errors.email && <span className="inline-error-msg">{errors.email}</span>}
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-icon-wrapper">
                <FiLock className="input-icon" />
                <input
                  type="password"
                  id="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                  }}
                  className={errors.password ? 'input-error' : ''}
                />
              </div>
              {errors.password && <span className="inline-error-msg">{errors.password}</span>}
            </div>

            {/* Demo Helpers Info */}
            <div className="demo-credentials-info">
              <p>Demo Customer Creds: <strong>customer@cravehouse.demo</strong> / <strong>password123</strong></p>
            </div>

            {/* Login Button */}
            <button type="submit" className="auth-btn">
              Login
            </button>

            {/* Continue as Guest */}
            <Link to="/order" className="guest-btn">
              Continue as Guest
            </Link>
          </form>

          {/* Navigation Links */}
          <div className="auth-footer">
            <p>
              Don't have an account? <Link to="/register" className="auth-link">Create Account</Link>
            </p>
            <div className="auth-footer-divider" />
            <Link to="/staff-login" className="staff-login-link">
              Staff Login
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
