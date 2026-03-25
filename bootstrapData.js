const User = require('./models/User');
const Room = require('./models/Room');
const Booking = require('./models/Booking');

const rooms = [
  {
    name: 'Classic Single Room',
    type: 'Single',
    price: 89,
    description: 'A cozy, well-appointed single room perfect for solo travelers. Features a plush queen bed, en-suite bathroom, and stunning city views.',
    images: [
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800',
      'https://images.unsplash.com/photo-1631049421450-348ccd8f8b5b?w=800'
    ],
    capacity: 1,
    size: 22,
    floor: 2,
    amenities: ['Free WiFi', 'Air Conditioning', 'Flat-screen TV', 'Mini Fridge', 'Room Service', 'Safe'],
    isAvailable: true,
    rating: 4.2,
    totalReviews: 8
  },
  {
    name: 'Superior Double Room',
    type: 'Double',
    price: 149,
    description: 'Spacious double room featuring two queen beds, ideal for couples or friends. Includes premium bedding, marble bathroom, and a charming balcony.',
    images: [
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800'
    ],
    capacity: 2,
    size: 35,
    floor: 3,
    amenities: ['Free WiFi', 'Air Conditioning', 'Smart TV', 'Minibar', 'Balcony', 'Bathtub', 'Room Service'],
    isAvailable: true,
    rating: 4.5,
    totalReviews: 15
  },
  {
    name: 'Deluxe Ocean View',
    type: 'Deluxe',
    price: 249,
    description: 'Our signature Deluxe room with breathtaking ocean views. Featuring a king-size bed, luxury en-suite with rainfall shower, and a private terrace.',
    images: [
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800'
    ],
    capacity: 3,
    size: 48,
    floor: 5,
    amenities: ['Free WiFi', 'Air Conditioning', '4K Smart TV', 'Minibar', 'Ocean View', 'Rainfall Shower', 'Butler Service', 'Bathtub'],
    isAvailable: true,
    rating: 4.7,
    totalReviews: 22
  },
  {
    name: 'Presidential Suite',
    type: 'Suite',
    price: 599,
    description: 'The pinnacle of luxury. Our Presidential Suite spans the entire top floor, featuring panoramic views, a private pool, dedicated butler, and bespoke amenities.',
    images: [
      'https://images.unsplash.com/photo-1631049421450-348ccd8f8b5b?w=800',
      'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800'
    ],
    capacity: 6,
    size: 180,
    floor: 10,
    amenities: ['Free WiFi', 'Private Pool', 'Butler Service', 'Kitchen', 'Dining Room', 'Home Theater', 'Jacuzzi', 'Gym Access', 'Airport Transfer'],
    isAvailable: true,
    rating: 4.9,
    totalReviews: 7
  },
  {
    name: 'Garden View Double',
    type: 'Double',
    price: 129,
    description: 'Serene double room overlooking our lush tropical gardens. Perfect for a relaxing retreat with all modern comforts and elegant decor.',
    images: [
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800'
    ],
    capacity: 2,
    size: 32,
    floor: 1,
    amenities: ['Free WiFi', 'Air Conditioning', 'TV', 'Garden View', 'Minibar', 'Room Service'],
    isAvailable: true,
    rating: 4.3,
    totalReviews: 11
  },
  {
    name: 'Luxury Suite with Terrace',
    type: 'Suite',
    price: 399,
    description: 'An elegant suite featuring a separate living area, private terrace with sun loungers, and a luxurious marble bathroom with a deep soaking tub.',
    images: [
      'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800',
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800'
    ],
    capacity: 4,
    size: 95,
    floor: 7,
    amenities: ['Free WiFi', 'Private Terrace', 'Living Room', 'Kitchenette', 'Jacuzzi', 'Butler Service', '4K TV', 'Premium Minibar'],
    isAvailable: true,
    rating: 4.8,
    totalReviews: 14
  },
  {
    name: 'Executive Single',
    type: 'Single',
    price: 109,
    description: 'A sophisticated single room designed for business travelers. Includes a dedicated work desk, ergonomic chair, and high-speed WiFi.',
    images: [
      'https://images.unsplash.com/photo-1631049421450-348ccd8f8b5b?w=800',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800'
    ],
    capacity: 1,
    size: 26,
    floor: 4,
    amenities: ['Free WiFi', 'Work Desk', 'Air Conditioning', 'Smart TV', 'Coffee Machine', 'Safe', 'Iron'],
    isAvailable: true,
    rating: 4.4,
    totalReviews: 9
  },
  {
    name: 'Honeymoon Deluxe',
    type: 'Deluxe',
    price: 299,
    description: 'Romantic and intimate, the Honeymoon Deluxe features rose petal turndown service, champagne on arrival, and a private sunset-view balcony.',
    images: [
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800'
    ],
    capacity: 2,
    size: 55,
    floor: 6,
    amenities: ['Free WiFi', 'Champagne Welcome', 'Jacuzzi', 'Ocean View', 'Canopy Bed', 'Butler Service', 'Romantic Setup', 'Bathrobe & Slippers'],
    isAvailable: true,
    rating: 4.9,
    totalReviews: 18
  }
];

async function ensureUser(userData) {
  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    return existingUser;
  }

  return User.create(userData);
}

async function ensureRoom(roomData) {
  const existingRoom = await Room.findOne({ name: roomData.name });
  if (existingRoom) {
    return existingRoom;
  }

  return Room.create(roomData);
}

async function ensureBooking(bookingData) {
  const existingBooking = await Booking.findOne({ specialRequests: bookingData.specialRequests });
  if (existingBooking) {
    return existingBooking;
  }

  return Booking.create(bookingData);
}

async function bootstrapData() {
  const adminUser = await ensureUser({
    name: 'Admin User',
    email: 'admin@hotel.com',
    password: 'admin123',
    role: 'admin',
    phone: '+1 555-0000'
  });

  const demoUser = await ensureUser({
    name: 'John Doe',
    email: 'user@hotel.com',
    password: 'user123',
    role: 'user',
    phone: '+1 555-1234'
  });

  const roomDocs = [];
  for (const room of rooms) {
    roomDocs.push(await ensureRoom(room));
  }

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  const lastMonth = new Date();
  lastMonth.setDate(lastMonth.getDate() - 30);

  const lastMonthEnd = new Date();
  lastMonthEnd.setDate(lastMonthEnd.getDate() - 25);

  await ensureBooking({
    user: demoUser._id,
    room: roomDocs[0]._id,
    checkIn: lastMonth,
    checkOut: lastMonthEnd,
    guests: { adults: 1, children: 0 },
    totalNights: 5,
    pricePerNight: 89,
    totalAmount: 445,
    status: 'completed',
    paymentStatus: 'paid',
    specialRequests: 'bootstrap-demo-booking-completed'
  });

  await ensureBooking({
    user: demoUser._id,
    room: roomDocs[2]._id,
    checkIn: nextWeek,
    checkOut: new Date(nextWeek.getTime() + 3 * 86400000),
    guests: { adults: 2, children: 0 },
    totalNights: 3,
    pricePerNight: 249,
    totalAmount: 747,
    status: 'confirmed',
    paymentStatus: 'paid',
    specialRequests: 'bootstrap-demo-booking-upcoming'
  });

  return {
    adminEmail: adminUser.email,
    userEmail: demoUser.email,
    rooms: roomDocs.length
  };
}

module.exports = { bootstrapData };
