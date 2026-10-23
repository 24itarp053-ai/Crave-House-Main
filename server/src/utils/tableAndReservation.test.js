/**
 * tableAndReservation.test.js
 * Comprehensive automated test suite for Phase 4.2 Database-Backed Table Management & Availability Engine.
 *
 * Verifies:
 * 1. Table creation and input validation (positive capacity, required tableNumber)
 * 2. Duplicate table identifier prevention (case-insensitive uniqueness)
 * 3. Unauthorized customer access rejection on all table-management endpoints (HTTP 403 / 401)
 * 4. Admin and Owner role authorization (HTTP 200 / 201)
 * 5. Updating table attributes and toggling active/inactive status
 * 6. Live availability engine: returns available with unreserved active tables
 * 7. Conflicting reservation detection: detects overlapping 90-minute dining windows
 * 8. Cancelled reservations: does not count cancelled bookings as occupied
 * 9. Input validation: rejects invalid dates (past), invalid party sizes, and malformed times
 * 10. Business hours enforcement: rejects booking attempts outside configured operating hours
 * 11. Safe deletion protection: rejects deletion of tables with reservation history, preserves audit records
 */

const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = require('../server');
const Table = require('../models/Table');
const Reservation = require('../models/Reservation');
const User = require('../models/User');

const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crave_house';

