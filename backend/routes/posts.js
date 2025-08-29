const express = require('express');
const router = express.Router();

// Import controllers
const {
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
  toggleLikePost,
  getPostsByUser,
  getPostsByHashtag,
  getPostsByLocation,
  searchPosts,
  upload
} = require('../controllers/postController');

const { protect, optionalAuth } = require('../middleware/auth');
const { validateCreatePost, validateUpdatePost } = require('../middleware/validation');

// Create uploads directory for posts if it doesn't exist
const fs = require('fs');
const path = require('path');
const uploadsDir = path.join(__dirname, '../uploads/posts');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Public routes
router.get('/', optionalAuth, getAllPosts); // Feed
router.get('/search', searchPosts); // Search posts
router.get('/hashtag/:hashtag', getPostsByHashtag); // Posts by hashtag
router.get('/location', getPostsByLocation); // Posts by location (nearby)
router.get('/user/:userId', optionalAuth, getPostsByUser); // Posts by user
router.get('/:id', optionalAuth, getPostById); // Single post

// Protected routes
router.post('/', protect, upload.array('media', 10), validateCreatePost, createPost); // Create post
router.put('/:id', protect, validateUpdatePost, updatePost); // Update post
router.delete('/:id', protect, deletePost); // Delete post
router.post('/:id/like', protect, toggleLikePost); // Like/unlike post

module.exports = router;
