const Reservation = require('../models/Reservation');
const Table = require('../models/Table');
const restaurantConfig = require('../config/restaurantConfig');
const { sendReservationConfirmation, sendReservationStatusUpdate } = require('../services/emailService');
const mongoose = require('mongoose');

// Standard dining slot duration in minutes
const DEFAULT_SLOT_DURATION_MINUTES = restaurantConfig.reservationSettings?.defaultDurationMinutes || 90;

/**
 * Concurrency Mutex to synchronize table evaluation and reservation creation.
 * Prevents overlapping double-booking race conditions between concurrent requests.
 */
class AsyncMutex {
  constructor() {
    this.queue = Promise.resolve();
  }

  runExclusive(fn) {
    const res = this.queue.then(fn, fn);
    this.queue = res.catch(() => {});
    return res;
  }
}

const reservationAllocationMutex = new AsyncMutex();

/**
 * Validates opening hours using configurable backend restaurant settings:
 * Configurable via environment variables or restaurantConfig.js.
 * Enforces opening time and last-seating cutoff (30 mins before closing).
 */
function isWithinBusinessHours(dateStr, timeStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dayOfWeek = d.getUTCDay(); // 0 = Sun, 6 = Sat
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const [hours, minutes] = timeStr.split(':').map(Number);
  const totalMinutes = hours * 60 + (minutes || 0);

  const hoursConfig = isWeekend
    ? restaurantConfig.businessHours.weekends
    : restaurantConfig.businessHours.weekdays;

  const openMinutes = hoursConfig.openMinutes;
  const lastBookingTime = hoursConfig.lastBookingMinutes;

  if (totalMinutes < openMinutes || totalMinutes > lastBookingTime) {
    return {
      valid: false,
      message: `Requested time is outside business hours. Our opening hours are ${hoursConfig.label}.`
    };
  }

  return { valid: true };
}

/**
 * Checks table availability and finds the best matching table
 */
async function evaluateTableAvailability({ date, time, guests, durationMinutes = DEFAULT_SLOT_DURATION_MINUTES }) {
  // 1. Validate date format (YYYY-MM-DD)
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { available: false, statusCode: 400, message: 'Invalid date format. Expected YYYY-MM-DD.' };
  }

  // 2. Validate date is not in the past
  const todayStr = new Date().toISOString().split('T')[0];
  if (date < todayStr) {
    return { available: false, statusCode: 400, message: 'Reservation date cannot be in the past.' };
  }

  // 3. Validate time format (HH:MM or H:MM)
  if (!time || !/^\d{1,2}:\d{2}$/.test(time)) {
    return { available: false, statusCode: 400, message: 'Invalid time format. Expected HH:MM.' };
  }

  // 4. Validate party size
  const minParty = restaurantConfig.reservationSettings?.minPartySize || 1;
  const maxParty = restaurantConfig.reservationSettings?.maxPartySize || 20;
  const guestsNum = parseInt(guests, 10);
  if (isNaN(guestsNum) || guestsNum < minParty) {
    return { available: false, statusCode: 400, message: `Number of guests must be at least ${minParty}.` };
  }
  if (guestsNum > maxParty) {
    return { available: false, statusCode: 400, message: `For groups larger than ${maxParty} guests, please contact us directly for private event booking.` };
  }

  // 5. Business hours check
  const hoursCheck = isWithinBusinessHours(date, time);
  if (!hoursCheck.valid) {
    return { available: false, statusCode: 400, message: hoursCheck.message };
  }

  // 6. Calculate requested time slot window
  const [reqH, reqM] = time.split(':').map(Number);
  const reqStart = reqH * 60 + (reqM || 0);
  const reqEnd = reqStart + durationMinutes;

  // 7. Fetch all active tables
  const activeTables = await Table.find({ isActive: true }).sort({ capacity: 1 });

  // 8. Fetch overlapping active reservations for this date
  const existingReservations = await Reservation.find({
    date,
    status: { $in: ['Pending', 'Confirmed'] }
  });

  // Filter reservations overlapping with requested window:
  // slotStart < existingEnd && slotEnd > existingStart
  const overlappingReservations = existingReservations.filter(r => {
    if (!r.time) return false;
    const [h, m] = r.time.split(':').map(Number);
    const startMin = h * 60 + (m || 0);
    const duration = r.durationMinutes || DEFAULT_SLOT_DURATION_MINUTES;
    const endMin = startMin + duration;
    return reqStart < endMin && reqEnd > startMin;
  });

  // Set of occupied table IDs and table numbers
  const occupiedTableIds = new Set();
  const occupiedTableNumbers = new Set();
  for (const r of overlappingReservations) {
    if (r.tableId) occupiedTableIds.add(r.tableId.toString());
    if (r.table && r.table !== 'T-TBD') occupiedTableNumbers.add(r.table.toUpperCase());
  }

  // Filter free active tables
  const availableTables = activeTables.filter((t) =>
    !occupiedTableIds.has(t._id.toString()) &&
    !occupiedTableNumbers.has(t.tableNumber.toUpperCase())
  );

  const totalConfiguredTables = await Table.countDocuments();

  // If tables are configured in the system but none are active, do not allow bookings
  if (totalConfiguredTables > 0 && activeTables.length === 0) {
    return {
      available: false,
      statusCode: 200,
      message: 'Sorry, no active tables are currently available for reservations. Please try another time or contact us.'
    };
  }

  // If database has never been configured with tables, fallback gracefully to default capacity
  if (totalConfiguredTables === 0) {
    const totalBookedGuests = overlappingReservations.reduce((acc, r) => acc + (r.guests || 2), 0);
    const defaultCapacity = 60;
    if (totalBookedGuests + guestsNum > defaultCapacity) {
      return {
        available: false,
        statusCode: 200,
        message: 'Sorry, we are fully booked for this time slot. Please try another hour.'
      };
    }
    return {
      available: true,
      statusCode: 200,
      message: 'Tables are available! You can proceed to book.',
      assignedTable: null
    };
  }

  // Find candidate table with minimum sufficient capacity (best fit)
  const suitableTables = availableTables.filter(t => t.capacity >= guestsNum);

  if (suitableTables.length > 0) {
    const candidateTable = suitableTables[0];
    return {
      available: true,
      statusCode: 200,
      message: 'Tables are available! You can proceed to book.',
      assignedTable: candidateTable,
      availableTableCount: availableTables.length
    };
  }

  // If party is large (> 10) and multiple tables can combine:
  const totalAvailableCapacity = availableTables.reduce((acc, t) => acc + t.capacity, 0);
  if (guestsNum > 10 && totalAvailableCapacity >= guestsNum) {
    return {
      available: true,
      statusCode: 200,
      message: 'Tables are available! You can proceed to book.',
      assignedTable: null,
      availableTableCount: availableTables.length
    };
  }

  // Otherwise, no suitable table is free
  return {
    available: false,
    statusCode: 200,
    message: 'Sorry, no suitable tables are available for your party size during this time slot. Please try another time.'
  };
}

