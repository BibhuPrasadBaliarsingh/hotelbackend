const Booking = require('../models/Booking');
const Room = require('../models/Room');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const excel = require('xlsx');

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
    const { roomId, quantity = 1, checkIn, checkOut, guests, specialRequests, paymentMethod, paymentStatus = 'paid', customAmount, assignedRoomNumber, checkInTime, checkOutTime, referId, aadhaarNumber, receptionNotes, documents, guestInfo } = req.body;
    const qty = Math.max(1, Number(quantity) || 1);
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

    // Only allow admin to set a custom amount/estimate. Regular users pay calculated total.
    const isAdmin = req.user && req.user.role === 'admin';
    const providedCustom = Number(customAmount) > 0 ? Number(customAmount) : 0;
    const effectiveCustom = isAdmin && providedCustom > 0 ? providedCustom : 0;
    const totalAmount = effectiveCustom > 0 ? effectiveCustom : totalNights * room.price * qty;
    const docSubdir = 'booking-docs';
    const savedDocImage = await saveBase64Image(documents.documentImage, docSubdir, `${req.user.email || req.user._id}-document`);
    if (!savedDocImage) {
      return res.status(400).json({ message: 'Invalid document image format' });
    }
    const booking = await Booking.create({
      user: req.user._id,
      room: roomId,
      roomNumber: assignedRoomNumber || '',
      checkIn: ci,
      checkOut: co,
      checkInTime: checkInTime || '',
      checkOutTime: checkOutTime || '',
      guests,
      quantity: qty,
      totalNights,
      pricePerNight: room.price,
      totalAmount,
      customAmount: isAdmin ? (Number(customAmount) || 0) : 0,
      paymentMethod,
      paymentStatus,
      status: paymentStatus === 'due' ? 'pending' : 'confirmed',
      referId: referId || '',
      aadhaarNumber: aadhaarNumber || '',
      assignedRoomNumber: assignedRoomNumber || '',
      receptionNotes: receptionNotes || '',
      specialRequests,
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
      roomIds,
      checkIn,
      checkOut,
      checkInTime,
      checkOutTime,
      guests,
      specialRequests,
      paymentMethod,
      paymentStatus = 'paid',
      customAmount,
      assignedRoomNumber,
      receptionNotes,
      guestName,
      guestEmail,
      guestPhone,
      guestPassword,
      referId,
      aadhaarNumber,
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
      user = await User.create({ name: guestName, email, phone: guestPhone, password: guestPassword, role: 'user', referId: referId || '', aadhaarNumber: aadhaarNumber || '' });
    }

    const requestedRoomIds = Array.isArray(roomIds) && roomIds.length > 0 ? roomIds : [roomId];
    if (!requestedRoomIds.length) return res.status(400).json({ message: 'Select at least one room' });

    const roomsToBook = await Room.find({ _id: { $in: requestedRoomIds } });
    if (roomsToBook.length !== requestedRoomIds.length) {
      return res.status(404).json({ message: 'One or more selected rooms were not found' });
    }

    const ci = new Date(checkIn), co = new Date(checkOut);
    const totalNights = Math.ceil((co - ci) / (1000 * 60 * 60 * 24));
    if (totalNights < 1) return res.status(400).json({ message: 'Check-out must be after check-in' });

    const conflicts = await Booking.findOne({
      room: { $in: requestedRoomIds },
      status: { $in: ['confirmed', 'pending'] },
      $or: [{ checkIn: { $lt: co }, checkOut: { $gt: ci } }]
    });
    if (conflicts) return res.status(400).json({ message: `Room ${conflicts.room} is already booked for these dates` });

    const conflict = await Booking.findOne({
      room: roomId,
      status: { $in: ['confirmed', 'pending'] },
      $or: [{ checkIn: { $lt: new Date(checkOut) }, checkOut: { $gt: new Date(checkIn) } }]
    });
    if (conflict) return res.status(400).json({ message: 'Room is already booked for these dates' });

    const calculatedDocs = {
      aadhaarFront: await saveBase64Image(documents?.aadhaarFront, 'booking-docs', `${email}-aadhaar-front`),
      aadhaarBack: await saveBase64Image(documents?.aadhaarBack, 'booking-docs', `${email}-aadhaar-back`),
      cardFront: await saveBase64Image(documents?.cardFront, 'booking-docs', `${email}-card-front`),
      cardBack: await saveBase64Image(documents?.cardBack, 'booking-docs', `${email}-card-back`),
      idProof: await saveBase64Image(documents?.idProof, 'booking-docs', `${email}-idproof`),
      paymentSlip: await saveBase64Image(documents?.paymentSlip, 'booking-docs', `${email}-payment-slip`),
    };

    const createdBookings = [];
    for (const room of roomsToBook) {
      if (!room.isAvailable) {
        return res.status(400).json({ message: `Room ${room.name} is not available` });
      }
      const amount = Number(customAmount) > 0 ? Number(customAmount) : totalNights * room.price;
      const booking = await Booking.create({
        user: user._id,
        createdBy: req.user._id,
        room: room._id,
        roomNumber: assignedRoomNumber || room.roomNumber || '',
        checkIn: ci,
        checkOut: co,
        checkInTime: checkInTime || '',
        checkOutTime: checkOutTime || '',
        guests,
        quantity: 1,
        totalNights,
        pricePerNight: room.price,
        totalAmount: amount,
        customAmount: Number(customAmount) || 0,
        paymentMethod,
        paymentStatus,
        status: paymentStatus === 'due' ? 'pending' : 'confirmed',
        referId: referId || '',
        aadhaarNumber: aadhaarNumber || '',
        assignedRoomNumber: assignedRoomNumber || room.roomNumber || '',
        receptionNotes: receptionNotes || '',
        specialRequests,
        guestInfo: { name: guestName, email: guestEmail, phone: guestPhone },
        documents: calculatedDocs
      });
      await booking.populate(['room', { path: 'user', select: 'name email phone' }, { path: 'createdBy', select: 'name email' }]);
      createdBookings.push(booking);
    }

    res.status(201).json({
      bookings: createdBookings,
      userWasCreated,
      message: 'Admin booking(s) created successfully'
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

// Search bookings (admin)
exports.searchBookings = async (req, res) => {
  try {
    const { q } = req.query;
    const query = { $or: [] };
    if (q) {
      const regex = new RegExp(q.trim(), 'i');
      query.$or.push(
        { bookingRef: regex },
        { referId: regex },
        { aadhaarNumber: regex },
        { 'guestInfo.name': regex },
        { 'guestInfo.email': regex },
        { 'guestInfo.phone': regex },
        { 'documents.aadhaarFront': regex },
        { 'documents.idProof': regex }
      );
    }
    const bookings = await Booking.find(q ? query : {})
      .populate('room', 'name type price')
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 });

    const revenue = bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + b.totalAmount, 0);
    res.json({ bookings, count: bookings.length, revenue });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Document list (admin)
exports.getBookingDocuments = async (req, res) => {
  try {
    const { q } = req.query;
    const query = { 'documents': { $exists: true } };
    if (q) {
      const regex = new RegExp(q.trim(), 'i');
      query.$or = [
        { bookingRef: regex },
        { referId: regex },
        { 'guestInfo.name': regex },
        { 'guestInfo.phone': regex },
        { 'guestInfo.email': regex },
      ];
    }
    const bookings = await Booking.find(query)
      .select('bookingRef guestInfo referId aadhaarNumber documents room createdAt checkIn checkOut')
      .populate('room', 'name type')
      .populate('user', 'name email phone');
    res.json({ bookings, count: bookings.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Export monthly revenue report (admin)
exports.exportRevenueReport = async (req, res) => {
  try {
    const { year, month } = req.query;
    const start = new Date(`${year}-${month || '01'}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const bookings = await Booking.find({
      createdAt: { $gte: start, $lt: end },
      status: { $ne: 'cancelled' }
    })
      .populate('room', 'name type')
      .populate('user', 'name email phone');

    const rows = bookings.map((booking) => ({
      BookingID: booking.bookingRef,
      Guest: booking.guestInfo.name || booking.user?.name || '',
      Email: booking.guestInfo.email || booking.user?.email || '',
      Phone: booking.guestInfo.phone || booking.user?.phone || '',
      Room: booking.room?.name || '',
      RoomType: booking.room?.type || '',
      CheckIn: booking.checkIn.toISOString().slice(0, 10),
      CheckOut: booking.checkOut.toISOString().slice(0, 10),
      Nights: booking.totalNights,
      Amount: booking.totalAmount,
      PaymentStatus: booking.paymentStatus,
      Status: booking.status,
      ReferID: booking.referId,
      AadhaarNumber: booking.aadhaarNumber,
      CreatedAt: booking.createdAt.toISOString(),
    }));

    const workbook = excel.utils.book_new();
    const sheet = excel.utils.json_to_sheet(rows);
    excel.utils.book_append_sheet(workbook, sheet, 'Revenue');
    const buffer = excel.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename="revenue-${year}-${month || 'all'}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
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

// Bulk checkout (multiple rooms)
exports.createBulkBooking = async (req, res) => {
  try {
    const { items, paymentMethod = 'card', paymentStatus = 'paid', customAmount, checkInTime, checkOutTime, referId, aadhaarNumber, receptionNotes, assignedRoomNumber } = req.body;
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'Cart items are required' });

    const created = [];
    for (const item of items) {
      const room = await Room.findById(item.roomId);
      if (!room) return res.status(404).json({ message: `Room ${item.roomId} not found` });
      const ci = new Date(item.checkIn || item.checkInDate || new Date());
      const co = new Date(item.checkOut || item.checkOutDate || ci);
      const totalNights = Math.max(1, Math.ceil((co - ci) / (1000 * 60 * 60 * 24)));
      const conflict = await Booking.findOne({
        room: room._id,
        status: { $in: ['confirmed', 'pending'] },
        $or: [{ checkIn: { $lt: co }, checkOut: { $gt: ci } }]
      });
      if (conflict) return res.status(400).json({ message: `Room ${room.name} is already booked for selected dates` });
      const amount = Number(item.customAmount) > 0 ? Number(item.customAmount) : totalNights * room.price * (Number(item.quantity) || 1);
      const booking = await Booking.create({
        user: req.user._id,
        room: room._id,
        roomNumber: assignedRoomNumber || room.roomNumber || '',
        checkIn: ci,
        checkOut: co,
        checkInTime: checkInTime || item.checkInTime || '',
        checkOutTime: checkOutTime || item.checkOutTime || '',
        guests: { adults: item.adults || 1, children: item.children || 0 },
        totalNights,
        pricePerNight: room.price,
        totalAmount: amount,
        customAmount: Number(item.customAmount) || 0,
        paymentMethod,
        paymentStatus,
        status: paymentStatus === 'due' ? 'pending' : 'confirmed',
        referId: referId || item.referId || '',
        aadhaarNumber: aadhaarNumber || item.aadhaarNumber || '',
        assignedRoomNumber: assignedRoomNumber || room.roomNumber || '',
        receptionNotes: receptionNotes || item.receptionNotes || '',
        specialRequests: item.specialRequests || '',
        guestInfo: {
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone,
        },
        documents: item.documents || {}
      });
      created.push(booking);
    }

    res.status(201).json({ bookings: created, message: 'Bulk booking created successfully' });
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
