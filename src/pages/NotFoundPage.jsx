import React from 'react';
import { Link } from 'react-router-dom';
import { FiHome, FiAlertTriangle } from 'react-icons/fi';
import '../pizza-page.css';

/**
 * NotFoundPage — 404 page matching Crave House visual identity.
 * Rendered for any unmatched route.
 */
export default function NotFoundPage() {
  return (
    <main className="pizza-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Minimal header */}
      <header className="pizza-nav">
        <Link to="/" className="pizza-brand">
          <span>CH</span>
          <i>Crave House</i>
        </Link>
        <Link to="/" className="pizza-back">
          <FiHome /> Back to Home
        </Link>
        <span />
      </header>

      {/* 404 Hero */}
      <div className="not-found-container">
        <div className="not-found-icon">
          <FiAlertTriangle />
        </div>

        <p className="eyebrow" style={{ color: '#d4a373', letterSpacing: '3px' }}>ERROR 404</p>

        <h1 className="not-found-heading">
          Page Not Found
        </h1>

        <p className="not-found-subtitle">
          Sorry, the page you're looking for doesn't exist or may have been moved.
        </p>

        <div className="not-found-actions">
          <Link to="/" className="button">
            <FiHome /> Back to Home
          </Link>
          <Link to="/order" className="button ghost">
            Browse Menu
          </Link>
        </div>
      </div>
    </main>
  );
}