/**
 * Generate a random reservation ID format: CH-R<6-digit>
 */
function generateReservationId() {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `CH-R${rand}`;
}

/**
 * GET /api/reservations/availability
 * Check live table availability for given date, time, and party size
 * Access: Public
 */
exports.checkAvailability = async (req, res) => {
  try {
    const date = req.query.date || req.body.date;
    const time = req.query.time || req.body.time;
    const guests = req.query.guests || req.body.guests;

    if (!date || !time || !guests) {
      return res.status(400).json({
        success: false,
        message: 'Date, time, and guests parameters are required'
      });
    }

    const evaluation = await evaluateTableAvailability({
      date,
      time,
      guests
    });

    return res.status(evaluation.statusCode || 200).json({
      success: evaluation.available,
      available: evaluation.available,
      message: evaluation.message,
      availableTableCount: evaluation.availableTableCount
    });
  } catch (error) {
    console.error('Error checking reservation availability:', error);
    res.status(500).json({
      success: false,
      message: 'Server error checking table availability'
    });
  }
};

/**
 * POST /api/reservations
 * Create a new table reservation with database availability verification
 * Access: Private (Authenticated Customer)
 */
exports.createReservation = async (req, res) => {
  return reservationAllocationMutex.runExclusive(async () => {
    try {
      const { customerName, email, phone, date, time, guests, specialRequest, reservationId, durationMinutes } = req.body;

      if (!customerName || !email || !phone || !date || !time || !guests) {
        return res.status(400).json({
          success: false,
          message: 'Please fill in all required fields.'
        });
      }

      const minParty = restaurantConfig.reservationSettings?.minPartySize || 1;
      const maxParty = restaurantConfig.reservationSettings?.maxPartySize || 20;
      const guestsNum = parseInt(guests, 10);
      if (isNaN(guestsNum) || guestsNum < minParty || guestsNum > maxParty) {
        return res.status(400).json({
          success: false,
          message: `Number of guests must be between ${minParty} and ${maxParty}.`
        });
      }

      const slotDuration = durationMinutes || DEFAULT_SLOT_DURATION_MINUTES;

      // Re-evaluate table availability at time of booking
      const evaluation = await evaluateTableAvailability({
        date,
        time,
        guests: guestsNum,
        durationMinutes: slotDuration
      });

      if (!evaluation.available) {
        return res.status(evaluation.statusCode === 400 ? 400 : 409).json({
          success: false,
          message: evaluation.message
        });
      }

      // Set custom generated reservation ID if not provided by client
      const finalReservationId = reservationId || generateReservationId();

      const assignedTableNumber = evaluation.assignedTable
        ? evaluation.assignedTable.tableNumber
        : 'T-TBD';
      const assignedTableId = evaluation.assignedTable
        ? evaluation.assignedTable._id
        : null;

      const reservation = await Reservation.create({
        user: req.user.id,
        reservationId: finalReservationId,
        customerName: customerName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        date,
        time,
        guests: guestsNum,
        specialRequest: specialRequest ? specialRequest.trim() : '',
        status: 'Pending',
        table: assignedTableNumber,
        tableId: assignedTableId,
        durationMinutes: slotDuration
      });

      // Post-create conflict verification (defense-in-depth against multi-process races)
      if (assignedTableId) {
        const [reqH, reqM] = time.split(':').map(Number);
        const reqStart = reqH * 60 + (reqM || 0);
        const reqEnd = reqStart + slotDuration;

        const otherBookings = await Reservation.find({
          _id: { $ne: reservation._id },
          tableId: assignedTableId,
          date,
          status: { $in: ['Pending', 'Confirmed'] }
        });

        const hasConflict = otherBookings.some(other => {
          if (!other.time) return false;
          const [oh, om] = other.time.split(':').map(Number);
          const oStart = oh * 60 + (om || 0);
          const oEnd = oStart + (other.durationMinutes || slotDuration);
          return reqStart < oEnd && reqEnd > oStart;
        });

        if (hasConflict) {
          // Immediately purge the conflicting insertion
          await Reservation.deleteOne({ _id: reservation._id });
          return res.status(409).json({
            success: false,
            message: 'Conflict detected: this table was just reserved by another request. Please try another time slot.'
          });
        }
      }

      // Asynchronously dispatch reservation confirmation email
      sendReservationConfirmation(reservation).catch(err => {
        console.error('[ReservationController] Confirmation email warning:', err.message);
      });

      res.status(201).json({
        success: true,
        message: 'Reservation created successfully',
        reservation
      });
    } catch (error) {
      console.error('Error creating reservation:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Server error creating reservation'
      });
    }
  });
};

