const mongoose = require('mongoose');
const dotenv = require('dotenv');

const path = require('path');
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const User = require('../models/User');
const Category = require('../models/Category');

const API_URL = 'http://localhost:5000/api';
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crave-house';

async function runApiTests() {
  console.log('Connecting to database to retrieve test menu items...');
  try {
    await mongoose.connect(mongoURI);
    console.log('Database connected.');
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }

  // Get an available MenuItem from the database to test with
  const testMenuItem = await MenuItem.findOne({ isAvailable: true });
  if (!testMenuItem) {
    console.error('No available menu items found in the database. Please seed the database first.');
    mongoose.connection.close();
    process.exit(1);
  }
  console.log(`Found MenuItem: "${testMenuItem.name}" (ID: ${testMenuItem._id}, Price: ₹${testMenuItem.price})`);

  let tokenA = '';
  let tokenB = '';
  let customerAId = '';
  let customerBId = '';
  let orderIdA = '';

  const emailA = `cust-a-${Date.now()}@example.com`;
  const emailB = `cust-b-${Date.now()}@example.com`;
  const password = 'password123';

  // Helper for tracking checks
  const results = [];
  function report(name, success, detail = '') {
    results.push({ name, success, detail });
    console.log(`[${success ? 'PASS' : 'FAIL'}] ${name} ${detail ? `(${detail})` : ''}`);
  }

  try {
    // 1. Register Customer A
    const regResA = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Customer A',
        email: emailA,
        password: password,
        phone: '9999999991'
      })
    });
    const regDataA = await regResA.json();
    customerAId = regDataA.user?.id;

    // Login Customer A
    const loginResA = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailA, password })
    });
    const loginDataA = await loginResA.json();
    tokenA = loginDataA.token;
    report('Register and Login Customer A', regResA.status === 201 && loginResA.status === 200 && !!tokenA, `Status: ${regResA.status}, ${loginResA.status}`);

    // 2. Register Customer B
    const regResB = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Customer B',
        email: emailB,
        password: password,
        phone: '9999999992'
      })
    });
    const regDataB = await regResB.json();
    customerBId = regDataB.user?.id;

    // Login Customer B
    const loginResB = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailB, password })
    });
    const loginDataB = await loginResB.json();
    tokenB = loginDataB.token;
    report('Register and Login Customer B', regResB.status === 201 && loginResB.status === 200 && !!tokenB, `Status: ${regResB.status}, ${loginResB.status}`);

    // 3. Unauthenticated Order Rejection
    const unauthRes = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderType: 'pickup',
        customer: { name: 'Customer A', email: emailA, phone: '9999999991' },
        items: [{ menuItem: testMenuItem._id, quantity: 1 }]
      })
    });
    report('Unauthenticated request rejection', unauthRes.status === 401, `Status: ${unauthRes.status}`);

    // 4. Create Valid Order (Customer A)
    const validRes = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        orderType: 'delivery',
        customer: { name: 'Customer A', email: emailA, phone: '9999999991' },
        address: {
          address: '456 Delivery Lane',
          city: 'New Delhi',
          pincode: '110001'
        },
        items: [{ menuItem: testMenuItem._id.toString(), quantity: 2 }]
      })
    });
    const validData = await validRes.json();
    if (validData.success && validData.order) {
      orderIdA = validData.order.id;
    }
    report('Create valid order (HTTP 201)', validRes.status === 201 && validData.success, `OrderNumber: ${validData.order?.orderNumber}`);

    // 5. Price Manipulation Test (Security check)
    const priceManipRes = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        orderType: 'pickup',
        customer: { name: 'Customer A', email: emailA, phone: '9999999991' },
        items: [{ menuItem: testMenuItem._id.toString(), quantity: 3, price: 1, subtotal: 3 }],
        pricing: { subtotal: 3, total: 3 }
      })
    });
    const priceManipData = await priceManipRes.json();
    const isPriceSecure = priceManipRes.status === 201 &&
                          priceManipData.order?.items[0].price === testMenuItem.price &&
                          priceManipData.order?.pricing.subtotal === testMenuItem.price * 3;
    report('Price manipulation prevention', isPriceSecure, `Submitted: ₹1 | Saved: ₹${priceManipData.order?.items[0].price} | Total: ₹${priceManipData.order?.pricing.total}`);

    // 6. Negative/Invalid Quantity Rejection
    const negQtyRes = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        orderType: 'pickup',
        customer: { name: 'Customer A', email: emailA, phone: '9999999991' },
        items: [{ menuItem: testMenuItem._id.toString(), quantity: -1 }]
      })
    });
    report('Negative quantity rejection', negQtyRes.status === 400, `Status: ${negQtyRes.status}`);

    // 7. Nonexistent Product ID Rejection
    const fakeObjectId = new mongoose.Types.ObjectId();
    const fakeProductRes = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        orderType: 'pickup',
        customer: { name: 'Customer A', email: emailA, phone: '9999999991' },
        items: [{ menuItem: fakeObjectId.toString(), quantity: 1 }]
      })
    });
    report('Nonexistent product rejection (HTTP 404)', fakeProductRes.status === 404, `Status: ${fakeProductRes.status}`);

    // 8. Unavailable Product Rejection
    await MenuItem.findByIdAndUpdate(testMenuItem._id, { isAvailable: false });
    const unavailableRes = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        orderType: 'pickup',
        customer: { name: 'Customer A', email: emailA, phone: '9999999991' },
        items: [{ menuItem: testMenuItem._id.toString(), quantity: 1 }]
      })
    });
    // Restore availability immediately
    await MenuItem.findByIdAndUpdate(testMenuItem._id, { isAvailable: true });
    report('Unavailable product rejection (HTTP 400)', unavailableRes.status === 400, `Status: ${unavailableRes.status}`);

    // 9. Delivery Order without Address details Rejection
    const missingAddressRes = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        orderType: 'delivery',
        customer: { name: 'Customer A', email: emailA, phone: '9999999991' },
        items: [{ menuItem: testMenuItem._id.toString(), quantity: 1 }]
        // missing address fields
      })
    });
    report('Missing delivery address rejection', missingAddressRes.status === 400, `Status: ${missingAddressRes.status}`);

    // 10. GET customer orders list (Customer A)
    const listResA = await fetch(`${API_URL}/orders`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const listDataA = await listResA.json();
    const hasOrder = listDataA.orders?.some(o => o.id === orderIdA);
    report('List Customer A orders', listResA.status === 200 && hasOrder, `Orders count: ${listDataA.count}`);

    // 11. GET customer orders list (Customer B - Ownership Check)
    const listResB = await fetch(`${API_URL}/orders`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const listDataB = await listResB.json();
    const seesOrderA = listDataB.orders?.some(o => o.id === orderIdA);
    report('Customer B list does not leak Customer A order', listResB.status === 200 && !seesOrderA, `Orders count: ${listDataB.count}`);

    // 12. GET single order detail (Authorized Customer A)
    const getResA = await fetch(`${API_URL}/orders/${orderIdA}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const getDataA = await getResA.json();
    report('Customer A retrieve own order detail', getResA.status === 200 && getDataA.order?.id === orderIdA, `Status: ${getResA.status}`);

    // 13. GET single order detail (Unauthorized Customer B - Ownership Check)
    const getResB = await fetch(`${API_URL}/orders/${orderIdA}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    report('Customer B retrieve Customer A order blocked (HTTP 404)', getResB.status === 404, `Status: ${getResB.status}`);

  } catch (error) {
    console.error('Fatal API test error:', error);
  } finally {
    console.log('\n--- Cleaning up API test data ---');
    try {
      if (customerAId) {
        await User.deleteOne({ _id: customerAId });
        console.log('Deleted Customer A.');
      }
      if (customerBId) {
        await User.deleteOne({ _id: customerBId });
        console.log('Deleted Customer B.');
      }
      // Delete orders belonging to test users
      const userIds = [customerAId, customerBId].filter(Boolean);
      if (userIds.length > 0) {
        const delResult = await Order.deleteMany({ user: { $in: userIds } });
        console.log(`Deleted ${delResult.deletedCount} orders created during API test.`);
      }
    } catch (cleanupErr) {
      console.error('Clean up failed:', cleanupErr.message);
    }

    mongoose.connection.close();
    console.log('Database connection closed.');

    console.log('\n--- API Test Execution Summary ---');
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runApiTests();
