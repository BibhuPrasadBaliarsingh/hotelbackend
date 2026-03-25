const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: String,
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['Single', 'Double', 'Deluxe', 'Suite'], required: true },
  price: { type: Number, required: true, min: 0 },
  description: { type: String, required: true },
  images: [{ type: String }],
  capacity: { type: Number, default: 2 },
  size: { type: Number, default: 30 }, // in sqm
  floor: { type: Number, default: 1 },
  amenities: [{ type: String }],
  isAvailable: { type: Boolean, default: true },
  reviews: [reviewSchema],
  rating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Auto-calculate rating
roomSchema.methods.calculateRating = function () {
  if (this.reviews.length === 0) { this.rating = 0; this.totalReviews = 0; return; }
  const total = this.reviews.reduce((acc, r) => acc + r.rating, 0);
  this.rating = Math.round((total / this.reviews.length) * 10) / 10;
  this.totalReviews = this.reviews.length;
};

module.exports = mongoose.model('Room', roomSchema);
