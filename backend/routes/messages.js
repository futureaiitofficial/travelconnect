const express = require('express');
const router = express.Router();

// Import controllers
const {
  getUserConversations,
  createOrGetConversation,
  getConversationMessages,
  sendMessage,
  markMessageAsRead,
  deleteMessage,
  addReaction,
  removeReaction,
  getUnreadCount,
  searchConversations
} = require('../controllers/messageController');

const { protect } = require('../middleware/auth');
const {
  validateCreateConversation,
  validateSendMessage,
  validateAddReaction
} = require('../middleware/validation');

// All routes require authentication
router.use(protect);

// Conversation routes
router.get('/conversations', getUserConversations);
router.post('/conversations', validateCreateConversation, createOrGetConversation);
router.get('/conversations/:id', getConversationMessages);
router.post('/conversations/:id/messages', validateSendMessage, sendMessage);

// Message routes
router.put('/messages/:id/read', markMessageAsRead);
router.delete('/messages/:id', deleteMessage);
router.post('/messages/:id/reactions', validateAddReaction, addReaction);
router.delete('/messages/:id/reactions', removeReaction);

// Utility routes
router.get('/unread-count', getUnreadCount);
router.get('/search', searchConversations);

module.exports = router;
