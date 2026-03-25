const express = require('express');
const router = express.Router();
const { getRooms, getRoom, createRoom, updateRoom, deleteRoom, addReview } = require('../controllers/roomController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', getRooms);
router.get('/:id', getRoom);
router.post('/', protect, adminOnly, createRoom);
router.put('/:id', protect, adminOnly, updateRoom);
router.delete('/:id', protect, adminOnly, deleteRoom);
router.post('/:id/reviews', protect, addReview);

module.exports = router;
