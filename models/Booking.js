const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  guests: { adults: { type: Number, default: 1 }, children: { type: Number, default: 0 } },
  totalNights: { type: Number, required: true },
  pricePerNight: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'confirmed' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'paid' },
  paymentMethod: { type: String, default: 'card' },
  specialRequests: { type: String, default: '' },
  bookingRef: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now }
});

// Generate booking reference
bookingSchema.pre('save', function (next) {
  if (!this.bookingRef) {
    this.bookingRef = 'HTL' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
