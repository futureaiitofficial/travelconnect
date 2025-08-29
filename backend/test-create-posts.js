const mongoose = require('mongoose');
const Post = require('./models/Post');
const User = require('./models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/travelconnect')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Sample posts data
const samplePosts = [
  {
    caption: 'Just witnessed the most breathtaking sunset from Oia! The blue domes and white buildings create such a magical contrast against the golden sky. Greece, you have my heart! 💙 #Santorini #Greece #Sunset',
    media: ['https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    location: {
      name: 'Santorini, Greece',
      lat: 36.3932,
      lng: 25.4615
    },
    hashtags: ['santorini', 'greece', 'sunset'],
    isPublic: true
  },
  {
    caption: 'Finally made it to Machu Picchu after a 4-day Inca Trail trek! The ancient architecture and mountain views are absolutely incredible. Worth every step of the challenging hike! 🏔️ #MachuPicchu #Peru #IncaTrail #Hiking',
    media: ['https://images.unsplash.com/photo-1587595431973-160d0d94add1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    location: {
      name: 'Machu Picchu, Peru',
      lat: -13.1631,
      lng: -72.5450
    },
    hashtags: ['machupicchu', 'peru', 'incatrail', 'hiking'],
    isPublic: true
  },
  {
    caption: 'Lost in the neon lights of Shibuya! Tokyo is a perfect blend of traditional culture and modern innovation. The street food here is absolutely amazing 🍜 #Tokyo #Japan #Shibuya #StreetFood',
    media: ['https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    location: {
      name: 'Tokyo, Japan',
      lat: 35.6762,
      lng: 139.6503
    },
    hashtags: ['tokyo', 'japan', 'shibuya', 'streetfood'],
    isPublic: true
  },
  {
    caption: 'Exploring the beautiful beaches and temples of Bali! Swipe to see more photos from this paradise island. 🌴 #Bali #Indonesia #TravelPhotography #BeachVibes',
    media: [
      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1539367628448-4bc5c9d171c8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    ],
    location: {
      name: 'Bali, Indonesia',
      lat: -8.3405,
      lng: 115.0920
    },
    hashtags: ['bali', 'indonesia', 'travelphotography', 'beachvibes'],
    isPublic: true
  },
  {
    caption: 'Road trip through the mountains! The winding roads and breathtaking views make every mile worth it. 🚗 #RoadTrip #Mountains #Adventure',
    media: ['https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    location: {
      name: 'Rocky Mountains, USA',
      lat: 39.5501,
      lng: -105.7821
    },
    hashtags: ['roadtrip', 'mountains', 'adventure'],
    isPublic: true
  }
];

async function createSamplePosts() {
  try {
    // Get a user to assign posts to (create one if none exists)
    let user = await User.findOne();
    if (!user) {
      console.log('No users found. Creating a test user...');
      user = new User({
        username: 'testuser',
        email: 'test@example.com',
        fullName: 'Test User',
        password: 'password123'
      });
      await user.save();
      console.log('Test user created:', user.username);
    }

    console.log('Creating sample posts...');

    // Create posts
    const posts = samplePosts.map(postData => ({
      ...postData,
      userId: user._id
    }));

    const createdPosts = await Post.insertMany(posts);
    console.log(`Successfully created ${createdPosts.length} sample posts`);

    // Display created posts
    createdPosts.forEach((post, index) => {
      console.log(`${index + 1}. ${post.caption.substring(0, 50)}...`);
    });

  } catch (error) {
    console.error('Error creating sample posts:', error);
  } finally {
    mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the script
createSamplePosts();
