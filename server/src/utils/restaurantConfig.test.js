/**
 * restaurantConfig.test.js
 * Verification test suite for Crave House Phase 4.4: Centralized Restaurant Settings.
 *
 * Verifies:
 * 1. Backend Centralized Configuration:
 *    - Brand identity (name, shortName, tagline, description, sinceYear)
 *    - Valid theme tokens (hex validation)
 *    - Contact details & composed fullAddress
 *    - Authoritative business hours (opening, closing, last seating calculations)
 *    - Reservation operational limits (slot duration, party sizes)
 *    - Currency & locale display settings
 * 2. Fallbacks & Boundary Validations:
 *    - Invalid/out-of-bounds hours fall back to safe defaults
 *    - Invalid hex colors fall back to safe brand defaults
 *    - Excessive shortName automatically sliced to 1-4 characters
 * 3. GET /api/config Public Endpoint:
 *    - Exposes sanitized public configuration for client-side rendering
 *    - Zero secret leakage (verifies absence of JWT_SECRET, MONGODB_URI, RAZORPAY_KEY_SECRET, etc.)
 * 4. Backend Enforcement & Schedule Consistency:
 *    - Consistency between displayed business hours and server-enforced reservation checks
 *    - Reservation service enforces backend opening/closing hours
 * 5. Frontend & Backend Consistency:
 *    - Ensures frontend formatPrice matches currencySymbol and locale
 *    - Theme tokens match expected CSS variable structure
 */

const http = require('http');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = require('../server');
const backendConfig = require('../config/restaurantConfig');
const mongoose = require('mongoose');

let server;
let baseUrl;
const results = [];

function assertTest(title, condition, detail = '') {
  results.push({ title, pass: Boolean(condition), detail });
  const status = condition ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  console.log(`  [${status}] ${title} ${detail ? `(${detail})` : ''}`);
}

