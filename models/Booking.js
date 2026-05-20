const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  roomNumber: { type: String, default: '' },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  checkInTime: { type: String, default: '' },
  checkOutTime: { type: String, default: '' },
  guests: { adults: { type: Number, default: 1 }, children: { type: Number, default: 0 } },
  totalNights: { type: Number, required: true },
  quantity: { type: Number, default: 1 },
  pricePerNight: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  customAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'confirmed' },
  paymentStatus: { type: String, enum: ['due', 'paid', 'pending', 'refunded'], default: 'paid' },
  paymentMethod: { type: String, enum: ['cash', 'upi', 'card', 'netbanking'], default: 'card' },
  referId: { type: String, default: '' },
  aadhaarNumber: { type: String, default: '' },
  assignedRoomNumber: { type: String, default: '' },
  receptionNotes: { type: String, default: '' },
  specialRequests: { type: String, default: '' },
  guestInfo: {
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
  },
  documents: {
    aadhaarFront: { type: String, default: '' },
    aadhaarBack: { type: String, default: '' },
    cardFront: { type: String, default: '' },
    cardBack: { type: String, default: '' },
    documentImage: { type: String, default: '' },
    idProof: { type: String, default: '' },
    paymentSlip: { type: String, default: '' },
  },
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
