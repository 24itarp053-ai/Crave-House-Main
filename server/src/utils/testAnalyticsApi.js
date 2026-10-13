/**
 * testAnalyticsApi.js
 * Task 5E — Live Analytics & Statistics API Test Suite
 *
 * Tests the live dashboard analytics endpoints:
 * - Authentication & Authorization checks
 * - Verification of MongoDB aggregation queries
 * - Correct KPI updates after seeding new order data
 * - Handling of cancelled and failed orders
 *
 * Usage: node server/src/utils/testAnalyticsApi.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const API_URL = 'http://localhost:5000/api';
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const User = require('../models/User');
const Reservation = require('../models/Reservation');

let passed = 0;
let failed = 0;

function report(label, ok, detail = '') {
  if (ok) {
    console.log(`[PASS] ${label}${detail ? ' (' + detail + ')' : ''}`);
    passed++;
  } else {
    console.error(`[FAIL] ${label}${detail ? ' (' + detail + ')' : ''}`);
    failed++;
  }
}

async function loginUser(email, password) {
  const r = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const d = await r.json();
  return d.token;
}

async function main() {
  console.log('\nConnecting to database...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.\n');

  // Seed test accounts
  console.log('--- Seeding accounts ---');
  const ADMIN_EMAIL = `test-admin-anal-${Date.now()}@test.com`;
  const OWNER_EMAIL = `test-owner-anal-${Date.now()}@test.com`;
  const CUST_EMAIL  = `test-cust-anal-${Date.now()}@test.com`;
  const PASS        = 'testpass99';

  await User.create({ name: 'AnalAdmin', email: ADMIN_EMAIL, password: PASS, role: 'admin' });
  await User.create({ name: 'AnalOwner', email: OWNER_EMAIL, password: PASS, role: 'owner' });
  await User.create({ name: 'AnalCust',  email: CUST_EMAIL,  password: PASS, role: 'customer' });

  // Get tokens
  console.log('--- Logging in ---');
  const adminToken = await loginUser(ADMIN_EMAIL, PASS);
  const ownerToken = await loginUser(OWNER_EMAIL, PASS);
  const custToken  = await loginUser(CUST_EMAIL, PASS);
  report('Login all roles', !!(adminToken && ownerToken && custToken));

  const AUTH = (t) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${t}` });

  // 1. Authentication
  console.log('\n--- 1. Authentication ---');
  const r1a = await fetch(`${API_URL}/analytics/admin`);
  report('Unauthenticated admin analytics -> 401', r1a.status === 401, `Status: ${r1a.status}`);
  const r1b = await fetch(`${API_URL}/analytics/owner`);
  report('Unauthenticated owner analytics -> 401', r1b.status === 401, `Status: ${r1b.status}`);

  // 2. Authorization
  console.log('\n--- 2. Authorization ---');
  const r2a = await fetch(`${API_URL}/analytics/admin`, { headers: AUTH(custToken) });
  report('Customer -> admin analytics -> 403', r2a.status === 403, `Status: ${r2a.status}`);

  const r2b = await fetch(`${API_URL}/analytics/owner`, { headers: AUTH(custToken) });
  report('Customer -> owner analytics -> 403', r2b.status === 403, `Status: ${r2b.status}`);

  const r2c = await fetch(`${API_URL}/analytics/admin`, { headers: AUTH(ownerToken) });
  report('Owner -> admin analytics -> 403', r2c.status === 403, `Status: ${r2c.status}`);

  const r2d = await fetch(`${API_URL}/analytics/owner`, { headers: AUTH(adminToken) });
  report('Admin -> owner analytics -> 403', r2d.status === 403, `Status: ${r2d.status}`);

  // 3. Successful requests
  console.log('\n--- 3. Successful Queries ---');
  const r3a = await fetch(`${API_URL}/analytics/admin`, { headers: AUTH(adminToken) });
  const d3a = await r3a.json();
  report('Admin -> admin analytics -> 200', r3a.status === 200 && d3a.success, `Status: ${r3a.status}`);

  const r3b = await fetch(`${API_URL}/analytics/owner`, { headers: AUTH(ownerToken) });
  const d3b = await r3b.json();
  report('Owner -> owner analytics -> 200', r3b.status === 200 && d3b.success, `Status: ${r3b.status}`);

  // 4. Seeding validation
  console.log('\n--- 4. Seeding validation ---');
  // Record current admin stats
  const initialOrdersCount = d3a.data.kpis.totalOrders;
  const initialRevenue     = d3a.data.kpis.revenue;

  // Find or create test category and menu item
  let testCat = await Category.findOne({ isActive: true });
  if (!testCat) {
    testCat = await Category.create({ name: 'AnalCat', slug: 'anal-cat', isActive: true });
  }

  let testItem = await MenuItem.findOne({ category: testCat._id });
  if (!testItem) {
    testItem = await MenuItem.create({
      name: 'AnalPizza',
      slug: `anal-pizza-${Date.now()}`,
      price: 500,
      image: '/src/assets/images/margherita.jpg',
      description: 'Anal pizza',
      category: testCat._id,
      isAvailable: true
    });
  }

  // Find a customer user ID for order user field
  const tempCust = await User.findOne({ role: 'customer' });

  // Create a new paid test order of 500 INR
  const testOrder = await Order.create({
    user: tempCust._id,
    orderNumber: `TEST-AN-${Date.now()}`,
    customer: { name: 'Test Anal', email: 'testanal@test.com', phone: '9999999999' },
    orderType: 'pickup',
    items: [{
      menuItem: testItem._id,
      name: testItem.name,
      image: testItem.image,
      price: 500,
      quantity: 1,
      subtotal: 500
    }],
    pricing: { subtotal: 500, tax: 0, deliveryFee: 0, discount: 0, total: 500 },
    payment: { method: 'UPI', status: 'Paid' },
    status: 'Completed'
  });

  // Re-run admin analytics
  const r4a = await fetch(`${API_URL}/analytics/admin`, { headers: AUTH(adminToken) });
  const d4a = await r4a.json();

  const newOrdersCount = d4a.data.kpis.totalOrders;
  const newRevenue     = d4a.data.kpis.revenue;

  report('Analytics total orders updated in MongoDB', newOrdersCount === initialOrdersCount + 1, `Before: ${initialOrdersCount}, After: ${newOrdersCount}`);
  report('Analytics revenue updated in MongoDB', newRevenue === initialRevenue + 500, `Before: ${initialRevenue}, After: ${newRevenue}`);

  // Test cancelled order does not increment realized revenue
  const testOrderCancelled = await Order.create({
    user: tempCust._id,
    orderNumber: `TEST-AN-C-${Date.now()}`,
    customer: { name: 'Test Anal C', email: 'testanal@test.com', phone: '9999999999' },
    orderType: 'pickup',
    items: [{
      menuItem: testItem._id,
      name: testItem.name,
      image: testItem.image,
      price: 500,
      quantity: 1,
      subtotal: 500
    }],
    pricing: { subtotal: 500, tax: 0, deliveryFee: 0, discount: 0, total: 500 },
    payment: { method: 'UPI', status: 'Refunded' },
    status: 'Cancelled'
  });

  // Re-run admin analytics again
  const r4b = await fetch(`${API_URL}/analytics/admin`, { headers: AUTH(adminToken) });
  const d4b = await r4b.json();

  report('Cancelled orders counted in KPIs', d4b.data.kpis.cancelledOrders === d3a.data.kpis.cancelledOrders + 1, `Cancelled count: ${d4b.data.kpis.cancelledOrders}`);
  report('Cancelled order does not affect total revenue', d4b.data.kpis.revenue === newRevenue, `Revenue remains: ${d4b.data.kpis.revenue}`);

  // 5. Reservations Analytics Verification
  console.log('\n--- 5. Reservations Analytics Verification ---');
  const tempCustForRes = await User.findOne({ email: CUST_EMAIL });

  // Record initial reservation counts
  const initialAdminReservations = d4b.data.kpis.reservations;

  // Let's get current owner analytics to get today's reservations
  const r5_owner_init = await fetch(`${API_URL}/analytics/owner`, { headers: AUTH(ownerToken) });
  const d5_owner_init = await r5_owner_init.json();
  const initialOwnerReservations = d5_owner_init.data.kpis.todayReservations;

  // Create controlled test Reservation
  const testRes = await Reservation.create({
    user: tempCustForRes._id,
    reservationId: `TEST-RES-AN-${Date.now()}`,
    customerName: 'Test Res Anal',
    email: CUST_EMAIL,
    phone: '9999999999',
    date: '2026-08-25',
    time: '19:30',
    guests: 4,
    specialRequest: 'Window seat',
    status: 'Pending',
    table: 'T-TBD'
  });

  // Re-run admin analytics
  const r5_admin_after = await fetch(`${API_URL}/analytics/admin`, { headers: AUTH(adminToken) });
  const d5_admin_after = await r5_admin_after.json();
  const newAdminReservations = d5_admin_after.data.kpis.reservations;
  report('Admin analytics reservation count increased dynamically', newAdminReservations === initialAdminReservations + 1, `Before: ${initialAdminReservations}, After: ${newAdminReservations}`);

  // Re-run owner analytics
  const r5_owner_after = await fetch(`${API_URL}/analytics/owner`, { headers: AUTH(ownerToken) });
  const d5_owner_after = await r5_owner_after.json();
  const newOwnerReservations = d5_owner_after.data.kpis.todayReservations;
  report('Owner analytics today\'s reservation count increased dynamically', newOwnerReservations === initialOwnerReservations + 1, `Before: ${initialOwnerReservations}, After: ${newOwnerReservations}`);

  // Clean up seeded orders, reservations & test users
  console.log('\n--- Cleanup ---');
  await Order.deleteOne({ _id: testOrder._id });
  await Order.deleteOne({ _id: testOrderCancelled._id });
  await Reservation.deleteOne({ _id: testRes._id });
  await User.deleteMany({ email: { $in: [ADMIN_EMAIL, OWNER_EMAIL, CUST_EMAIL] } });
  console.log('Cleanup complete.');

  await mongoose.disconnect();

  console.log('\n--- Test Summary ---');
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  if (failed === 0) {
    console.log('All tests passed successfully!');
  } else {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
