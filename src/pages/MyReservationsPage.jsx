import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FiArrowLeft, FiShoppingBag, FiCalendar, FiClock, FiUsers,
  FiAlertTriangle, FiX, FiCheck, FiPackage
} from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { getMyReservations } from '../services/reservationService';
import Footer from '../components/Footer';
import restaurantConfig from '../config/restaurantConfig';
import BrandLogo from '../components/BrandLogo';
import '../pizza-page.css';

/** Format ISO date string → "20 August 2026" */
function formatDate(isoDate) {
  if (!isoDate) return '—';
  try {
    const d = new Date(isoDate + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return isoDate;
  }
}

/** Format 24-h time string "19:30" → "7:30 PM" */
function formatTime(timeStr) {
  if (!timeStr) return '—';
  try {
    const [h, m] = timeStr.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
  } catch {
    return timeStr;
  }
}

export default function MyReservationsPage() {
  const { cartCount } = useCart();
  const { user } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // confirmId: id of reservation awaiting cancel confirmation, or null
  const [confirmId, setConfirmId] = useState(null);

  // Load reservations from live MongoDB backend API
  const loadReservations = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getMyReservations();
      if (res.success && res.reservations) {
        setReservations(res.reservations);
      }
    } catch (err) {
      console.error('Error loading reservations:', err);
      setError(err.message || 'Failed to load reservations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    loadReservations();
  }, [loadReservations]);

  const handleCancelClick = (id) => {
    setConfirmId(id);
  };

  const handleCancelConfirm = (id) => {
    alert("Cancellation request submitted. Please contact restaurant administration to cancel or modify your reservation.");
    setConfirmId(null);
  };

  const handleKeep = () => {
    setConfirmId(null);
  };

  return (
    <main className="pizza-page">
      {/* ── Header ── */}
      <header className="pizza-nav">
        <BrandLogo />

        <Link to="/account" className="pizza-back">
          <FiArrowLeft /> My Account
        </Link>

        <Link to="/cart" className="pizza-cart" aria-label="Shopping cart">
          <FiShoppingBag /> Cart <b>{cartCount}</b>
        </Link>
      </header>

      {/* ── Hero ── */}
      <section className="pizza-hero" style={{ background: '#26150f' }}>
        <p className="eyebrow">TABLE BOOKINGS</p>
        <h1>
          My
          <br />
          <em>Reservations.</em>
        </h1>
        <p>View, track, and manage your {restaurantConfig.name} table reservations.</p>
      </section>

      {/* ── Content ── */}
      <div className="product-details-container" style={{ padding: 'clamp(24px, 5vw, 60px) clamp(14px, 4vw, 24px) clamp(40px, 6vw, 80px)' }}>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
            Loading reservations...
          </div>
        ) : error ? (
          <div style={{ padding: '20px 15px', background: '#fff2f2', border: '1px solid #f5c6cb', color: '#9b3a3a', borderRadius: '4px', textAlign: 'center' }}>
            {error}
          </div>
        ) : reservations.length === 0 ? (
          /* ── Empty state ── */
          <div className="empty-cart-wrapper">
            <div className="empty-cart-icon">
              <FiCalendar />
            </div>
            <h2>No reservations yet</h2>
            <p>
              Book a table at {restaurantConfig.name} and your reservations will appear here.
            </p>
            <Link to="/book-table" className="explore-menu-btn">
              Book a Table &rarr;
            </Link>
          </div>
        ) : (
          /* ── Reservations list ── */
          <div className="my-orders-layout-container">
            <div className="my-orders-header-row">
              <h2>Your Reservations</h2>
              <Link to="/book-table" className="auth-btn" style={{ width: 'auto', padding: '10px 20px', fontSize: '12px', textAlign: 'center' }}>
                + New Booking
              </Link>
            </div>

            <div className="reservations-list">
              {reservations.map((res) => (
                <div key={res._id || res.id} className="reservation-card">
                  {/* ── Card header ── */}
                  <div className="reservation-card-header">
                    <div className="reservation-id-block">
                      <span className="order-number-tag">
                        Reservation <strong>{res.reservationId || res.id}</strong>
                      </span>
                      <span className="order-date-tag">
                        <FiClock style={{ marginRight: 4 }} />
                        Booked {formatDate(res.createdAt?.slice(0, 10))}
                      </span>
                    </div>
                    <span
                      className={`reservation-status-badge ${res.status === 'Cancelled' ? 'cancelled' : 'pending'}`}
                    >
                      {res.status}
                    </span>
                  </div>

                  {/* ── Card body ── */}
                  <div className="reservation-card-body">
                    {/* Date + Time row */}
                    <div className="res-detail-row">
                      <div className="res-detail-item">
                        <FiCalendar className="res-detail-icon" />
                        <div>
                          <span className="detail-label">Date</span>
                          <span className="detail-value">{formatDate(res.date)}</span>
                        </div>
                      </div>

                      <div className="res-detail-item">
                        <FiClock className="res-detail-icon" />
                        <div>
                          <span className="detail-label">Time</span>
                          <span className="detail-value">{formatTime(res.time)}</span>
                        </div>
                      </div>

                      <div className="res-detail-item">
                        <FiUsers className="res-detail-icon" />
                        <div>
                          <span className="detail-label">Guests</span>
                          <span className="detail-value">{res.guests} {Number(res.guests) === 1 ? 'Guest' : 'Guests'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Customer name */}
                    <div className="res-customer-row">
                      <span className="detail-label">Reserved by</span>
                      <span className="detail-value">{res.customerName}</span>
                    </div>

                    {/* Special request */}
                    {res.specialRequest && (
                      <div className="res-special-request">
                        <span className="detail-label">Special Request</span>
                        <p>{res.specialRequest}</p>
                      </div>
                    )}
                  </div>

                  {/* ── Inline cancel confirmation ── */}
                  {confirmId === (res._id || res.id) ? (
                    <div className="cancel-confirm-panel">
                      <div className="cancel-confirm-inner">
                        <FiAlertTriangle className="cancel-warn-icon" />
                        <p>Are you sure you want to cancel this reservation?</p>
                      </div>
                      <div className="cancel-confirm-actions">
                        <button
                          className="cancel-confirm-btn"
                          onClick={() => handleCancelConfirm(res._id || res.id)}
                          aria-label="Confirm cancellation"
                        >
                          <FiX /> Cancel Reservation
                        </button>
                        <button
                          className="keep-btn"
                          onClick={handleKeep}
                          aria-label="Keep this reservation"
                        >
                          <FiCheck /> Keep Reservation
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── Card footer ── */
                    res.status === 'Pending' && (
                      <div className="reservation-card-footer">
                        <button
                          className="cancel-reservation-btn"
                          onClick={() => handleCancelClick(res._id || res.id)}
                          aria-label={`Cancel reservation ${res.reservationId || res.id}`}
                        >
                          Cancel Reservation
                        </button>
                      </div>
                    )
                  )}

                  {/* Cancelled footer (no action available) */}
                  {res.status === 'Cancelled' && confirmId !== (res._id || res.id) && (
                    <div className="reservation-card-footer cancelled-footer">
                      <span className="cancelled-note">
                        This reservation has been cancelled.
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Dev note */}
            <div className="demo-credentials-info" style={{ marginTop: '30px' }}>
              <p>
                💡 <strong>System Note:</strong> Your table reservations are saved securely
                in the {restaurantConfig.name} database.
              </p>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
