const express = require('express');
const router = express.Router();

// Import controllers
const {
  getUserProfile,
  updateProfile,
  followUser,
  unfollowUser,
  getUserFollowers,
  getUserFollowing,
  searchUsers,
  getAllUsers,
  uploadAvatar,
  uploadCover,
  upload
} = require('../controllers/userController');

const { protect, optionalAuth } = require('../middleware/auth');
const { validateUpdateProfile } = require('../middleware/validation');

// Create uploads directory if it doesn't exist
const fs = require('fs');
const path = require('path');
const uploadsDir = path.join(__dirname, '../uploads/profile');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Public routes
router.get('/', getAllUsers);
router.get('/search', optionalAuth, searchUsers);
router.get('/profile/:identifier', optionalAuth, getUserProfile);
router.get('/followers/:userId', getUserFollowers);
router.get('/following/:userId', getUserFollowing);

// Protected routes
router.put('/profile', protect, validateUpdateProfile, updateProfile);
router.post('/follow/:userId', protect, followUser);
router.delete('/follow/:userId', protect, unfollowUser);

// File upload routes
router.post('/upload/avatar', protect, upload.single('avatar'), uploadAvatar);
router.post('/upload/cover', protect, upload.single('cover'), uploadCover);

module.exports = router;
