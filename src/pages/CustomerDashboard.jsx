import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiShoppingBag, FiUser, FiMapPin, FiMail, FiPhone, FiBookOpen, FiCalendar, FiLogOut, FiLock, FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import Footer from '../components/Footer';
import { updateProfile, changePassword as apiChangePassword } from '../services/userService';
import BrandLogo from '../components/BrandLogo';
import '../pizza-page.css';

export default function CustomerDashboard() {
  const { user, logout, updateCurrentUser } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password fields states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPwd, setIsChangingPwd] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditEmail(user.email || '');
      setEditPhone(user.phone || '');
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!editName.trim()) {
      setErrorMsg('Name is required.');
      return;
    }
    if (!editEmail.trim()) {
      setErrorMsg('Email address is required.');
      return;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateProfile({
        name: editName.trim(),
        email: editEmail.toLowerCase().trim(),
        phone: editPhone.trim()
      });

      if (res.success && res.user) {
        updateCurrentUser(res.user);
        setSuccessMsg('Profile updated successfully!');
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwdError('All password fields are required.');
      return;
    }
    if (newPassword.length < 6) {
      setPwdError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('Passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setPwdError('New password must be different from current password.');
      return;
    }

    setIsChangingPwd(true);
    try {
      const res = await apiChangePassword(currentPassword, newPassword, confirmPassword);
      if (res.success) {
        setPwdSuccess('Password changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      console.error('Error changing password:', err);
      setPwdError(err.message || 'Failed to change password.');
    } finally {
      setIsChangingPwd(false);
    }
  };

  return (
    <main className="pizza-page">
      {/* Header */}
      <header className="pizza-nav">
        <BrandLogo />

        <Link to="/order" className="pizza-back">
          <FiArrowLeft /> Back to Menu
        </Link>

        <Link to="/cart" className="pizza-cart" aria-label="Shopping cart">
          <FiShoppingBag /> Cart <b>{cartCount}</b>
        </Link>
      </header>

      {/* Hero Banner */}
      <section className="pizza-hero" style={{ background: '#26150f' }}>
        <p className="eyebrow">CUSTOMER PORTAL</p>
        <h1>
          Welcome,
          <br />
          <em>{user?.name || 'Customer'}.</em>
        </h1>
        <p>Manage your profile, check orders, view reservations, or start a new order.</p>
      </section>

      {/* Dashboard Content Container */}
      <div className="product-details-container" style={{ padding: '60px max(6vw, 24px) 80px' }}>
        <div className="dashboard-layout">
          {/* Left Column containing Profile + Password Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {/* Left Panel: Profile Info */}
            <div className="dashboard-profile-card">
              <div className="profile-header">
                <div className="profile-avatar">
                  <FiUser />
                </div>
                <h3>{user?.name}</h3>
                <span className="profile-badge">Customer Member</span>
              </div>

              {successMsg && (
                <div className="auth-alert success" style={{ width: '100%', marginBottom: '15px', padding: '8px 12px', fontSize: '13px', background: '#e6fffa', border: '1px solid #b2f5ea', color: '#234e52', borderRadius: '4px' }}>
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="auth-alert error" style={{ width: '100%', marginBottom: '15px', padding: '8px 12px', fontSize: '13px', background: '#fff2f2', border: '1px solid #f5c6cb', color: '#9b3a3a', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FiAlertCircle style={{ flexShrink: 0 }} /> <span>{errorMsg}</span>
                </div>
              )}

              {!isEditing ? (
                <>
                  <div className="profile-details-list">
                    <div className="profile-detail-item">
                      <FiMail className="detail-icon" />
                      <div>
                        <span className="detail-label">Email Address</span>
                        <span className="detail-value">{user?.email}</span>
                      </div>
                    </div>

                    <div className="profile-detail-item">
                      <FiPhone className="detail-icon" />
                      <div>
                        <span className="detail-label">Phone Number</span>
                        <span className="detail-value">{user?.phone || 'Not provided'}</span>
                      </div>
                    </div>

                    <div className="profile-detail-item">
                      <FiMapPin className="detail-icon" />
                      <div>
                        <span className="detail-label">Default Address</span>
                        <span className="detail-value">123 Green Valley Street, New Delhi</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '20px' }}>
                    <button onClick={() => { setIsEditing(true); setErrorMsg(''); setSuccessMsg(''); }} className="dashboard-logout-btn" style={{ background: '#2b6cb0', color: 'white', borderColor: '#2b6cb0' }}>
                      Edit Profile
                    </button>
                    <button onClick={handleLogout} className="dashboard-logout-btn">
                      <FiLogOut /> Log Out
                    </button>
                  </div>
                </>
              ) : (
                <form onSubmit={handleSaveProfile} className="auth-form" style={{ width: '100%', marginTop: '15px' }}>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label htmlFor="editName" style={{ fontSize: '12px', fontWeight: '600' }}>Full Name</label>
                    <input
                      type="text"
                      id="editName"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd', background: '#fff', color: '#333' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label htmlFor="editEmail" style={{ fontSize: '12px', fontWeight: '600' }}>Email Address</label>
                    <input
                      type="email"
                      id="editEmail"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd', background: '#fff', color: '#333' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label htmlFor="editPhone" style={{ fontSize: '12px', fontWeight: '600' }}>Phone Number</label>
                    <input
                      type="text"
                      id="editPhone"
                      placeholder="e.g. 9876543210"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd', background: '#fff', color: '#333' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" disabled={isSaving} className="dashboard-logout-btn" style={{ flex: 1, background: '#2f855a', color: 'white', borderColor: '#2f855a', margin: 0 }}>
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button type="button" onClick={() => setIsEditing(false)} className="dashboard-logout-btn" style={{ flex: 1, margin: 0 }}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Change Password Card */}
            <div className="dashboard-profile-card" style={{ padding: '30px' }}>
              <div className="profile-header" style={{ marginBottom: '15px' }}>
                <div className="profile-avatar" style={{ background: '#744210' }}>
                  <FiLock />
                </div>
                <h3 style={{ margin: 0, fontSize: '18px' }}>Security Settings</h3>
                <span className="profile-badge" style={{ background: '#feebc8', color: '#9c4221' }}>Password Management</span>
              </div>

              {pwdSuccess && (
                <div className="auth-alert success" style={{ width: '100%', marginBottom: '15px', padding: '8px 12px', fontSize: '13px', background: '#e6fffa', border: '1px solid #b2f5ea', color: '#234e52', borderRadius: '4px' }}>
                  <span>{pwdSuccess}</span>
                </div>
              )}

              {pwdError && (
                <div className="auth-alert error" style={{ width: '100%', marginBottom: '15px', padding: '8px 12px', fontSize: '13px', background: '#fff2f2', border: '1px solid #f5c6cb', color: '#9b3a3a', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FiAlertCircle style={{ flexShrink: 0 }} /> <span>{pwdError}</span>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="auth-form" style={{ width: '100%' }}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label htmlFor="currentPassword" style={{ fontSize: '12px', fontWeight: '600' }}>Current Password</label>
                  <input
                    type="password"
                    id="currentPassword"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd', background: '#fff', color: '#333' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label htmlFor="newPassword" style={{ fontSize: '12px', fontWeight: '600' }}>New Password</label>
                  <input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd', background: '#fff', color: '#333' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label htmlFor="confirmPassword" style={{ fontSize: '12px', fontWeight: '600' }}>Confirm New Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd', background: '#fff', color: '#333' }}
                  />
                </div>

                <button type="submit" disabled={isChangingPwd} className="dashboard-logout-btn" style={{ width: '100%', background: '#744210', color: 'white', borderColor: '#744210', margin: 0 }}>
                  {isChangingPwd ? 'Changing Password...' : 'Change Password'}
                </button>
              </form>
            </div>
          </div>

          <div className="dashboard-actions-panel">
            <h2>Quick Actions</h2>
            <div className="dashboard-grid-cards">
              {/* Browse Menu */}
              <Link to="/order" className="dashboard-action-card">
                <div className="action-card-icon">
                  <FiBookOpen />
                </div>
                <h4>Browse Menu</h4>
                <p>Explore our fresh pizza, burgers, pastas, salads, and more.</p>
                <span className="action-card-link">Go to Menu &rarr;</span>
              </Link>

              {/* My Cart */}
              <Link to="/cart" className="dashboard-action-card">
                <div className="action-card-icon">
                  <FiShoppingBag />
                </div>
                <h4>My Cart</h4>
                <p>View items currently in your cart and proceed to checkout.</p>
                <span className="action-card-link">View Cart &rarr;</span>
              </Link>

              {/* My Orders */}
              <Link to="/orders" className="dashboard-action-card">
                <div className="action-card-icon">
                  <FiShoppingBag />
                </div>
                <h4>My Orders</h4>
                <p>Track current orders or review your ordering history.</p>
                <span className="action-card-link">View Orders &rarr;</span>
              </Link>

              {/* My Reservations */}
              <Link to="/reservations" className="dashboard-action-card">
                <div className="action-card-icon">
                  <FiCalendar />
                </div>
                <h4>My Reservations</h4>
                <p>Check active table reservations and review status.</p>
                <span className="action-card-link">View Reservations &rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
