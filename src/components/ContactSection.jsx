import React from 'react';
import { FiArrowUpRight, FiHeart, FiInstagram, FiMapPin, FiPhone } from 'react-icons/fi';
import restaurantConfig from '../config/restaurantConfig';

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
            {restaurantConfig.contact.address.street}
            <br />
            {restaurantConfig.contact.address.city}, {restaurantConfig.contact.address.state} {restaurantConfig.contact.address.pincode}
          </p>
        </div>

        <div>
          <FiPhone />
          <p>
            {restaurantConfig.contact.phone}
            <br />
            {restaurantConfig.contact.email}
          </p>
        </div>

        <div className="social">
          {restaurantConfig.social?.instagram && (
            <a href={restaurantConfig.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <FiInstagram />
            </a>
          )}
          {restaurantConfig.social?.facebook && (
            <a href={restaurantConfig.social.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <FiHeart />
            </a>
          )}
          {restaurantConfig.social?.twitter && (
            <a href={restaurantConfig.social.twitter} target="_blank" rel="noopener noreferrer" aria-label="Twitter">
              <FiMapPin />
            </a>
          )}
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
