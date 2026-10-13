import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiMenu, FiX, FiLogOut, FiHome } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

/**
 * DashboardLayout — shared sidebar + main content shell for Admin and Owner.
 * @param {string}   role         — 'admin' | 'owner'
 * @param {string}   title        — sidebar header title
 * @param {Array}    navItems     — [{ label, to, icon }]
 * @param {ReactNode} children
 */
export default function DashboardLayout({ role, title, navItems, children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (to) => location.pathname === to;

  return (
    <div className="dash-shell">
      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div className="dash-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`dash-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div className="dash-sidebar-brand">
          <Link to="/" className="dash-brand-logo" aria-label="Crave House Home">
            <span>CH</span>
          </Link>
          <div className="dash-brand-text">
            <strong>Crave House</strong>
            <small>{title}</small>
          </div>
          <button
            className="dash-sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <FiX />
          </button>
        </div>

        {/* Navigation */}
        <nav className="dash-nav">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`dash-nav-link ${isActive(item.to) ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="dash-nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer: user info + logout */}
        <div className="dash-sidebar-footer">
          <div className="dash-user-info">
            <div className="dash-user-avatar">{user?.name?.[0] || '?'}</div>
            <div>
              <span className="dash-user-name">{user?.name}</span>
              <span className="dash-user-role">{role === 'admin' ? 'Administrator' : 'Restaurant Owner'}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="dash-logout-btn" aria-label="Log out">
            <FiLogOut /> Logout
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="dash-main">
        {/* Top bar */}
        <header className="dash-topbar">
          <button
            className="dash-hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <FiMenu />
          </button>
          <span className="dash-topbar-title">
            {navItems.find((n) => isActive(n.to))?.label || title}
          </span>
          <Link to="/" className="dash-topbar-home" aria-label="Back to site">
            <FiHome /> <span>Live Site</span>
          </Link>
        </header>

        {/* Page content */}
        <div className="dash-content">
          {children}
        </div>
      </div>
    </div>
  );
}
