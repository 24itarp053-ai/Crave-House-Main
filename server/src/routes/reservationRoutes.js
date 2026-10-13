const express = require('express');
const router = express.Router();
const {
  createReservation,
  getMyReservations,
  getAdminReservations,
  updateReservationStatus
} = require('../controllers/reservationController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Secure all reservation routes under authentication middleware
router.use(protect);

// Admin/Owner-only list
router.get('/admin', authorize('admin', 'owner'), getAdminReservations);

// Admin/Owner-only status update
router.patch('/:id/status', authorize('admin', 'owner'), updateReservationStatus);

// Customer-only endpoints
router.post('/', authorize('customer'), createReservation);
router.get('/', authorize('customer'), getMyReservations);

module.exports = router;
