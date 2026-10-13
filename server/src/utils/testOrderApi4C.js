const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const User = require('../models/User');

const API_URL = 'http://localhost:5000/api';
const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crave_house';

async function runTests() {
  console.log('Connecting to database...');
  try {
    await mongoose.connect(mongoURI);
    console.log('Database connected successfully.');
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }

  // Find an available MenuItem
  const menuItem = await MenuItem.findOne({ isAvailable: true });
  if (!menuItem) {
    console.error('No available menu items found. Please seed the database first.');
    mongoose.connection.close();
    process.exit(1);
  }
  console.log(`Using MenuItem for test: ${menuItem.name} (ID: ${menuItem._id}, Price: ₹${menuItem.price})`);

  let customerId = null;
  let anotherCustomerId = null;
  let adminId = null;
  let ownerId = null;

  let tokenCust = '';
  let tokenAnotherCust = '';
  let tokenAdmin = '';
  let tokenOwner = '';

  let testOrderId = null;

  const timestamp = Date.now();
  const custEmail = `cust-${timestamp}@test.com`;
  const anotherCustEmail = `cust-other-${timestamp}@test.com`;
  const adminEmail = `admin-${timestamp}@test.com`;
  const ownerEmail = `owner-${timestamp}@test.com`;
  const password = 'password123';

  const results = [];
  function report(name, success, detail = '') {
    results.push({ name, success, detail });
    console.log(`[${success ? 'PASS' : 'FAIL'}] ${name} ${detail ? `(${detail})` : ''}`);
  }

  try {
    console.log('\n--- Creating Test Users directly in DB ---');
    // Create test customer
    const userCust = await User.create({
      name: 'Test Customer',
      email: custEmail,
      password,
      phone: '1234567890',
      role: 'customer'
    });
    customerId = userCust._id;

    // Create another customer for regression ownership tests
    const userAnotherCust = await User.create({
      name: 'Another Customer',
      email: anotherCustEmail,
      password,
      phone: '1234567891',
      role: 'customer'
    });
    anotherCustomerId = userAnotherCust._id;

    // Create test admin
    const userAdmin = await User.create({
      name: 'Test Admin',
      email: adminEmail,
      password,
      phone: '1234567892',
      role: 'admin'
    });
    adminId = userAdmin._id;

    // Create test owner
    const userOwner = await User.create({
      name: 'Test Owner',
      email: ownerEmail,
      password,
      phone: '1234567893',
      role: 'owner'
    });
    ownerId = userOwner._id;

    console.log('Test users created in database.');

    console.log('\n--- Logging in Test Users via API ---');
    
    // Log in Customer
    const loginCustRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: custEmail, password })
    });
    const loginCustData = await loginCustRes.json();
    tokenCust = loginCustData.token;

    // Log in Another Customer
    const loginAnotherCustRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: anotherCustEmail, password })
    });
    const loginAnotherCustData = await loginAnotherCustRes.json();
    tokenAnotherCust = loginAnotherCustData.token;

    // Log in Admin
    const loginAdminRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password })
    });
    const loginAdminData = await loginAdminRes.json();
    tokenAdmin = loginAdminData.token;

    // Log in Owner
    const loginOwnerRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ownerEmail, password })
    });
    const loginOwnerData = await loginOwnerRes.json();
    tokenOwner = loginOwnerData.token;

    const loggedIn = !!(tokenCust && tokenAnotherCust && tokenAdmin && tokenOwner);
    report('Log in all role test users', loggedIn, `Cust: ${!!tokenCust}, Admin: ${!!tokenAdmin}, Owner: ${!!tokenOwner}`);

    if (!loggedIn) {
      throw new Error('Could not log in all test users. Server might be down or not responding correctly.');
    }

    console.log('\n--- 1. AUTHENTICATION TESTS ---');

    // 1. No token -> GET admin orders
    const res1 = await fetch(`${API_URL}/orders/admin`);
    report('1. No token -> GET admin orders (401)', res1.status === 401, `Status: ${res1.status}`);

    // 2. Customer token -> GET admin orders
    const res2 = await fetch(`${API_URL}/orders/admin`, {
      headers: { 'Authorization': `Bearer ${tokenCust}` }
    });
    report('2. Customer token -> GET admin orders (403)', res2.status === 403, `Status: ${res2.status}`);

    // 3. Owner token -> GET admin orders
    const res3 = await fetch(`${API_URL}/orders/admin`, {
      headers: { 'Authorization': `Bearer ${tokenOwner}` }
    });
    report('3. Owner token -> GET admin orders (403)', res3.status === 403, `Status: ${res3.status}`);

    // 4. Admin token -> GET admin orders
    const res4 = await fetch(`${API_URL}/orders/admin`, {
      headers: { 'Authorization': `Bearer ${tokenAdmin}` }
    });
    const res4Data = await res4.json();
    report('4. Admin token -> GET admin orders (200)', res4.status === 200 && res4Data.success === true, `Status: ${res4.status}`);

    // 5. No token -> GET owner orders
    const res5 = await fetch(`${API_URL}/orders/owner`);
    report('5. No token -> GET owner orders (401)', res5.status === 401, `Status: ${res5.status}`);

    // 6. Customer token -> GET owner orders
    const res6 = await fetch(`${API_URL}/orders/owner`, {
      headers: { 'Authorization': `Bearer ${tokenCust}` }
    });
    report('6. Customer token -> GET owner orders (403)', res6.status === 403, `Status: ${res6.status}`);

    // 7. Admin token -> GET owner orders
    const res7 = await fetch(`${API_URL}/orders/owner`, {
      headers: { 'Authorization': `Bearer ${tokenAdmin}` }
    });
    report('7. Admin token -> GET owner orders (403)', res7.status === 403, `Status: ${res7.status}`);

    // 8. Owner token -> GET owner orders
    const res8 = await fetch(`${API_URL}/orders/owner`, {
      headers: { 'Authorization': `Bearer ${tokenOwner}` }
    });
    const res8Data = await res8.json();
    report('8. Owner token -> GET owner orders (200)', res8.status === 200 && res8Data.success === true, `Status: ${res8.status}`);


    console.log('\n--- 2. CUSTOMER REGRESSION & ORDER CREATION ---');

    // 25. Customer can still create an order
    const createRes = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenCust}`
      },
      body: JSON.stringify({
        orderType: 'pickup',
        customer: { name: 'Test Customer', email: custEmail, phone: '1234567890' },
        items: [{ menuItem: menuItem._id.toString(), quantity: 2 }]
      })
    });
    const createData = await createRes.json();
    if (createData.success && createData.order) {
      testOrderId = createData.order.id;
    }
    report('25. Customer can still create an order (201)', createRes.status === 201 && !!testOrderId, `OrderID: ${testOrderId}`);

    // 26. Customer can still list own orders
    const listRes = await fetch(`${API_URL}/orders`, {
      headers: { 'Authorization': `Bearer ${tokenCust}` }
    });
    const listData = await listRes.json();
    const hasOrderInList = listData.orders?.some(o => o.id === testOrderId);
    report('26. Customer can still list own orders (200)', listRes.status === 200 && hasOrderInList, `List count: ${listData.count}`);

    // 27. Customer can still view own order
    const viewRes = await fetch(`${API_URL}/orders/${testOrderId}`, {
      headers: { 'Authorization': `Bearer ${tokenCust}` }
    });
    const viewData = await viewRes.json();
    report('27. Customer can still view own order (200)', viewRes.status === 200 && viewData.order?.id === testOrderId, `Status: ${viewRes.status}`);

    // 28. Customer cannot view another customer\'s order
    const viewOtherRes = await fetch(`${API_URL}/orders/${testOrderId}`, {
      headers: { 'Authorization': `Bearer ${tokenAnotherCust}` }
    });
    report('28. Customer cannot view another customer\'s order (404)', viewOtherRes.status === 404, `Status: ${viewOtherRes.status}`);


    console.log('\n--- 3. ORDER DETAIL TESTS ---');

    // 9. Admin gets valid order -> 200
    const res9 = await fetch(`${API_URL}/orders/admin/${testOrderId}`, {
      headers: { 'Authorization': `Bearer ${tokenAdmin}` }
    });
    const res9Data = await res9.json();
    report('9. Admin gets valid order (200)', res9.status === 200 && res9Data.order?.id === testOrderId, `Status: ${res9.status}`);

    // 10. Owner gets valid order -> 200
    const res10 = await fetch(`${API_URL}/orders/owner/${testOrderId}`, {
      headers: { 'Authorization': `Bearer ${tokenOwner}` }
    });
    const res10Data = await res10.json();
    report('10. Owner gets valid order (200)', res10.status === 200 && res10Data.order?.id === testOrderId, `Status: ${res10.status}`);

    // 11. Invalid ObjectId -> 400
    const res11 = await fetch(`${API_URL}/orders/admin/invalid_object_id_123`, {
      headers: { 'Authorization': `Bearer ${tokenAdmin}` }
    });
    report('11. Invalid ObjectId -> 400', res11.status === 400, `Status: ${res11.status}`);

    // 12. Nonexistent order -> 404
    const nonexistentId = new mongoose.Types.ObjectId().toString();
    const res12 = await fetch(`${API_URL}/orders/admin/${nonexistentId}`, {
      headers: { 'Authorization': `Bearer ${tokenAdmin}` }
    });
    report('12. Nonexistent order -> 404', res12.status === 404, `Status: ${res12.status}`);


    console.log('\n--- 4. OPERATIONAL STATUS TESTS ---');

    // 13. Admin changes status -> 200
    const res13 = await fetch(`${API_URL}/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({ status: 'Confirmed' })
    });
    const res13Data = await res13.json();
    report('13. Admin changes status to Confirmed (200)', res13.status === 200 && res13Data.order?.status === 'Confirmed', `Status: ${res13.status}`);

    // 14. Owner changes status -> 200
    const res14 = await fetch(`${API_URL}/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenOwner}`
      },
      body: JSON.stringify({ status: 'Preparing' })
    });
    const res14Data = await res14.json();
    report('14. Owner changes status to Preparing (200)', res14.status === 200 && res14Data.order?.status === 'Preparing', `Status: ${res14.status}`);

    // 15. Customer changes status -> 403
    const res15 = await fetch(`${API_URL}/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenCust}`
      },
      body: JSON.stringify({ status: 'Ready' })
    });
    report('15. Customer changes status -> 403', res15.status === 403, `Status: ${res15.status}`);

    // 16. Unauthenticated changes status -> 401
    const res16 = await fetch(`${API_URL}/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'Ready' })
    });
    report('16. Unauthenticated changes status -> 401', res16.status === 401, `Status: ${res16.status}`);

    // 17. Invalid status -> 400
    const res17 = await fetch(`${API_URL}/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({ status: 'NotAValidStatus' })
    });
    report('17. Invalid status -> 400', res17.status === 400, `Status: ${res17.status}`);

    // 18. Verify MongoDB status actually changed
    const orderInDb = await Order.findById(testOrderId);
    report('18. Verify MongoDB status actually changed', orderInDb?.status === 'Preparing', `Db status: ${orderInDb?.status}`);


    console.log('\n--- 5. PAYMENT STATUS TESTS ---');

    // 19. Admin changes payment status -> 200
    const res19 = await fetch(`${API_URL}/orders/${testOrderId}/payment-status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({ status: 'Paid' })
    });
    const res19Data = await res19.json();
    report('19. Admin changes payment status to Paid (200)', res19.status === 200 && res19Data.order?.payment?.status === 'Paid', `Status: ${res19.status}`);

    // 20. Owner changes payment status -> 403
    const res20 = await fetch(`${API_URL}/orders/${testOrderId}/payment-status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenOwner}`
      },
      body: JSON.stringify({ status: 'Refunded' })
    });
    report('20. Owner changes payment status -> 403', res20.status === 403, `Status: ${res20.status}`);

    // 21. Customer changes payment status -> 403
    const res21 = await fetch(`${API_URL}/orders/${testOrderId}/payment-status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenCust}`
      },
      body: JSON.stringify({ status: 'Refunded' })
    });
    report('21. Customer changes payment status -> 403', res21.status === 403, `Status: ${res21.status}`);

    // 22. Unauthenticated -> 401
    const res22 = await fetch(`${API_URL}/orders/${testOrderId}/payment-status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'Refunded' })
    });
    report('22. Unauthenticated -> 401', res22.status === 401, `Status: ${res22.status}`);

    // 23. Invalid payment status -> 400
    const res23 = await fetch(`${API_URL}/orders/${testOrderId}/payment-status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({ status: 'NotAPaymentStatus' })
    });
    report('23. Invalid payment status -> 400', res23.status === 400, `Status: ${res23.status}`);

    // 24. Verify MongoDB payment.status changed
    const orderInDbPayment = await Order.findById(testOrderId);
    report('24. Verify MongoDB payment.status changed', orderInDbPayment?.payment?.status === 'Paid', `Db payment status: ${orderInDbPayment?.payment?.status}`);


    console.log('\n--- 6. DATA INTEGRITY TESTS ---');

    const originalOrder = await Order.findById(testOrderId);

    // Let's perform status update and check data integrity
    const statusUpdateRes = await fetch(`${API_URL}/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({ status: 'Ready' })
    });
    const orderAfterStatusUpdate = await Order.findById(testOrderId);

    const pricingUnchanged = orderAfterStatusUpdate.pricing.total === originalOrder.pricing.total &&
                            orderAfterStatusUpdate.pricing.subtotal === originalOrder.pricing.subtotal;
    const itemsUnchanged = orderAfterStatusUpdate.items.length === originalOrder.items.length &&
                          orderAfterStatusUpdate.items[0].subtotal === originalOrder.items[0].subtotal;
    const customerUnchanged = orderAfterStatusUpdate.customer.name === originalOrder.customer.name &&
                             orderAfterStatusUpdate.customer.email === originalOrder.customer.email;
    const orderNumberUnchanged = orderAfterStatusUpdate.orderNumber === originalOrder.orderNumber;
    const userUnchanged = orderAfterStatusUpdate.user.toString() === originalOrder.user.toString();

    const statusIntegrity = pricingUnchanged && itemsUnchanged && customerUnchanged && orderNumberUnchanged && userUnchanged;
    report('25b. Status update preserves data integrity', statusIntegrity, 
      `Pricing: ${pricingUnchanged}, Items: ${itemsUnchanged}, Cust: ${customerUnchanged}, Num: ${orderNumberUnchanged}, User: ${userUnchanged}`);

    // Let's perform payment status update and check data integrity
    const paymentUpdateRes = await fetch(`${API_URL}/orders/${testOrderId}/payment-status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({ status: 'Refunded' })
    });
    const orderAfterPaymentUpdate = await Order.findById(testOrderId);

    const paymentMethodUnchanged = orderAfterPaymentUpdate.payment.method === originalOrder.payment.method;
    const orderStatusUnchanged = orderAfterPaymentUpdate.status === 'Ready'; // status was updated to Ready in the previous test step
    const pricingUnchangedPay = orderAfterPaymentUpdate.pricing.total === originalOrder.pricing.total;
    const itemsUnchangedPay = orderAfterPaymentUpdate.items.length === originalOrder.items.length;

    const paymentIntegrity = paymentMethodUnchanged && orderStatusUnchanged && pricingUnchangedPay && itemsUnchangedPay;
    report('26b. Payment status update preserves data integrity', paymentIntegrity,
      `Method: ${paymentMethodUnchanged}, Status: ${orderStatusUnchanged}, Pricing: ${pricingUnchangedPay}, Items: ${itemsUnchangedPay}`);


    console.log('\n--- 7. PAGINATION & FILTER TESTS ---');

    // Admin pagination check
    const paginationRes = await fetch(`${API_URL}/orders/admin?page=1&limit=5`, {
      headers: { 'Authorization': `Bearer ${tokenAdmin}` }
    });
    const paginationData = await paginationRes.json();
    const hasPaginationKeys = 'total' in paginationData && 'totalPages' in paginationData && 'page' in paginationData && 'limit' in paginationData;
    report('Pagination metadata exists', hasPaginationKeys && paginationData.limit === 5, 
      `Total: ${paginationData.total}, Page: ${paginationData.page}, Limit: ${paginationData.limit}`);

    // Admin filter check
    const filterRes = await fetch(`${API_URL}/orders/admin?status=Ready`, {
      headers: { 'Authorization': `Bearer ${tokenAdmin}` }
    });
    const filterData = await filterRes.json();
    const allFilteredMatch = filterData.orders?.every(o => o.status === 'Ready') ?? false;
    report('Filtering by status', allFilteredMatch, `Orders matching Ready: ${filterData.count}`);

  } catch (error) {
    console.error('Fatal testing error:', error);
  } finally {
    console.log('\n--- Cleaning up Test Data ---');
    try {
      if (customerId) {
        await User.deleteOne({ _id: customerId });
        console.log('Deleted customer.');
      }
      if (anotherCustomerId) {
        await User.deleteOne({ _id: anotherCustomerId });
        console.log('Deleted other customer.');
      }
      if (adminId) {
        await User.deleteOne({ _id: adminId });
        console.log('Deleted admin.');
      }
      if (ownerId) {
        await User.deleteOne({ _id: ownerId });
        console.log('Deleted owner.');
      }
      const userIds = [customerId, anotherCustomerId, adminId, ownerId].filter(Boolean);
      if (userIds.length > 0) {
        const delResult = await Order.deleteMany({ user: { $in: userIds } });
        console.log(`Deleted ${delResult.deletedCount} orders created during tests.`);
      }
    } catch (cleanupErr) {
      console.error('Cleanup failed:', cleanupErr.message);
    }

    mongoose.connection.close();
    console.log('Database connection closed.');

    console.log('\n--- Test Execution Summary ---');
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

runTests();
