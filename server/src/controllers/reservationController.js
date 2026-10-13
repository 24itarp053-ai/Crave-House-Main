const Reservation = require('../models/Reservation');
const mongoose = require('mongoose');

/**
 * Generate a random reservation ID format: CH-R<6-digit>
 */
function generateReservationId() {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `CH-R${rand}`;
}

/**
 * POST /api/reservations
 * Create a new table reservation (Authenticated Customer)
 */
exports.createReservation = async (req, res) => {
  try {
    const { customerName, email, phone, date, time, guests, specialRequest, reservationId } = req.body;

    if (!customerName || !email || !phone || !date || !time || !guests) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields.'
      });
    }

    const guestsNum = parseInt(guests, 10);
    if (isNaN(guestsNum) || guestsNum < 1) {
      return res.status(400).json({
        success: false,
        message: 'Number of guests must be at least 1.'
      });
    }

    // Set custom generated reservation ID if not provided by client
    const finalReservationId = reservationId || generateReservationId();

    const reservation = await Reservation.create({
      user: req.user.id,
      reservationId: finalReservationId,
      customerName,
      email,
      phone,
      date,
      time,
      guests: guestsNum,
      specialRequest: specialRequest || '',
      status: 'Pending'
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
      message: 'Server error creating reservation'
    });
  }
};

/**
 * GET /api/reservations
 * Retrieve all reservations belonging to the authenticated customer
 */
exports.getMyReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find({ user: req.user.id })
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
    const { status } = req.body;

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

    reservation.status = status;
    await reservation.save();

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
