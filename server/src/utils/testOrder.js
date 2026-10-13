const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const Order = require('../models/Order');
const User = require('../models/User');
const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crave-house';

async function runTests() {
  console.log('Connecting to MongoDB for Order Model validation tests...');
  try {
    await mongoose.connect(mongoURI);
    console.log('Database connected successfully.');
  } catch (error) {
    console.error('Failed to connect to database:', error.message);
    process.exit(1);
  }

  // Tracking test results
  const results = [];
  function report(name, success, detail = '') {
    results.push({ name, success, detail });
    console.log(`[${success ? 'PASS' : 'FAIL'}] ${name} ${detail ? `(${detail})` : ''}`);
  }

  let testUser = null;
  let testCategory = null;
  let testMenuItem = null;

  try {
    // 0. Seed helper records
    console.log('\n--- Seeding temporary test records ---');
    testUser = await User.create({
      name: 'Test Customer',
      email: `test-${Date.now()}@example.com`,
      password: 'password123',
      phone: '9876543210',
      role: 'customer'
    });
    console.log(`Seeded test User ID: ${testUser._id}`);

    testCategory = await Category.create({
      name: 'Test Category',
      slug: `test-cat-${Date.now()}`,
      description: 'Temporary category for validation testing',
      isActive: true
    });
    console.log(`Seeded test Category ID: ${testCategory._id}`);

    testMenuItem = await MenuItem.create({
      name: 'Test Paneer Burger',
      slug: `test-paneer-burger-${Date.now()}`,
      price: 199,
      image: '/src/assets/images/paneer-burger.jpg',
      description: 'Juicy test burger',
      category: testCategory._id,
      isAvailable: true
    });
    console.log(`Seeded test MenuItem ID: ${testMenuItem._id}`);

    console.log('\n--- Running validation test suite ---');

    // 1. Valid order can be created
    try {
      const validOrder = new Order({
        user: testUser._id,
        orderNumber: `CH-TEST-${Date.now()}-1`,
        customer: {
          name: 'Test Customer',
          email: testUser.email,
          phone: testUser.phone
        },
        orderType: 'delivery',
        address: {
          address: '123 Test St',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110001',
          instructions: 'Leave at door'
        },
        items: [
          {
            menuItem: testMenuItem._id,
            name: testMenuItem.name,
            image: testMenuItem.image,
            price: testMenuItem.price,
            quantity: 2,
            subtotal: testMenuItem.price * 2
          }
        ],
        pricing: {
          subtotal: testMenuItem.price * 2,
          tax: 18,
          deliveryFee: 40,
          total: (testMenuItem.price * 2) + 18 + 40
        },
        payment: {
          method: 'COD',
          status: 'Pending'
        },
        status: 'Pending'
      });

      const saved = await validOrder.save();
      report('Valid order creation', !!saved, `Saved order ID: ${saved._id}, Number: ${saved.orderNumber}`);
    } catch (err) {
      report('Valid order creation', false, err.message);
    }

    // 2. Missing user is rejected
    try {
      const badOrder = new Order({
        orderNumber: `CH-TEST-${Date.now()}-2`,
        customer: { name: 'Test Customer', email: testUser.email, phone: testUser.phone },
        orderType: 'pickup',
        items: [{ menuItem: testMenuItem._id, name: testMenuItem.name, image: testMenuItem.image, price: testMenuItem.price, quantity: 1, subtotal: testMenuItem.price }],
        pricing: { subtotal: testMenuItem.price, total: testMenuItem.price }
      });
      await badOrder.save();
      report('Missing user rejection', false, 'Allowed saving order without user');
    } catch (err) {
      const isMissingUser = err.errors && err.errors.user;
      report('Missing user rejection', !!isMissingUser, isMissingUser ? err.errors.user.message : err.message);
    }

    // 3. Empty items are rejected
    try {
      const badOrder = new Order({
        user: testUser._id,
        orderNumber: `CH-TEST-${Date.now()}-3`,
        customer: { name: 'Test Customer', email: testUser.email, phone: testUser.phone },
        orderType: 'pickup',
        items: [],
        pricing: { subtotal: 0, total: 0 }
      });
      await badOrder.save();
      report('Empty items rejection', false, 'Allowed saving order with empty items array');
    } catch (err) {
      const isEmptyItems = err.errors && err.errors.items;
      report('Empty items rejection', !!isEmptyItems, isEmptyItems ? err.errors.items.message : err.message);
    }

    // 4. Quantity 0 is rejected
    try {
      const badOrder = new Order({
        user: testUser._id,
        orderNumber: `CH-TEST-${Date.now()}-4`,
        customer: { name: 'Test Customer', email: testUser.email, phone: testUser.phone },
        orderType: 'pickup',
        items: [{ menuItem: testMenuItem._id, name: testMenuItem.name, image: testMenuItem.image, price: testMenuItem.price, quantity: 0, subtotal: 0 }],
        pricing: { subtotal: 0, total: 0 }
      });
      await badOrder.save();
      report('Quantity 0 rejection', false, 'Allowed quantity: 0');
    } catch (err) {
      const badQty = err.errors && err.errors['items.0.quantity'];
      report('Quantity 0 rejection', !!badQty, badQty ? err.errors['items.0.quantity'].message : err.message);
    }

    // 5. Negative price is rejected
    try {
      const badOrder = new Order({
        user: testUser._id,
        orderNumber: `CH-TEST-${Date.now()}-5`,
        customer: { name: 'Test Customer', email: testUser.email, phone: testUser.phone },
        orderType: 'pickup',
        items: [{ menuItem: testMenuItem._id, name: testMenuItem.name, image: testMenuItem.image, price: -10, quantity: 1, subtotal: -10 }],
        pricing: { subtotal: -10, total: -10 }
      });
      await badOrder.save();
      report('Negative price rejection', false, 'Allowed negative price');
    } catch (err) {
      const badPrice = err.errors && err.errors['items.0.price'];
      report('Negative price rejection', !!badPrice, badPrice ? err.errors['items.0.price'].message : err.message);
    }

    // 6. Invalid status is rejected
    try {
      const badOrder = new Order({
        user: testUser._id,
        orderNumber: `CH-TEST-${Date.now()}-6`,
        customer: { name: 'Test Customer', email: testUser.email, phone: testUser.phone },
        orderType: 'pickup',
        items: [{ menuItem: testMenuItem._id, name: testMenuItem.name, image: testMenuItem.image, price: testMenuItem.price, quantity: 1, subtotal: testMenuItem.price }],
        pricing: { subtotal: testMenuItem.price, total: testMenuItem.price },
        status: 'Shipped' // Invalid status
      });
      await badOrder.save();
      report('Invalid order status rejection', false, 'Allowed invalid status "Shipped"');
    } catch (err) {
      const badStatus = err.errors && err.errors.status;
      report('Invalid order status rejection', !!badStatus, badStatus ? err.errors.status.message : err.message);
    }

    // 7. Duplicate orderNumber is rejected
    try {
      const dupNum = `CH-DUP-${Date.now()}`;
      const orderA = new Order({
        user: testUser._id,
        orderNumber: dupNum,
        customer: { name: 'Test Customer', email: testUser.email, phone: testUser.phone },
        orderType: 'pickup',
        items: [{ menuItem: testMenuItem._id, name: testMenuItem.name, image: testMenuItem.image, price: testMenuItem.price, quantity: 1, subtotal: testMenuItem.price }],
        pricing: { subtotal: testMenuItem.price, total: testMenuItem.price }
      });
      await orderA.save();

      const orderB = new Order({
        user: testUser._id,
        orderNumber: dupNum, // duplicate
        customer: { name: 'Test Customer', email: testUser.email, phone: testUser.phone },
        orderType: 'pickup',
        items: [{ menuItem: testMenuItem._id, name: testMenuItem.name, image: testMenuItem.image, price: testMenuItem.price, quantity: 1, subtotal: testMenuItem.price }],
        pricing: { subtotal: testMenuItem.price, total: testMenuItem.price }
      });
      await orderB.save();
      report('Duplicate orderNumber rejection', false, 'Allowed duplicate orderNumber');
    } catch (err) {
      const isDup = err.code === 11000 || (err.message && err.message.includes('E11000'));
      report('Duplicate orderNumber rejection', !!isDup, isDup ? 'E11000 duplicate key error thrown' : err.message);
    }

    // 8. Negative total is rejected
    try {
      const badOrder = new Order({
        user: testUser._id,
        orderNumber: `CH-TEST-${Date.now()}-8`,
        customer: { name: 'Test Customer', email: testUser.email, phone: testUser.phone },
        orderType: 'pickup',
        items: [{ menuItem: testMenuItem._id, name: testMenuItem.name, image: testMenuItem.image, price: testMenuItem.price, quantity: 1, subtotal: testMenuItem.price }],
        pricing: { subtotal: testMenuItem.price, total: -50 } // negative total
      });
      await badOrder.save();
      report('Negative total rejection', false, 'Allowed negative total');
    } catch (err) {
      const badTotal = err.errors && err.errors['pricing.total'];
      report('Negative total rejection', !!badTotal, badTotal ? err.errors['pricing.total'].message : err.message);
    }

    // 9. Payment status validation works
    try {
      const badOrder = new Order({
        user: testUser._id,
        orderNumber: `CH-TEST-${Date.now()}-9`,
        customer: { name: 'Test Customer', email: testUser.email, phone: testUser.phone },
        orderType: 'pickup',
        items: [{ menuItem: testMenuItem._id, name: testMenuItem.name, image: testMenuItem.image, price: testMenuItem.price, quantity: 1, subtotal: testMenuItem.price }],
        pricing: { subtotal: testMenuItem.price, total: testMenuItem.price },
        payment: {
          method: 'COD',
          status: 'InvalidStatus' // bad payment status
        }
      });
      await badOrder.save();
      report('Payment status validation rejection', false, 'Allowed invalid payment status');
    } catch (err) {
      const badPayment = err.errors && err.errors['payment.status'];
      report('Payment status validation rejection', !!badPayment, badPayment ? err.errors['payment.status'].message : err.message);
    }

    // 10. Product snapshot fields are preserved
    try {
      const snapOrder = new Order({
        user: testUser._id,
        orderNumber: `CH-SNAP-${Date.now()}`,
        customer: { name: 'Test Customer', email: testUser.email, phone: testUser.phone },
        orderType: 'pickup',
        items: [
          {
            menuItem: testMenuItem._id,
            name: 'Original Test Burger Name',
            image: '/src/assets/images/paneer-burger.jpg',
            price: 199,
            quantity: 1,
            subtotal: 199
          }
        ],
        pricing: { subtotal: 199, total: 199 }
      });
      const savedSnap = await snapOrder.save();

      // Simulate menu item modification in the database
      await MenuItem.findByIdAndUpdate(testMenuItem._id, {
        name: 'New Modded Burger Name',
        price: 249
      });

      // Query order and check if original name/price are preserved
      const retrieved = await Order.findById(savedSnap._id);
      const originalPreserved = retrieved.items[0].name === 'Original Test Burger Name' && retrieved.items[0].price === 199;

      report('Product snapshot fields preservation', originalPreserved, originalPreserved ? 'Original name ("Original Test Burger Name") and price (₹199) remain unchanged' : 'Snapshot data was overwritten');
    } catch (err) {
      report('Product snapshot fields preservation', false, err.message);
    }

  } catch (error) {
    console.error('Fatal error during test run:', error);
  } finally {
    // 11. Clean up test records
    console.log('\n--- Cleaning up temporary records ---');
    try {
      if (testUser) {
        await User.deleteOne({ _id: testUser._id });
        console.log('Cleaned up test User.');
      }
      if (testCategory) {
        await Category.deleteOne({ _id: testCategory._id });
        console.log('Cleaned up test Category.');
      }
      if (testMenuItem) {
        await MenuItem.deleteOne({ _id: testMenuItem._id });
        console.log('Cleaned up test MenuItem.');
      }
      // Delete any test orders
      const deleteCount = await Order.deleteMany({ orderNumber: { $regex: /^CH-(TEST|DUP|SNAP)-/ } });
      console.log(`Cleaned up ${deleteCount.deletedCount} test orders.`);
    } catch (cleanupErr) {
      console.error('Error during cleanup:', cleanupErr.message);
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
