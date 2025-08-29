require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Trip = require('./models/Trip');

async function createTestTrip() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB');

    // Find the test user
    const testUser = await User.findOne({ email: 'test@travelconnect.com' });
    if (!testUser) {
      console.error('❌ Test user not found');
      return;
    }
    console.log('✅ Found test user:', testUser.username);

    // Check if Hyderabad trip already exists
    const existingTrip = await Trip.findOne({
      destination: /hyderabad/i,
      createdBy: testUser._id
    });

    if (existingTrip) {
      console.log('✅ Hyderabad trip already exists:', existingTrip.tripName);
      console.log('Trip ID:', existingTrip._id);
      return;
    }

    // Create a new trip in Hyderabad
    const tripData = {
      createdBy: testUser._id,
      tripName: 'Explore Historic Hyderabad',
      description: 'A wonderful journey through the pearl city of India. Visit Charminar, Golconda Fort, and taste authentic Hyderabadi biryani!',
      destination: 'Hyderabad, Telangana, India',
      destinationCoordinates: {
        lat: 17.3850,
        lng: 78.4867
      },
      destinationPlaceId: 'ChIJD7fiBh9ucTkRg6ajd2nnUIE',
      startDate: new Date('2025-12-01'),
      endDate: new Date('2025-12-05'),
      isPublic: true,
      maxMembers: 8,
      tripType: 'group',
      interests: ['culture-history', 'food-cuisine', 'adventure'],
      tags: ['heritage', 'food', 'history', 'culture'],
      status: 'planning',
      members: [],
      itinerary: [
        {
          day: 1,
          date: new Date('2025-12-01'),
          activities: [
            {
              time: '10:00',
              activity: 'Visit Charminar',
              location: 'Charminar, Hyderabad',
              coordinates: { lat: 17.3616, lng: 78.4747 },
              notes: 'Iconic monument and symbol of Hyderabad'
            },
            {
              time: '14:00',
              activity: 'Lunch at Paradise Restaurant',
              location: 'Paradise Restaurant, Secunderabad',
              coordinates: { lat: 17.4399, lng: 78.4983 },
              notes: 'Famous for authentic Hyderabadi biryani'
            }
          ]
        },
        {
          day: 2,
          date: new Date('2025-12-02'),
          activities: [
            {
              time: '09:00',
              activity: 'Explore Golconda Fort',
              location: 'Golconda Fort, Hyderabad',
              coordinates: { lat: 17.3833, lng: 78.4011 },
              notes: 'Historic fort complex with great views'
            }
          ]
        }
      ],
      checklist: [
        { item: 'Book train/flight tickets', isDone: false },
        { item: 'Research local restaurants', isDone: false },
        { item: 'Pack comfortable walking shoes', isDone: false },
        { item: 'Download offline maps', isDone: false },
        { item: 'Book accommodation', isDone: false }
      ]
    };

    const newTrip = await Trip.create(tripData);
    console.log('🎉 Created new Hyderabad trip successfully!');
    console.log('Trip ID:', newTrip._id);
    console.log('Trip Name:', newTrip.tripName);
    console.log('Destination:', newTrip.destination);
    console.log('Coordinates:', newTrip.destinationCoordinates);
    console.log('Public:', newTrip.isPublic);
    console.log('Trip Type:', newTrip.tripType);
    console.log('Interests:', newTrip.interests);

  } catch (error) {
    console.error('❌ Error creating test trip:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

createTestTrip();
