const express = require('express');
const router = express.Router();
const { createBooking, createBulkBooking, adminCreateBooking, getMyBookings, getAllBookings, cancelBooking, updateBookingStatus, getDashboardStats, searchBookings, getBookingDocuments, exportRevenueReport } = require('../controllers/bookingController');
const { protect, adminOnly, adminOrStaff } = require('../middleware/auth');

router.post('/', protect, createBooking);
router.post('/bulk', protect, createBulkBooking);
router.post('/admin/create', protect, adminOrStaff, adminCreateBooking);
router.get('/my', protect, getMyBookings);
router.get('/admin/all', protect, adminOrStaff, getAllBookings);
router.get('/admin/search', protect, adminOrStaff, searchBookings);
router.get('/admin/documents', protect, adminOnly, getBookingDocuments);
router.get('/admin/export', protect, adminOnly, exportRevenueReport);
router.get('/admin/stats', protect, adminOrStaff, getDashboardStats);
router.put('/:id/cancel', protect, cancelBooking);
router.put('/:id/status', protect, adminOnly, updateBookingStatus);

module.exports = router;
