const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/User');
const Room = require('./models/Room');
const Booking = require('./models/Booking');

const shouldReset = process.argv.includes('--reset');

const rawRooms = [
  // ===== FLOOR 1 =====
  { roomNumber: 101, floor: 1, price: 1200, type: 'Standard', isBooked: false },
  { roomNumber: 102, floor: 1, price: 1200, type: 'Standard', isBooked: true },
  { roomNumber: 103, floor: 1, price: 1200, type: 'Standard', isBooked: false },
  { roomNumber: 104, floor: 1, price: 1200, type: 'Standard', isBooked: false },
  { roomNumber: 105, floor: 1, price: 2500, type: 'Deluxe Family', isBooked: true },
  { roomNumber: 106, floor: 1, price: 1200, type: 'Standard', isBooked: false },
  { roomNumber: 107, floor: 1, price: 1200, type: 'Standard', isBooked: false },
  { roomNumber: 108, floor: 1, price: 2000, type: 'Connecting Room', isBooked: true },
  { roomNumber: 109, floor: 1, price: 1200, type: 'Standard', isBooked: false },
  { roomNumber: 110, floor: 1, price: 1200, type: 'Standard', isBooked: false },

  // ===== FLOOR 2 =====
  { roomNumber: 201, floor: 2, price: 1400, type: 'Standard', isBooked: false },
  { roomNumber: 202, floor: 2, price: 1400, type: 'Standard', isBooked: false },
  { roomNumber: 203, floor: 2, price: 1800, type: 'Deluxe', isBooked: true },
  { roomNumber: 204, floor: 2, price: 1800, type: 'Deluxe', isBooked: false },
  { roomNumber: 205, floor: 2, price: 1400, type: 'Standard', isBooked: false },
  { roomNumber: 206, floor: 2, price: 1400, type: 'Standard', isBooked: true },
  { roomNumber: 207, floor: 2, price: 1800, type: 'Deluxe', isBooked: false },
  { roomNumber: 208, floor: 2, price: 2500, type: 'Family Room', isBooked: true },
  { roomNumber: 209, floor: 2, price: 1400, type: 'Standard', isBooked: false },
  { roomNumber: 210, floor: 2, price: 1400, type: 'Standard', isBooked: false },

  // ===== FLOOR 3 =====
  { roomNumber: 301, floor: 3, price: 2000, type: 'Deluxe', isBooked: false },
  { roomNumber: 302, floor: 3, price: 2000, type: 'Deluxe', isBooked: true },
  { roomNumber: 303, floor: 3, price: 2000, type: 'Deluxe', isBooked: false },
  { roomNumber: 304, floor: 3, price: 1500, type: 'Standard', isBooked: false },
  { roomNumber: 305, floor: 3, price: 1500, type: 'Standard', isBooked: true },
  { roomNumber: 306, floor: 3, price: 2000, type: 'Deluxe', isBooked: false },
  { roomNumber: 307, floor: 3, price: 3000, type: 'Mini Suite', isBooked: true },
  { roomNumber: 308, floor: 3, price: 1500, type: 'Standard', isBooked: false },
  { roomNumber: 309, floor: 3, price: 2000, type: 'Deluxe', isBooked: false },
  { roomNumber: 310, floor: 3, price: 1500, type: 'Standard', isBooked: false },

  // ===== FLOOR 4 =====
  { roomNumber: 401, floor: 4, price: 2500, type: 'Deluxe', isBooked: false },
  { roomNumber: 402, floor: 4, price: 2500, type: 'Deluxe', isBooked: true },
  { roomNumber: 403, floor: 4, price: 4000, type: 'Executive Suite', isBooked: false },
  { roomNumber: 404, floor: 4, price: 4000, type: 'Executive Suite', isBooked: true },
  { roomNumber: 405, floor: 4, price: 2500, type: 'Deluxe', isBooked: false },
  { roomNumber: 406, floor: 4, price: 2800, type: 'Deluxe Balcony', isBooked: false },
  { roomNumber: 407, floor: 4, price: 1600, type: 'Standard', isBooked: true },
  { roomNumber: 408, floor: 4, price: 1600, type: 'Standard', isBooked: false },
  { roomNumber: 409, floor: 4, price: 2500, type: 'Deluxe', isBooked: false },
  { roomNumber: 410, floor: 4, price: 2500, type: 'Deluxe', isBooked: true },

  // ===== FLOOR 5 =====
  { roomNumber: 501, floor: 5, price: 3500, type: 'Luxury Deluxe', isBooked: false },
  { roomNumber: 502, floor: 5, price: 3500, type: 'Luxury Deluxe', isBooked: true },
  { roomNumber: 503, floor: 5, price: 5000, type: 'Premium Suite', isBooked: false },
  { roomNumber: 504, floor: 5, price: 3500, type: 'Luxury Deluxe', isBooked: false },
  { roomNumber: 505, floor: 5, price: 3500, type: 'Luxury Deluxe', isBooked: true },
  { roomNumber: 506, floor: 5, price: 8000, type: 'Presidential Suite', isBooked: false },
  { roomNumber: 507, floor: 5, price: 3500, type: 'Luxury Deluxe', isBooked: false },
  { roomNumber: 508, floor: 5, price: 3500, type: 'Luxury Deluxe', isBooked: false },
  { roomNumber: 509, floor: 5, price: 5000, type: 'Premium Suite', isBooked: true },
  { roomNumber: 510, floor: 5, price: 3500, type: 'Luxury Deluxe', isBooked: false }
];

