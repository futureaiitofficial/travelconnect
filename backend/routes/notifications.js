const express = require('express');
const router = express.Router();

// Placeholder routes - will implement controllers next
router.get('/', (req, res) => {
  res.json({ message: 'Get user notifications endpoint - to be implemented' });
});

router.put('/:id/read', (req, res) => {
  res.json({ message: 'Mark notification as read endpoint - to be implemented' });
});

router.put('/mark-all-read', (req, res) => {
  res.json({ message: 'Mark all notifications as read endpoint - to be implemented' });
});

router.delete('/:id', (req, res) => {
  res.json({ message: 'Delete notification endpoint - to be implemented' });
});

router.get('/unread-count', (req, res) => {
  res.json({ message: 'Get unread notification count endpoint - to be implemented' });
});

module.exports = router;
