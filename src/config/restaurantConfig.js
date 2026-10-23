/**
 * restaurantConfig.js
 * Centralized Restaurant Configuration for Crave House and white-label deployments.
 *
 * This file centralizes brand identity, visual theming, contact information,
 * operating hours, and localized currency settings. Provides build-time defaults
 * and allows runtime synchronization with the backend /api/config endpoint.
 *
 * SECURITY NOTICE:
 * Do NOT store server secrets (e.g. Razorpay Key Secret, Webhook Secret, DB URIs,
 * JWT keys) in this frontend file. All credentials belong exclusively in server/.env.
 */

export const restaurantConfig = {
  // ── 1. Brand Identity ───────────────────────────────────────────────────────
  name: 'Crave House',
  shortName: 'CH',
  tagline: 'Delicious food, delivered fast.',
  description: 'Fresh ingredients. Fast delivery. Premium taste. Made with love.',
  sinceYear: '2016',

  // ── 2. Logo & Visual Assets ────────────────────────────────────────────────
  logo: {
    // If an image asset is provided, it will render inside the brand logo components.
    // If null, the shortName initials badge (e.g., 'CH') is rendered dynamically.
    image: null,
    favicon: '/favicon.ico',
  },

  // ── 3. Theme & Brand Colors ────────────────────────────────────────────────
  // Injected into document :root as CSS variables at runtime
  theme: {
    primary: '#4e342e',     // Maps to --brown
    dark: '#241713',        // Maps to --dark
    secondary: '#6d4c41',   // Maps to --coffee
    cream: '#f8f5ed',       // Maps to --cream
    beige: '#efe7dd',       // Maps to --beige
    accent: '#d4a373',      // Maps to --accent
  },

  // ── 4. Contact & Location ──────────────────────────────────────────────────
  contact: {
    phone: '+91 98765 43210',
    email: 'hello@cravehouse.in',
    address: {
      street: '18, Olive Street, Near Central Park',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '380015',
      country: 'India',
      fullAddress: '18, Olive Street, Near Central Park, Ahmedabad, Gujarat 380015',
    },
    pickupLocationName: 'Crave House Main Restaurant',
  },

  // ── 5. Business & Operating Hours ──────────────────────────────────────────
  businessHours: {
    weekdays: {
      days: 'Monday – Friday',
      hours: '10AM – 10PM',
      label: 'Weekdays (Mon–Fri): 10:00 AM – 10:00 PM',
    },
    weekends: {
      days: 'Saturday – Sunday',
      hours: '9AM – 11PM',
      label: 'Weekends (Sat–Sun): 9:00 AM – 11:00 PM',
    },
  },

  // ── 6. Reservation Operating Settings ──────────────────────────────────────
  reservationSettings: {
    defaultDurationMinutes: 90,
    minPartySize: 1,
    maxPartySize: 20,
  },

  // ── 7. Currency, Locale & Tax Display ──────────────────────────────────────
  // Authoritative prices, totals, and payment amounts are enforced server-side.
  pricing: {
    currencyCode: 'INR',
    currencySymbol: '₹',
    locale: 'en-IN',
    // Menu item prices are inclusive of taxes (0% separate tax added)
    taxRatePercent: 0,
    pricesIncludeTax: true,
  },

  // ── 8. Social Links ────────────────────────────────────────────────────────
  social: {
    instagram: 'https://instagram.com/cravehouse',
    facebook: 'https://facebook.com/cravehouse',
    twitter: 'https://twitter.com/cravehouse',
  },

  // ── 9. Helper Utilities ────────────────────────────────────────────────────
  formatPrice(amount) {
    const num = Number(amount) || 0;
    const locale = this.pricing?.locale || 'en-IN';
    const symbol = this.pricing?.currencySymbol || '₹';
    return `${symbol}${num.toLocaleString(locale)}`;
  },
};

/**
 * Apply CSS theme variables to document root
 */
export function applyTheme(themeObj = {}) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (themeObj.primary) root.style.setProperty('--brown', themeObj.primary);
  if (themeObj.dark) root.style.setProperty('--dark', themeObj.dark);
  if (themeObj.secondary) root.style.setProperty('--coffee', themeObj.secondary);
  if (themeObj.cream) root.style.setProperty('--cream', themeObj.cream);
  if (themeObj.beige) root.style.setProperty('--beige', themeObj.beige);
  if (themeObj.accent) root.style.setProperty('--accent', themeObj.accent);
}

/**
 * Safely merge remote backend configuration into local restaurantConfig
 */
export function applyRemoteConfig(remote = {}) {
  if (!remote || typeof remote !== 'object') return restaurantConfig;

  if (remote.name) restaurantConfig.name = remote.name;
  if (remote.shortName) restaurantConfig.shortName = remote.shortName;
  if (remote.tagline) restaurantConfig.tagline = remote.tagline;
  if (remote.description) restaurantConfig.description = remote.description;
  if (remote.sinceYear) restaurantConfig.sinceYear = remote.sinceYear;

  if (remote.logo) {
    restaurantConfig.logo = { ...restaurantConfig.logo, ...remote.logo };
  }
  if (remote.theme) {
    restaurantConfig.theme = { ...restaurantConfig.theme, ...remote.theme };
    applyTheme(restaurantConfig.theme);
  }
  if (remote.contact) {
    restaurantConfig.contact = {
      ...restaurantConfig.contact,
      ...remote.contact,
      address: {
        ...restaurantConfig.contact.address,
        ...(remote.contact.address || {})
      }
    };
  }
  if (remote.businessHours) {
    restaurantConfig.businessHours = {
      weekdays: { ...restaurantConfig.businessHours.weekdays, ...(remote.businessHours.weekdays || {}) },
      weekends: { ...restaurantConfig.businessHours.weekends, ...(remote.businessHours.weekends || {}) }
    };
  }
  if (remote.reservationSettings) {
    restaurantConfig.reservationSettings = {
      ...restaurantConfig.reservationSettings,
      ...remote.reservationSettings
    };
  }
  if (remote.pricing) {
    restaurantConfig.pricing = { ...restaurantConfig.pricing, ...remote.pricing };
  }
  if (remote.social) {
    restaurantConfig.social = { ...restaurantConfig.social, ...remote.social };
  }

  // Update dynamic document title
  if (typeof document !== 'undefined' && restaurantConfig.name) {
    document.title = `${restaurantConfig.name} — ${restaurantConfig.tagline || ''}`;
  }

  return restaurantConfig;
}

export default restaurantConfig;
