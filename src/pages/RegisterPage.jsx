import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiShoppingBag, FiUser, FiMail, FiPhone, FiLock, FiAlertCircle } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';
import restaurantConfig from '../config/restaurantConfig';
import BrandLogo from '../components/BrandLogo';
import '../pizza-page.css';

export default function RegisterPage() {
  const { cartCount } = useCart();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full Name is required.';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone Number is required.';
    } else if (!/^\d{10}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Please enter a valid 10-digit Phone Number.';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required.';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirm Password is required.';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!validate()) return;

    // Call async registration API
    const result = await register(
      formData.fullName,
      formData.email,
      formData.password,
      formData.phone
    );

    if (result.success) {
      navigate('/login', {
        state: {
          message: 'Registration successful! You can now log in using your credentials.'
        }
      });
    } else {
      setFormError(result.error);
    }
  };

  return (
    <main className="pizza-page">
      {/* Header Navigation */}
      <header className="pizza-nav">
        <BrandLogo />

        <Link to="/login" className="pizza-back">
          <FiArrowLeft /> Back to login
        </Link>

        <Link to="/cart" className="pizza-cart" aria-label="Shopping cart">
          <FiShoppingBag /> Cart <b>{cartCount}</b>
        </Link>
      </header>

      {/* Register Container */}
      <section className="auth-container" style={{ padding: '40px max(6vw, 24px) 60px' }}>
        <div className="auth-card">
          <div className="auth-header">
            <span className="logo-badge">{restaurantConfig.shortName}</span>
            <h2>{restaurantConfig.name.toUpperCase()}</h2>
            <p className="auth-subtitle">Create Account</p>
          </div>

          {formError && (
            <div className="auth-alert error">
              <FiAlertCircle />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            {/* Full Name Field */}
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <div className="input-icon-wrapper">
                <FiUser className="input-icon" />
                <input
                  type="text"
                  id="fullName"
                  placeholder="Jane Doe"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className={errors.fullName ? 'input-error' : ''}
                />
              </div>
              {errors.fullName && <span className="inline-error-msg">{errors.fullName}</span>}
            </div>

            {/* Email Field */}
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-icon-wrapper">
                <FiMail className="input-icon" />
                <input
                  type="email"
                  id="email"
                  placeholder="jane.doe@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={errors.email ? 'input-error' : ''}
                />
              </div>
              {errors.email && <span className="inline-error-msg">{errors.email}</span>}
            </div>

            {/* Phone Number Field */}
            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <div className="input-icon-wrapper">
                <FiPhone className="input-icon" />
                <input
                  type="tel"
                  id="phone"
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={errors.phone ? 'input-error' : ''}
                />
              </div>
              {errors.phone && <span className="inline-error-msg">{errors.phone}</span>}
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-icon-wrapper">
                <FiLock className="input-icon" />
                <input
                  type="password"
                  id="password"
                  placeholder="•••••••• (Min 6 chars)"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={errors.password ? 'input-error' : ''}
                />
              </div>
              {errors.password && <span className="inline-error-msg">{errors.password}</span>}
            </div>

            {/* Confirm Password Field */}
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-icon-wrapper">
                <FiLock className="input-icon" />
                <input
                  type="password"
                  id="confirmPassword"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={errors.confirmPassword ? 'input-error' : ''}
                />
              </div>
              {errors.confirmPassword && <span className="inline-error-msg">{errors.confirmPassword}</span>}
            </div>

            {/* Register Button */}
            <button type="submit" className="auth-btn" style={{ marginTop: '20px' }}>
              Create Account
            </button>
          </form>

          {/* Navigation Links */}
          <div className="auth-footer">
            <p>
              Already have an account? <Link to="/login" className="auth-link">Login</Link>
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
