const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

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

  const timestamp = Date.now();
  const customerEmail = `cust-sec-${timestamp}@test.com`;
  const adminEmail = `admin-sec-${timestamp}@test.com`;
  const originalPassword = 'password123';
  const newPassword = 'newPassword456';

  let tokenCust = '';
  let tokenAdmin = '';
  let custId = null;

  const results = [];
  function report(name, success, detail = '') {
    results.push({ name, success, detail });
    console.log(`[${success ? 'PASS' : 'FAIL'}] ${name} ${detail ? `(${detail})` : ''}`);
  }

  try {
    console.log('\n--- Seeding Test Accounts ---');
    const custUser = await User.create({
      name: 'Security Test Customer',
      email: customerEmail,
      password: originalPassword,
      role: 'customer'
    });
    custId = custUser._id;

    await User.create({
      name: 'Security Test Admin',
      email: adminEmail,
      password: originalPassword,
      role: 'admin'
    });

    console.log('Accounts seeded successfully.');

    // Log in to get tokens
    console.log('\n--- Logging In ---');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: customerEmail, password: originalPassword })
    });
    const loginData = await loginRes.json();
    if (loginData.success) {
      tokenCust = loginData.token;
      report('Customer Login', true);
    } else {
      report('Customer Login', false, loginData.message);
    }

    const adminLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: originalPassword })
    });
    const adminLoginData = await adminLoginRes.json();
    if (adminLoginData.success) {
      tokenAdmin = adminLoginData.token;
      report('Admin Login', true);
    } else {
      report('Admin Login', false, adminLoginData.message);
    }

    // 1. Unauthenticated change attempt
    console.log('\n--- Test Case 1: Unauthenticated request ---');
    const res1 = await fetch(`${API_URL}/users/change-password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: originalPassword, newPassword, confirmPassword: newPassword })
    });
    report('Change Password - Unauthenticated blocked (401)', res1.status === 401);

    // 2. Invalid JWT change attempt
    console.log('\n--- Test Case 2: Invalid JWT ---');
    const res2 = await fetch(`${API_URL}/users/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token-here'
      },
      body: JSON.stringify({ currentPassword: originalPassword, newPassword, confirmPassword: newPassword })
    });
    report('Change Password - Invalid JWT blocked (401)', res2.status === 401);

    // 3. Admin authorization block
    console.log('\n--- Test Case 3: Admin role block ---');
    const res3 = await fetch(`${API_URL}/users/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({ currentPassword: originalPassword, newPassword, confirmPassword: newPassword })
    });
    report('Change Password - Admin role blocked (403)', res3.status === 403);

    // 4. Missing inputs
    console.log('\n--- Test Case 4: Missing fields ---');
    const res4 = await fetch(`${API_URL}/users/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenCust}`
      },
      body: JSON.stringify({ currentPassword: '', newPassword, confirmPassword: newPassword })
    });
    const data4 = await res4.json();
    report('Change Password - Missing currentPassword rejected (400)', res4.status === 400 && data4.success === false);

    // 5. Short password length validation
    console.log('\n--- Test Case 5: Password too short ---');
    const res5 = await fetch(`${API_URL}/users/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenCust}`
      },
      body: JSON.stringify({ currentPassword: originalPassword, newPassword: '123', confirmPassword: '123' })
    });
    const data5 = await res5.json();
    report('Change Password - Short password rejected (400)', res5.status === 400 && data5.message.includes('at least 6 characters'));

    // 6. Passwords mismatch
    console.log('\n--- Test Case 6: Confirm password mismatch ---');
    const res6 = await fetch(`${API_URL}/users/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenCust}`
      },
      body: JSON.stringify({ currentPassword: originalPassword, newPassword, confirmPassword: 'differentPassword' })
    });
    const data6 = await res6.json();
    report('Change Password - Password mismatch rejected (400)', res6.status === 400 && data6.message.includes('do not match'));

    // 7. Same password change block
    console.log('\n--- Test Case 7: Same password update ---');
    const res7 = await fetch(`${API_URL}/users/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenCust}`
      },
      body: JSON.stringify({ currentPassword: originalPassword, newPassword: originalPassword, confirmPassword: originalPassword })
    });
    const data7 = await res7.json();
    report('Change Password - Same password rejected (400)', res7.status === 400 && data7.message.includes('different from current'));

    // 8. Incorrect current password
    console.log('\n--- Test Case 8: Incorrect current password ---');
    const res8 = await fetch(`${API_URL}/users/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenCust}`
      },
      body: JSON.stringify({ currentPassword: 'wrongPassword', newPassword, confirmPassword: newPassword })
    });
    const data8 = await res8.json();
    report('Change Password - Incorrect current password rejected (400)', res8.status === 400 && data8.message.includes('Current password is incorrect'));

    // 9. Successful password change
    console.log('\n--- Test Case 9: Successful password update ---');
    const res9 = await fetch(`${API_URL}/users/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenCust}`
      },
      body: JSON.stringify({ currentPassword: originalPassword, newPassword, confirmPassword: newPassword })
    });
    const data9 = await res9.json();
    report('Change Password - Success (200)', res9.status === 200 && data9.success === true);

    // 10. Verify old password login fails
    console.log('\n--- Test Case 10: Verify old password fails login ---');
    const res10 = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: customerEmail, password: originalPassword })
    });
    report('Old password login fails (401)', res10.status === 401);

    // 11. Verify new password login succeeds
    console.log('\n--- Test Case 11: Verify new password login ---');
    const res11 = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: customerEmail, password: newPassword })
    });
    const data11 = await res11.json();
    report('New password login succeeds (200)', res11.status === 200 && data11.success === true);

    // 12. Direct Database verification checks
    console.log('\n--- Test Case 12: Database Verification ---');
    const userInDb = await User.findById(custId).select('+password');
    const isHashed = userInDb.password.startsWith('$2b$') || userInDb.password.startsWith('$2a$');
    report('Password in DB is hashed', isHashed);

    const isHashedPlaintext = userInDb.password === newPassword;
    report('Password in DB is not plaintext', !isHashedPlaintext);

    // Verify other fields did not change
    const matchesMetadata = userInDb.name === 'Security Test Customer' && userInDb.role === 'customer';
    report('Profile Metadata unchanged', matchesMetadata);

    // 13. Regression: profile endpoints still work
    console.log('\n--- Test Case 13: Profile GET Regression ---');
    const res13 = await fetch(`${API_URL}/auth/profile`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${data11.token}` }
    });
    report('Profile endpoint GET works', res13.status === 200);

  } catch (error) {
    console.error('An error occurred during testing:', error);
  } finally {
    console.log('\n--- Cleaning Up Test Users ---');
    await User.deleteMany({ email: { $in: [customerEmail, adminEmail] } });
    console.log('Test users cleaned up.');
    await mongoose.disconnect();
    console.log('Database disconnected.');

    console.log('\n=======================================');
    console.log('            TEST RESULTS               ');
    console.log('=======================================');
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`Passed: ${passed}/${results.length}`);
    if (failed > 0) {
      console.log(`Failed: ${failed}`);
      process.exit(1);
    } else {
      console.log('All tests passed successfully!');
      process.exit(0);
    }
  }
}

runTests();
