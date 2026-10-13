import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiShoppingBag, FiMapPin, FiPhone, FiClock, FiArrowUpRight, FiCalendar } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { createReservation } from '../services/reservationService';
import Footer from '../components/Footer';
import '../pizza-page.css';

export default function BookTablePage() {
  const { cartCount } = useCart();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    guests: '',
    specialRequest: ''
  });

  const [availabilityMessage, setAvailabilityMessage] = useState(null);
  const [bookingStatus, setBookingStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear validation warnings upon input changes
    setAvailabilityMessage(null);
    setBookingStatus(null);
  };

  const validateForm = () => {
    const { fullName, email, phone, date, time, guests } = formData;
    if (!fullName || !email || !phone || !date || !time || !guests) {
      return { valid: false, message: 'Please fill in all required fields.' };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, message: 'Please enter a valid email address.' };
    }

    // Validate phone format (10-15 digits)
    const phoneRegex = /^[0-9\s+-]{10,15}$/;
    if (!phoneRegex.test(phone.trim())) {
      return { valid: false, message: 'Please enter a valid phone number (minimum 10 digits).' };
    }

    // Validate date is not in the past
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      return { valid: false, message: 'Reservation date cannot be in the past.' };
    }

    // Validate guests count
    const guestNum = parseInt(guests, 10);
    if (isNaN(guestNum) || guestNum < 1) {
      return { valid: false, message: 'Number of guests must be at least 1.' };
    }
    if (guestNum > 20) {
      return { valid: false, message: 'For groups larger than 20, please contact us directly.' };
    }

    return { valid: true };
  };

  const handleCheckAvailability = () => {
    const validation = validateForm();
    if (!validation.valid) {
      setAvailabilityMessage({
        type: 'error',
        text: validation.message
      });
      return;
    }

    setAvailabilityMessage({
      type: 'info',
      text: 'Checking table availability for your slot...'
    });

    setTimeout(() => {
      const hour = parseInt(formData.time.split(':')[0], 10);
      // Simulate fully booked times (e.g., 2 PM to 4 PM or after 10 PM)
      if ((hour >= 14 && hour < 16) || hour >= 22) {
        setAvailabilityMessage({
          type: 'warning',
          text: '✗ Sorry, we are fully booked during this time slot. Please try another hour.'
        });
      } else {
        setAvailabilityMessage({
          type: 'success',
          text: '✓ Tables are available! You can proceed to Book Table.'
        });
      }
    }, 1000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setBookingStatus({
        type: 'error',
        text: 'You must be logged in to reserve a table.'
      });
      return;
    }
    const validation = validateForm();
    if (!validation.valid) {
      setBookingStatus({
        type: 'error',
        text: validation.message
      });
      return;
    }

    setSubmitting(true);
    setBookingStatus({
      type: 'info',
      text: 'Reserving your table...'
    });

    try {
      const res = await createReservation({
        customerName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        date: formData.date,
        time: formData.time,
        guests: Number(formData.guests),
        specialRequest: formData.specialRequest || ''
      });

      if (res.success && res.reservation) {
        setBookingStatus({
          type: 'success',
          reservationId: res.reservation.reservationId || res.reservation._id,
          text: `✓ Success! Your table has been reserved for ${formData.guests} guest(s) on ${formData.date} at ${formData.time}. A confirmation has been sent to ${formData.email}.`
        });

        // Reset form fields
        setFormData({
          fullName: '',
          email: '',
          phone: '',
          date: '',
          time: '',
          guests: '',
          specialRequest: ''
        });
        setAvailabilityMessage(null);
      } else {
        setBookingStatus({
          type: 'error',
          text: res.message || 'Failed to book table. Please try again.'
        });
      }
    } catch (err) {
      console.error(err);
      setBookingStatus({
        type: 'error',
        text: err.message || 'An error occurred. Please try again.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="pizza-page">
      <style>{`
        @media (max-width: 520px) {
          .book-form-grid-2, .book-form-grid-3 {
            grid-template-columns: 1fr !important;
          }
          .book-form-actions {
            flex-direction: column;
          }
        }
      `}</style>

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

      <section className="pizza-hero" style={{ background: '#26150f' }}>
        <p className="eyebrow">YOUR TABLE IS WAITING</p>
        <h1>
          Book a Table
          <br />
          <em>With Us.</em>
        </h1>
        <p>Skip the wait and reserve a cozy table for yourself, friends, or family today.</p>
      </section>

      <section className="contact" style={{ padding: '80px 6vw', background: '#f8f5ed' }}>
        <div className="contact-info">
          <p className="eyebrow">Warm service, always</p>
          <h2>
            Join us for
            <br />
            <em>lunch or dinner.</em>
          </h2>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', marginBottom: '25px' }}>
            <FiMapPin style={{ fontSize: '20px', color: '#d4a373', marginTop: '3px' }} />
            <div>
              <h4 style={{ margin: '0 0 5px 0', fontFamily: 'Poppins', fontWeight: 600 }}>Location</h4>
              <p style={{ margin: 0, color: '#6c554a' }}>
                18, Olive Street, Near Central Park<br />
                Ahmedabad, Gujarat 380015
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', marginBottom: '25px' }}>
            <FiPhone style={{ fontSize: '20px', color: '#d4a373', marginTop: '3px' }} />
            <div>
              <h4 style={{ margin: '0 0 5px 0', fontFamily: 'Poppins', fontWeight: 600 }}>Get In Touch</h4>
              <p style={{ margin: 0, color: '#6c554a' }}>
                +91 98765 43210<br />
                hello@cravehouse.in
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
            <FiClock style={{ fontSize: '20px', color: '#d4a373', marginTop: '3px' }} />
            <div>
              <h4 style={{ margin: '0 0 5px 0', fontFamily: 'Poppins', fontWeight: 600 }}>Opening Hours</h4>
              <p style={{ margin: 0, color: '#6c554a' }}>
                Mon – Fri: <strong>10AM – 10PM</strong><br />
                Sat – Sun: <strong>9AM – 11PM</strong>
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '1px solid #efe7dd' }}>
          <h3>Reserve Your Table</h3>

          <label>
            Full Name *
            <input 
              type="text" 
              name="fullName"
              placeholder="Enter your full name" 
              required 
              value={formData.fullName} 
              onChange={handleChange}
            />
          </label>

          <div className="book-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <label>
              Email Address *
              <input 
                type="email" 
                name="email"
                placeholder="you@email.com" 
                required 
                value={formData.email} 
                onChange={handleChange}
              />
            </label>

            <label>
              Phone Number *
              <input 
                type="tel" 
                name="phone"
                placeholder="98765 43210" 
                required 
                value={formData.phone} 
                onChange={handleChange}
              />
            </label>
          </div>

          <div className="book-form-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
            <label>
              Date *
              <input 
                type="date" 
                name="date"
                required 
                value={formData.date} 
                onChange={handleChange}
              />
            </label>

            <label>
              Time *
              <input 
                type="time" 
                name="time"
                required 
                value={formData.time} 
                onChange={handleChange}
              />
            </label>

            <label>
              Guests *
              <input 
                type="number" 
                name="guests"
                min="1"
                max="20"
                placeholder="Guests" 
                required 
                value={formData.guests} 
                onChange={handleChange}
              />
            </label>
          </div>

          <label>
            Special Request
            <textarea 
              name="specialRequest"
              placeholder="Any request (e.g. window table, dietary requests)?" 
              value={formData.specialRequest} 
              onChange={handleChange}
            />
          </label>

          {/* Availability Status Check Indicator */}
          {availabilityMessage && (
            <div style={{ 
              padding: '12px', 
              borderRadius: '8px', 
              fontSize: '12px',
              marginTop: '15px',
              backgroundColor: availabilityMessage.type === 'success' ? '#e2f0d9' : availabilityMessage.type === 'error' ? '#fbe5d6' : availabilityMessage.type === 'warning' ? '#fff2cc' : '#e6f2ff',
              color: availabilityMessage.type === 'success' ? '#385723' : availabilityMessage.type === 'error' ? '#c65911' : availabilityMessage.type === 'warning' ? '#7f6000' : '#0066cc',
              border: `1px solid ${availabilityMessage.type === 'success' ? '#c5e0b4' : availabilityMessage.type === 'error' ? '#f8cbad' : availabilityMessage.type === 'warning' ? '#ffe699' : '#b3d9ff'}`
            }}>
              {availabilityMessage.text}
            </div>
          )}

          {/* Booking Confirmation Indicator */}
          {bookingStatus && (
            <div style={{ 
              padding: '12px', 
              borderRadius: '8px', 
              fontSize: '12px',
              marginTop: '15px',
              backgroundColor: bookingStatus.type === 'success' ? '#e2f0d9' : bookingStatus.type === 'error' ? '#fbe5d6' : '#e6f2ff',
              color: bookingStatus.type === 'success' ? '#385723' : bookingStatus.type === 'error' ? '#c65911' : '#0066cc',
              border: `1px solid ${bookingStatus.type === 'success' ? '#c5e0b4' : bookingStatus.type === 'error' ? '#f8cbad' : '#b3d9ff'}`
            }}>
              {bookingStatus.text}
              {bookingStatus.type === 'success' && bookingStatus.reservationId && (
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #c5e0b4' }}>
                  <span style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                    Reservation ID: {bookingStatus.reservationId}
                  </span>
                  <Link
                    to="/reservations"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      color: '#385723',
                      fontWeight: 600,
                      textDecoration: 'underline'
                    }}
                  >
                    <FiCalendar /> View My Reservations
                  </Link>
                </div>
              )}
            </div>
          )}

          <div className="book-form-actions" style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button 
              type="button" 
              className="button ghost" 
              onClick={handleCheckAvailability}
              disabled={submitting}
              style={{ flex: 1, padding: '12px', fontSize: '12px', border: '1px solid #efe7dd', color: 'var(--dark)' }}
            >
              Check Availability
            </button>
            
            <button 
              type="submit" 
              className="button"
              disabled={submitting}
              style={{ flex: 1, padding: '12px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
            >
              {submitting ? 'Reserving...' : 'Book Table'} <FiArrowUpRight />
            </button>
          </div>
        </form>
      </section>

      <Footer />
    </main>
  );
}
