const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Who receives the notification
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },

  // Who triggered the notification (optional for system notifications)
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Type of notification
  type: {
    type: String,
    required: [true, 'Notification type is required'],
    enum: [
      'like', 'comment', 'follow', 'unfollow',
      'trip_invite', 'trip_join', 'trip_leave',
      'message', 'mention',
      'admin_warning', 'admin_ban', 'system'
    ]
  },

  // Reference to the related object (post, trip, etc.)
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  // Reference model type
  referenceModel: {
    type: String,
    required: true,
    enum: ['Post', 'Comment', 'Trip', 'User', 'Message']
  },

  // Notification message/content
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    maxlength: [500, 'Notification message cannot be more than 500 characters']
  },

  // Additional data (optional)
  data: {
    type: mongoose.Schema.Types.Mixed
  },

  // Read status
  isRead: {
    type: Boolean,
    default: false
  },

  // Read timestamp
  readAt: {
    type: Date
  },

  // Priority level
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },

  // Notification settings
  canDismiss: {
    type: Boolean,
    default: true
  },

  // For push notifications
  isPushSent: {
    type: Boolean,
    default: false
  },

  // For email notifications
  isEmailSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Virtual for time ago
notificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
});

// Indexes for performance
notificationSchema.index({ userId: 1, createdAt: -1 }); // User's notifications sorted by date
notificationSchema.index({ userId: 1, isRead: 1 }); // Unread notifications
notificationSchema.index({ type: 1 }); // Filter by type
notificationSchema.index({ priority: 1 }); // Filter by priority
notificationSchema.index({ createdAt: 1 }); // Cleanup old notifications

// Instance method to mark as read
notificationSchema.methods.markAsRead = async function() {
  this.isRead = true;
  this.readAt = new Date();
  return await this.save();
};

// Static method to create notification
notificationSchema.statics.createNotification = async function(data) {
  const {
    userId,
    senderId,
    type,
    referenceId,
    referenceModel,
    message,
    priority = 'normal',
    additionalData = {}
  } = data;

  // Don't create notification for self-actions
  if (senderId && userId.toString() === senderId.toString()) {
    return null;
  }

  // Check if similar notification already exists (prevent spam)
  const existingNotification = await this.findOne({
    userId,
    senderId,
    type,
    referenceId,
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Within last 24 hours
  });

  if (existingNotification) {
    // Update existing notification instead of creating new one
    existingNotification.message = message;
    existingNotification.isRead = false;
    existingNotification.readAt = undefined;
    existingNotification.createdAt = new Date();
    existingNotification.data = additionalData;
    return await existingNotification.save();
  }

  const notification = new this({
    userId,
    senderId,
    type,
    referenceId,
    referenceModel,
    message,
    priority,
    data: additionalData
  });

  return await notification.save();
};

// Static method to get user's notifications
notificationSchema.statics.getUserNotifications = function(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  return this.find({ userId })
    .populate('senderId', 'username fullName profilePicture')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    userId,
    isRead: false
  });
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { userId, isRead: false },
    {
      isRead: true,
      readAt: new Date()
    }
  );
};

// Static method to delete old notifications (cleanup)
notificationSchema.statics.deleteOldNotifications = function(daysOld = 30) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  return this.deleteMany({
    createdAt: { $lt: cutoffDate },
    isRead: true
  });
};

// Static helper methods for common notification types
notificationSchema.statics.createLikeNotification = async function(postId, likedBy, postOwnerId) {
  const User = mongoose.model('User');
  const liker = await User.findById(likedBy).select('username fullName');

  return this.createNotification({
    userId: postOwnerId,
    senderId: likedBy,
    type: 'like',
    referenceId: postId,
    referenceModel: 'Post',
    message: `${liker.fullName || liker.username} liked your post`
  });
};

notificationSchema.statics.createCommentNotification = async function(postId, commentedBy, postOwnerId) {
  const User = mongoose.model('User');
  const commenter = await User.findById(commentedBy).select('username fullName');

  return this.createNotification({
    userId: postOwnerId,
    senderId: commentedBy,
    type: 'comment',
    referenceId: postId,
    referenceModel: 'Post',
    message: `${commenter.fullName || commenter.username} commented on your post`
  });
};

notificationSchema.statics.createFollowNotification = async function(followedUserId, followerId) {
  const User = mongoose.model('User');
  const follower = await User.findById(followerId).select('username fullName');

  return this.createNotification({
    userId: followedUserId,
    senderId: followerId,
    type: 'follow',
    referenceId: followerId,
    referenceModel: 'User',
    message: `${follower.fullName || follower.username} started following you`
  });
};

notificationSchema.statics.createTripInviteNotification = async function(tripId, invitedUserId, invitedBy) {
  const User = mongoose.model('User');
  const Trip = mongoose.model('Trip');

  const [inviter, trip] = await Promise.all([
    User.findById(invitedBy).select('username fullName'),
    Trip.findById(tripId).select('tripName')
  ]);

  return this.createNotification({
    userId: invitedUserId,
    senderId: invitedBy,
    type: 'trip_invite',
    referenceId: tripId,
    referenceModel: 'Trip',
    message: `${inviter.fullName || inviter.username} invited you to join "${trip.tripName}"`,
    priority: 'high'
  });
};

notificationSchema.statics.createAdminWarningNotification = async function(userId, reason, adminId) {
  return this.createNotification({
    userId,
    senderId: adminId,
    type: 'admin_warning',
    referenceId: adminId,
    referenceModel: 'User',
    message: `Warning: ${reason}`,
    priority: 'urgent',
    canDismiss: false
  });
};

module.exports = mongoose.model('Notification', notificationSchema);
