const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// @desc    Get user's conversations
// @route   GET /api/messages/conversations
// @access  Private
const getUserConversations = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const conversations = await Conversation.getUserConversations(req.user.id, page, limit);

    // Get unread counts for each conversation
    const conversationsWithUnreadCounts = await Promise.all(
      conversations.map(async (conversation) => {
        const unreadCount = await Message.countDocuments({
          conversationId: conversation._id,
          senderId: { $ne: req.user.id },
          'readBy.user': { $ne: req.user.id },
          isBlocked: false
        });

        return {
          ...conversation.toObject(),
          unreadCount
        };
      })
    );

    res.status(200).json({
      success: true,
      data: conversationsWithUnreadCounts,
      pagination: {
        page,
        limit,
        hasMore: conversationsWithUnreadCounts.length === limit
      }
    });

  } catch (error) {
    console.error('Get user conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching conversations'
    });
  }
};

// @desc    Get or create direct conversation
// @route   POST /api/messages/conversations
// @access  Private
const createOrGetConversation = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { userId, isGroup, groupName, memberIds } = req.body;

    let conversation;

    if (isGroup) {
      // Create group conversation
      if (!groupName || !memberIds || memberIds.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Group name and at least 2 members are required'
        });
      }

      conversation = await Conversation.createGroupConversation(
        groupName,
        req.user.id,
        memberIds
      );
    } else {
      // Get or create direct conversation
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required for direct conversations'
        });
      }

      // Check if user exists
      const otherUser = await User.findById(userId);
      if (!otherUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      conversation = await Conversation.findOrCreateDirectConversation(req.user.id, userId);
    }

    // Populate conversation data
    await conversation.populate('members', 'username fullName profilePicture');
    await conversation.populate('lastMessageBy', 'username fullName');

    res.status(200).json({
      success: true,
      data: [conversation]
    });

  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating conversation'
    });
  }
};

// @desc    Get conversation messages
// @route   GET /api/messages/conversations/:id
// @access  Private
const getConversationMessages = async (req, res, next) => {
  try {
    const { id: conversationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    // Check if user is member of conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    if (!conversation.isMember(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this conversation'
      });
    }

    // Get messages
    const messages = await Message.getMessagesForConversation(conversationId, page, limit);

    // Mark messages as read
    await Message.markAllAsReadInConversation(conversationId, req.user.id);

    // Reverse messages to show oldest first (like Instagram)
    const reversedMessages = messages.reverse();

    res.status(200).json({
      success: true,
      data: {
        conversation,
        messages: reversedMessages,
        pagination: {
          page,
          limit,
          hasMore: messages.length === limit
        }
      }
    });

  } catch (error) {
    console.error('Get conversation messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching messages'
    });
  }
};

// @desc    Send message
// @route   POST /api/messages/conversations/:id/messages
// @access  Private
const sendMessage = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { id: conversationId } = req.params;
    const { messageText, messageType = 'text', mediaUrl, replyTo } = req.body;

    // Check if user is member of conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    if (!conversation.isMember(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send messages in this conversation'
      });
    }

    // Create message
    const messageData = {
      conversationId,
      senderId: req.user.id,
      messageText,
      messageType
    };

    if (mediaUrl) {
      messageData.mediaUrl = mediaUrl;
    }

    if (replyTo) {
      // Verify reply message exists and is in same conversation
      const replyMessage = await Message.findOne({
        _id: replyTo,
        conversationId,
        isBlocked: false
      });

      if (replyMessage) {
        messageData.replyTo = replyTo;
      }
    }

    const message = new Message(messageData);
    await message.save();

    // Populate message data
    await message.populate('senderId', 'username fullName profilePicture');
    if (message.replyTo) {
      await message.populate('replyTo', 'messageText senderId');
    }

    // Update conversation's last message
    await conversation.updateLastMessage(messageText, req.user.id);

    res.status(201).json({
      success: true,
      data: message
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending message'
    });
  }
};

// @desc    Mark message as read
// @route   PUT /api/messages/messages/:id/read
// @access  Private
const markMessageAsRead = async (req, res, next) => {
  try {
    const { id: messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is part of the conversation
    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation || !conversation.isMember(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to mark this message as read'
      });
    }

    await message.markAsReadBy(req.user.id);

    res.status(200).json({
      success: true,
      data: message
    });

  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking message as read'
    });
  }
};

// @desc    Delete message
// @route   DELETE /api/messages/messages/:id
// @access  Private
const deleteMessage = async (req, res, next) => {
  try {
    const { id: messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Only sender can delete their own message
    if (!message.senderId.equals(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this message'
      });
    }

    await Message.findByIdAndDelete(messageId);

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting message'
    });
  }
};

// @desc    Add reaction to message
// @route   POST /api/messages/messages/:id/reactions
// @access  Private
const addReaction = async (req, res, next) => {
  try {
    const { id: messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({
        success: false,
        message: 'Emoji is required'
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is part of the conversation
    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation || !conversation.isMember(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to react to this message'
      });
    }

    await message.addReaction(req.user.id, emoji);

    res.status(200).json({
      success: true,
      data: message
    });

  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding reaction'
    });
  }
};

// @desc    Remove reaction from message
// @route   DELETE /api/messages/messages/:id/reactions
// @access  Private
const removeReaction = async (req, res, next) => {
  try {
    const { id: messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is part of the conversation
    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation || !conversation.isMember(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to remove reaction from this message'
      });
    }

    await message.removeReaction(req.user.id);

    res.status(200).json({
      success: true,
      data: message
    });

  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while removing reaction'
    });
  }
};

// @desc    Get unread message count
// @route   GET /api/messages/unread-count
// @access  Private
const getUnreadCount = async (req, res, next) => {
  try {
    const unreadCount = await Message.getUnreadCountForUser(req.user.id);

    res.status(200).json({
      success: true,
      data: { unreadCount }
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting unread count'
    });
  }
};

// @desc    Search conversations
// @route   GET /api/messages/search
// @access  Private
const searchConversations = async (req, res, next) => {
  try {
    const { q: searchQuery } = req.query;

    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    // Search for conversations where the other user's name matches
    const conversations = await Conversation.find({
      members: req.user.id,
      isGroup: false,
      isActive: true
    })
    .populate('members', 'username fullName profilePicture')
    .populate('lastMessageBy', 'username fullName');

    // Filter conversations where other member matches search
    const filteredConversations = conversations.filter(conversation => {
      const otherMember = conversation.members.find(member =>
        !member._id.equals(req.user.id)
      );

      if (!otherMember) return false;

      return otherMember.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
             otherMember.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    });

    res.status(200).json({
      success: true,
      data: filteredConversations
    });

  } catch (error) {
    console.error('Search conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching conversations'
    });
  }
};

module.exports = {
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
};
