const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  // Post this comment belongs to
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: [true, 'Post ID is required']
  },

  // User who made the comment
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },

  // Comment content
  commentText: {
    type: String,
    required: [true, 'Comment text is required'],
    maxlength: [1000, 'Comment cannot be more than 1000 characters'],
    trim: true
  },

  // Optional: Parent comment for nested/reply comments
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },

  // Users who liked this comment
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Admin moderation
  isReported: {
    type: Boolean,
    default: false
  },
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
  },
  blockedAt: {
    type: Date
  }
}, {
  timestamps: true // adds createdAt and updatedAt
});

// Virtual for likes count
commentSchema.virtual('likesCount').get(function() {
  return this.likes.length;
});

// Virtual to check if this is a reply
commentSchema.virtual('isReply').get(function() {
  return this.parentComment !== null;
});

// Indexes for performance
commentSchema.index({ postId: 1, createdAt: 1 }); // Comments for a post sorted by date
commentSchema.index({ userId: 1, createdAt: -1 }); // User's comments
commentSchema.index({ parentComment: 1 }); // Reply comments
commentSchema.index({ isBlocked: 1 }); // Non-blocked comments

// Instance method to check if user liked this comment
commentSchema.methods.isLikedBy = function(userId) {
  return this.likes.includes(userId);
};

// Instance method to like/unlike comment
commentSchema.methods.toggleLike = async function(userId) {
  const isLiked = this.isLikedBy(userId);

  if (isLiked) {
    // Unlike
    this.likes = this.likes.filter(id => id.toString() !== userId.toString());
  } else {
    // Like
    this.likes.push(userId);
  }

  return await this.save();
};

// Static method to get comments for a post
commentSchema.statics.getCommentsForPost = function(postId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  return this.find({
    postId,
    parentComment: null, // Only top-level comments
    isBlocked: false
  })
  .populate('userId', 'username fullName profilePicture')
  .sort({ createdAt: 1 }) // Oldest first for comments
  .skip(skip)
  .limit(limit);
};

// Static method to get replies for a comment
commentSchema.statics.getRepliesForComment = function(commentId, page = 1, limit = 10) {
  const skip = (page - 1) * limit;

  return this.find({
    parentComment: commentId,
    isBlocked: false
  })
  .populate('userId', 'username fullName profilePicture')
  .sort({ createdAt: 1 })
  .skip(skip)
  .limit(limit);
};

// Static method to get comments by user
commentSchema.statics.getCommentsByUser = function(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  return this.find({
    userId,
    isBlocked: false
  })
  .populate('postId', 'caption media')
  .populate('userId', 'username fullName profilePicture')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
};

// Admin method to block comment
commentSchema.statics.blockComment = async function(commentId, adminId, reason) {
  return this.findByIdAndUpdate(commentId, {
    isBlocked: true,
    blockedReason: reason,
    blockedBy: adminId,
    blockedAt: new Date()
  }, { new: true });
};

// Pre-save middleware to update post comment count
commentSchema.post('save', async function(doc) {
  if (doc.isNew) {
    const Post = mongoose.model('Post');
    await Post.findByIdAndUpdate(doc.postId, { $inc: { commentsCount: 1 } });
  }
});

// Pre-remove middleware to update post comment count
commentSchema.pre('deleteOne', { document: true }, async function() {
  const Post = mongoose.model('Post');
  await Post.findByIdAndUpdate(this.postId, { $inc: { commentsCount: -1 } });
});

module.exports = mongoose.model('Comment', commentSchema);
