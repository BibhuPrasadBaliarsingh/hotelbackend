const mongoose = require('mongoose');

const sessionItemSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  name: { type: String, default: '' },
  type: { type: String, default: '' },
  pricePerNight: { type: Number, default: 0 },
  quantity: { type: Number, default: 1 },
  nights: { type: Number, default: 1 },
  totalAmount: { type: Number, default: 0 },
});

const bookingSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referId: { type: String, required: true, trim: true },
  aadhaarNumber: { type: String, trim: true, default: '' },
  checkInDate: { type: Date, required: true },
  checkInTime: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'active', 'completed', 'cancelled'], default: 'pending' },
  notes: { type: String, default: '' },
  cart: [sessionItemSchema],
  totalAmount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('BookingSession', bookingSessionSchema);
