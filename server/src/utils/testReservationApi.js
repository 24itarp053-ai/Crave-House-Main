/**
 * testReservationApi.js
 * Task 5F — Live Table Reservation Integration Test Suite
 *
 * Tests the live table reservation endpoints:
 * - Authentication & Authorization checks
 * - Verification of Mongoose MongoDB validations
 * - Customer creation & ownership isolation
 * - Admin/Owner retrieval & status updates
 *
 * Usage: node server/src/utils/testReservationApi.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const API_URL = 'http://localhost:5000/api';
const Reservation = require('../models/Reservation');
const User = require('../models/User');

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
  console.log('--- Seeding test accounts ---');
  const ADMIN_EMAIL = `test-admin-res-${Date.now()}@test.com`;
  const OWNER_EMAIL = `test-owner-res-${Date.now()}@test.com`;
  const CUST_A_EMAIL  = `test-cust-a-res-${Date.now()}@test.com`;
  const CUST_B_EMAIL  = `test-cust-b-res-${Date.now()}@test.com`;
  const PASS        = 'testpass99';

  const adminUser = await User.create({ name: 'ResAdmin', email: ADMIN_EMAIL, password: PASS, role: 'admin' });
  const ownerUser = await User.create({ name: 'ResOwner', email: OWNER_EMAIL, password: PASS, role: 'owner' });
  const custAUser = await User.create({ name: 'ResCustA', email: CUST_A_EMAIL, password: PASS, role: 'customer' });
  const custBUser = await User.create({ name: 'ResCustB', email: CUST_B_EMAIL, password: PASS, role: 'customer' });

  // Get tokens
  console.log('--- Logging in ---');
  const adminToken = await loginUser(ADMIN_EMAIL, PASS);
  const ownerToken = await loginUser(OWNER_EMAIL, PASS);
  const custAToken  = await loginUser(CUST_A_EMAIL, PASS);
  const custBToken  = await loginUser(CUST_B_EMAIL, PASS);
  report('Login all roles', !!(adminToken && ownerToken && custAToken && custBToken));

  const AUTH = (t) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${t}` });

  // 1. Authentication Check
  console.log('\n--- 1. Authentication Check ---');
  const r1 = await fetch(`${API_URL}/reservations`, { method: 'POST' });
  report('1. Unauthenticated POST -> 401', r1.status === 401, `Status: ${r1.status}`);

  const r2 = await fetch(`${API_URL}/reservations`);
  report('2. Unauthenticated GET -> 401', r2.status === 401, `Status: ${r2.status}`);

  const r3 = await fetch(`${API_URL}/reservations/admin`);
  report('3. Unauthenticated admin GET -> 401', r3.status === 401, `Status: ${r3.status}`);

  const r4 = await fetch(`${API_URL}/reservations/someid/status`, { method: 'PATCH' });
  report('4. Unauthenticated status update -> 401', r4.status === 401, `Status: ${r4.status}`);

  // 2. Customer Checks
  const futureTestDate = new Date();
  futureTestDate.setDate(futureTestDate.getDate() + 7);
  const futureDateStr = futureTestDate.toISOString().split('T')[0];

  const resData = {
    customerName: 'Customer A',
    email: CUST_A_EMAIL,
    phone: '9999999999',
    date: futureDateStr,
    time: '19:30',
    guests: 4,
    specialRequest: 'Window seat please'
  };

  const r5 = await fetch(`${API_URL}/reservations`, {
    method: 'POST',
    headers: AUTH(custAToken),
    body: JSON.stringify(resData)
  });
  const d5 = await r5.json();
  report('5. Customer creates reservation -> 201', r5.status === 201 && d5.success, `Status: ${r5.status}`);
  const reservationId = d5.reservation?._id;

  const r6 = await fetch(`${API_URL}/reservations`, { headers: AUTH(custAToken) });
  const d6 = await r6.json();
  report('6. Customer gets own reservations -> 200', r6.status === 200 && d6.success, `Status: ${r6.status}`);

  const customerAHasId = d6.reservations?.some(r => r._id === reservationId);
  report('7. Customer A sees own reservation', customerAHasId);

  const r20 = await fetch(`${API_URL}/reservations`, { headers: AUTH(custBToken) });
  const d20 = await r20.json();
  const customerBHasId = d20.reservations?.some(r => r._id === reservationId);
  report('20. Customer B cannot see Customer A\'s reservation', !customerBHasId);

  const r8 = await fetch(`${API_URL}/reservations/admin`, { headers: AUTH(custAToken) });
  report('8. Customer cannot access admin reservation list -> 403', r8.status === 403, `Status: ${r8.status}`);

  const r9 = await fetch(`${API_URL}/reservations/${reservationId}/status`, {
    method: 'PATCH',
    headers: AUTH(custAToken),
    body: JSON.stringify({ status: 'Confirmed' })
  });
  report('9. Customer cannot update reservation status -> 403', r9.status === 403, `Status: ${r9.status}`);

  // 3. Admin & Owner Checks
  console.log('\n--- 3. Admin & Owner Checks ---');
  const r10 = await fetch(`${API_URL}/reservations/admin`, { headers: AUTH(adminToken) });
  const d10 = await r10.json();
  report('10. Admin gets reservations -> 200', r10.status === 200 && d10.success, `Status: ${r10.status}`);

  const r12 = await fetch(`${API_URL}/reservations/admin`, { headers: AUTH(ownerToken) });
  const d12 = await r12.json();
  report('12. Owner gets reservations -> 200', r12.status === 200 && d12.success, `Status: ${r12.status}`);

  const r11 = await fetch(`${API_URL}/reservations/${reservationId}/status`, {
    method: 'PATCH',
    headers: AUTH(adminToken),
    body: JSON.stringify({ status: 'Confirmed' })
  });
  const d11 = await r11.json();
  report('11. Admin updates status -> 200', r11.status === 200 && d11.success, `Status: ${r11.status}`);

  const r13 = await fetch(`${API_URL}/reservations/${reservationId}/status`, {
    method: 'PATCH',
    headers: AUTH(ownerToken),
    body: JSON.stringify({ status: 'Cancelled' })
  });
  const d13 = await r13.json();
  report('13. Owner updates status -> 200', r13.status === 200 && d13.success, `Status: ${r13.status}`);

  // 4. Validation Checks
  console.log('\n--- 4. Validation Checks ---');
  const r14 = await fetch(`${API_URL}/reservations/invalidid123/status`, {
    method: 'PATCH',
    headers: AUTH(adminToken),
    body: JSON.stringify({ status: 'Confirmed' })
  });
  report('14. Invalid ObjectId format -> 400', r14.status === 400, `Status: ${r14.status}`);

  const r15 = await fetch(`${API_URL}/reservations/${reservationId}/status`, {
    method: 'PATCH',
    headers: AUTH(adminToken),
    body: JSON.stringify({ status: 'InvalidStatus' })
  });
  report('15. Invalid status enum value -> 400', r15.status === 400, `Status: ${r15.status}`);

  const r16 = await fetch(`${API_URL}/reservations`, {
    method: 'POST',
    headers: AUTH(custAToken),
    body: JSON.stringify({
      customerName: 'Missing info',
      email: CUST_A_EMAIL
      // Missing phone, date, time, guests
    })
  });
  report('16. Missing required fields -> 400', r16.status === 400, `Status: ${r16.status}`);

  const randomObjId = new mongoose.Types.ObjectId();
  const r17 = await fetch(`${API_URL}/reservations/${randomObjId}/status`, {
    method: 'PATCH',
    headers: AUTH(adminToken),
    body: JSON.stringify({ status: 'Confirmed' })
  });
  report('17. Nonexistent reservation ID -> 404', r17.status === 404, `Status: ${r17.status}`);

  // 5. MongoDB Persistence & Integrity Checks
  console.log('\n--- 5. MongoDB Persistence & Integrity ---');
  const dbReservation = await Reservation.findById(reservationId);
  report('18. Reservation document actually exists in MongoDB', !!dbReservation);
  report('19. Status change persists in MongoDB', dbReservation?.status === 'Cancelled', `DB status: ${dbReservation?.status}`);

  // Clean up
  console.log('\n--- Cleanup ---');
  await Reservation.deleteOne({ _id: reservationId });
  await User.deleteMany({ email: { $in: [ADMIN_EMAIL, OWNER_EMAIL, CUST_A_EMAIL, CUST_B_EMAIL] } });
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