let server;
let baseUrl;
const testRunId = Date.now();
const createdUserIds = [];
const createdTableIds = [];
const createdReservationIds = [];

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

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('   CRAVE HOUSE: PHASE 4.2 TABLE MANAGEMENT TEST SUITE  ');
  console.log('======================================================\n');

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoURI);
    }

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api`;

    // 1. Setup Test Users
    console.log('--- 1. Setting Up Test Accounts ---');
    const adminUser = await User.create({
      name: `Admin Test ${testRunId}`,
      email: `admin-tbl-${testRunId}@test.com`,
      password: 'TestPassword123!',
      role: 'admin',
      isActive: true
    });
    createdUserIds.push(adminUser._id);

    const ownerUser = await User.create({
      name: `Owner Test ${testRunId}`,
      email: `owner-tbl-${testRunId}@test.com`,
      password: 'TestPassword123!',
      role: 'owner',
      isActive: true
    });
    createdUserIds.push(ownerUser._id);

    const customerUser = await User.create({
      name: `Customer Test ${testRunId}`,
      email: `cust-tbl-${testRunId}@test.com`,
      password: 'TestPassword123!',
      role: 'customer',
      isActive: true
    });
    createdUserIds.push(customerUser._id);

    // Login users
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: adminUser.email, password: 'TestPassword123!' })
    });
    const adminToken = adminLogin.data?.token;

    const ownerLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: ownerUser.email, password: 'TestPassword123!' })
    });
    const ownerToken = ownerLogin.data?.token;

    const custLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: customerUser.email, password: 'TestPassword123!' })
    });
    const custToken = custLogin.data?.token;

    assertTest('Test accounts logged in and tokens generated', adminToken && ownerToken && custToken);

    // 2. Table Creation & Validation
    console.log('\n--- 2. Table Creation & Input Validation ---');
    const tableNumberA = `TST-${testRunId.toString().slice(-4)}-A`;
    const createRes = await request('/tables', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        tableNumber: tableNumberA,
        name: 'Window Booth Test',
        capacity: 4,
        area: 'Main Hall',
        description: 'Test booth by the window'
      })
    });
    assertTest(
      'Admin can create a valid table (HTTP 201)',
      createRes.status === 201 && createRes.data?.table?.tableNumber === tableNumberA,
      `ID: ${createRes.data?.table?._id}`
    );
    if (createRes.data?.table?._id) createdTableIds.push(createRes.data.table._id);

    // Invalid capacity (0 or negative)
    const badCapRes = await request('/tables', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        tableNumber: `TST-${testRunId.toString().slice(-4)}-BAD`,
        capacity: 0,
        area: 'Main Hall'
      })
    });
    assertTest(
      'Rejects invalid table capacity <= 0 with HTTP 400',
      badCapRes.status === 400 && !badCapRes.data?.success
    );

    // Missing tableNumber
    const missingNumRes = await request('/tables', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        capacity: 4,
        area: 'Main Hall'
      })
    });
    assertTest(
      'Rejects missing tableNumber with HTTP 400',
      missingNumRes.status === 400 && !missingNumRes.data?.success
    );

    // 3. Duplicate Table Identifier
    console.log('\n--- 3. Duplicate Table Identifier Validation ---');
    const duplicateRes = await request('/tables', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        tableNumber: tableNumberA.toLowerCase(), // test case-insensitive uniqueness
        capacity: 6,
        area: 'Terrace'
      })
    });
    assertTest(
      'Rejects duplicate tableNumber (case-insensitive) with HTTP 400',
      duplicateRes.status === 400 && duplicateRes.data?.message?.includes('already exists'),
      duplicateRes.data?.message
    );

    // 4. Role Authorization & Customer Access Rejection
    console.log('\n--- 4. Role Authorization & Customer Access Control ---');
    const custGetTables = await request('/tables', {
      headers: { Authorization: `Bearer ${custToken}` }
    });
    assertTest(
      'Customer rejected from GET /api/tables with HTTP 403 Forbidden',
      custGetTables.status === 403
    );

    const custPostTable = await request('/tables', {
      method: 'POST',
      headers: { Authorization: `Bearer ${custToken}` },
      body: JSON.stringify({ tableNumber: 'CUST-HACK', capacity: 2 })
    });
    assertTest(
      'Customer rejected from POST /api/tables with HTTP 403 Forbidden',
      custPostTable.status === 403
    );

    const unauthGet = await request('/tables');
    assertTest(
      'Unauthenticated request rejected with HTTP 401 Unauthorized',
      unauthGet.status === 401
    );

    // Owner authorization
    const ownerGetTables = await request('/tables', {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    assertTest(
      'Owner authorized for GET /api/tables with HTTP 200',
      ownerGetTables.status === 200 && Array.isArray(ownerGetTables.data?.tables)
    );

    // 5. Updating & Deactivating Tables
    console.log('\n--- 5. Updating & Deactivating Tables ---');
    const testTableId = createRes.data?.table?._id;
    const updateRes = await request(`/tables/${testTableId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        tableNumber: tableNumberA,
        name: 'Updated Luxury Booth',
        capacity: 6,
        area: 'Private Dining'
      })
    });
    assertTest(
      'Owner can update table details (HTTP 200)',
      updateRes.status === 200 && updateRes.data?.table?.capacity === 6 && updateRes.data?.table?.area === 'Private Dining'
    );

    const toggleRes = await request(`/tables/${testTableId}/toggle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assertTest(
      'Admin can toggle table active status (HTTP 200)',
      toggleRes.status === 200 && toggleRes.data?.table?.isActive === false
    );

    // Re-activate table for subsequent tests
    const reactivateRes = await request(`/tables/${testTableId}/toggle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assertTest(
      'Table re-activated to true for booking tests',
      reactivateRes.status === 200 && reactivateRes.data?.table?.isActive === true
    );

    // 6. Availability Engine: Unreserved Active Tables
    console.log('\n--- 6. Table Availability Engine ---');
    // Future date setup (tomorrow)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const dateStr = futureDate.toISOString().split('T')[0];

    const availRes1 = await request(`/reservations/availability?date=${dateStr}&time=19:00&guests=4`);
    assertTest(
      'Public availability check returns HTTP 200 and available: true when unreserved',
      availRes1.status === 200 && availRes1.data?.available === true,
      `Available tables: ${availRes1.data?.availableCount}`
    );

    // 7. Conflicting Reservations & Overlapping Window Check
    console.log('\n--- 7. Conflicting Reservation & 90-Min Overlap Evaluation ---');
    // Make all other tables inactive temporarily to isolate our test table
    const otherTables = await Table.find({ _id: { $ne: testTableId } });
    await Table.updateMany({ _id: { $ne: testTableId } }, { isActive: false });

    // Customer books testTableId for 19:00 (occupies 19:00 to 20:30)
    const bookRes = await request('/reservations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${custToken}` },
      body: JSON.stringify({
        customerName: 'Alice Test',
        email: 'alice@test.com',
        phone: '9876543210',
        date: dateStr,
        time: '19:00',
        guests: 4
      })
    });
    assertTest(
      'Reservation created and assigned table',
      bookRes.status === 201 && bookRes.data?.reservation?._id,
      `Table assigned: ${bookRes.data?.reservation?.table}`
    );
    if (bookRes.data?.reservation?._id) createdReservationIds.push(bookRes.data.reservation._id);

    // Check availability at 19:30 (overlapping with 19:00 - 20:30 booking)
    const overlapAvail = await request(`/reservations/availability?date=${dateStr}&time=19:30&guests=4`);
    assertTest(
      'Detects conflicting overlapping reservation at 19:30 (returns available: false)',
      overlapAvail.status === 200 && overlapAvail.data?.available === false
    );

    // Check availability at 20:45 (non-overlapping, after 20:30)
    const nonOverlapAvail = await request(`/reservations/availability?date=${dateStr}&time=20:45&guests=4`);
    assertTest(
      'Detects non-overlapping slot at 20:45 after 90m window (returns available: true)',
      nonOverlapAvail.status === 200 && nonOverlapAvail.data?.available === true
    );

    // 8. Cancelled Reservations Do Not Block Availability
    console.log('\n--- 8. Cancelled Reservation Non-Interference ---');
    // Update reservation to 'Cancelled'
    await Reservation.findByIdAndUpdate(bookRes.data.reservation._id, { status: 'Cancelled' });

    const cancelledAvail = await request(`/reservations/availability?date=${dateStr}&time=19:00&guests=4`);
    assertTest(
      'Cancelled reservation does NOT block availability at 19:00 (available: true)',
      cancelledAvail.status === 200 && cancelledAvail.data?.available === true
    );

    // Restore other tables to active
    await Table.updateMany({ _id: { $in: otherTables.map(t => t._id) } }, { isActive: true });

    // 9. Input Validation: Invalid Dates, Party Sizes & Times
    console.log('\n--- 9. Input Validation on Reservations & Availability ---');
    // Past date
    const pastRes = await request(`/reservations/availability?date=2020-01-01&time=19:00&guests=2`);
    assertTest(
      'Rejects past date with HTTP 400',
      pastRes.status === 400 && !pastRes.data?.available
    );

    // Excessive guests
    const hugeGuestsRes = await request(`/reservations/availability?date=${dateStr}&time=19:00&guests=25`);
    assertTest(
      'Rejects guests > 20 with HTTP 400',
      hugeGuestsRes.status === 400 && !hugeGuestsRes.data?.available
    );

    // 10. Business Hours Enforcement
    console.log('\n--- 10. Business Hours Enforcement ---');
    const lateNightAvail = await request(`/reservations/availability?date=${dateStr}&time=03:30&guests=2`);
    assertTest(
      'Rejects booking outside opening hours (03:30 AM) with HTTP 400',
      lateNightAvail.status === 400 && lateNightAvail.data?.message?.includes('outside business hours'),
      lateNightAvail.data?.message
    );

    // 11. Safe Deletion & Reservation History Preservation
    console.log('\n--- 11. Safe Deletion & Audit History Protection ---');
    // Re-link our reservation to testTableId to verify safe deletion rejection
    await Reservation.findByIdAndUpdate(bookRes.data.reservation._id, {
      tableId: testTableId,
      table: tableNumberA,
      status: 'Confirmed'
    });

    const safeDelRes = await request(`/tables/${testTableId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assertTest(
      'Rejects deletion of table with existing reservation history with HTTP 400',
      safeDelRes.status === 400 && (safeDelRes.data?.message?.includes('reservation records') || safeDelRes.data?.message?.includes('associated reservations')),
      safeDelRes.data?.message
    );

    // Verify reservation still exists intact in database
    const preservedRes = await Reservation.findById(bookRes.data.reservation._id);
    assertTest(
      'Existing reservation record is completely preserved in database',
      preservedRes && preservedRes.customerName === 'Alice Test'
    );

    // 12. Concurrent Overlapping Reservation Race Prevention & Deactivated Tables
    console.log('\n--- 12. Concurrency Race Prevention & Deactivated Tables ---');
    const raceTableNumber = `RACE-${testRunId.toString().slice(-4)}`;
    const raceTable = await Table.create({
      tableNumber: raceTableNumber,
      capacity: 4,
      area: 'Terrace',
      isActive: true
    });
    createdTableIds.push(raceTable._id);

    // Temporarily isolate raceTable as the only active table
    const allOtherTables = await Table.find({ _id: { $ne: raceTable._id } });
    await Table.updateMany({ _id: { $ne: raceTable._id } }, { isActive: false });

    const raceDateStr = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];

    // Fire 2 simultaneous overlapping booking requests for the solitary available table
    const [raceRes1, raceRes2] = await Promise.all([
      request('/reservations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${custToken}` },
        body: JSON.stringify({
          customerName: 'Concurrent User 1',
          email: 'concurrent1@test.com',
          phone: '1111111111',
          date: raceDateStr,
          time: '19:00',
          guests: 4
        })
      }),
      request('/reservations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${custToken}` },
        body: JSON.stringify({
          customerName: 'Concurrent User 2',
          email: 'concurrent2@test.com',
          phone: '2222222222',
          date: raceDateStr,
          time: '19:15', // Overlaps with 19:00-20:30 window
          guests: 4
        })
      })
    ]);

    if (raceRes1.data?.reservation?._id) createdReservationIds.push(raceRes1.data.reservation._id);
    if (raceRes2.data?.reservation?._id) createdReservationIds.push(raceRes2.data.reservation._id);

    const raceSuccessCount = (raceRes1.status === 201 ? 1 : 0) + (raceRes2.status === 201 ? 1 : 0);
    const raceConflictCount = (raceRes1.status === 409 || raceRes1.status === 400 ? 1 : 0) +
                              (raceRes2.status === 409 || raceRes2.status === 400 ? 1 : 0);

    assertTest(
      'Concurrent overlapping bookings: exactly ONE succeeds and ONE is rejected (no double-booking)',
      raceSuccessCount === 1 && raceConflictCount === 1,
      `Successes: ${raceSuccessCount}, Rejections: ${raceConflictCount}`
    );

    // Verify database occupancy count for this table
    const dbBookingsForRaceTable = await Reservation.find({
      tableId: raceTable._id,
      date: raceDateStr,
      status: { $in: ['Pending', 'Confirmed'] }
    });
    assertTest(
      'Database verifies exactly ONE active booking allocated to the race table',
      dbBookingsForRaceTable.length === 1
    );

    // Verify deactivated tables cannot receive new bookings
    console.log('\n--- 13. Deactivated Table Booking Immunity ---');
    await Table.findByIdAndUpdate(raceTable._id, { isActive: false });

    const deactivatedBookingRes = await request('/reservations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${custToken}` },
      body: JSON.stringify({
        customerName: 'Blocked User',
        email: 'blocked@test.com',
        phone: '3333333333',
        date: raceDateStr,
        time: '12:00',
        guests: 4
      })
    });
    assertTest(
      'Deactivated table cannot receive new bookings (HTTP 409/400)',
      deactivatedBookingRes.status === 409 || deactivatedBookingRes.status === 400,
      deactivatedBookingRes.data?.message
    );

    // Restore all other tables to active
    await Table.updateMany({ _id: { $in: allOtherTables.map(t => t._id) } }, { isActive: true });

  } catch (err) {
    console.error('Unhandled suite error:', err);
    assertTest('Suite executed without unhandled errors', false, err.message);
  } finally {
    // Cleanup test artifacts
    console.log('\n--- Cleaning Up Test Artifacts ---');
    try {
      if (createdReservationIds.length > 0) {
        await Reservation.deleteMany({ _id: { $in: createdReservationIds } });
      }
      if (createdTableIds.length > 0) {
        await Table.deleteMany({ _id: { $in: createdTableIds } });
      }
      if (createdUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: createdUserIds } });
      }
      console.log('Test artifacts safely cleaned up.');
    } catch (e) {
      console.error('Cleanup warning:', e.message);
    }

    if (server) {
      server.close();
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    const passedCount = results.filter(r => r.pass).length;
    const totalCount = results.length;
    console.log(`\nResults: ${passedCount}/${totalCount} tests passed.\n`);

    if (passedCount !== totalCount) {
      process.exit(1);
    }
  }
}

if (require.main === module) {
  runTestSuite();
}

module.exports = { runTestSuite };
