/**
 * server/src/config/restaurantConfig.js
 * Centralized Authoritative Restaurant Configuration for Crave House and white-label deployments.
 *
 * This module is the single backend source of truth for:
 * 1. Brand Identity (name, shortName, tagline, description, sinceYear)
 * 2. Visual Theme & Brand Tokens (CSS custom properties, logo, favicon)
 * 3. Contact & Physical Location (address, phone, email, pickupLocationName)
 * 4. Operating Business Hours (weekday/weekend opening, closing, last seating calculations)
 * 5. Reservation Operating Rules (default duration, party size bounds)
 * 6. Localized Currency, Locale & Tax Display settings
 * 7. Social Links
 *
 * SECURITY NOTICE:
 * This module strictly isolates public configuration settings from backend secrets.
 * getPublicConfig() returns ONLY safe, client-facing settings. Private keys (JWT_SECRET,
 * MONGODB_URI, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET) are NEVER included.
 */

// Helper: parse integer with fallback and bounds checking
function parseIntSafe(val, fallback, min = 0, max = Infinity) {
  const num = parseInt(val, 10);
  if (isNaN(num) || num < min || num > max) return fallback;
  return num;
}

// Helper: validate hex color
function validateHexColor(hex, fallback) {
  if (typeof hex === 'string' && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex.trim())) {
    return hex.trim();
  }
  return fallback;
}

