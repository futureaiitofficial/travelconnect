const mongoose = require('mongoose');
const Comment = require('./models/Comment');
const Post = require('./models/Post');
const User = require('./models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/travelconnect')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Sample comments data
const sampleComments = [
  {
    commentText: 'Absolutely stunning! The colors are incredible. I need to visit Santorini one day! 🌅',
  },
  {
    commentText: 'This looks amazing! How long did you stay there? Any recommendations for places to visit?',
  },
  {
    commentText: 'Wow, this is breathtaking! The sunset must have been magical. Great photo! 📸',
  },
  {
    commentText: 'I was there last year! The blue domes are even more beautiful in person. Did you visit Oia?',
  },
  {
    commentText: 'This is on my bucket list! The architecture is so unique. Thanks for sharing! ✨',
  },
  {
    commentText: 'Incredible shot! The lighting is perfect. What camera did you use?',
  },
  {
    commentText: 'This brings back so many memories! Santorini is truly magical. Great capture! 💙',
  },
  {
    commentText: 'The composition is perfect! I love how you captured the traditional architecture.',
  }
];

async function createSampleComments() {
  try {
    // Get a user and post to assign comments to
    let user = await User.findOne();
    let post = await Post.findOne();

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

    if (!post) {
      console.log('No posts found. Please create some posts first.');
      return;
    }

    console.log('Creating sample comments...');

    // Create comments
    const comments = sampleComments.map(commentData => ({
      ...commentData,
      postId: post._id,
      userId: user._id
    }));

    const createdComments = await Comment.insertMany(comments);
    console.log(`Successfully created ${createdComments.length} sample comments`);

    // Display created comments
    createdComments.forEach((comment, index) => {
      console.log(`${index + 1}. ${comment.commentText.substring(0, 50)}...`);
    });

    // Update post comment count
    await Post.findByIdAndUpdate(post._id, { commentsCount: createdComments.length });
    console.log('Updated post comment count');

  } catch (error) {
    console.error('Error creating sample comments:', error);
  } finally {
    mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the script
createSampleComments();
