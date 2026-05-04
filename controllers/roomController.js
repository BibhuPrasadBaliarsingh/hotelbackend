const Room = require('../models/Room');
const Booking = require('../models/Booking');

// GET all rooms with filters
exports.getRooms = async (req, res) => {
  try {
    const { type, minPrice, maxPrice, available, checkIn, checkOut } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (minPrice || maxPrice) { filter.price = {}; if (minPrice) filter.price.$gte = Number(minPrice); if (maxPrice) filter.price.$lte = Number(maxPrice); }
    if (available === 'true') filter.isAvailable = true;

    let rooms = await Room.find(filter).sort({ floor: 1, roomNumber: 1, createdAt: -1 });

    // Check date conflicts
    if (checkIn && checkOut) {
      const bookedRoomIds = await Booking.find({
        status: { $in: ['confirmed', 'pending'] },
        $or: [{ checkIn: { $lt: new Date(checkOut) }, checkOut: { $gt: new Date(checkIn) } }]
      }).distinct('room');
      rooms = rooms.filter(r => !bookedRoomIds.map(id => id.toString()).includes(r._id.toString()));
    }

    res.json({ rooms, count: rooms.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).populate('reviews.user', 'name avatar');
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json({ room });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createRoom = async (req, res) => {
  try {
    const room = await Room.create(req.body);
    res.status(201).json({ room });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json({ room });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json({ message: 'Room deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    const alreadyReviewed = room.reviews.find(r => r.user.toString() === req.user._id.toString());
    if (alreadyReviewed) return res.status(400).json({ message: 'Room already reviewed' });
    room.reviews.push({ user: req.user._id, userName: req.user.name, rating, comment });
    room.calculateRating();
    await room.save();
    res.status(201).json({ message: 'Review added', room });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
