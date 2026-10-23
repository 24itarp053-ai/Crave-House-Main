/**
 * securityAndIntegrity.test.js
 * Automated security and data-isolation test suite for Crave House backend.
 *
 * Verifies:
 * 1. Inactive user rejection on login & on protected routes
 * 2. Role authorization (customers denied access to admin/owner routes)
 * 3. Privilege escalation protection (admins cannot assign owner role or deactivate owners)
 * 4. Cross-user order isolation (Customer A cannot access Customer B's order)
 * 5. Price tampering protection (client-side price ignored, calculated from MongoDB item)
 */

const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = require('../server');
const User = require('../models/User');
const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');
const Order = require('../models/Order');

const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crave_house';

let server;
let baseUrl;
const testRunId = Date.now();
const createdUserIds = [];
const createdOrderIds = [];

const results = [];

function assertTest(title, condition, detail = '') {
  results.push({ title, pass: Boolean(condition), detail });
  const status = condition ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  console.log(`  [${status}] ${title} ${detail ? `(${detail})` : ''}`);
}

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
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

async function runSuite() {
  console.log('\n======================================================');
  console.log('   CRAVE HOUSE: SECURITY & DATA INTEGRITY TEST SUITE  ');
  console.log('======================================================\n');

  try {
    // 1. Connect DB if not already connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(mongoURI);
    }
    console.log('Connected to MongoDB.\n');

    // 2. Start server on ephemeral port (0)
    server = app.listen(0);
    await new Promise(resolve => server.on('listening', resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
    console.log(`Ephemeral test server listening on ${baseUrl}\n`);

    // Ensure a test Category and MenuItem exist
    let testCategory = await Category.findOne({ isActive: true });
    if (!testCategory) {
      testCategory = await Category.create({
        name: `Security Test Category ${testRunId}`,
        slug: `sec-cat-${testRunId}`,
        description: 'Category for security tests',
        isActive: true
      });
    }

    let testMenuItem = await MenuItem.findOne({ isAvailable: true });
    if (!testMenuItem) {
      testMenuItem = await MenuItem.create({
        name: `Secured Pizza ${testRunId}`,
        slug: `sec-pizza-${testRunId}`,
        price: 349,
        image: 'test.jpg',
        description: 'Pizza for testing',
        category: testCategory._id,
        isAvailable: true
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // SUITE 1: Inactive User Rejection
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 1. Inactive User Rejection ---');
    const inactiveEmail = `inactive-${testRunId}@example.com`;
    const userPassword = 'TestPassword123';

    // Register user
    const regRes = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Inactive Tester',
        email: inactiveEmail,
        password: userPassword,
        phone: '9876543210'
      })
    });
    createdUserIds.push(regRes.data.user.id);

    // Initial Login to get active token
    const loginActiveRes = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: inactiveEmail, password: userPassword })
    });
    const savedToken = loginActiveRes.data.token;

    // Verify token works when active
    const profileActiveRes = await request('/api/auth/profile', {
      headers: { Authorization: `Bearer ${savedToken}` }
    });
    assertTest('Active user can access protected route', profileActiveRes.status === 200);

    // Deactivate user in database
    await User.findByIdAndUpdate(regRes.data.user.id, { status: 'Inactive' });

    // Test 1.1: Login must be rejected with 403
    const loginInactiveRes = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: inactiveEmail, password: userPassword })
    });
    assertTest(
      'Login rejected for inactive user with HTTP 403',
      loginInactiveRes.status === 403 && loginInactiveRes.data?.success === false,
      `Received status: ${loginInactiveRes.status}`
    );

    // Test 1.2: Existing JWT token rejected on protected route with 403
    const profileInactiveRes = await request('/api/auth/profile', {
      headers: { Authorization: `Bearer ${savedToken}` }
    });
    assertTest(
      'Existing JWT rejected on protected route for inactive user with HTTP 403',
      profileInactiveRes.status === 403 && profileInactiveRes.data?.success === false,
      `Received status: ${profileInactiveRes.status}`
    );

    // ──────────────────────────────────────────────────────────────────────────
    // SUITE 2: Role Authorization
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 2. Role Authorization (Customer vs Staff Routes) ---');
    const custEmail = `cust-${testRunId}@example.com`;
    const custReg = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Customer Tester',
        email: custEmail,
        password: userPassword,
        phone: '9876543211'
      })
    });
    createdUserIds.push(custReg.data.user.id);

    const custLogin = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: custEmail, password: userPassword })
    });
    const custToken = custLogin.data.token;

    // Test 2.1: Customer denied access to admin order list
    const adminOrdersRes = await request('/api/orders/admin', {
      headers: { Authorization: `Bearer ${custToken}` }
    });
    assertTest(
      'Customer denied access to /api/orders/admin with HTTP 403',
      adminOrdersRes.status === 403,
      `Received: ${adminOrdersRes.status}`
    );

    // Test 2.2: Customer denied access to user management
    const usersListRes = await request('/api/users', {
      headers: { Authorization: `Bearer ${custToken}` }
    });
    assertTest(
      'Customer denied access to /api/users with HTTP 403',
      usersListRes.status === 403,
      `Received: ${usersListRes.status}`
    );

    // Test 2.3: Customer denied access to owner orders
    const ownerOrdersRes = await request('/api/orders/owner', {
      headers: { Authorization: `Bearer ${custToken}` }
    });
    assertTest(
      'Customer denied access to /api/orders/owner with HTTP 403',
      ownerOrdersRes.status === 403,
      `Received: ${ownerOrdersRes.status}`
    );

    // ──────────────────────────────────────────────────────────────────────────
    // SUITE 3: Privilege Escalation Prevention
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 3. Privilege Escalation & Hierarchy Protection ---');
    // Create an Admin user
    const adminUser = await User.create({
      name: `Admin Tester ${testRunId}`,
      email: `admin-${testRunId}@example.com`,
      password: userPassword,
      role: 'admin',
      status: 'Active'
    });
    createdUserIds.push(adminUser._id);

    const adminLogin = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: `admin-${testRunId}@example.com`, password: userPassword })
    });
    const adminToken = adminLogin.data.token;

    // Create an Owner user
    const ownerUser = await User.create({
      name: `Owner Tester ${testRunId}`,
      email: `owner-${testRunId}@example.com`,
      password: userPassword,
      role: 'owner',
      status: 'Active'
    });
    createdUserIds.push(ownerUser._id);

    // Test 3.1: Admin cannot promote a customer to 'owner'
    const promoteAttempt = await request(`/api/users/${custReg.data.user.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ role: 'owner' })
    });
    assertTest(
      'Admin cannot promote user to Owner role (HTTP 403)',
      promoteAttempt.status === 403,
      `Received: ${promoteAttempt.status}`
    );

    // Test 3.2: Admin cannot deactivate an Owner account
    const deactivateOwnerAttempt = await request(`/api/users/${ownerUser._id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'Inactive' })
    });
    assertTest(
      'Admin cannot deactivate an Owner account (HTTP 403)',
      deactivateOwnerAttempt.status === 403,
      `Received: ${deactivateOwnerAttempt.status}`
    );

    // Test 3.3: Admin cannot deactivate themselves
    const selfDeactivateAttempt = await request(`/api/users/${adminUser._id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'Inactive' })
    });
    assertTest(
      'Admin cannot deactivate their own account (HTTP 400)',
      selfDeactivateAttempt.status === 400,
      `Received: ${selfDeactivateAttempt.status}`
    );

    // ──────────────────────────────────────────────────────────────────────────
    // SUITE 4: Cross-User Order Isolation
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 4. Cross-User Order Isolation ---');
    // Customer A places an order
    const orderPayload = {
      orderType: 'takeaway', // pickup
      customer: {
        name: 'Customer A',
        email: custEmail,
        phone: '9876543211'
      },
      orderType: 'pickup',
      items: [
        { menuItem: testMenuItem._id, quantity: 1 }
      ],
      payment: { method: 'COD' }
    };

    const orderResA = await request('/api/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${custToken}` },
      body: JSON.stringify(orderPayload)
    });
    assertTest('Customer A successfully creates order', orderResA.status === 201 && orderResA.data?.order);
    const orderIdA = orderResA.data?.order?.id || orderResA.data?.order?._id;
    if (orderIdA) createdOrderIds.push(orderIdA);

    // Customer B registers & logs in
    const custBEmail = `cust-b-${testRunId}@example.com`;
    const custBReg = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Customer B',
        email: custBEmail,
        password: userPassword,
        phone: '9876543212'
      })
    });
    createdUserIds.push(custBReg.data.user.id);

    const custBLogin = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: custBEmail, password: userPassword })
    });
    const custBToken = custBLogin.data.token;

    // Customer B attempts to fetch Customer A's order by ID
    const crossOrderRes = await request(`/api/orders/${orderIdA}`, {
      headers: { Authorization: `Bearer ${custBToken}` }
    });
    assertTest(
      'Customer B cannot view Customer A order (HTTP 404 isolation)',
      crossOrderRes.status === 404,
      `Received: ${crossOrderRes.status}`
    );

    // ──────────────────────────────────────────────────────────────────────────
    // SUITE 5: Order Price Tampering Prevention
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 5. Server-Side Price Tampering Prevention ---');
    const tamperedPayload = {
      orderType: 'pickup',
      customer: {
        name: 'Price Tamperer',
        email: custEmail,
        phone: '9876543211'
      },
      // Client maliciously supplies price of 1 Rupee
      items: [
        { menuItem: testMenuItem._id, quantity: 2, price: 1, subtotal: 2 }
      ],
      pricing: { subtotal: 2, total: 2 },
      payment: { method: 'COD' }
    };

    const tamperRes = await request('/api/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${custToken}` },
      body: JSON.stringify(tamperedPayload)
    });

    const expectedTotal = testMenuItem.price * 2;
    const actualTotal = tamperRes.data?.order?.pricing?.total;

    assertTest(
      'Server calculates price from database, ignoring tampered client price',
      tamperRes.status === 201 && actualTotal === expectedTotal && actualTotal !== 2,
      `Calculated total: ₹${actualTotal}, Expected: ₹${expectedTotal}`
    );
    const tamperOrderId = tamperRes.data?.order?.id || tamperRes.data?.order?._id;
    if (tamperOrderId) createdOrderIds.push(tamperOrderId);

  } catch (err) {
    console.error('Fatal test runner error:', err);
  } finally {
    // Cleanup created test records
    console.log('\nCleaning up test artifacts from MongoDB...');
    try {
      if (createdOrderIds.length > 0) {
        await Order.deleteMany({ _id: { $in: createdOrderIds } });
      }
      if (createdUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: createdUserIds } });
      }
      console.log('Cleanup completed.');
    } catch (cleanErr) {
      console.error('Cleanup error:', cleanErr.message);
    }

    if (server) {
      server.close();
    }
    await mongoose.connection.close();

    // Summary
    console.log('\n======================================================');
    const total = results.length;
    const passed = results.filter(r => r.pass).length;
    const failed = total - passed;
    console.log(`TOTAL: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('======================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  }
}

runSuite();
