const User = require('../models/User');
const BookingSession = require('../models/BookingSession');
const jwt = require('jsonwebtoken');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email, and password are required' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });
    const user = await User.create({ name, email, password, phone });
    const token = signToken(user._id);
    res.status(201).json({ token, user: { _id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) return res.status(401).json({ message: 'Invalid email or password' });
    const token = signToken(user._id);
    res.json({ token, user: { _id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.guestLogin = async (req, res) => {
  try {
    const { name, email, phone, referId, aadhaarNumber, checkInDate, checkInTime } = req.body;
    if (!name || !phone || !referId || !checkInDate) {
      return res.status(400).json({ message: 'Name, phone, refer ID and check-in date are required' });
    }

    const normalizedEmail = email ? String(email).toLowerCase().trim() : `${referId.trim().toLowerCase().replace(/\s+/g, '-')}-guest@luxestay.local`;
    let user = await User.findOne({ $or: [{ email: normalizedEmail }, { referId: referId.trim() }] });
    const guestPassword = `Guest@${Date.now().toString(36)}`;

    if (!user) {
      user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        phone: phone.trim(),
        password: guestPassword,
        role: 'guest',
        referId: referId.trim(),
        aadhaarNumber: aadhaarNumber ? aadhaarNumber.trim() : ''
      });
    } else {
      user.name = name.trim();
      user.phone = phone.trim();
      user.referId = user.referId || referId.trim();
      user.aadhaarNumber = user.aadhaarNumber || (aadhaarNumber ? aadhaarNumber.trim() : '');
      if (user.role === 'user') user.role = 'guest';
      if (!user.email) user.email = normalizedEmail;
      await user.save();
    }

    const sessionData = {
      user: user._id,
      referId: referId.trim(),
      aadhaarNumber: aadhaarNumber ? aadhaarNumber.trim() : '',
      checkInDate: new Date(checkInDate),
      checkInTime: checkInTime || '',
      status: 'active',
      totalAmount: 0,
    };

    const session = await BookingSession.findOneAndUpdate(
      { user: user._id, status: { $in: ['pending', 'active'] } },
      sessionData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const token = signToken(user._id);
    res.json({ token, user: { _id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, referId: user.referId }, session });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getGuestSession = async (req, res) => {
  try {
    const session = await BookingSession.findOne({ user: req.user._id }).populate('cart.room', 'name type price images');
    if (!session) return res.status(404).json({ message: 'Guest session not found' });
    res.json({ session });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name, phone }, { new: true }).select('-password');
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