// Formatting helpers for business hours display
function formatHourLabel(hour) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:00 ${period}`;
}

function formatTimeLabel(minutes) {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  const mm = m < 10 ? `0${m}` : m;
  return `${h}:${mm} ${period}`;
}

// ── 1. Operating Hours & Schedule ─────────────────────────────────────────────
// Canonical scheme: BUSINESS_HOURS_WEEKDAY_OPEN, BUSINESS_HOURS_WEEKDAY_CLOSE, etc.
// Backward compatibility: WEEKDAY_OPEN_TIME, WEEKDAY_CLOSE_TIME, etc. (supports 24-hr integer or 'HH:MM')
const weekdayOpenHour = parseIntSafe(process.env.BUSINESS_HOURS_WEEKDAY_OPEN || process.env.WEEKDAY_OPEN_TIME, 10, 0, 23);
const weekdayCloseHour = parseIntSafe(process.env.BUSINESS_HOURS_WEEKDAY_CLOSE || process.env.WEEKDAY_CLOSE_TIME, 22, 0, 23);
const weekendOpenHour = parseIntSafe(process.env.BUSINESS_HOURS_WEEKEND_OPEN || process.env.WEEKEND_OPEN_TIME, 9, 0, 23);
const weekendCloseHour = parseIntSafe(process.env.BUSINESS_HOURS_WEEKEND_CLOSE || process.env.WEEKEND_CLOSE_TIME, 23, 0, 23);

const weekdayOpenMinutes = weekdayOpenHour * 60;
const weekdayCloseMinutes = weekdayCloseHour * 60;
const weekdayLastSeating = Math.max(weekdayOpenMinutes, weekdayCloseMinutes - 30);

const weekendOpenMinutes = weekendOpenHour * 60;
const weekendCloseMinutes = weekendCloseHour * 60;
const weekendLastSeating = Math.max(weekendOpenMinutes, weekendCloseMinutes - 30);

// ── 2. Reservation Settings ───────────────────────────────────────────────────
const defaultDurationMinutes = parseIntSafe(process.env.DEFAULT_SLOT_DURATION_MINUTES, 90, 15, 360);
const maxPartySize = parseIntSafe(process.env.MAX_PARTY_SIZE, 20, 1, 100);
const minPartySize = parseIntSafe(process.env.MIN_PARTY_SIZE, 1, 1, maxPartySize);

// ── 3. Brand Identity ─────────────────────────────────────────────────────────
const restaurantName = (process.env.RESTAURANT_NAME || 'Crave House').trim();
const rawShortName = (process.env.RESTAURANT_SHORT_NAME || 'CH').trim();
const shortName = rawShortName.length > 4 ? rawShortName.slice(0, 4) : (rawShortName || 'CH');

// ── 4. Contact Details ────────────────────────────────────────────────────────
// Canonical: CONTACT_STREET, CONTACT_CITY, etc.
// Aliases: RESTAURANT_ADDRESS_STREET, RESTAURANT_ADDRESS_CITY, etc.
const street = (process.env.CONTACT_STREET || process.env.RESTAURANT_ADDRESS_STREET || '18, Olive Street, Near Central Park').trim();
const city = (process.env.CONTACT_CITY || process.env.RESTAURANT_ADDRESS_CITY || 'Ahmedabad').trim();
const state = (process.env.CONTACT_STATE || process.env.RESTAURANT_ADDRESS_STATE || 'Gujarat').trim();
const pincode = (process.env.CONTACT_PINCODE || process.env.RESTAURANT_ADDRESS_PINCODE || '380015').trim();
const country = (process.env.CONTACT_COUNTRY || process.env.RESTAURANT_ADDRESS_COUNTRY || 'India').trim();
const fullAddress = `${street}, ${city}, ${state} ${pincode}`.trim();

const restaurantConfig = {
  // Brand
  restaurantName,
  name: restaurantName,
  shortName,
  tagline: (process.env.RESTAURANT_TAGLINE || 'Delicious food, delivered fast.').trim(),
  description: (process.env.RESTAURANT_DESCRIPTION || 'Fresh ingredients. Fast delivery. Premium taste. Made with love.').trim(),
  sinceYear: (process.env.RESTAURANT_SINCE_YEAR || '2016').trim(),

  // Logo & Visual Assets
  logo: {
    image: process.env.RESTAURANT_LOGO_URL || null,
    favicon: process.env.RESTAURANT_FAVICON_URL || '/favicon.ico'
  },

  // Theme Colors
  theme: {
    primary: validateHexColor(process.env.THEME_PRIMARY, '#4e342e'),
    dark: validateHexColor(process.env.THEME_DARK, '#241713'),
    secondary: validateHexColor(process.env.THEME_SECONDARY, '#6d4c41'),
    cream: validateHexColor(process.env.THEME_CREAM, '#f8f5ed'),
    beige: validateHexColor(process.env.THEME_BEIGE, '#efe7dd'),
    accent: validateHexColor(process.env.THEME_ACCENT, '#d4a373')
  },

  // Contact Info (Canonical: CONTACT_PHONE / CONTACT_EMAIL, Aliases: RESTAURANT_CONTACT_PHONE / RESTAURANT_CONTACT_EMAIL)
  contact: {
    phone: (process.env.CONTACT_PHONE || process.env.RESTAURANT_CONTACT_PHONE || '+91 98765 43210').trim(),
    email: (process.env.CONTACT_EMAIL || process.env.RESTAURANT_CONTACT_EMAIL || 'hello@cravehouse.in').trim(),
    address: {
      street,
      city,
      state,
      pincode,
      country,
      fullAddress
    },
    pickupLocationName: (process.env.PICKUP_LOCATION_NAME || `${restaurantName} Main Restaurant`).trim()
  },

  // Authoritative Business Hours (used by server reservations and client display)
  businessHours: {
    weekdays: {
      days: 'Monday – Friday',
      openHour: weekdayOpenHour,
      closeHour: weekdayCloseHour,
      openMinutes: weekdayOpenMinutes,
      closeMinutes: weekdayCloseMinutes,
      lastBookingMinutes: weekdayLastSeating,
      hours: `${formatHourLabel(weekdayOpenHour)} – ${formatHourLabel(weekdayCloseHour)}`,
      label: `Weekdays (Mon–Fri): ${formatHourLabel(weekdayOpenHour)} – ${formatHourLabel(weekdayCloseHour)} (last seating ${formatTimeLabel(weekdayLastSeating)})`
    },
    weekends: {
      days: 'Saturday – Sunday',
      openHour: weekendOpenHour,
      closeHour: weekendCloseHour,
      openMinutes: weekendOpenMinutes,
      closeMinutes: weekendCloseMinutes,
      lastBookingMinutes: weekendLastSeating,
      hours: `${formatHourLabel(weekendOpenHour)} – ${formatHourLabel(weekendCloseHour)}`,
      label: `Weekends (Sat–Sun): ${formatHourLabel(weekendOpenHour)} – ${formatHourLabel(weekendCloseHour)} (last seating ${formatTimeLabel(weekendLastSeating)})`
    }
  },

  // Reservation Constraints
  reservationSettings: {
    defaultDurationMinutes,
    minPartySize,
    maxPartySize
  },

  // Currency & Display Settings
  pricing: {
    currencyCode: (process.env.CURRENCY_CODE || 'INR').trim().toUpperCase(),
    currencySymbol: (process.env.CURRENCY_SYMBOL || '₹').trim(),
    locale: (process.env.LOCALE || 'en-IN').trim(),
    taxRatePercent: 0,
    pricesIncludeTax: true
  },

  // Social Channels
  social: {
    instagram: (process.env.SOCIAL_INSTAGRAM || 'https://instagram.com/cravehouse').trim(),
    facebook: (process.env.SOCIAL_FACEBOOK || 'https://facebook.com/cravehouse').trim(),
    twitter: (process.env.SOCIAL_TWITTER || 'https://twitter.com/cravehouse').trim()
  },

  /**
   * Returns a sanitized, safe public configuration payload.
   * Guaranteed to contain zero server secrets or environment credentials.
   */
  getPublicConfig() {
    return {
      name: this.name,
      shortName: this.shortName,
      tagline: this.tagline,
      description: this.description,
      sinceYear: this.sinceYear,
      logo: { ...this.logo },
      theme: { ...this.theme },
      contact: {
        phone: this.contact.phone,
        email: this.contact.email,
        address: { ...this.contact.address },
        pickupLocationName: this.contact.pickupLocationName
      },
      businessHours: {
        weekdays: {
          days: this.businessHours.weekdays.days,
          hours: this.businessHours.weekdays.hours,
          label: this.businessHours.weekdays.label,
          openMinutes: this.businessHours.weekdays.openMinutes,
          closeMinutes: this.businessHours.weekdays.closeMinutes,
          lastBookingMinutes: this.businessHours.weekdays.lastBookingMinutes
        },
        weekends: {
          days: this.businessHours.weekends.days,
          hours: this.businessHours.weekends.hours,
          label: this.businessHours.weekends.label,
          openMinutes: this.businessHours.weekends.openMinutes,
          closeMinutes: this.businessHours.weekends.closeMinutes,
          lastBookingMinutes: this.businessHours.weekends.lastBookingMinutes
        }
      },
      reservationSettings: {
        defaultDurationMinutes: this.reservationSettings.defaultDurationMinutes,
        minPartySize: this.reservationSettings.minPartySize,
        maxPartySize: this.reservationSettings.maxPartySize
      },
      pricing: { ...this.pricing },
      social: { ...this.social }
    };
  }
};

module.exports = restaurantConfig;
