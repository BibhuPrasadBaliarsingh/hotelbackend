const express = require('express');
const router = express.Router();
const { createBooking, getMyBookings, getAllBookings, cancelBooking, updateBookingStatus, getDashboardStats } = require('../controllers/bookingController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/', protect, createBooking);
router.get('/my', protect, getMyBookings);
router.get('/admin/all', protect, adminOnly, getAllBookings);
router.get('/admin/stats', protect, adminOnly, getDashboardStats);
router.put('/:id/cancel', protect, cancelBooking);
router.put('/:id/status', protect, adminOnly, updateBookingStatus);

module.exports = router;
