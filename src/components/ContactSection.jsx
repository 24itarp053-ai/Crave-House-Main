import React from 'react';
import { FiArrowUpRight, FiHeart, FiInstagram, FiMapPin, FiPhone } from 'react-icons/fi';

export default function ContactSection() {
  const handleSubmit = (event) => {
    event.preventDefault();
    // Form submission handling logic
  };

  return (
    <section id="contact" className="contact">
      <div className="contact-info">
        <p className="eyebrow">Come say hello</p>
        <h2>
          Your table is
          <br />
          <em>waiting.</em>
        </h2>

        <div>
          <FiMapPin />
          <p>
            18, Olive Street, Near Central Park
            <br />
            Ahmedabad, Gujarat 380015
          </p>
        </div>

        <div>
          <FiPhone />
          <p>
            +91 98765 43210
            <br />
            hello@cravehouse.in
          </p>
        </div>

        <div className="social">
          <FiInstagram />
          <FiHeart />
          <FiMapPin />
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <h3>Send us a note</h3>

        <label>
          Name
          <input placeholder="Your name" required />
        </label>

        <label>
          Email
          <input type="email" placeholder="you@email.com" required />
        </label>

        <label>
          Message
          <textarea placeholder="How can we help?" required />
        </label>

        <button type="submit" className="button">
          Send message <FiArrowUpRight />
        </button>
      </form>
    </section>
  );
}
