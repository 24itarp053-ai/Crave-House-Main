import React from 'react';
import { Link } from 'react-router-dom';
import restaurantConfig from '../config/restaurantConfig';

/**
 * BrandLogo
 * Reusable branding component that renders the configured restaurant name and
 * badge or image logo across standard navigation bars and page headers.
 *
 * @param {('pizza-brand'|'logo')} variant - CSS class variant to apply ('logo' or 'pizza-brand')
 * @param {string} to - React Router route to link to (default: '/')
 * @param {string|null} href - Optional anchor hash href (e.g. '#home')
 * @param {string} className - Additional CSS classes
 */
export default function BrandLogo({
  variant = 'pizza-brand',
  to = '/',
  href = null,
  className = '',
}) {
  const content = (
    <>
      {restaurantConfig.logo.image ? (
        <img
          src={restaurantConfig.logo.image}
          alt={restaurantConfig.name}
          className="brand-logo-img"
          style={{ maxHeight: '35px', width: 'auto' }}
        />
      ) : (
        <span>{restaurantConfig.shortName}</span>
      )}
      <i>{restaurantConfig.name}</i>
    </>
  );

  const combinedClass = `${variant} ${className}`.trim();

  if (href) {
    return (
      <a href={href} className={combinedClass} aria-label={restaurantConfig.name}>
        {content}
      </a>
    );
  }

  return (
    <Link to={to} className={combinedClass} aria-label={restaurantConfig.name}>
      {content}
    </Link>
  );
}
