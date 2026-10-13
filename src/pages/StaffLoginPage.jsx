import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiShoppingBag, FiMail, FiLock, FiAlertCircle, FiBriefcase } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import Footer from '../components/Footer';
import '../pizza-page.css';

export default function StaffLoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();

  // If already logged in, redirect to respective dashboard
  React.useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'admin') navigate('/admin');
      if (user.role === 'owner') navigate('/owner');
      if (user.role === 'customer') navigate('/account');
    }
  }, [isAuthenticated, user, navigate]);

  const [selectedRole, setSelectedRole] = useState('admin'); // 'admin' or 'owner'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Validation and error states
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

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

    if (!validate()) return;

    // Call async login function with selected expectedRole filter
    const result = await login(email, password, selectedRole);

    if (result.success) {
      if (selectedRole === 'admin') navigate('/admin');
      if (selectedRole === 'owner') navigate('/owner');
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

        <Link to="/login" className="pizza-back">
          <FiArrowLeft /> Customer Login
        </Link>

        <Link to="/cart" className="pizza-cart" aria-label="Shopping cart">
          <FiShoppingBag /> Cart <b>{cartCount}</b>
        </Link>
      </header>

      {/* Staff Login Container */}
      <section className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <span className="logo-badge" style={{ background: '#d4a373', color: '#3e2723' }}>
              <FiBriefcase />
            </span>
            <h2>STAFF PORTAL</h2>
            <p className="auth-subtitle">Staff Login</p>
          </div>

          {formError && (
            <div className="auth-alert error">
              <FiAlertCircle />
              <span>{formError}</span>
            </div>
          )}

          {/* Role Selection Tabs */}
          <div className="role-selection-wrapper">
            <label className="role-label">Select Staff Role:</label>
            <div className="role-buttons">
              <button
                type="button"
                className={`role-btn ${selectedRole === 'admin' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedRole('admin');
                  setFormError('');
                }}
              >
                Admin
              </button>
              <button
                type="button"
                className={`role-btn ${selectedRole === 'owner' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedRole('owner');
                  setFormError('');
                }}
              >
                Restaurant Owner
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            {/* Email Field */}
            <div className="form-group">
              <label htmlFor="email">Staff Email</label>
              <div className="input-icon-wrapper">
                <FiMail className="input-icon" />
                <input
                  type="email"
                  id="email"
                  placeholder={selectedRole === 'admin' ? 'admin@cravehouse.demo' : 'owner@cravehouse.demo'}
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

            {/* Demo Credentials Alert Helper */}
            <div className="demo-credentials-info">
              {selectedRole === 'admin' ? (
                <p>Demo Admin: <strong>admin@cravehouse.demo</strong> / <strong>password123</strong></p>
              ) : (
                <p>Demo Owner: <strong>owner@cravehouse.demo</strong> / <strong>password123</strong></p>
              )}
            </div>

            {/* Login Button */}
            <button type="submit" className="auth-btn">
              Login as {selectedRole === 'admin' ? 'Admin' : 'Owner'}
            </button>
          </form>

          {/* Navigation Links */}
          <div className="auth-footer">
            <Link to="/login" className="auth-link">
              ← Return to Customer Login
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