/**
 * GET /api/reservations
 * Retrieve all reservations belonging to the authenticated customer
 */
exports.getMyReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find({ user: req.user.id })
      .populate('tableId', 'tableNumber name capacity area')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      reservations
    });
  } catch (error) {
    console.error('Error fetching customer reservations:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving reservations'
    });
  }
};

/**
 * GET /api/reservations/admin
 * Retrieve all reservations list (Admin + Owner)
 */
exports.getAdminReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find({})
      .populate('tableId', 'tableNumber name capacity area')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      reservations
    });
  } catch (error) {
    console.error('Error fetching admin reservations:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving admin reservations'
    });
  }
};

/**
 * PATCH /api/reservations/:id/status
 * Update operational status of a reservation (Admin + Owner)
 */
exports.updateReservationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, table: manualTable } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reservation ID format'
      });
    }

    if (!status || !['Pending', 'Confirmed', 'Cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value. Must be Pending, Confirmed, or Cancelled'
      });
    }

    const reservation = await Reservation.findById(id);
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    const previousStatus = reservation.status;
    reservation.status = status;
    if (manualTable) {
      reservation.table = manualTable.trim().toUpperCase();
      const matchedTable = await Table.findOne({ tableNumber: reservation.table });
      if (matchedTable) {
        reservation.tableId = matchedTable._id;
      }
    }

    await reservation.save();

    // Asynchronously dispatch reservation status update / cancellation email ONLY if status actually changed
    if (previousStatus !== status) {
      sendReservationStatusUpdate(reservation, status, previousStatus).catch(err => {
        console.error('[ReservationController] Status update email warning:', err.message);
      });
    }

    res.status(200).json({
      success: true,
      message: `Reservation status updated to ${status}`,
      reservation
    });
  } catch (error) {
    console.error('Error updating reservation status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating reservation status'
    });
  }
};
