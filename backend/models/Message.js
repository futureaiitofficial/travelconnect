const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // Conversation this message belongs to
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: [true, 'Conversation ID is required']
  },

  // Who sent the message
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender ID is required']
  },

  // Who should receive the message (for direct messages)
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Message content
  messageText: {
    type: String,
    required: [true, 'Message text is required'],
    maxlength: [5000, 'Message cannot be more than 5000 characters'],
    trim: true
  },

  // Message type
  messageType: {
    type: String,
    enum: ['text', 'image', 'video', 'file', 'location'],
    default: 'text'
  },

  // For non-text messages
  mediaUrl: {
    type: String
  },

  // For location messages
  location: {
    name: String,
    lat: Number,
    lng: Number
  },

  // Read status
  read: {
    type: Boolean,
    default: false
  },

  // Read by (for group messages)
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Message status
  isDelivered: {
    type: Boolean,
    default: false
  },

  // For message replies
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },

  // Message reactions
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Admin moderation
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockedReason: {
    type: String
  },
  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Virtual for read count in group messages
messageSchema.virtual('readCount').get(function() {
  return this.readBy.length;
});

// Virtual to check if message has media
messageSchema.virtual('hasMedia').get(function() {
  return this.messageType !== 'text' && this.mediaUrl;
});

// Indexes for performance
messageSchema.index({ conversationId: 1, createdAt: 1 }); // Messages in conversation sorted by time
messageSchema.index({ senderId: 1, createdAt: -1 }); // User's sent messages
messageSchema.index({ receiverId: 1, read: 1 }); // Unread messages for user
messageSchema.index({ read: 1 }); // All unread messages

// Instance method to mark as read by user
messageSchema.methods.markAsReadBy = async function(userId) {
  // For direct messages
  if (this.receiverId && this.receiverId.equals(userId)) {
    this.read = true;
    this.isDelivered = true;
  }

  // For group messages
  const existingRead = this.readBy.find(r => r.user.equals(userId));
  if (!existingRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
  }

  return await this.save();
};

// Instance method to add reaction
messageSchema.methods.addReaction = async function(userId, emoji) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(r => !r.user.equals(userId));

  // Add new reaction
  this.reactions.push({
    user: userId,
    emoji,
    createdAt: new Date()
  });

  return await this.save();
};

// Instance method to remove reaction
messageSchema.methods.removeReaction = async function(userId) {
  this.reactions = this.reactions.filter(r => !r.user.equals(userId));
  return await this.save();
};

// Static method to get messages for conversation
messageSchema.statics.getMessagesForConversation = function(conversationId, page = 1, limit = 50) {
  const skip = (page - 1) * limit;

  return this.find({
    conversationId,
    isBlocked: false
  })
  .populate('senderId', 'username fullName profilePicture')
  .populate('replyTo', 'messageText senderId')
  .sort({ createdAt: -1 }) // Newest first, then reverse on frontend
  .skip(skip)
  .limit(limit);
};

// Static method to get unread messages for user
messageSchema.statics.getUnreadMessagesForUser = function(userId) {
  return this.find({
    $or: [
      { receiverId: userId, read: false },
      {
        conversationId: { $exists: true },
        'readBy.user': { $ne: userId },
        senderId: { $ne: userId }
      }
    ],
    isBlocked: false
  })
  .populate('senderId', 'username fullName profilePicture')
  .populate('conversationId', 'isGroup groupName members')
  .sort({ createdAt: -1 });
};

// Static method to get unread count for user
messageSchema.statics.getUnreadCountForUser = async function(userId) {
  return this.countDocuments({
    $or: [
      { receiverId: userId, read: false },
      {
        conversationId: { $exists: true },
        'readBy.user': { $ne: userId },
        senderId: { $ne: userId }
      }
    ],
    isBlocked: false
  });
};

// Static method to mark all messages as read in conversation
messageSchema.statics.markAllAsReadInConversation = async function(conversationId, userId) {
  return this.updateMany(
    {
      conversationId,
      senderId: { $ne: userId },
      isBlocked: false
    },
    {
      $set: { read: true },
      $addToSet: {
        readBy: {
          user: userId,
          readAt: new Date()
        }
      }
    }
  );
};

// Admin method to block message
messageSchema.statics.blockMessage = async function(messageId, adminId, reason) {
  return this.findByIdAndUpdate(messageId, {
    isBlocked: true,
    blockedReason: reason,
    blockedBy: adminId
  }, { new: true });
};

// Post-save middleware to update conversation's last message
messageSchema.post('save', async function(doc) {
  if (doc.isNew && !doc.isBlocked) {
    const Conversation = mongoose.model('Conversation');
    await Conversation.findByIdAndUpdate(doc.conversationId, {
      lastMessage: doc.messageText,
      lastMessageBy: doc.senderId,
      lastMessageAt: doc.createdAt
    });
  }
});

module.exports = mongoose.model('Message', messageSchema);
