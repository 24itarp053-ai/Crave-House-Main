/**
 * server/src/services/emailService.js
 * Centralized, asynchronous transactional email service for Crave House white-label deployments.
 *
 * Reliability & Security Hardening (Phase 4.5.1 Audit):
 * 1. Atomic Concurrency Lock: Uses MongoDB findOneAndUpdate with state transitions
 *    ('none' | 'failed' -> 'sending') preventing concurrent duplicate dispatches.
 * 2. Accurate Delivery Tracking: Status is only transitioned to 'sent' upon verified transport confirmation.
 *    Failures transition to 'failed' with error reason and incremented attempts.
 * 3. HTML Sanitization: All dynamic user-supplied inputs (names, addresses, instructions, special requests)
 *    are strictly HTML-escaped to prevent HTML injection / XSS in mail clients.
 * 4. Durable Failure Recovery: Includes retryPendingNotifications() to reliably reprocess failed notifications.
 * 5. Strict Secret Isolation: Zero logging or exposure of passwords, tokens, or payment secrets.
 */

const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Reservation = require('../models/Reservation');
const restaurantConfig = require('../config/restaurantConfig');

// In-memory mock store for testing and verification
const mockSentEmails = [];

/**
 * HTML Escaping helper to neutralize HTML injection vulnerabilities in email bodies
 */
function escapeHtml(val) {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Helper to determine active email provider
 */
function getEmailProvider() {
  if (process.env.EMAIL_SERVICE_ENABLED === 'false' || process.env.EMAIL_PROVIDER === 'none') {
    return 'none';
  }
  if (process.env.NODE_ENV === 'test' || process.env.EMAIL_PROVIDER === 'mock') {
    return 'mock';
  }
  if (
    process.env.EMAIL_PROVIDER === 'smtp' ||
    (process.env.EMAIL_SERVICE_ENABLED === 'true' && process.env.SMTP_HOST && process.env.SMTP_USER) ||
    (process.env.SMTP_HOST && process.env.SMTP_USER)
  ) {
    return 'smtp';
  }
  return 'none';
}

/**
 * Initialize nodemailer transporter for SMTP
 */
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    },
    // Strict timeout bounds to prevent hanging the event loop
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000
  });
}

/**
 * Format currency amount using restaurant configuration
 */
function formatAmount(amount) {
  const symbol = restaurantConfig.pricing?.currencySymbol || '₹';
  const val = Number(amount) || 0;
  return `${symbol}${val.toLocaleString(restaurantConfig.pricing?.locale || 'en-IN')}`;
}

/**
 * Core send helper with graceful error handling and non-blocking delivery
 */
async function sendMailAsync({ to, subject, text, html, metadata = {} }) {
  const provider = getEmailProvider();
  let from = process.env.EMAIL_FROM;
  if (!from && process.env.SMTP_FROM_EMAIL) {
    const fromName = process.env.SMTP_FROM_NAME || restaurantConfig.name;
    from = `"${fromName}" <${process.env.SMTP_FROM_EMAIL}>`;
  }
  if (!from) {
    from = `"${restaurantConfig.name}" <${restaurantConfig.contact.email}>`;
  }

  if (!to) {
    return { success: false, reason: 'missing_recipient' };
  }

  // Provider: Mock (Test Suite & Dev Sandbox)
  if (provider === 'mock') {
    const record = {
      to,
      from,
      subject,
      text,
      html,
      metadata,
      sentAt: new Date()
    };
    mockSentEmails.push(record);
    const idSuffix = metadata.orderId ? `order-${metadata.orderId}` : (metadata.reservationId ? `res-${metadata.reservationId}` : `${Date.now()}_${mockSentEmails.length}`);
    return { success: true, provider: 'mock', messageId: `<mock_${idSuffix}@cravehouse.local>` };
  }

  // Provider: Unconfigured
  if (provider === 'none') {
    if (process.env.NODE_ENV !== 'test') {
      console.info(`[EmailService] Email notification skipped for "${to}" (Subject: "${subject}"). Provider not configured. Configure SMTP_HOST, SMTP_USER, and SMTP_PASS in server/.env to enable transactional emails.`);
    }
    return { success: false, provider: 'none', reason: 'unconfigured' };
  }

  // Provider: SMTP via Nodemailer
  try {
    const transporter = createTransporter();
    if (!transporter) {
      console.warn('[EmailService] SMTP delivery skipped: Required SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) are missing or incomplete.');
      return { success: false, provider: 'smtp', reason: 'missing_smtp_credentials', error: 'Missing required SMTP credentials' };
    }

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html
    });

    return { success: true, provider: 'smtp', messageId: info.messageId };
  } catch (err) {
    // Sanitize log: log only generic message without sensitive tokens or passwords
    console.error(`[EmailService] Failed to send email to ${to} (Subject: "${subject}"): ${err.message}`);
    return { success: false, provider: 'smtp', error: err.message };
  }
}

/**
 * Common HTML Email Wrapper Styled with Centralized Theme Tokens
 */
