/**
 * testMenuApi.js
 * Task 5D — Menu Management API Test Suite
 *
 * Tests the full lifecycle of menu management:
 * - Authentication and authorization by role
 * - Admin create / update / availability toggle / delete
 * - Owner create / update / availability toggle / no delete
 * - Customer and unauthenticated blocks
 * - MongoDB persistence verification
 * - Public menu regression
 *
 * Usage: node server/src/utils/testMenuApi.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const API_URL = 'http://localhost:5000/api';
const Category = require('../models/Category');
const MenuItem  = require('../models/MenuItem');
const User      = require('../models/User');

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

  // ─── Seed test data ─────────────────────────────────────────────────────────
  console.log('--- Seeding test accounts and category ---');

  const ADMIN_EMAIL  = `test-admin-menu-${Date.now()}@test.com`;
  const OWNER_EMAIL  = `test-owner-menu-${Date.now()}@test.com`;
  const CUST_EMAIL   = `test-cust-menu-${Date.now()}@test.com`;
  const PASS         = 'testpass99';

  const admin    = await User.create({ name: 'MenuAdmin',  email: ADMIN_EMAIL, password: PASS, role: 'admin'  });
  const owner    = await User.create({ name: 'MenuOwner',  email: OWNER_EMAIL, password: PASS, role: 'owner'  });
  const customer = await User.create({ name: 'MenuCust',   email: CUST_EMAIL,  password: PASS, role: 'customer' });

  // Use an existing category or create a temp one
  let testCategory = await Category.findOne({ isActive: true });
  let createdCategory = false;
  if (!testCategory) {
    testCategory = await Category.create({ name: 'TestCat', slug: `testcat-${Date.now()}`, isActive: true });
    createdCategory = true;
  }

  console.log('Seeded.\n');

  // ─── Login ───────────────────────────────────────────────────────────────────
  console.log('--- Logging in ---');
  const adminToken  = await loginUser(ADMIN_EMAIL, PASS);
  const ownerToken  = await loginUser(OWNER_EMAIL, PASS);
  const custToken   = await loginUser(CUST_EMAIL, PASS);
  report('Login all three roles', !!(adminToken && ownerToken && custToken));

  const AUTH  = (t) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${t}` });
  const NOAUTH = { 'Content-Type': 'application/json' };

  // Unique slug for each test run
  const baseSlug = `test-item-${Date.now()}`;
  const createdByOwnerSlug  = `${baseSlug}-owner`;
  const createdByAdminSlug  = `${baseSlug}-admin`;
  let ownerCreatedId  = null;
  let adminCreatedId  = null;

  // ─── 1. Unauthenticated block on create ─────────────────────────────────────
  console.log('\n--- 1. Unauthenticated modification ---');
  const r1 = await fetch(`${API_URL}/menu`, {
    method: 'POST', headers: NOAUTH,
    body: JSON.stringify({ name: 'Bad', slug: 'bad', price: 100, image: 'x', description: 'y', category: testCategory._id.toString() })
  });
  report('1. Unauthenticated create -> 401', r1.status === 401, `Status: ${r1.status}`);

  // ─── 2. Customer blocked ─────────────────────────────────────────────────────
  console.log('\n--- 2. Customer role blocked ---');
  const r2a = await fetch(`${API_URL}/menu`, {
    method: 'POST', headers: AUTH(custToken),
    body: JSON.stringify({ name: 'CustItem', slug: 'cust-item', price: 100, image: 'x', description: 'y', category: testCategory._id.toString() })
  });
  report('2. Customer create -> 403', r2a.status === 403, `Status: ${r2a.status}`);

  const fakeId = new mongoose.Types.ObjectId().toString();
  const r2b = await fetch(`${API_URL}/menu/${fakeId}`, {
    method: 'PUT', headers: AUTH(custToken),
    body: JSON.stringify({ name: 'Bad' })
  });
  report('3. Customer update -> 403', r2b.status === 403, `Status: ${r2b.status}`);

  const r2c = await fetch(`${API_URL}/menu/${fakeId}/availability`, {
    method: 'PATCH', headers: AUTH(custToken),
    body: JSON.stringify({ isAvailable: false })
  });
  report('4. Customer availability toggle -> 403', r2c.status === 403, `Status: ${r2c.status}`);

  const r2d = await fetch(`${API_URL}/menu/${fakeId}`, { method: 'DELETE', headers: AUTH(custToken) });
  report('5. Customer delete -> 403', r2d.status === 403, `Status: ${r2d.status}`);

  // ─── 3. Owner create ─────────────────────────────────────────────────────────
  console.log('\n--- 3. Owner create ---');
  const ownerCreateBody = {
    name: 'Owner Test Pizza', slug: createdByOwnerSlug,
    description: 'Test description', price: 299,
    image: '/src/assets/images/margherita.jpg',
    category: testCategory._id.toString(),
    isAvailable: true, isPopular: false,
    ingredients: ['dough', 'cheese'], tags: ['veg']
  };
  const r3 = await fetch(`${API_URL}/menu`, {
    method: 'POST', headers: AUTH(ownerToken),
    body: JSON.stringify(ownerCreateBody)
  });
  const d3 = await r3.json();
  ownerCreatedId = d3.item?.id || d3.item?._id;
  report('6. Owner create -> 201', r3.status === 201 && !!ownerCreatedId, `Status: ${r3.status}, ID: ${ownerCreatedId}`);

  // ─── 4. Owner update ─────────────────────────────────────────────────────────
  console.log('\n--- 4. Owner update ---');
  const r4 = await fetch(`${API_URL}/menu/${ownerCreatedId}`, {
    method: 'PUT', headers: AUTH(ownerToken),
    body: JSON.stringify({ name: 'Owner Updated Pizza', price: 349, slug: createdByOwnerSlug, description: 'Updated desc', image: '/src/assets/images/margherita.jpg', category: testCategory._id.toString() })
  });
  const d4 = await r4.json();
  report('7. Owner update -> 200', r4.status === 200 && d4.item?.price === 349, `Price: ${d4.item?.price}`);

  // ─── 5. Owner availability toggle ────────────────────────────────────────────
  console.log('\n--- 5. Owner availability toggle ---');
  const r5 = await fetch(`${API_URL}/menu/${ownerCreatedId}/availability`, {
    method: 'PATCH', headers: AUTH(ownerToken),
    body: JSON.stringify({ isAvailable: false })
  });
  const d5 = await r5.json();
  report('8. Owner toggle unavailable -> 200', r5.status === 200 && d5.item?.isAvailable === false, `isAvailable: ${d5.item?.isAvailable}`);

  // ─── 6. Owner cannot delete ──────────────────────────────────────────────────
  console.log('\n--- 6. Owner delete blocked ---');
  const r6 = await fetch(`${API_URL}/menu/${ownerCreatedId}`, { method: 'DELETE', headers: AUTH(ownerToken) });
  report('9. Owner delete -> 403', r6.status === 403, `Status: ${r6.status}`);

  // ─── 7. Admin create ─────────────────────────────────────────────────────────
  console.log('\n--- 7. Admin create ---');
  const adminCreateBody = {
    name: 'Admin Test Burger', slug: createdByAdminSlug,
    description: 'Admin test burger', price: 199,
    image: '/src/assets/images/veg-classic-burger.jpg',
    category: testCategory._id.toString(),
    isAvailable: false, isPopular: true,
    ingredients: ['bun', 'patty'], tags: ['new']
  };
  const r7 = await fetch(`${API_URL}/menu`, {
    method: 'POST', headers: AUTH(adminToken),
    body: JSON.stringify(adminCreateBody)
  });
  const d7 = await r7.json();
  adminCreatedId = d7.item?.id || d7.item?._id;
  report('10. Admin create -> 201', r7.status === 201 && !!adminCreatedId, `Status: ${r7.status}, ID: ${adminCreatedId}`);

  // ─── 8. Admin update ─────────────────────────────────────────────────────────
  console.log('\n--- 8. Admin update ---');
  const r8 = await fetch(`${API_URL}/menu/${adminCreatedId}`, {
    method: 'PUT', headers: AUTH(adminToken),
    body: JSON.stringify({ name: 'Admin Updated Burger', price: 249, slug: createdByAdminSlug, description: 'Updated', image: '/src/assets/images/veg-classic-burger.jpg', category: testCategory._id.toString() })
  });
  const d8 = await r8.json();
  report('11. Admin update -> 200', r8.status === 200 && d8.item?.price === 249, `Price: ${d8.item?.price}`);

  // ─── 9. Admin availability toggle ────────────────────────────────────────────
  console.log('\n--- 9. Admin availability toggle ---');
  const r9 = await fetch(`${API_URL}/menu/${adminCreatedId}/availability`, {
    method: 'PATCH', headers: AUTH(adminToken),
    body: JSON.stringify({ isAvailable: true })
  });
  const d9 = await r9.json();
  report('12. Admin toggle available -> 200', r9.status === 200 && d9.item?.isAvailable === true, `isAvailable: ${d9.item?.isAvailable}`);

  // ─── 10. Admin endpoint returns all items (including unavailable) ─────────────
  console.log('\n--- 10. Admin /menu/admin endpoint ---');
  const r10 = await fetch(`${API_URL}/menu/admin`, { method: 'GET', headers: AUTH(adminToken) });
  const d10 = await r10.json();
  const hasOwnerItem  = d10.items?.some(i => i.name === 'Owner Updated Pizza');
  const hasAdminItem  = d10.items?.some(i => i.name === 'Admin Updated Burger');
  report('13. Admin GET /menu/admin -> 200 with items', r10.status === 200 && d10.success, `Total: ${d10.total}`);
  report('14. Admin endpoint includes unavailable items', hasOwnerItem && hasAdminItem, `OwnerItem: ${hasOwnerItem}, AdminItem: ${hasAdminItem}`);

  // Unauthenticated blocked from admin endpoint
  const r10b = await fetch(`${API_URL}/menu/admin`);
  report('15. Unauthenticated GET /menu/admin -> 401', r10b.status === 401, `Status: ${r10b.status}`);

  // ─── 11. Invalid ObjectId ─────────────────────────────────────────────────────
  console.log('\n--- 11. Validation ---');
  const r11 = await fetch(`${API_URL}/menu/not-a-valid-id`, {
    method: 'PUT', headers: AUTH(adminToken),
    body: JSON.stringify({ name: 'x' })
  });
  report('16. Invalid ObjectId PUT -> 400', r11.status === 400, `Status: ${r11.status}`);

  const r11b = await fetch(`${API_URL}/menu/${new mongoose.Types.ObjectId()}/availability`, {
    method: 'PATCH', headers: AUTH(adminToken),
    body: JSON.stringify({ isAvailable: true })
  });
  report('17. Nonexistent item -> 404', r11b.status === 404, `Status: ${r11b.status}`);

  // ─── 12. MongoDB persistence verification ─────────────────────────────────────
  console.log('\n--- 12. MongoDB persistence ---');
  const dbOwnerItem = await MenuItem.findOne({ slug: createdByOwnerSlug });
  const dbAdminItem = await MenuItem.findOne({ slug: createdByAdminSlug });
  report('18. Owner item persisted in MongoDB', !!dbOwnerItem && dbOwnerItem.price === 349, `Name: ${dbOwnerItem?.name}`);
  report('19. Admin item persisted in MongoDB', !!dbAdminItem && dbAdminItem.price === 249, `Name: ${dbAdminItem?.name}`);

  // ─── 13. Public menu regression ──────────────────────────────────────────────
  console.log('\n--- 13. Public menu regression ---');
  const r13 = await fetch(`${API_URL}/menu`);
  const d13 = await r13.json();
  // Owner item (isAvailable: false) should NOT appear in public menu
  const ownerItemInPublic = d13.items?.some(i => i.name === 'Owner Updated Pizza');
  report('20. Public GET /menu excludes unavailable items', r13.status === 200 && !ownerItemInPublic,
    `OwnerItemVisible: ${ownerItemInPublic}, Total: ${d13.total}`);

  // ─── 14. Admin delete ─────────────────────────────────────────────────────────
  console.log('\n--- 14. Admin delete ---');
  const r14 = await fetch(`${API_URL}/menu/${adminCreatedId}`, { method: 'DELETE', headers: AUTH(adminToken) });
  const d14 = await r14.json();
  report('21. Admin delete -> 200', r14.status === 200 && d14.success, `Status: ${r14.status}`);

  // Verify deleted from MongoDB
  const deletedItem = await MenuItem.findById(adminCreatedId);
  report('22. Deleted item absent from MongoDB', !deletedItem, `Found: ${!!deletedItem}`);

  // ─── Cleanup ─────────────────────────────────────────────────────────────────
  console.log('\n--- Cleanup ---');
  if (ownerCreatedId) await MenuItem.findByIdAndDelete(ownerCreatedId);
  if (createdCategory) await Category.findByIdAndDelete(testCategory._id);
  await User.deleteMany({ email: { $in: [ADMIN_EMAIL, OWNER_EMAIL, CUST_EMAIL] } });
  console.log('Cleanup done.');

  await mongoose.disconnect();

  // ─── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n--- Test Summary ---');
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  if (failed === 0) console.log('All tests passed!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