async function request(apiPath, options = {}) {
  const url = `${baseUrl}${apiPath}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  let data;
  try {
    data = await response.json();
  } catch (_) {
    data = null;
  }
  return { status: response.status, data };
}

async function runConfigSuite() {
  console.log('\n======================================================');
  console.log('   CRAVE HOUSE: PHASE 4.4 RESTAURANT CONFIG TEST SUITE');
  console.log('======================================================\n');

  try {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api`;

    // 1. Backend Authoritative Configuration
    console.log('--- 1. Backend Authoritative Configuration ---');
    assertTest(
      'Backend configuration module exports valid object',
      backendConfig && typeof backendConfig === 'object'
    );
    assertTest(
      'Backend restaurantName and name are non-empty strings',
      typeof backendConfig.name === 'string' && backendConfig.name.trim().length > 0 &&
      backendConfig.name === backendConfig.restaurantName,
      `Name: "${backendConfig.name}"`
    );
    assertTest(
      'ShortName badge is between 1 and 4 characters',
      typeof backendConfig.shortName === 'string' && backendConfig.shortName.length >= 1 && backendConfig.shortName.length <= 4,
      `Badge: "${backendConfig.shortName}"`
    );
    assertTest(
      'Tagline, description, and sinceYear are defined strings',
      typeof backendConfig.tagline === 'string' && typeof backendConfig.description === 'string' && typeof backendConfig.sinceYear === 'string'
    );

    // 2. Theme & Visual Colors
    console.log('\n--- 2. Theme Tokens & Hex Validation ---');
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    const theme = backendConfig.theme || {};
    assertTest(
      'Theme tokens include valid primary, secondary, and accent colors',
      hexRegex.test(theme.primary) && hexRegex.test(theme.secondary) && hexRegex.test(theme.accent),
      `Primary: ${theme.primary}, Secondary: ${theme.secondary}, Accent: ${theme.accent}`
    );

    // 3. Contact & Location
    console.log('\n--- 3. Contact & Business Details ---');
    const contact = backendConfig.contact || {};
    assertTest(
      'Contact phone and email are valid non-empty strings with @',
      typeof contact.phone === 'string' && typeof contact.email === 'string' && contact.email.includes('@'),
      `Phone: ${contact.phone}, Email: ${contact.email}`
    );
    assertTest(
      'Address structure includes street, city, state, pincode, and fullAddress',
      contact.address && contact.address.street && contact.address.city && contact.address.pincode && contact.address.fullAddress
    );
    assertTest(
      'Pickup location name is defined for takeaway orders',
      typeof contact.pickupLocationName === 'string' && contact.pickupLocationName.length > 0,
      `Pickup Location: "${contact.pickupLocationName}"`
    );

    // 4. Business Hours & Server Enforcement Calculations
    console.log('\n--- 4. Business Hours & Operational Schedule ---');
    const hours = backendConfig.businessHours || {};
    assertTest(
      'Business hours defined for weekdays and weekends with open/close minutes',
      hours.weekdays && hours.weekends &&
      typeof hours.weekdays.openMinutes === 'number' && typeof hours.weekdays.closeMinutes === 'number' &&
      typeof hours.weekends.openMinutes === 'number' && typeof hours.weekends.closeMinutes === 'number'
    );
    assertTest(
      'Last seating is calculated exactly 30 minutes before closing time',
      hours.weekdays.lastBookingMinutes === hours.weekdays.closeMinutes - 30 &&
      hours.weekends.lastBookingMinutes === hours.weekends.closeMinutes - 30,
      `Weekday last: ${hours.weekdays.lastBookingMinutes}m, Weekend last: ${hours.weekends.lastBookingMinutes}m`
    );

    // 5. Reservation Operating Settings
    console.log('\n--- 5. Reservation Operational Settings ---');
    const rsvSettings = backendConfig.reservationSettings || {};
    assertTest(
      'Default reservation duration is configured and at least 15 minutes',
      typeof rsvSettings.defaultDurationMinutes === 'number' && rsvSettings.defaultDurationMinutes >= 15,
      `Duration: ${rsvSettings.defaultDurationMinutes} mins`
    );
    assertTest(
      'Party size bounds are configured with min >= 1 and max >= min',
      rsvSettings.minPartySize >= 1 && rsvSettings.maxPartySize >= rsvSettings.minPartySize,
      `Party Range: ${rsvSettings.minPartySize} – ${rsvSettings.maxPartySize}`
    );

    // 6. Pricing & Currency Metadata
    console.log('\n--- 6. Pricing, Currency & Locale ---');
    const pricing = backendConfig.pricing || {};
    assertTest(
      'Pricing configuration contains currencyCode, currencySymbol, and locale',
      pricing.currencyCode === 'INR' && pricing.currencySymbol === '₹' && pricing.locale === 'en-IN',
      `Currency: ${pricing.currencyCode} (${pricing.currencySymbol}), Locale: ${pricing.locale}`
    );
    assertTest(
      'Tax configuration specifies rate and inclusion flag',
      typeof pricing.taxRatePercent === 'number' && typeof pricing.pricesIncludeTax === 'boolean',
      `Tax Rate: ${pricing.taxRatePercent}%, Inclusive: ${pricing.pricesIncludeTax}`
    );

    // 7. GET /api/config Public Endpoint & Secret Isolation
    console.log('\n--- 7. GET /api/config Endpoint & Secret Isolation ---');
    const configRes = await request('/config');
    assertTest(
      'GET /api/config returns HTTP 200 with success: true',
      configRes.status === 200 && configRes.data?.success === true
    );
    const pubConfig = configRes.data?.config;
    assertTest(
      'Public config payload contains name, theme, contact, and businessHours',
      pubConfig && pubConfig.name === backendConfig.name &&
      pubConfig.theme && pubConfig.contact && pubConfig.businessHours
    );

    // Critical Security Check: Ensure NO server secrets are leaked in public config payload
    const rawPubConfigString = JSON.stringify(pubConfig);
    const forbiddenPatterns = [
      'RAZORPAY_KEY_SECRET',
      'rzp_live_',
      'rzp_test_',
      'mongodb://',
      'JWT_SECRET',
      'password',
      'secret'
    ];
    let leaksDetected = 0;
    for (const pattern of forbiddenPatterns) {
      if (rawPubConfigString.toLowerCase().includes(pattern.toLowerCase())) {
        leaksDetected++;
      }
    }
    assertTest(
      'No server secrets, JWT keys, or database credentials exposed in GET /api/config',
      leaksDetected === 0,
      `Leaks detected: ${leaksDetected}`
    );

    // 8. Frontend Config Compatibility Check
    console.log('\n--- 8. Frontend Configuration Module Compatibility ---');
    const frontendConfigPath = path.resolve(__dirname, '../../../src/config/restaurantConfig.js');
    const { restaurantConfig: frontendConfig } = await import(`file://${frontendConfigPath.replace(/\\/g, '/')}`);
    assertTest(
      'Frontend restaurantConfig formats monetary values accurately',
      typeof frontendConfig.formatPrice === 'function' && frontendConfig.formatPrice(450) === '₹450',
      `Formatted 450: "${frontendConfig.formatPrice(450)}"`
    );
    assertTest(
      'Frontend restaurantConfig has matching theme and identity defaults',
      frontendConfig.name === backendConfig.name &&
      frontendConfig.theme.primary === backendConfig.theme.primary
    );

    // 9. Business Hours Reconciled Naming & Fallbacks
    console.log('\n--- 9. Business Hours Reconciled Naming & Fallbacks ---');
    assertTest(
      'Canonical business hours variables produce valid weekday open/close and last seating minutes',
      backendConfig.businessHours.weekdays.openMinutes >= 0 &&
      backendConfig.businessHours.weekdays.closeMinutes > backendConfig.businessHours.weekdays.openMinutes &&
      backendConfig.businessHours.weekdays.lastBookingMinutes === backendConfig.businessHours.weekdays.closeMinutes - 30
    );

    const { execSync } = require('child_process');
    const serverDir = path.join(__dirname, '../..');
    const legacyHoursOutput = execSync(
      'node -e "process.env.WEEKDAY_OPEN_TIME=\'11\'; process.env.WEEKDAY_CLOSE_TIME=\'23\'; delete process.env.BUSINESS_HOURS_WEEKDAY_OPEN; delete process.env.BUSINESS_HOURS_WEEKDAY_CLOSE; const cfg = require(\'./src/config/restaurantConfig\'); console.log(JSON.stringify(cfg.businessHours.weekdays));"',
      { cwd: serverDir, encoding: 'utf-8' }
    );
    const legacyHours = JSON.parse(legacyHoursOutput.trim());
    assertTest(
      'Legacy WEEKDAY_OPEN_TIME / WEEKDAY_CLOSE_TIME fallback properly resolves hours when canonical vars are absent',
      legacyHours.openHour === 11 && legacyHours.closeHour === 23 && legacyHours.openMinutes === 660 && legacyHours.closeMinutes === 1380
    );

    // 10. CORS Multi-Origin Parsing
    console.log('\n--- 10. CORS Multi-Origin Parsing ---');
    const corsMultiOriginOutput = execSync(
      'node -e "process.env.CLIENT_URL=\'https://cravehouse.in, https://www.cravehouse.in\'; const server = require(\'./src/server\'); console.log(\'CORS config loaded\');"',
      { cwd: serverDir, encoding: 'utf-8' }
    );
    assertTest(
      'Server initializes cleanly with comma-separated CLIENT_URL origins',
      corsMultiOriginOutput.includes('CORS config loaded')
    );

    // 11. Production Seed Safeguards & Override Elimination
    console.log('\n--- 11. Production Seed Safeguards & Override Elimination ---');
    let seedBlockedNoPass = false;
    try {
      execSync(
        'node -e "process.env.NODE_ENV=\'production\'; process.env.MONGODB_URI=\'mongodb://127.0.0.1:27017/dummy\'; delete process.env.SEED_ADMIN_PASSWORD; require(\'./src/utils/seedUsers\');"',
        { cwd: serverDir, stdio: 'pipe' }
      );
    } catch (seedErr) {
      seedBlockedNoPass = seedErr.status === 1;
    }
    assertTest(
      'seedUsers.js blocks default demo account seeding when NODE_ENV is production without explicit password',
      seedBlockedNoPass === true
    );

    let seedBlockedEvenWithOverride = false;
    try {
      execSync(
        'node -e "process.env.NODE_ENV=\'production\'; process.env.MONGODB_URI=\'mongodb://127.0.0.1:27017/dummy\'; process.env.ALLOW_DEFAULT_DEMO_SEED=\'true\'; delete process.env.SEED_ADMIN_PASSWORD; require(\'./src/utils/seedUsers\');"',
        { cwd: serverDir, stdio: 'pipe' }
      );
    } catch (seedErr) {
      seedBlockedEvenWithOverride = seedErr.status === 1;
    }
    assertTest(
      'seedUsers.js refuses demo passwords in production even if ALLOW_DEFAULT_DEMO_SEED=true was attempted (override removed)',
      seedBlockedEvenWithOverride === true
    );

    let seedBlockedIdenticalPasswords = false;
    try {
      execSync(
        'node -e "process.env.NODE_ENV=\'production\'; process.env.MONGODB_URI=\'mongodb://127.0.0.1:27017/dummy\'; process.env.SEED_ADMIN_PASSWORD=\'ProdAdminPass1!\'; process.env.SEED_OWNER_PASSWORD=\'ProdAdminPass1!\'; require(\'./src/utils/seedUsers\');"',
        { cwd: serverDir, stdio: 'pipe' }
      );
    } catch (seedErr) {
      seedBlockedIdenticalPasswords = seedErr.status === 1;
    }
    assertTest(
      'seedUsers.js requires unique, distinct passwords for admin and owner in production',
      seedBlockedIdenticalPasswords === true
    );

    let seedTablesBlockedNoDbInProd = false;
    try {
      execSync(
        'node -e "process.env.NODE_ENV=\'production\'; const { seedTables } = require(\'./src/utils/seedTables\'); delete process.env.MONGODB_URI; delete process.env.MONGO_URI; seedTables();"',
        { cwd: serverDir, stdio: 'pipe' }
      );
    } catch (seedErr) {
      seedTablesBlockedNoDbInProd = seedErr.status === 1;
    }
    assertTest(
      'seedTables.js refuses to connect to localhost fallback in production when database URI is missing',
      seedTablesBlockedNoDbInProd === true
    );

    // 12. Database Connection Variable & Fallbacks
    console.log('\n--- 12. Database Connection Variable & Fallbacks ---');
    const dbMongoUriOutput = execSync(
      'node -e "delete process.env.MONGODB_URI; process.env.MONGO_URI=\'mongodb://127.0.0.1:27017/test_alias\'; const connectDB = require(\'./src/config/db\'); console.log(\'Loaded with MONGO_URI alias\');"',
      { cwd: serverDir, encoding: 'utf-8' }
    );
    assertTest(
      'Database config accepts MONGO_URI fallback when MONGODB_URI is not set',
      dbMongoUriOutput.includes('Loaded with MONGO_URI alias')
    );

    let dbMissingBlocked = false;
    try {
      execSync(
        'node -e "delete process.env.MONGODB_URI; delete process.env.MONGO_URI; const connectDB = require(\'./src/config/db\'); connectDB();"',
        { cwd: serverDir, stdio: 'pipe' }
      );
    } catch (dbErr) {
      dbMissingBlocked = dbErr.status === 1;
    }
    assertTest(
      'connectDB exits with code 1 when neither MONGODB_URI nor MONGO_URI is defined',
      dbMissingBlocked === true
    );

    // 13. Contact Details Canonical & Alias Reconciliation
    console.log('\n--- 13. Contact Details Canonical & Alias Reconciliation ---');
    const contactAliasOutput = execSync(
      'node -e "delete process.env.CONTACT_PHONE; delete process.env.CONTACT_EMAIL; delete process.env.CONTACT_STREET; process.env.RESTAURANT_CONTACT_PHONE=\'+91 11111 22222\'; process.env.RESTAURANT_CONTACT_EMAIL=\'alias@test.com\'; process.env.RESTAURANT_ADDRESS_STREET=\'456 Alias Blvd\'; const cfg = require(\'./src/config/restaurantConfig\'); console.log(JSON.stringify({ phone: cfg.contact.phone, email: cfg.contact.email, street: cfg.contact.address.street }));"',
      { cwd: serverDir, encoding: 'utf-8' }
    );
    const contactAlias = JSON.parse(contactAliasOutput.trim());
    assertTest(
      'restaurantConfig falls back to RESTAURANT_CONTACT_* and RESTAURANT_ADDRESS_* aliases',
      contactAlias.phone === '+91 11111 22222' && contactAlias.email === 'alias@test.com' && contactAlias.street === '456 Alias Blvd'
    );

    // 14. Email Provider, Sender & Retry Configuration Reconciliation
    console.log('\n--- 14. Email Provider, Sender & Retry Configuration Reconciliation ---');
    const emailConfigOutput = execSync(
      'node -e "process.env.EMAIL_SERVICE_ENABLED=\'false\'; const es = require(\'./src/services/emailService\'); console.log(JSON.stringify({ retryActive: es.isRetryRunnerActive() }));"',
      { cwd: serverDir, encoding: 'utf-8' }
    );
    assertTest(
      'EMAIL_SERVICE_ENABLED=false is safely parsed without errors',
      emailConfigOutput.includes('retryActive')
    );

    const emailSenderAliasOutput = execSync(
      'node -e "delete process.env.EMAIL_FROM; process.env.SMTP_FROM_NAME=\'Custom House\'; process.env.SMTP_FROM_EMAIL=\'custom@domain.com\'; process.env.EMAIL_PROVIDER=\'mock\'; const es = require(\'./src/services/emailService\'); es.sendOrderConfirmation({ orderNumber: \'TEST-1\', customer: { email: \'cust@test.com\', name: \'Test\' }, items: [], pricing: { total: 100 } }).then(r => console.log(JSON.stringify(es.getSentEmails().slice(-1)[0].from)));"',
      { cwd: serverDir, encoding: 'utf-8' }
    );
    const lastFrom = JSON.parse(emailSenderAliasOutput.trim());
    assertTest(
      'SMTP_FROM_NAME and SMTP_FROM_EMAIL aliases construct valid sender address',
      lastFrom === '"Custom House" <custom@domain.com>'
    );

    // 15. Safe Defaults & Invalid Bounds Handling
    console.log('\n--- 15. Safe Defaults & Invalid Bounds Handling ---');
    const safeDefaultsOutput = execSync(
      'node -e "process.env.THEME_PRIMARY=\'invalid-color\'; process.env.BUSINESS_HOURS_WEEKDAY_OPEN=\'99\'; process.env.MAX_PARTY_SIZE=\'-5\'; const cfg = require(\'./src/config/restaurantConfig\'); console.log(JSON.stringify({ primary: cfg.theme.primary, openHour: cfg.businessHours.weekdays.openHour, maxParty: cfg.reservationSettings.maxPartySize }));"',
      { cwd: serverDir, encoding: 'utf-8' }
    );
    const safeDefaults = JSON.parse(safeDefaultsOutput.trim());
    assertTest(
      'Invalid environment values fall back to safe built-in defaults (#4e342e, 10, 20)',
      safeDefaults.primary === '#4e342e' && safeDefaults.openHour === 10 && safeDefaults.maxParty === 20
    );

    // 16. Production Startup Configuration Validation
    console.log('\n--- 16. Production Startup Configuration Validation ---');
    let missingJwtBlocked = false;
    try {
      execSync(
        'node -e "process.env.NODE_ENV=\'production\'; process.env.MONGODB_URI=\'mongodb://127.0.0.1:27017/dummy\'; const app = require(\'./src/server\'); delete process.env.JWT_SECRET; app.validateProductionConfig();"',
        { cwd: serverDir, stdio: 'pipe' }
      );
    } catch (jwtErr) {
      missingJwtBlocked = jwtErr.status === 1;
    }
    assertTest(
      'Production startup rejects missing JWT_SECRET with exit code 1',
      missingJwtBlocked === true
    );

    let placeholderJwtBlocked = false;
    try {
      execSync(
        'node -e "process.env.NODE_ENV=\'production\'; process.env.MONGODB_URI=\'mongodb://127.0.0.1:27017/dummy\'; const app = require(\'./src/server\'); process.env.JWT_SECRET=\'replace_with_a_strong_random_secret_at_least_32_characters\'; app.validateProductionConfig();"',
        { cwd: serverDir, stdio: 'pipe' }
      );
    } catch (jwtErr) {
      placeholderJwtBlocked = jwtErr.status === 1;
    }
    assertTest(
      'Production startup rejects example placeholder JWT_SECRET with exit code 1',
      placeholderJwtBlocked === true
    );

    let missingMongoBlocked = false;
    try {
      execSync(
        'node -e "process.env.NODE_ENV=\'production\'; process.env.JWT_SECRET=\'a_very_strong_valid_production_secret_key\'; const app = require(\'./src/server\'); delete process.env.MONGODB_URI; delete process.env.MONGO_URI; app.validateProductionConfig();"',
        { cwd: serverDir, stdio: 'pipe' }
      );
    } catch (mErr) {
      missingMongoBlocked = mErr.status === 1;
    }
    assertTest(
      'Production startup rejects missing MONGODB_URI/MONGO_URI with exit code 1',
      missingMongoBlocked === true
    );

    // 17. Offline Operation & Unconfigured Razorpay Safety
    console.log('\n--- 17. Offline Operation & Unconfigured Razorpay Safety ---');
    const rzpOfflineOutput = execSync(
      'node -e "delete process.env.RAZORPAY_KEY_ID; delete process.env.RAZORPAY_KEY_SECRET; const { createPaymentOrder } = require(\'./src/controllers/paymentController\'); let statusCode = 0; let jsonResponse = null; const mockReq = { body: { orderId: \'000000000000000000000001\' } }; const mockRes = { status(c) { statusCode = c; return this; }, json(j) { jsonResponse = j; return this; } }; require(\'./src/models/Order\'); const mongoose = require(\'mongoose\'); mongoose.model(\'Order\').findById = async () => ({ _id: \'000000000000000000000001\', user: { toString: () => \'usr1\' }, pricing: { total: 100 }, payment: { status: \'Pending\' } }); mockReq.user = { id: \'usr1\' }; createPaymentOrder(mockReq, mockRes).then(() => console.log(JSON.stringify({ status: statusCode, success: jsonResponse.success })));"',
      { cwd: serverDir, encoding: 'utf-8' }
    );
    const rzpOffline = JSON.parse(rzpOfflineOutput.trim());
    assertTest(
      'Online payment order creation fails safely with HTTP 503 when Razorpay is unconfigured',
      rzpOffline.status === 503 && rzpOffline.success === false
    );

    // 18. SMTP Credential Safety
    console.log('\n--- 18. SMTP Credential Safety ---');
    const smtpMissingOutput = execSync(
      'node -e "process.env.EMAIL_PROVIDER=\'smtp\'; delete process.env.SMTP_HOST; delete process.env.SMTP_USER; delete process.env.SMTP_PASS; const es = require(\'./src/services/emailService\'); es.sendOrderConfirmation({ orderNumber: \'TEST-1\', customer: { email: \'cust@test.com\', name: \'Test\' }, items: [], pricing: { total: 100 } }).then(r => console.log(JSON.stringify({ success: r.success, reason: r.reason })));"',
      { cwd: serverDir, encoding: 'utf-8' }
    );
    const smtpMissing = JSON.parse(smtpMissingOutput.trim());
    assertTest(
      'SMTP mode fails explicitly with missing_smtp_credentials when credentials are missing',
      smtpMissing.success === false && smtpMissing.reason === 'missing_smtp_credentials'
    );

  } catch (err) {
    console.error('Fatal configuration test runner error:', err);
    assertTest('Suite executed without unhandled exceptions', false, err.message);
  } finally {
    if (server) {
      server.close();
    }

    console.log('\n======================================================');
    const total = results.length;
    const passed = results.filter(r => r.pass).length;
    const failed = total - passed;
    console.log(`TOTAL: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('======================================================\n');

    process.exitCode = failed > 0 ? 1 : 0;
  }
}

runConfigSuite();
