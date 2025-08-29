const express = require('express');
const router = express.Router();

// Import controllers
const {
  getCommentsForPost,
  createComment,
  updateComment,
  deleteComment,
  toggleLikeComment,
  getRepliesForComment
} = require('../controllers/commentController');

const { protect } = require('../middleware/auth');
const { validateCreateComment, validateUpdateComment } = require('../middleware/validation');

// Public routes
router.get('/post/:postId', getCommentsForPost); // Get comments for a post
router.get('/:id/replies', getRepliesForComment); // Get replies for a comment

// Protected routes
router.post('/', protect, validateCreateComment, createComment); // Create comment
router.put('/:id', protect, validateUpdateComment, updateComment); // Update comment
router.delete('/:id', protect, deleteComment); // Delete comment
router.post('/:id/like', protect, toggleLikeComment); // Like/unlike comment

module.exports = router;