const rooms = rawRooms.map((room) => ({
  roomNumber: room.roomNumber,
  name: `${room.type} Room ${room.roomNumber}`,
  type: room.type,
  price: room.price,
  description: room.description || `Beautiful ${room.type.toLowerCase()} on floor ${room.floor} with premium amenities and a comfortable layout.`,
  images: room.images || ['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=80'],
  capacity: room.capacity || (String(room.type).toLowerCase().includes('suite') ? 4 : 2),
  size: room.size || 30,
  floor: room.floor,
  amenities: room.amenities || ['Free WiFi', 'Air Conditioning', 'Room Service'],
  isAvailable: !room.isBooked,
  rating: room.rating ?? 0,
  totalReviews: room.totalReviews ?? 0,
}));

async function ensureUser(userData) {
  const existingUser = await User.findOne({ email: userData.email });

  if (existingUser) {
    return { user: existingUser, created: false };
  }

  const user = await User.create(userData);
  return { user, created: true };
}

async function ensureRoom(roomData) {
  const existingRoom = await Room.findOne({ name: roomData.name });

  if (existingRoom) {
    return { room: existingRoom, created: false };
  }

  const room = await Room.create(roomData);
  return { room, created: true };
}

async function ensureBooking(bookingData) {
  const existingBooking = await Booking.findOne({ specialRequests: bookingData.specialRequests });

  if (existingBooking) {
    return { booking: existingBooking, created: false };
  }

  const booking = await Booking.create(bookingData);
  return { booking, created: true };
}

async function seed() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('Missing MONGO_URI');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    if (shouldReset) {
      await Booking.deleteMany({});
      await Room.deleteMany({});
      await User.deleteMany({});
      console.log('Reset existing users, rooms, and bookings');
    } else {
      console.log('Safe seed mode enabled. Existing records will be preserved.');
    }

    const adminResult = await ensureUser({
      name: 'Admin User',
      email: 'admin@hotel.com',
      password: 'admin123',
      role: 'admin',
      phone: '+1 555-0000'
    });

    const userResult = await ensureUser({
      name: 'John Doe',
      email: 'user@hotel.com',
      password: 'user123',
      role: 'user',
      phone: '+1 555-1234'
    });

    const receptionResult = await ensureUser({
      name: 'Reception Team',
      email: 'reception@hotel.com',
      password: 'recept123',
      role: 'reception',
      phone: '+1 555-2000'
    });

    const managementResult = await ensureUser({
      name: 'Management Lead',
      email: 'manager@hotel.com',
      password: 'manage123',
      role: 'management',
      phone: '+1 555-3000'
    });

    console.log(`Users ready. Created: ${Number(adminResult.created) + Number(userResult.created) + Number(receptionResult.created) + Number(managementResult.created)}`);

    const roomResults = await Promise.all(rooms.map(ensureRoom));
    const createdRooms = roomResults.map(result => result.room);
    const createdRoomCount = roomResults.filter(result => result.created).length;
    console.log(`Rooms ready. Created: ${createdRoomCount}`);

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const lastMonth = new Date();
    lastMonth.setDate(lastMonth.getDate() - 30);

    const lastMonthEnd = new Date();
    lastMonthEnd.setDate(lastMonthEnd.getDate() - 25);

    const bookingResults = await Promise.all([
      ensureBooking({
        user: userResult.user._id,
        room: createdRooms[0]._id,
        checkIn: lastMonth,
        checkOut: lastMonthEnd,
        guests: { adults: 1, children: 0 },
        totalNights: 5,
        pricePerNight: 89,
        totalAmount: 445,
        status: 'completed',
        paymentStatus: 'paid',
        specialRequests: 'seed-demo-booking-completed'
      }),
      ensureBooking({
        user: userResult.user._id,
        room: createdRooms[2]._id,
        checkIn: nextWeek,
        checkOut: new Date(nextWeek.getTime() + 3 * 86400000),
        guests: { adults: 2, children: 0 },
        totalNights: 3,
        pricePerNight: 249,
        totalAmount: 747,
        status: 'confirmed',
        paymentStatus: 'paid',
        specialRequests: 'seed-demo-booking-upcoming'
      })
    ]);

    const createdBookingCount = bookingResults.filter(result => result.created).length;
    console.log(`Bookings ready. Created: ${createdBookingCount}`);

    console.log('\nSeed complete.\n');
    console.log('Admin: admin@hotel.com | Password: admin123');
    console.log('User:  user@hotel.com  | Password: user123');
    console.log('Reception: reception@hotel.com | Password: recept123');
    console.log('Management: manager@hotel.com | Password: manage123');
    console.log(`Mode: ${shouldReset ? 'reset' : 'safe'}`);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

seed();
