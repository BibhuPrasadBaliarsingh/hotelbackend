const Booking = require('../models/Booking');
const Room = require('../models/Room');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ensureDir = async (dirPath) => {
  await fs.promises.mkdir(dirPath, { recursive: true });
};

const saveBase64Image = async (dataUrl, subdir, filenameBase) => {
  if (!dataUrl || typeof dataUrl !== 'string') return '';

  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i);
  if (!match) return '';

  const mime = match[1].toLowerCase();
  const base64 = match[2];
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
  const buffer = Buffer.from(base64, 'base64');
  if (!buffer?.length) return '';

  const uploadsRoot = path.join(__dirname, '..', 'uploads');
  const outDir = path.join(uploadsRoot, subdir);
  await ensureDir(outDir);

  const safeBase = (filenameBase || 'image').replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
  const name = `${safeBase}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  const outPath = path.join(outDir, name);
  await fs.promises.writeFile(outPath, buffer);

  return `/uploads/${subdir}/${name}`;
};

// Create a booking (with conflict check)
exports.createBooking = async (req, res) => {
  try {
    const { roomId, checkIn, checkOut, guests, specialRequests, paymentMethod, documents, guestInfo } = req.body;
    if (!documents?.documentImage) {
      return res.status(400).json({ message: 'Upload Aadhaar or PAN card before booking' });
    }
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (!room.isAvailable) return res.status(400).json({ message: 'Room is not available' });

    // Date conflict check
    const conflict = await Booking.findOne({
      room: roomId,
      status: { $in: ['confirmed', 'pending'] },
      $or: [{ checkIn: { $lt: new Date(checkOut) }, checkOut: { $gt: new Date(checkIn) } }]
    });
    if (conflict) return res.status(400).json({ message: 'Room is already booked for these dates' });

    const ci = new Date(checkIn), co = new Date(checkOut);
    const totalNights = Math.ceil((co - ci) / (1000 * 60 * 60 * 24));
    if (totalNights < 1) return res.status(400).json({ message: 'Check-out must be after check-in' });

    const totalAmount = totalNights * room.price;
    const docSubdir = 'booking-docs';
    const savedDocImage = await saveBase64Image(documents.documentImage, docSubdir, `${req.user.email || req.user._id}-document`);
    if (!savedDocImage) {
      return res.status(400).json({ message: 'Invalid document image format' });
    }
    const booking = await Booking.create({
      user: req.user._id, room: roomId, checkIn: ci, checkOut: co,
      guests, totalNights, pricePerNight: room.price, totalAmount,
      specialRequests, paymentMethod, status: 'confirmed', paymentStatus: 'paid',
      guestInfo: {
        name: guestInfo?.name || req.user.name || '',
        email: guestInfo?.email || req.user.email || '',
        phone: guestInfo?.phone || req.user.phone || '',
      },
      documents: { documentImage: savedDocImage }
    });

    await booking.populate(['room', { path: 'user', select: 'name email' }]);
    res.status(201).json({ booking, message: 'Booking confirmed successfully!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create a booking as admin (for a specific guest email)
exports.adminCreateBooking = async (req, res) => {
  try {
    const {
      roomId,
      checkIn,
      checkOut,
      guests,
      specialRequests,
      paymentMethod,
      guestName,
      guestEmail,
      guestPhone,
      guestPassword,
      documents
    } = req.body;

    if (!guestName || !guestEmail || !guestPhone) {
      return res.status(400).json({ message: 'Guest name, email, and phone are required' });
    }

    const email = String(guestEmail).toLowerCase().trim();
    let user = await User.findOne({ email });
    const userWasCreated = !user;

    if (!user) {
      if (!guestPassword || String(guestPassword).length < 6) {
        return res.status(400).json({ message: 'Guest password (min 6 chars) is required for new user' });
      }
      user = await User.create({ name: guestName, email, phone: guestPhone, password: guestPassword, role: 'user' });
    }

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (!room.isAvailable) return res.status(400).json({ message: 'Room is not available' });

    // Date conflict check
    const conflict = await Booking.findOne({
      room: roomId,
      status: { $in: ['confirmed', 'pending'] },
      $or: [{ checkIn: { $lt: new Date(checkOut) }, checkOut: { $gt: new Date(checkIn) } }]
    });
    if (conflict) return res.status(400).json({ message: 'Room is already booked for these dates' });

    const ci = new Date(checkIn), co = new Date(checkOut);
    const totalNights = Math.ceil((co - ci) / (1000 * 60 * 60 * 24));
    if (totalNights < 1) return res.status(400).json({ message: 'Check-out must be after check-in' });

    const totalAmount = totalNights * room.price;

    const docSubdir = 'booking-docs';
    const savedDocs = {
      aadhaarFront: await saveBase64Image(documents?.aadhaarFront, docSubdir, `${email}-aadhaar-front`),
      aadhaarBack: await saveBase64Image(documents?.aadhaarBack, docSubdir, `${email}-aadhaar-back`),
      cardFront: await saveBase64Image(documents?.cardFront, docSubdir, `${email}-card-front`),
      cardBack: await saveBase64Image(documents?.cardBack, docSubdir, `${email}-card-back`),
    };

    const booking = await Booking.create({
      user: user._id,
      createdBy: req.user._id,
      room: roomId,
      checkIn: ci,
      checkOut: co,
      guests,
      totalNights,
      pricePerNight: room.price,
      totalAmount,
      specialRequests,
      paymentMethod,
      status: 'confirmed',
      paymentStatus: 'paid',
      guestInfo: { name: guestName, email, phone: guestPhone },
      documents: savedDocs
    });

    await booking.populate(['room', { path: 'user', select: 'name email phone' }, { path: 'createdBy', select: 'name email' }]);
    res.status(201).json({
      booking,
      userWasCreated,
      message: 'Admin booking created successfully'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get my bookings
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('room', 'name type images price')
      .sort({ createdAt: -1 });
    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all bookings (admin)
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('room', 'name type price')
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 });
    const revenue = bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + b.totalAmount, 0);
    res.json({ bookings, count: bookings.length, revenue });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Cancel booking
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Not authorized' });
    if (booking.status === 'cancelled') return res.status(400).json({ message: 'Already cancelled' });
    booking.status = 'cancelled';
    booking.paymentStatus = 'refunded';
    await booking.save();
    res.json({ booking, message: 'Booking cancelled' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update booking status (admin)
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findByIdAndUpdate(req.params.id, { status }, { new: true })
      .populate('room', 'name type').populate('user', 'name email');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json({ booking });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Dashboard stats (admin)
exports.getDashboardStats = async (req, res) => {
  try {
    const Room = require('../models/Room');
    const User = require('../models/User');
    const [totalRooms, totalBookings, totalUsers, bookings] = await Promise.all([
      Room.countDocuments(),
      Booking.countDocuments(),
      User.countDocuments({ role: 'user' }),
      Booking.find()
    ]);
    const revenue = bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + b.totalAmount, 0);
    const active = bookings.filter(b => b.status === 'confirmed').length;
    const cancelled = bookings.filter(b => b.status === 'cancelled').length;

    // Monthly revenue (last 6 months)
    const monthly = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const label = d.toLocaleString('default', { month: 'short' });
      const monthRevenue = bookings.filter(b => {
        const bd = new Date(b.createdAt);
        return bd.getMonth() === d.getMonth() && bd.getFullYear() === d.getFullYear() && b.status !== 'cancelled';
      }).reduce((s, b) => s + b.totalAmount, 0);
      monthly.push({ month: label, revenue: monthRevenue });
    }

    res.json({ totalRooms, totalBookings, totalUsers, revenue, active, cancelled, monthly });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