function buildHtmlWrapper({ title, badge, contentHtml }) {
  const primaryColor = restaurantConfig.theme?.primary || '#4e342e';
  const darkColor = restaurantConfig.theme?.dark || '#241713';
  const accentColor = restaurantConfig.theme?.accent || '#d4a373';
  const creamColor = restaurantConfig.theme?.cream || '#f8f5ed';
  const name = escapeHtml(restaurantConfig.name);
  const shortName = escapeHtml(restaurantConfig.shortName);
  const phone = escapeHtml(restaurantConfig.contact?.phone);
  const email = escapeHtml(restaurantConfig.contact?.email);
  const fullAddress = escapeHtml(restaurantConfig.contact?.address?.fullAddress);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} — ${name}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4efe9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2d2019; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
    .header { background-color: ${primaryColor}; padding: 32px 24px; text-align: center; color: #ffffff; }
    .logo-badge { display: inline-block; background-color: ${accentColor}; color: ${darkColor}; font-weight: 800; font-size: 18px; width: 44px; height: 44px; line-height: 44px; border-radius: 8px; margin-bottom: 12px; text-align: center; }
    .header h1 { margin: 0 0 6px 0; font-size: 24px; font-weight: 700; color: #ffffff; }
    .header p { margin: 0; font-size: 14px; opacity: 0.9; color: ${creamColor}; }
    .body { padding: 32px 28px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background: #e8f5e9; color: #2e7d32; margin-bottom: 16px; }
    .badge-warn { background: #fff3e0; color: #e65100; }
    .badge-alert { background: #ffebee; color: #c62828; }
    .badge-info { background: #e3f2fd; color: #1565c0; }
    .item-table { width: 100%; margin: 20px 0; border-top: 1px solid #e0d7cd; border-bottom: 1px solid #e0d7cd; }
    .item-table th { text-align: left; padding: 12px 8px; font-size: 13px; color: #795548; text-transform: uppercase; border-bottom: 1px solid #eee; }
    .item-table td { padding: 12px 8px; font-size: 14px; border-bottom: 1px solid #f5f0eb; }
    .item-table td.num { text-align: right; }
    .total-row { font-size: 16px; font-weight: 700; color: ${primaryColor}; }
    .info-card { background-color: #faf7f2; border: 1px solid #eee6dc; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
    .info-card h3 { margin: 0 0 8px 0; font-size: 15px; color: ${primaryColor}; }
    .info-card p { margin: 4px 0; font-size: 14px; line-height: 1.5; color: #555; }
    .footer { background-color: #f7f4ef; padding: 24px 20px; text-align: center; font-size: 13px; color: #7d6e65; border-top: 1px solid #ebdcd0; }
    .footer a { color: ${primaryColor}; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">${shortName}</div>
      <h1>${name}</h1>
      <p>${escapeHtml(restaurantConfig.tagline)}</p>
    </div>
    <div class="body">
      ${badge ? `<div class="badge ${badge.type || ''}">${escapeHtml(badge.text)}</div>` : ''}
      ${contentHtml}
    </div>
    <div class="footer">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #4e342e;">${name}</p>
      <p style="margin: 0 0 4px 0;">${fullAddress}</p>
      <p style="margin: 0 0 8px 0;">Phone: <a href="tel:${phone}">${phone}</a> | Email: <a href="mailto:${email}">${email}</a></p>
      <p style="margin: 12px 0 0 0; font-size: 11px; opacity: 0.7;">This is an automated notification from ${name}.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Customer Order Confirmation Notification
 * ─────────────────────────────────────────────────────────────────────────────
 */
async function sendOrderConfirmation(order, options = {}) {
  if (!order || !order.customer?.email) {
    return { success: false, reason: 'missing_customer_email' };
  }

  const orderId = order._id || order.id;

  // Atomic Lock Claim: only 1 execution can transition from none/failed to sending
  // Stale locks older than 5 minutes can be claimed in case of previous server crash
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  let claimedOrder = null;

  if (options.isClaimed) {
    claimedOrder = order;
  } else {
    try {
      claimedOrder = await Order.findOneAndUpdate(
        {
          _id: orderId,
          $or: [
            { 'notifications.orderPlaced.status': { $in: ['none', 'failed', null] } },
            { 'notifications.orderPlaced.status': 'sending', 'notifications.orderPlaced.lastAttemptAt': { $lt: fiveMinAgo } },
            { 'notifications.orderPlaced': { $exists: false } }
          ],
          'notifications.orderPlacedSent': { $ne: true }
        },
        {
          $set: {
            'notifications.orderPlaced.status': 'sending',
            'notifications.orderPlaced.lastAttemptAt': new Date()
          },
          $inc: { 'notifications.orderPlaced.attempts': 1 }
        },
        { new: true }
      );
    } catch (err) {
      // If database lookup errors, proceed carefully
    }
  }

  if (!claimedOrder) {
    if (order.notifications?.orderPlacedSent || order.notifications?.orderPlaced?.status === 'sent') {
      return { success: true, skipped: true, reason: 'already_sent' };
    }
    const existsInDb = orderId && mongoose.Types.ObjectId.isValid(orderId) ? await Order.exists({ _id: orderId }) : false;
    if (existsInDb) {
      return { success: true, skipped: true, reason: 'already_sent' };
    }
    claimedOrder = order;
  }

  const orderNum = escapeHtml(claimedOrder.orderNumber || order.orderNumber || 'CH-ORD');
  const customerName = escapeHtml(claimedOrder.customer?.name || order.customer?.name || 'Valued Guest');
  const orderType = (claimedOrder.orderType || order.orderType || 'delivery').toUpperCase();
  const pricing = claimedOrder.pricing || order.pricing || { total: 0 };
  const items = claimedOrder.items || order.items || [];

  // Plain text version
  const textItems = items
    .map(i => `- ${i.quantity}x ${i.name} (${formatAmount(i.price)} each) = ${formatAmount(i.subtotal || i.price * i.quantity)}`)
    .join('\n');

  let orderDetailsText = `Order Type: ${orderType}\n`;
  const addr = claimedOrder.address || order.address;
  const dineIn = claimedOrder.dineInDetails || order.dineInDetails;

  if (order.orderType === 'delivery' && addr) {
    orderDetailsText += `Delivery Address: ${addr.address}, ${addr.city} ${addr.pincode}\n`;
  } else if (order.orderType === 'dine-in' && dineIn) {
    orderDetailsText += `Dine-in Table: ${dineIn.tableNumber} (${dineIn.numberOfGuests} Guests)\n`;
  } else {
    orderDetailsText += `Pickup Location: ${restaurantConfig.contact?.pickupLocationName || restaurantConfig.name}\n`;
  }

  const plainText = `
Hello ${customerName},

Thank you for your order with ${restaurantConfig.name}!
We have received your order #${orderNum} and are getting it ready.

${orderDetailsText}
Items:
${textItems}

Subtotal: ${formatAmount(pricing.subtotal || pricing.total)}
Delivery Fee: ${formatAmount(pricing.deliveryFee || 0)}
Total: ${formatAmount(pricing.total)}
Payment Method: ${(order.payment?.method || 'COD').toUpperCase()} (Status: ${order.payment?.status || 'Pending'})

If you have any questions, call us at ${restaurantConfig.contact?.phone} or reply to ${restaurantConfig.contact?.email}.

Warm regards,
The ${restaurantConfig.name} Team
  `.trim();

  // HTML version with strict input escaping
  const htmlItems = items
    .map(i => `
      <tr>
        <td><strong>${escapeHtml(i.name)}</strong></td>
        <td class="num">${escapeHtml(i.quantity)}</td>
        <td class="num">${formatAmount(i.price)}</td>
        <td class="num">${formatAmount(i.subtotal || i.price * i.quantity)}</td>
      </tr>
    `).join('');

  let detailsCardHtml = '';
  if (order.orderType === 'delivery' && addr) {
    detailsCardHtml = `
      <div class="info-card">
        <h3>Delivery Details</h3>
        <p><strong>Address:</strong> ${escapeHtml(addr.address)}, ${escapeHtml(addr.city)} ${escapeHtml(addr.pincode)}</p>
        ${addr.instructions ? `<p><strong>Instructions:</strong> ${escapeHtml(addr.instructions)}</p>` : ''}
      </div>
    `;
  } else if (order.orderType === 'dine-in' && dineIn) {
    detailsCardHtml = `
      <div class="info-card">
        <h3>Dine-In Details</h3>
        <p><strong>Table:</strong> ${escapeHtml(dineIn.tableNumber)}</p>
        <p><strong>Guests:</strong> ${escapeHtml(dineIn.numberOfGuests)}</p>
      </div>
    `;
  } else {
    detailsCardHtml = `
      <div class="info-card">
        <h3>Takeaway Pickup</h3>
        <p><strong>Location:</strong> ${escapeHtml(restaurantConfig.contact?.pickupLocationName || restaurantConfig.name)}</p>
        <p><strong>Address:</strong> ${escapeHtml(restaurantConfig.contact?.address?.fullAddress)}</p>
      </div>
    `;
  }

  const contentHtml = `
    <h2 style="margin: 0 0 12px 0; font-size: 20px; color: #4e342e;">Order Received!</h2>
    <p style="font-size: 15px; line-height: 1.5; margin: 0 0 16px 0;">Hi <strong>${customerName}</strong>, your order <strong>#${orderNum}</strong> has been placed successfully.</p>
    ${detailsCardHtml}
    <table class="item-table">
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align: right;">Qty</th>
          <th style="text-align: right;">Price</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${htmlItems}
        <tr class="total-row">
          <td colspan="3" style="text-align: right; padding-top: 14px;">Total Amount:</td>
          <td class="num" style="padding-top: 14px;">${formatAmount(pricing.total)}</td>
        </tr>
      </tbody>
    </table>
    <p style="font-size: 14px; color: #666; margin: 12px 0 0 0;">Payment: <strong>${escapeHtml((order.payment?.method || 'COD').toUpperCase())}</strong> (${escapeHtml(order.payment?.status || 'Pending')})</p>
  `;

  const html = buildHtmlWrapper({
    title: `Order Confirmation #${orderNum}`,
    badge: { text: `Order ${orderType}`, type: 'badge-info' },
    contentHtml
  });

  const res = await sendMailAsync({
    to: claimedOrder.customer?.email || order.customer.email,
    subject: `Order Confirmed: #${orderNum} — ${restaurantConfig.name}`,
    text: plainText,
    html,
    metadata: { orderId, orderNumber: orderNum, type: 'order_placed' }
  });

  // Accurate Status Recording based on actual transport outcome
  if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
    try {
      if (res.success) {
        await Order.updateOne(
          { _id: orderId },
          {
            $set: {
              'notifications.orderPlaced.status': 'sent',
              'notifications.orderPlaced.sentAt': new Date(),
              'notifications.orderPlaced.messageId': res.messageId,
              'notifications.orderPlacedSent': true,
              'notifications.orderPlacedSentAt': new Date()
            }
          }
        );
      } else {
        await Order.updateOne(
          { _id: orderId },
          {
            $set: {
              'notifications.orderPlaced.status': 'failed',
              'notifications.orderPlaced.lastError': res.error || res.reason || 'Delivery failed'
            }
          }
        );
      }
    } catch (dbErr) {
      // Non-fatal database update error
    }
  }

  return res;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 2. Table Reservation Confirmation Notification
 * ─────────────────────────────────────────────────────────────────────────────
 */
async function sendReservationConfirmation(reservation, options = {}) {
  if (!reservation || !reservation.email) {
    return { success: false, reason: 'missing_reservation_email' };
  }

  const resId = reservation._id || reservation.id;
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  let claimed = null;

  if (options.isClaimed) {
    claimed = reservation;
  } else {
    try {
      claimed = await Reservation.findOneAndUpdate(
        {
          _id: resId,
          $or: [
            { 'notifications.created.status': { $in: ['none', 'failed', null] } },
            { 'notifications.created.status': 'sending', 'notifications.created.lastAttemptAt': { $lt: fiveMinAgo } },
            { 'notifications.created': { $exists: false } }
          ],
          'notifications.createdSent': { $ne: true }
        },
        {
          $set: {
            'notifications.created.status': 'sending',
            'notifications.created.lastAttemptAt': new Date()
          },
          $inc: { 'notifications.created.attempts': 1 }
        },
        { new: true }
      );
    } catch (err) {
      // Proceed safely
    }
  }

  if (!claimed) {
    if (reservation.notifications?.createdSent || reservation.notifications?.created?.status === 'sent') {
      return { success: true, skipped: true, reason: 'already_sent' };
    }
    const existsInDb = resId && mongoose.Types.ObjectId.isValid(resId) ? await Reservation.exists({ _id: resId }) : false;
    if (existsInDb) {
      return { success: true, skipped: true, reason: 'already_sent' };
    }
    claimed = reservation;
  }

  const displayId = escapeHtml(claimed.reservationId || reservation.reservationId || 'CH-RES');
  const customerName = escapeHtml(claimed.customerName || reservation.customerName || 'Valued Guest');
  const date = escapeHtml(claimed.date || reservation.date);
  const time = escapeHtml(claimed.time || reservation.time);
  const guests = escapeHtml(claimed.guests || reservation.guests);
  const table = escapeHtml(claimed.table || reservation.table || 'Allocated on arrival');
  const duration = escapeHtml(claimed.durationMinutes || reservation.durationMinutes || 90);
  const specialRequest = claimed.specialRequest || reservation.specialRequest;

  const plainText = `
Hello ${customerName},

Your table reservation at ${restaurantConfig.name} is confirmed!

Reservation Details:
- Reservation ID: ${displayId}
- Date: ${date}
- Time: ${time}
- Party Size: ${guests} Guest(s)
- Table: ${table}
- Duration: ${duration} Minutes
${specialRequest ? `- Special Request: ${specialRequest}\n` : ''}
Restaurant Address:
${restaurantConfig.contact?.address?.fullAddress}
Phone: ${restaurantConfig.contact?.phone}

We look forward to welcoming you!

Warm regards,
The ${restaurantConfig.name} Team
  `.trim();

  const contentHtml = `
    <h2 style="margin: 0 0 12px 0; font-size: 20px; color: #4e342e;">Table Reservation Confirmed</h2>
    <p style="font-size: 15px; line-height: 1.5; margin: 0 0 16px 0;">Hello <strong>${customerName}</strong>, we are thrilled to host you at ${restaurantConfig.name}.</p>
    <div class="info-card">
      <h3>Reservation Summary</h3>
      <p><strong>Reservation ID:</strong> ${displayId}</p>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Time:</strong> ${time}</p>
      <p><strong>Guests:</strong> ${guests} People</p>
      <p><strong>Assigned Table:</strong> ${table}</p>
      <p><strong>Dining Slot:</strong> ${duration} Minutes</p>
      ${specialRequest ? `<p><strong>Special Requests:</strong> ${escapeHtml(specialRequest)}</p>` : ''}
    </div>
    <p style="font-size: 14px; color: #555; line-height: 1.5;">Please arrive 5–10 minutes early. If your plans change, feel free to contact us at <a href="tel:${restaurantConfig.contact?.phone}">${restaurantConfig.contact?.phone}</a>.</p>
  `;

  const html = buildHtmlWrapper({
    title: `Reservation Confirmed: ${displayId}`,
    badge: { text: 'Booking Confirmed', type: 'badge' },
    contentHtml
  });

  const res = await sendMailAsync({
    to: claimed.email || reservation.email,
    subject: `Reservation Confirmed: ${displayId} on ${date} at ${time} — ${restaurantConfig.name}`,
    text: plainText,
    html,
    metadata: { reservationId: displayId, type: 'reservation_created' }
  });

  try {
    if (res.success) {
      await Reservation.updateOne(
        { _id: resId },
        {
          $set: {
            'notifications.created.status': 'sent',
            'notifications.created.sentAt': new Date(),
            'notifications.created.messageId': res.messageId,
            'notifications.createdSent': true,
            'notifications.createdSentAt': new Date()
          }
        }
      );
    } else {
      await Reservation.updateOne(
        { _id: resId },
        {
          $set: {
            'notifications.created.status': 'failed',
            'notifications.created.lastError': res.error || res.reason || 'Delivery failed'
          }
        }
      );
    }
  } catch (dbErr) {}

  return res;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 3. Table Reservation Status Update / Cancellation Notification
 * ─────────────────────────────────────────────────────────────────────────────
 */
async function sendReservationStatusUpdate(reservation, newStatus, previousStatus = null, options = {}) {
  if (!reservation || !reservation.email) {
    return { success: false, reason: 'missing_reservation_email' };
  }

  // Guard against unchanged status
  if (previousStatus && previousStatus === newStatus) {
    return { success: true, skipped: true, reason: 'status_unchanged' };
  }

  if (!['Confirmed', 'Cancelled'].includes(newStatus)) {
    return { success: true, skipped: true, reason: 'unnotified_status' };
  }

  const resId = reservation._id || reservation.id;
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  let claimed = null;

  if (options.isClaimed) {
    claimed = reservation;
  } else {
    try {
      claimed = await Reservation.findOneAndUpdate(
        {
          _id: resId,
          'notifications.lastStatusNotified': { $ne: newStatus },
          $or: [
            { 'notifications.statusChange.status': { $in: ['none', 'failed', 'sent', null] } },
            { 'notifications.statusChange.status': 'sending', 'notifications.statusChange.lastAttemptAt': { $lt: fiveMinAgo } },
            { 'notifications.statusChange': { $exists: false } }
          ]
        },
        {
          $set: {
            'notifications.statusChange.status': 'sending',
            'notifications.statusChange.lastAttemptAt': new Date(),
            'notifications.statusChange.targetStatus': newStatus
          },
          $inc: { 'notifications.statusChange.attempts': 1 }
        },
        { new: true }
      );
    } catch (err) {}
  }

  if (!claimed) {
    if (reservation.notifications?.lastStatusNotified === newStatus) {
      return { success: true, skipped: true, reason: 'already_sent' };
    }
    const existsInDb = resId && mongoose.Types.ObjectId.isValid(resId) ? await Reservation.exists({ _id: resId }) : false;
    if (existsInDb) {
      return { success: true, skipped: true, reason: 'already_sent' };
    }
    claimed = reservation;
  }

  const displayId = escapeHtml(claimed.reservationId || reservation.reservationId || 'CH-RES');
  const customerName = escapeHtml(claimed.customerName || reservation.customerName || 'Valued Guest');
  const isCancelled = newStatus === 'Cancelled';
  const badgeType = isCancelled ? 'badge-alert' : 'badge';
  const badgeText = isCancelled ? 'Reservation Cancelled' : `Reservation ${newStatus}`;

  const plainText = `
Hello ${customerName},

Your reservation #${displayId} at ${restaurantConfig.name} on ${reservation.date} has been updated to: ${newStatus.toUpperCase()}.

${isCancelled ? 'We are sorry you had to cancel. We hope to serve you another time!' : 'Your table is confirmed and ready for your visit.'}

Details:
- Reservation ID: ${displayId}
- Date: ${reservation.date}
- Time: ${reservation.time}
- Party Size: ${reservation.guests} Guest(s)
- Table: ${reservation.table || 'N/A'}

If you have questions, please reach out at ${restaurantConfig.contact?.phone}.

Warm regards,
The ${restaurantConfig.name} Team
  `.trim();

  const contentHtml = `
    <h2 style="margin: 0 0 12px 0; font-size: 20px; color: #4e342e;">Reservation Status Update</h2>
    <p style="font-size: 15px; line-height: 1.5; margin: 0 0 16px 0;">Hello <strong>${customerName}</strong>, your reservation <strong>#${displayId}</strong> status is now <strong>${escapeHtml(newStatus)}</strong>.</p>
    <div class="info-card">
      <h3>Booking Details</h3>
      <p><strong>Reservation ID:</strong> ${displayId}</p>
      <p><strong>Date & Time:</strong> ${escapeHtml(reservation.date)} at ${escapeHtml(reservation.time)}</p>
      <p><strong>Party Size:</strong> ${escapeHtml(reservation.guests)} Guests</p>
      <p><strong>Status:</strong> <span style="font-weight: 700; color: ${isCancelled ? '#c62828' : '#2e7d32'};">${escapeHtml(newStatus)}</span></p>
    </div>
    ${isCancelled
      ? '<p style="font-size: 14px; color: #555;">If this cancellation was in error, please contact us right away to rebook.</p>'
      : '<p style="font-size: 14px; color: #555;">We look forward to seeing you at our restaurant.</p>'
    }
  `;

  const html = buildHtmlWrapper({
    title: `Reservation ${newStatus}: ${displayId}`,
    badge: { text: badgeText, type: badgeType },
    contentHtml
  });

  const res = await sendMailAsync({
    to: claimed.email || reservation.email,
    subject: `Reservation #${displayId} Update: ${newStatus} — ${restaurantConfig.name}`,
    text: plainText,
    html,
    metadata: { reservationId: displayId, status: newStatus, type: 'reservation_status' }
  });

  try {
    if (res.success) {
      await Reservation.updateOne(
        { _id: resId },
        {
          $set: {
            'notifications.statusChange.status': 'sent',
            'notifications.statusChange.lastStatusNotified': newStatus,
            'notifications.statusChange.sentAt': new Date(),
            'notifications.statusChange.messageId': res.messageId,
            'notifications.statusChangedSent': true,
            'notifications.lastStatusNotified': newStatus,
            'notifications.statusChangedSentAt': new Date()
          }
        }
      );
    } else {
      await Reservation.updateOne(
        { _id: resId },
        {
          $set: {
            'notifications.statusChange.status': 'failed',
            'notifications.statusChange.lastError': res.error || res.reason || 'Delivery failed'
          }
        }
      );
    }
  } catch (dbErr) {}

  return res;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 4. Verified Payment Success Notification
 * ─────────────────────────────────────────────────────────────────────────────
 * CRITICAL: This is only triggered after server-side cryptographic verification
 * (HMAC SHA256 in /api/payments/verify or verified Razorpay webhook payload).
 */
async function sendPaymentSuccess(order, payment = {}, options = {}) {
  if (!order || !order.customer?.email) {
    return { success: false, reason: 'missing_customer_email' };
  }

  const orderId = order._id || order.id;
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  let claimed = null;

  if (options.isClaimed) {
    claimed = order;
  } else {
    try {
      claimed = await Order.findOneAndUpdate(
        {
          _id: orderId,
          $or: [
            { 'notifications.paymentSuccess.status': { $in: ['none', 'failed', null] } },
            { 'notifications.paymentSuccess.status': 'sending', 'notifications.paymentSuccess.lastAttemptAt': { $lt: fiveMinAgo } },
            { 'notifications.paymentSuccess': { $exists: false } }
          ],
          'notifications.paymentSuccessSent': { $ne: true }
        },
        {
          $set: {
            'notifications.paymentSuccess.status': 'sending',
            'notifications.paymentSuccess.lastAttemptAt': new Date()
          },
          $inc: { 'notifications.paymentSuccess.attempts': 1 }
        },
        { new: true }
      );
    } catch (err) {}
  }

  if (!claimed) {
    if (order.notifications?.paymentSuccessSent || order.notifications?.paymentSuccess?.status === 'sent') {
      return { success: true, skipped: true, reason: 'already_sent' };
    }
    const existsInDb = orderId && mongoose.Types.ObjectId.isValid(orderId) ? await Order.exists({ _id: orderId }) : false;
    if (existsInDb) {
      return { success: true, skipped: true, reason: 'already_sent' };
    }
    claimed = order;
  }

  const orderNum = escapeHtml(claimed.orderNumber || order.orderNumber || 'CH-ORD');
  const customerName = escapeHtml(claimed.customer?.name || order.customer?.name || 'Valued Guest');
  const txnId = escapeHtml(payment.razorpayPaymentId || order.payment?.transactionId || 'ONLINE-TXN');
  const amountPaid = formatAmount(claimed.pricing?.total || order.pricing?.total || payment.amount || 0);
  const paymentMethod = escapeHtml((payment.method || order.payment?.method || 'Online Payment').toUpperCase());

  const plainText = `
Hello ${customerName},

We have received and verified your payment of ${amountPaid} for order #${orderNum}!

Payment Details:
- Transaction ID: ${txnId}
- Amount Paid: ${amountPaid}
- Payment Method: ${paymentMethod}
- Order Status: Confirmed & Preparing

Your order is now confirmed and our kitchen is preparing it with care.
You can track your order status in your ${restaurantConfig.name} account.

Thank you for dining with us!

Warm regards,
The ${restaurantConfig.name} Team
  `.trim();

  const contentHtml = `
    <h2 style="margin: 0 0 12px 0; font-size: 20px; color: #4e342e;">Payment Verified & Confirmed</h2>
    <p style="font-size: 15px; line-height: 1.5; margin: 0 0 16px 0;">Hello <strong>${customerName}</strong>, thank you! Your payment for order <strong>#${orderNum}</strong> has been verified.</p>
    <div class="info-card">
      <h3>Payment Receipt</h3>
      <p><strong>Order Number:</strong> #${orderNum}</p>
      <p><strong>Transaction ID:</strong> <code style="background: #eef; padding: 2px 6px; border-radius: 4px;">${txnId}</code></p>
      <p><strong>Amount Paid:</strong> <strong style="color: #2e7d32;">${amountPaid}</strong></p>
      <p><strong>Method:</strong> ${paymentMethod}</p>
      <p><strong>Order Status:</strong> Confirmed</p>
    </div>
    <p style="font-size: 14px; color: #555;">Our team is now preparing your delicious meal. We will notify you when it is ready or on its way!</p>
  `;

  const html = buildHtmlWrapper({
    title: `Payment Receipt: Order #${orderNum}`,
    badge: { text: 'Payment Successful', type: 'badge' },
    contentHtml
  });

  const res = await sendMailAsync({
    to: claimed.customer?.email || order.customer.email,
    subject: `Payment Successful for Order #${orderNum} (${amountPaid}) — ${restaurantConfig.name}`,
    text: plainText,
    html,
    metadata: { orderId, orderNumber: orderNum, txnId, type: 'payment_success' }
  });

  try {
    if (res.success) {
      await Order.updateOne(
        { _id: orderId },
        {
          $set: {
            'notifications.paymentSuccess.status': 'sent',
            'notifications.paymentSuccess.sentAt': new Date(),
            'notifications.paymentSuccess.messageId': res.messageId,
            'notifications.paymentSuccessSent': true,
            'notifications.paymentSuccessSentAt': new Date()
          }
        }
      );
    } else {
      await Order.updateOne(
        { _id: orderId },
        {
          $set: {
            'notifications.paymentSuccess.status': 'failed',
            'notifications.paymentSuccess.lastError': res.error || res.reason || 'Delivery failed'
          }
        }
      );
    }
  } catch (dbErr) {}

  return res;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 5. Durable Queue / Failure Recovery Retry Helper & Production Runner
 * ─────────────────────────────────────────────────────────────────────────────
 * Lightweight, MongoDB-native retry processor for failed or aborted notifications.
 * Automatically recovers from SMTP timeouts, temporary network errors, or process restarts.
 *
 * Delivery Guarantee Audit Note:
 * Delivery guarantee is AT-LEAST-ONCE. While atomic MongoDB locks ensure exactly-once
 * dispatch under normal operation, in the rare failure window where SMTP accepts a message (250 OK)
 * but the application crashes before the database write commits, a duplicate email may be delivered
 * upon recovery.
 */
async function retryPendingNotifications(maxAttempts = 3) {
  const configuredMax = parseInt(process.env.EMAIL_RETRY_MAX_ATTEMPTS, 10);
  const effectiveMax = !isNaN(configuredMax) && configuredMax > 0 ? configuredMax : maxAttempts;

  const results = {
    retriedOrders: 0,
    retriedReservations: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0
  };

  try {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

    // 1. Find orders with failed notifications OR stale sending locks (> 5 mins old)
    const pendingOrders = await Order.find({
      $or: [
        { 'notifications.orderPlaced.status': 'failed', 'notifications.orderPlaced.attempts': { $lt: effectiveMax } },
        { 'notifications.orderPlaced.status': 'sending', 'notifications.orderPlaced.lastAttemptAt': { $lt: fiveMinAgo }, 'notifications.orderPlaced.attempts': { $lt: effectiveMax } },
        { 'notifications.paymentSuccess.status': 'failed', 'notifications.paymentSuccess.attempts': { $lt: effectiveMax } },
        { 'notifications.paymentSuccess.status': 'sending', 'notifications.paymentSuccess.lastAttemptAt': { $lt: fiveMinAgo }, 'notifications.paymentSuccess.attempts': { $lt: effectiveMax } }
      ]
    }).limit(50);

    for (const order of pendingOrders) {
      // Check orderPlaced notification
      const isPlacedPending = order.notifications?.orderPlaced?.status === 'failed' ||
        (order.notifications?.orderPlaced?.status === 'sending' && order.notifications?.orderPlaced?.lastAttemptAt < fiveMinAgo);

      if (isPlacedPending && (order.notifications?.orderPlaced?.attempts || 0) < effectiveMax) {
        results.retriedOrders++;
        const res = await sendOrderConfirmation(order);
        if (res.success && !res.skipped) results.succeeded++;
        else if (res.skipped) results.skipped++;
        else if (!res.success) results.failed++;
      }

      // Check paymentSuccess notification
      const isPayPending = order.notifications?.paymentSuccess?.status === 'failed' ||
        (order.notifications?.paymentSuccess?.status === 'sending' && order.notifications?.paymentSuccess?.lastAttemptAt < fiveMinAgo);

      if (isPayPending && (order.notifications?.paymentSuccess?.attempts || 0) < effectiveMax) {
        results.retriedOrders++;
        const res = await sendPaymentSuccess(order, { razorpayPaymentId: order.payment?.transactionId });
        if (res.success && !res.skipped) results.succeeded++;
        else if (res.skipped) results.skipped++;
        else if (!res.success) results.failed++;
      }
    }

    // 2. Find reservations with failed notifications OR stale sending locks (> 5 mins old)
    const pendingReservations = await Reservation.find({
      $or: [
        { 'notifications.created.status': 'failed', 'notifications.created.attempts': { $lt: effectiveMax } },
        { 'notifications.created.status': 'sending', 'notifications.created.lastAttemptAt': { $lt: fiveMinAgo }, 'notifications.created.attempts': { $lt: effectiveMax } },
        { 'notifications.statusChange.status': 'failed', 'notifications.statusChange.attempts': { $lt: effectiveMax } },
        { 'notifications.statusChange.status': 'sending', 'notifications.statusChange.lastAttemptAt': { $lt: fiveMinAgo }, 'notifications.statusChange.attempts': { $lt: effectiveMax } }
      ]
    }).limit(50);

    for (const rsv of pendingReservations) {
      // Check created notification
      const isCreatedPending = rsv.notifications?.created?.status === 'failed' ||
        (rsv.notifications?.created?.status === 'sending' && rsv.notifications?.created?.lastAttemptAt < fiveMinAgo);

      if (isCreatedPending && (rsv.notifications?.created?.attempts || 0) < effectiveMax) {
        results.retriedReservations++;
        const res = await sendReservationConfirmation(rsv);
        if (res.success && !res.skipped) results.succeeded++;
        else if (res.skipped) results.skipped++;
        else if (!res.success) results.failed++;
      }

      // Check statusChange notification
      const isStatusPending = rsv.notifications?.statusChange?.status === 'failed' ||
        (rsv.notifications?.statusChange?.status === 'sending' && rsv.notifications?.statusChange?.lastAttemptAt < fiveMinAgo);

      if (isStatusPending && (rsv.notifications?.statusChange?.attempts || 0) < effectiveMax) {
        results.retriedReservations++;
        const targetStatus = rsv.notifications?.statusChange?.targetStatus || rsv.notifications?.statusChange?.lastStatusNotified || rsv.status;
        const res = await sendReservationStatusUpdate(rsv, targetStatus);
        if (res.success && !res.skipped) results.succeeded++;
        else if (res.skipped) results.skipped++;
        else if (!res.success) results.failed++;
      }
    }
  } catch (err) {
    console.error('[EmailService] Error running retryPendingNotifications:', err.message);
  }

  return results;
}

/**
 * Mutex & State for Periodic Production Runner
 */
let retryIntervalTimer = null;
let isRetrying = false;

/**
 * Execute a single safe retry cycle with in-process mutual exclusion
 */
async function runRetryCycle(maxAttempts = 3) {
  if (isRetrying) {
    return { skipped: true, reason: 'already_running' };
  }
  isRetrying = true;
  try {
    const configuredMax = parseInt(process.env.EMAIL_RETRY_MAX_ATTEMPTS, 10);
    const effectiveMax = !isNaN(configuredMax) && configuredMax > 0 ? configuredMax : maxAttempts;
    const summary = await retryPendingNotifications(effectiveMax);
    if (summary.retriedOrders > 0 || summary.retriedReservations > 0) {
      console.log(`[EmailRetryRunner] Completed cycle: ${summary.succeeded} sent, ${summary.failed} failed.`);
    }
    return summary;
  } catch (err) {
    console.error(`[EmailRetryRunner] Error during retry cycle: ${err.message}`);
    return { error: err.message };
  } finally {
    isRetrying = false;
  }
}

/**
 * Start the periodic background retry runner (default: 5 minutes)
 */
function startRetryRunner(intervalMs = 5 * 60 * 1000) {
  if (process.env.EMAIL_RETRY_ENABLED === 'false') {
    return null;
  }
  if (retryIntervalTimer) {
    return retryIntervalTimer;
  }
  const configuredInterval = parseInt(process.env.EMAIL_RETRY_INTERVAL_MS, 10) || intervalMs;
  retryIntervalTimer = setInterval(() => {
    runRetryCycle().catch(err => {
      console.error('[EmailRetryRunner] Uncaught error in interval cycle:', err.message);
    });
  }, configuredInterval);

  if (retryIntervalTimer.unref) {
    retryIntervalTimer.unref();
  }
  return retryIntervalTimer;
}

/**
 * Stop the background retry runner cleanly
 */
function stopRetryRunner() {
  if (retryIntervalTimer) {
    clearInterval(retryIntervalTimer);
    retryIntervalTimer = null;
  }
  isRetrying = false;
}

/**
 * Helper to check runner status
 */
function isRetryRunnerActive() {
  return retryIntervalTimer !== null;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 6. Operational Visibility & Controlled Manual Recovery for Exhausted Notifications
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Identify all permanently exhausted email notifications across Orders and Reservations.
 * Operational visibility helper returning diagnostics without customer PII or secrets.
 *
 * @param {number} maxAttempts - Attempt threshold (default: 3)
 * @returns {Promise<Array>} List of exhausted notification metadata objects
 */
async function getExhaustedNotifications(maxAttempts = 3) {
  const configuredMax = parseInt(process.env.EMAIL_RETRY_MAX_ATTEMPTS, 10);
  const effectiveMax = !isNaN(configuredMax) && configuredMax > 0 ? configuredMax : maxAttempts;
  const exhausted = [];

  try {
    // 1. Check Orders
    const orders = await Order.find({
      $or: [
        { 'notifications.orderPlaced.status': 'failed', 'notifications.orderPlaced.attempts': { $gte: effectiveMax } },
        { 'notifications.paymentSuccess.status': 'failed', 'notifications.paymentSuccess.attempts': { $gte: effectiveMax } }
      ]
    }).select('_id orderNumber customer.email notifications.orderPlaced notifications.paymentSuccess createdAt');

    for (const ord of orders) {
      if (ord.notifications?.orderPlaced?.status === 'failed' && (ord.notifications.orderPlaced.attempts || 0) >= effectiveMax) {
        exhausted.push({
          entityType: 'order',
          entityId: ord._id.toString(),
          displayId: ord.orderNumber || 'CH-ORD',
          notificationType: 'orderPlaced',
          status: 'failed',
          attempts: ord.notifications.orderPlaced.attempts,
          lastAttemptAt: ord.notifications.orderPlaced.lastAttemptAt,
          lastError: ord.notifications.orderPlaced.lastError || 'Delivery failed',
          hasRecipient: Boolean(ord.customer?.email)
        });
      }
      if (ord.notifications?.paymentSuccess?.status === 'failed' && (ord.notifications.paymentSuccess.attempts || 0) >= effectiveMax) {
        exhausted.push({
          entityType: 'order',
          entityId: ord._id.toString(),
          displayId: ord.orderNumber || 'CH-ORD',
          notificationType: 'paymentSuccess',
          status: 'failed',
          attempts: ord.notifications.paymentSuccess.attempts,
          lastAttemptAt: ord.notifications.paymentSuccess.lastAttemptAt,
          lastError: ord.notifications.paymentSuccess.lastError || 'Delivery failed',
          hasRecipient: Boolean(ord.customer?.email)
        });
      }
    }

    // 2. Check Reservations
    const reservations = await Reservation.find({
      $or: [
        { 'notifications.created.status': 'failed', 'notifications.created.attempts': { $gte: effectiveMax } },
        { 'notifications.statusChange.status': 'failed', 'notifications.statusChange.attempts': { $gte: effectiveMax } }
      ]
    }).select('_id reservationId email notifications.created notifications.statusChange createdAt');

    for (const rsv of reservations) {
      if (rsv.notifications?.created?.status === 'failed' && (rsv.notifications.created.attempts || 0) >= effectiveMax) {
        exhausted.push({
          entityType: 'reservation',
          entityId: rsv._id.toString(),
          displayId: rsv.reservationId || 'CH-RES',
          notificationType: 'created',
          status: 'failed',
          attempts: rsv.notifications.created.attempts,
          lastAttemptAt: rsv.notifications.created.lastAttemptAt,
          lastError: rsv.notifications.created.lastError || 'Delivery failed',
          hasRecipient: Boolean(rsv.email)
        });
      }
      if (rsv.notifications?.statusChange?.status === 'failed' && (rsv.notifications.statusChange.attempts || 0) >= effectiveMax) {
        exhausted.push({
          entityType: 'reservation',
          entityId: rsv._id.toString(),
          displayId: rsv.reservationId || 'CH-RES',
          notificationType: 'statusChange',
          status: 'failed',
          attempts: rsv.notifications.statusChange.attempts,
          lastAttemptAt: rsv.notifications.statusChange.lastAttemptAt,
          lastError: rsv.notifications.statusChange.lastError || 'Delivery failed',
          hasRecipient: Boolean(rsv.email)
        });
      }
    }
  } catch (err) {
    console.error('[EmailService] Error fetching exhausted notifications:', err.message);
  }

  return exhausted;
}

/**
 * Controlled manual retry of an exhausted notification.
 *
 * Operational Policy:
 * 1. Concurrency safety: Atomically verifies that notification is NOT currently in 'sending'
 *    state within the active lock timeout window (5 mins). Rejects with 'currently_sending' if locked.
 * 2. Attempt policy:
 *    - If resetAttempts === true: resets attempts to 1.
 *    - If resetAttempts === false (default): increments attempt counter (e.g. 3 -> 4)
 *      and executes a one-off retry without resetting the exhausted threshold.
 *      Because attempts remain >= maxAttempts, it will NOT be picked up by the automatic
 *      periodic runner, preventing indefinite silent retries.
 * 3. Atomic claim: Transitions status from 'failed' to 'sending' before attempting dispatch.
 */
async function retryExhaustedNotification({ entityType, entityId, notificationType, resetAttempts = false, maxAttempts = 3 }) {
  if (!entityType || !entityId || !notificationType) {
    return { success: false, reason: 'missing_parameters' };
  }

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

  if (entityType === 'order') {
    const order = await Order.findById(entityId);
    if (!order) return { success: false, reason: 'order_not_found' };

    const notif = order.notifications?.[notificationType];
    if (!notif && notificationType !== 'orderPlaced' && notificationType !== 'paymentSuccess') {
      return { success: false, reason: 'invalid_notification_type' };
    }

    if (notif?.status === 'sent' || order.notifications?.[`${notificationType}Sent`]) {
      return { success: true, skipped: true, reason: 'already_sent' };
    }

    // Reject if currently being dispatched by an active worker
    if (notif?.status === 'sending' && notif?.lastAttemptAt && notif.lastAttemptAt >= fiveMinAgo) {
      return { success: false, reason: 'currently_sending' };
    }

    const updateOps = {
      $set: {
        [`notifications.${notificationType}.status`]: 'sending',
        [`notifications.${notificationType}.lastAttemptAt`]: new Date()
      }
    };
    if (resetAttempts) {
      updateOps.$set[`notifications.${notificationType}.attempts`] = 1;
    } else {
      updateOps.$inc = { [`notifications.${notificationType}.attempts`]: 1 };
    }

    const claimed = await Order.findOneAndUpdate(
      {
        _id: entityId,
        $or: [
          { [`notifications.${notificationType}.status`]: { $in: ['failed', 'none', null] } },
          { [`notifications.${notificationType}.status`]: 'sending', [`notifications.${notificationType}.lastAttemptAt`]: { $lt: fiveMinAgo } },
          { [`notifications.${notificationType}`]: { $exists: false } }
        ],
        [`notifications.${notificationType}Sent`]: { $ne: true }
      },
      updateOps,
      { new: true }
    );

    if (!claimed) {
      return { success: false, reason: 'lock_conflict_or_already_sent' };
    }

    if (notificationType === 'orderPlaced') {
      return await sendOrderConfirmation(claimed, { isClaimed: true });
    } else if (notificationType === 'paymentSuccess') {
      return await sendPaymentSuccess(claimed, { razorpayPaymentId: claimed.payment?.transactionId }, { isClaimed: true });
    }
  } else if (entityType === 'reservation') {
    const rsv = await Reservation.findById(entityId);
    if (!rsv) return { success: false, reason: 'reservation_not_found' };

    const notif = rsv.notifications?.[notificationType];
    if (!notif && notificationType !== 'created' && notificationType !== 'statusChange') {
      return { success: false, reason: 'invalid_notification_type' };
    }

    if (notif?.status === 'sent' || rsv.notifications?.[`${notificationType}Sent`]) {
      return { success: true, skipped: true, reason: 'already_sent' };
    }

    if (notif?.status === 'sending' && notif?.lastAttemptAt && notif.lastAttemptAt >= fiveMinAgo) {
      return { success: false, reason: 'currently_sending' };
    }

    const updateOps = {
      $set: {
        [`notifications.${notificationType}.status`]: 'sending',
        [`notifications.${notificationType}.lastAttemptAt`]: new Date()
      }
    };
    if (resetAttempts) {
      updateOps.$set[`notifications.${notificationType}.attempts`] = 1;
    } else {
      updateOps.$inc = { [`notifications.${notificationType}.attempts`]: 1 };
    }

    const claimed = await Reservation.findOneAndUpdate(
      {
        _id: entityId,
        $or: [
          { [`notifications.${notificationType}.status`]: { $in: ['failed', 'none', null] } },
          { [`notifications.${notificationType}.status`]: 'sending', [`notifications.${notificationType}.lastAttemptAt`]: { $lt: fiveMinAgo } },
          { [`notifications.${notificationType}`]: { $exists: false } }
        ],
        [`notifications.${notificationType}Sent`]: { $ne: true }
      },
      updateOps,
      { new: true }
    );

    if (!claimed) {
      return { success: false, reason: 'lock_conflict_or_already_sent' };
    }

    if (notificationType === 'created') {
      return await sendReservationConfirmation(claimed, { isClaimed: true });
    } else if (notificationType === 'statusChange') {
      const targetStatus = claimed.notifications?.statusChange?.targetStatus || claimed.notifications?.statusChange?.lastStatusNotified || claimed.status;
      return await sendReservationStatusUpdate(claimed, targetStatus, null, { isClaimed: true });
    }
  }

  return { success: false, reason: 'unsupported_entity_type' };
}

/**
 * Inspection and test helpers
 */
function getSentEmails() {
  return [...mockSentEmails];
}

function clearSentEmails() {
  mockSentEmails.length = 0;
}

module.exports = {
  escapeHtml,
  getEmailProvider,
  sendOrderConfirmation,
  sendReservationConfirmation,
  sendReservationStatusUpdate,
  sendPaymentSuccess,
  retryPendingNotifications,
  runRetryCycle,
  startRetryRunner,
  stopRetryRunner,
  isRetryRunnerActive,
  getExhaustedNotifications,
  retryExhaustedNotification,
  getSentEmails,
  clearSentEmails
};
