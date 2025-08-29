const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Trip = require('../models/Trip');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Notification = require('../models/Notification');
const Report = require('../models/Report');

// Import controllers
const {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  refreshToken,
  getUserStats
} = require('../controllers/authController');

const { protect, requireAdmin } = require('../middleware/auth');
const {
  validateRegister,
  validateLogin,
  validateChangePassword,
  validateForgotPassword,
  validateResetPassword,
  validateUpdateProfile,
  validateRefreshToken
} = require('../middleware/validation');

// Test endpoint to verify database connection and all models
router.get('/test-db', async (req, res) => {
  try {
    // Test all models by counting documents
    const [
      userCount,
      postCount,
      commentCount,
      tripCount,
      messageCount,
      conversationCount,
      notificationCount,
      reportCount
    ] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Comment.countDocuments(),
      Trip.countDocuments(),
      Message.countDocuments(),
      Conversation.countDocuments(),
      Notification.countDocuments(),
      Report.countDocuments()
    ]);

    // Get all collection names
    const mongoose = require('mongoose');
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);

    res.json({
      message: 'Database connection successful! All models loaded.',
      databaseName: mongoose.connection.name,
      collections: collectionNames,
      modelCounts: {
        users: userCount,
        posts: postCount,
        comments: commentCount,
        trips: tripCount,
        messages: messageCount,
        conversations: conversationCount,
        notifications: notificationCount,
        reports: reportCount
      },
      modelsLoaded: [
        'User', 'Post', 'Comment', 'Trip',
        'Message', 'Conversation', 'Notification', 'Report'
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Test endpoint to create a sample user
router.post('/test-create-user', async (req, res) => {
  try {
    // Check if test user already exists
    const existingUser = await User.findOne({ email: 'test@travelconnect.com' });

    if (existingUser) {
      return res.json({
        message: 'Test user already exists',
        user: {
          id: existingUser._id,
          username: existingUser.username,
          email: existingUser.email,
          fullName: existingUser.fullName
        }
      });
    }

    // Create a test user
    const testUser = new User({
      firstName: 'John',
      lastName: 'Traveler',
      username: 'johntraveler',
      email: 'test@travelconnect.com',
      password: 'password123',
      bio: 'Love exploring new places and meeting fellow travelers!',
      location: 'San Francisco, CA',
      interests: ['adventure', 'photography', 'hiking', 'culture']
    });

    await testUser.save();

    // Return user without password
    const savedUser = await User.findById(testUser._id);

    res.status(201).json({
      message: 'Test user created successfully!',
      user: {
        id: savedUser._id,
        username: savedUser.username,
        email: savedUser.email,
        fullName: savedUser.fullName,
        bio: savedUser.bio,
        location: savedUser.location,
        interests: savedUser.interests
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to create test user',
      error: error.message
    });
  }
});

// Authentication routes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/profile', protect, validateUpdateProfile, updateProfile);
router.put('/change-password', protect, validateChangePassword, changePassword);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.put('/reset-password/:resettoken', validateResetPassword, resetPassword);
router.post('/refresh-token', validateRefreshToken, refreshToken);

// Admin routes
router.get('/stats', protect, requireAdmin, getUserStats);

// Test endpoint to promote user to admin (remove in production)
router.post('/promote-admin/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByIdAndUpdate(userId, { role: 'admin' }, { new: true });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User promoted to admin successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error promoting user to admin',
      error: error.message
    });
  }
});

module.exports = router;
