const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const MenuItem = require('../models/MenuItem');

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

  let customerId = null;
  let anotherCustomerId = null;
  let adminId = null;
  let ownerId = null;

  let tokenCust = '';
  let tokenAnotherCust = '';
  let tokenAdmin = '';
  let tokenOwner = '';

  const timestamp = Date.now();
  const custEmail = `cust-profile-${timestamp}@test.com`;
  const anotherCustEmail = `cust-other-profile-${timestamp}@test.com`;
  const adminEmail = `admin-profile-${timestamp}@test.com`;
  const ownerEmail = `owner-profile-${timestamp}@test.com`;
  const password = 'password123';

  const results = [];
  function report(name, success, detail = '') {
    results.push({ name, success, detail });
    console.log(`[${success ? 'PASS' : 'FAIL'}] ${name} ${detail ? `(${detail})` : ''}`);
  }

  try {
    console.log('\n--- Seeding Test Users Directly ---');
    const userCust = await User.create({
      name: 'Test Profile Customer',
      email: custEmail,
      password,
      phone: '1234567890',
      role: 'customer'
    });
    customerId = userCust._id;

    const userAnotherCust = await User.create({
      name: 'Another Profile Customer',
      email: anotherCustEmail,
      password,
      phone: '1234567891',
      role: 'customer'
    });
    anotherCustomerId = userAnotherCust._id;

    const userAdmin = await User.create({
      name: 'Test Profile Admin',
      email: adminEmail,
      password,
      phone: '1234567892',
      role: 'admin'
    });
    adminId = userAdmin._id;

    const userOwner = await User.create({
      name: 'Test Profile Owner',
      email: ownerEmail,
      password,
      phone: '1234567893',
      role: 'owner'
    });
    ownerId = userOwner._id;

    console.log('Seed users completed.');

    console.log('\n--- 1 & 22. AUTHENTICATION & LOGIN REGRESSION ---');
    // Customer login
    const loginCustRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: custEmail, password })
    });
    const loginCustData = await loginCustRes.json();
    tokenCust = loginCustData.token;

    // Another customer login
    const loginAnotherCustRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: anotherCustEmail, password })
    });
    const loginAnotherCustData = await loginAnotherCustRes.json();
    tokenAnotherCust = loginAnotherCustData.token;

    // Admin login
    const loginAdminRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password })
    });
    const loginAdminData = await loginAdminRes.json();
    tokenAdmin = loginAdminData.token;

    // Owner login
    const loginOwnerRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ownerEmail, password })
    });
    const loginOwnerData = await loginOwnerRes.json();
    tokenOwner = loginOwnerData.token;

    const loggedIn = !!(tokenCust && tokenAnotherCust && tokenAdmin && tokenOwner);
    report('Log in all test users (Auth regression)', loggedIn, `Cust: ${!!tokenCust}, Admin: ${!!tokenAdmin}, Owner: ${!!tokenOwner}`);

    if (!loggedIn) {
      throw new Error('Login failed. Check server status.');
    }

    console.log('\n--- 4. UNAUTHENTICATED PROFILE REQUESTS ---');
    const resNoAuth = await fetch(`${API_URL}/users/profile`);
    report('4. Unauthenticated profile request (401)', resNoAuth.status === 401, `Status: ${resNoAuth.status}`);

    console.log('\n--- 5. CUSTOMER GET PROFILE ---');
    const resCustGet = await fetch(`${API_URL}/users/profile`, {
      headers: { 'Authorization': `Bearer ${tokenCust}` }
    });
    const dataCustGet = await resCustGet.json();
    const hasSensitiveFields = dataCustGet.user && ('password' in dataCustGet.user);
    report('5. Customer GET own profile (200)', resCustGet.status === 200 && dataCustGet.success === true, `Status: ${resCustGet.status}`);
    report('19. Sensitive fields (password) not returned', !hasSensitiveFields && dataCustGet.user?.name === 'Test Profile Customer', `Password present: ${hasSensitiveFields}`);

    console.log('\n--- 6. CUSTOMER PUT PROFILE ---');
    const resCustPut = await fetch(`${API_URL}/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenCust}`
      },
      body: JSON.stringify({
        name: 'Updated Name Customer',
        phone: '9999999999'
      })
    });
    const dataCustPut = await resCustPut.json();
    report('6. Customer PUT own profile (200)', resCustPut.status === 200 && dataCustPut.user?.name === 'Updated Name Customer' && dataCustPut.user?.phone === '9999999999', `Status: ${resCustPut.status}`);

    console.log('\n--- 7. CUSTOMER CANNOT UPDATE ROLE/STATUS ---');
    const resCustPutRole = await fetch(`${API_URL}/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenCust}`
      },
      body: JSON.stringify({
        role: 'admin',
        status: 'Inactive'
      })
    });
    const dataCustPutRole = await resCustPutRole.json();
    const dbCustAfterPut = await User.findById(customerId);
    const roleNotUpdated = dbCustAfterPut.role === 'customer' && dbCustAfterPut.status === 'Active';
    report('7. Customer cannot change role or status via profile update', roleNotUpdated, `Role: ${dbCustAfterPut.role}, Status: ${dbCustAfterPut.status}`);

    console.log('\n--- 8, 9, 10. CUSTOMER ROLE BLOCKS ---');
    const resCustList = await fetch(`${API_URL}/users`, {
      headers: { 'Authorization': `Bearer ${tokenCust}` }
    });
    report('8. Customer cannot list users (403)', resCustList.status === 403, `Status: ${resCustList.status}`);

    const resCustDetail = await fetch(`${API_URL}/users/${customerId}`, {
      headers: { 'Authorization': `Bearer ${tokenCust}` }
    });
    report('9. Customer cannot view another user (403)', resCustDetail.status === 403, `Status: ${resCustDetail.status}`);

    const resCustStatus = await fetch(`${API_URL}/users/${customerId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenCust}`
      },
      body: JSON.stringify({ status: 'Inactive' })
    });
    report('10. Customer cannot change user status (403)', resCustStatus.status === 403, `Status: ${resCustStatus.status}`);

    console.log('\n--- 11, 12, 13. OWNER ROLE BLOCKS ---');
    const resOwnerList = await fetch(`${API_URL}/users`, {
      headers: { 'Authorization': `Bearer ${tokenOwner}` }
    });
    report('11. Owner cannot list users (403)', resOwnerList.status === 403, `Status: ${resOwnerList.status}`);

    const resOwnerDetail = await fetch(`${API_URL}/users/${customerId}`, {
      headers: { 'Authorization': `Bearer ${tokenOwner}` }
    });
    report('12. Owner cannot view another user (403)', resOwnerDetail.status === 403, `Status: ${resOwnerDetail.status}`);

    const resOwnerStatus = await fetch(`${API_URL}/users/${customerId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenOwner}`
      },
      body: JSON.stringify({ status: 'Inactive' })
    });
    report('13. Owner cannot change user status (403)', resOwnerStatus.status === 403, `Status: ${resOwnerStatus.status}`);

    console.log('\n--- 14. ADMIN LIST USERS & PAGINATION ---');
    const resAdminList = await fetch(`${API_URL}/users?page=1&limit=2`, {
      headers: { 'Authorization': `Bearer ${tokenAdmin}` }
    });
    const dataAdminList = await resAdminList.json();
    const hasPaginationKeys = dataAdminList.pagination && 'total' in dataAdminList.pagination && 'totalPages' in dataAdminList.pagination;
    report('14. Admin can list users with pagination (200)', resAdminList.status === 200 && dataAdminList.success === true && hasPaginationKeys && dataAdminList.pagination.limit === 2, `Limit: ${dataAdminList.pagination?.limit}`);

    console.log('\n--- 15. ADMIN GET USER BY ID ---');
    const resAdminGetId = await fetch(`${API_URL}/users/${customerId}`, {
      headers: { 'Authorization': `Bearer ${tokenAdmin}` }
    });
    const dataAdminGetId = await resAdminGetId.json();
    report('15. Admin can get user by ID (200)', resAdminGetId.status === 200 && dataAdminGetId.user?.id === customerId.toString(), `Status: ${resAdminGetId.status}`);

    console.log('\n--- 16. INVALID OBJECT ID ---');
    const resAdminGetInvalidId = await fetch(`${API_URL}/users/invalid_id_123`, {
      headers: { 'Authorization': `Bearer ${tokenAdmin}` }
    });
    report('16. Invalid ObjectId -> 400', resAdminGetInvalidId.status === 400, `Status: ${resAdminGetInvalidId.status}`);

    console.log('\n--- 17. NONEXISTENT USER ---');
    const nonexistentId = new mongoose.Types.ObjectId().toString();
    const resAdminGetNonexistentId = await fetch(`${API_URL}/users/${nonexistentId}`, {
      headers: { 'Authorization': `Bearer ${tokenAdmin}` }
    });
    report('17. Nonexistent user -> 404', resAdminGetNonexistentId.status === 404, `Status: ${resAdminGetNonexistentId.status}`);

    console.log('\n--- 18. DUPLICATE EMAIL ---');
    const resAdminPutDuplicate = await fetch(`${API_URL}/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenCust}`
      },
      body: JSON.stringify({ email: adminEmail })
    });
    report('18. Duplicate email PUT -> 409 Conflict', resAdminPutDuplicate.status === 409, `Status: ${resAdminPutDuplicate.status}`);

    console.log('\n--- 20. ADMIN ROLE SELF-PROTECTION ---');
    const resAdminSelfRole = await fetch(`${API_URL}/users/${adminId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({ role: 'customer' })
    });
    report('20. Admin self-role change blocked -> 400', resAdminSelfRole.status === 400, `Status: ${resAdminSelfRole.status}`);

    console.log('\n--- 21. ADMIN STATUS SELF-PROTECTION ---');
    const resAdminSelfStatus = await fetch(`${API_URL}/users/${adminId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({ status: 'Inactive' })
    });
    report('21. Admin self-status change to Inactive blocked -> 400', resAdminSelfStatus.status === 400, `Status: ${resAdminSelfStatus.status}`);

    console.log('\n--- 23. EXISTING ORDER / MENU API REGRESSION ---');
    const resMenu = await fetch(`${API_URL}/menu`);
    const dataMenu = await resMenu.json();
    report('23. Menu API regression (200)', resMenu.status === 200 && dataMenu.success === true, `Menu items count: ${dataMenu.menuItems?.length}`);

  } catch (error) {
    console.error('Fatal testing error:', error);
  } finally {
    console.log('\n--- Cleaning up Seeding Data ---');
    try {
      if (customerId) await User.deleteOne({ _id: customerId });
      if (anotherCustomerId) await User.deleteOne({ _id: anotherCustomerId });
      if (adminId) await User.deleteOne({ _id: adminId });
      if (ownerId) await User.deleteOne({ _id: ownerId });
      console.log('Cleanup completed successfully.');
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
