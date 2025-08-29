const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  // Members of the conversation
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],

  // Is this a group conversation or 1-on-1
  isGroup: {
    type: Boolean,
    default: false
  },

  // Group name (only for group conversations)
  groupName: {
    type: String,
    maxlength: [100, 'Group name cannot be more than 100 characters'],
    trim: true
  },

  // Group admin (only for group conversations)
  groupAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Last message timestamp for sorting
  lastMessageAt: {
    type: Date,
    default: Date.now
  },

  // Last message preview
  lastMessage: {
    type: String,
    maxlength: [200, 'Last message preview cannot be more than 200 characters']
  },

  // Who sent the last message
  lastMessageBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Conversation settings
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Validation: Group conversations must have a group name
conversationSchema.pre('save', function(next) {
  if (this.isGroup && !this.groupName) {
    return next(new Error('Group conversations must have a group name'));
  }

  if (this.isGroup && this.members.length < 3) {
    return next(new Error('Group conversations must have at least 3 members'));
  }

  if (!this.isGroup && this.members.length !== 2) {
    return next(new Error('Direct conversations must have exactly 2 members'));
  }

  next();
});

// Virtual for member count
conversationSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// Indexes for performance
conversationSchema.index({ members: 1 }); // Find conversations by member
conversationSchema.index({ lastMessageAt: -1 }); // Sort by recent activity
conversationSchema.index({ isActive: 1 }); // Active conversations only

// Instance method to check if user is member
conversationSchema.methods.isMember = function(userId) {
  return this.members.includes(userId);
};

// Instance method to add member (for group conversations)
conversationSchema.methods.addMember = async function(userId, addedBy) {
  if (!this.isGroup) {
    throw new Error('Cannot add members to direct conversations');
  }

  if (!this.isMember(addedBy)) {
    throw new Error('Only conversation members can add new members');
  }

  if (!this.isMember(userId)) {
    this.members.push(userId);
    await this.save();
  }

  return this;
};

// Instance method to remove member (for group conversations)
conversationSchema.methods.removeMember = async function(userId, removedBy) {
  if (!this.isGroup) {
    throw new Error('Cannot remove members from direct conversations');
  }

  // Only group admin or the user themselves can remove
  if (!removedBy.equals(this.groupAdmin) && !removedBy.equals(userId)) {
    throw new Error('Only group admin or the user themselves can remove members');
  }

  this.members = this.members.filter(id => !id.equals(userId));

  // If admin is removed, assign new admin
  if (userId.equals(this.groupAdmin) && this.members.length > 0) {
    this.groupAdmin = this.members[0];
  }

  await this.save();
  return this;
};

// Instance method to update last message info
conversationSchema.methods.updateLastMessage = async function(messageText, senderId) {
  this.lastMessage = messageText.length > 200 ? messageText.substring(0, 197) + '...' : messageText;
  this.lastMessageBy = senderId;
  this.lastMessageAt = new Date();

  return await this.save();
};

// Static method to find or create direct conversation
conversationSchema.statics.findOrCreateDirectConversation = async function(user1Id, user2Id) {
  // Try to find existing conversation
  let conversation = await this.findOne({
    isGroup: false,
    members: { $all: [user1Id, user2Id] }
  });

  if (!conversation) {
    // Create new conversation
    conversation = new this({
      members: [user1Id, user2Id],
      isGroup: false
    });
    await conversation.save();
  }

  return conversation;
};

// Static method to get user's conversations
conversationSchema.statics.getUserConversations = function(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  return this.find({
    members: userId,
    isActive: true
  })
  .populate('members', 'username fullName profilePicture')
  .populate('lastMessageBy', 'username fullName')
  .sort({ lastMessageAt: -1 })
  .skip(skip)
  .limit(limit);
};

// Static method to create group conversation
conversationSchema.statics.createGroupConversation = async function(groupName, adminId, memberIds) {
  const allMembers = [adminId, ...memberIds.filter(id => !id.equals(adminId))];

  const conversation = new this({
    groupName,
    members: allMembers,
    groupAdmin: adminId,
    isGroup: true
  });

  return await conversation.save();
};

module.exports = mongoose.model('Conversation', conversationSchema);
