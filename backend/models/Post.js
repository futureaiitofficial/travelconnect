const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  // User who created the post
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },

  // Post content
  caption: {
    type: String,
    required: [true, 'Caption is required'],
    maxlength: [2000, 'Caption cannot be more than 2000 characters'],
    trim: true
  },

  // Media files (photos/videos)
  media: [{
    type: String, // URLs to uploaded media files
    required: true
  }],

  // Location information
  location: {
    name: {
      type: String,
      trim: true,
      maxlength: [200, 'Location name cannot be more than 200 characters']
    },
    lat: {
      type: Number,
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    lng: {
      type: Number,
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    }
  },

  // Hashtags extracted from caption
  hashtags: [{
    type: String,
    lowercase: true,
    trim: true
  }],

  // Users who liked this post
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Count of comments (for performance)
  commentsCount: {
    type: Number,
    default: 0
  },

  // Post visibility
  isPublic: {
    type: Boolean,
    default: true
  },

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
  timestamps: true, // adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for likes count
postSchema.virtual('likesCount').get(function() {
  return this.likes.length;
});

// Virtual to check if post has location
postSchema.virtual('hasLocation').get(function() {
  return this.location && this.location.name && this.location.lat && this.location.lng;
});

// Indexes for performance
postSchema.index({ userId: 1, createdAt: -1 }); // User's posts sorted by date
postSchema.index({ createdAt: -1 }); // All posts sorted by date (feed)
postSchema.index({ hashtags: 1 }); // Search by hashtags
postSchema.index({ 'location.lat': 1, 'location.lng': 1 }); // Geospatial queries
postSchema.index({ likes: 1 }); // Find posts liked by user
postSchema.index({ isPublic: 1, isBlocked: 1 }); // Public, non-blocked posts

// Text index for search
postSchema.index({
  caption: 'text',
  hashtags: 'text',
  'location.name': 'text'
});

// Pre-save middleware to extract hashtags from caption
postSchema.pre('save', function(next) {
  if (this.isModified('caption')) {
    // Extract hashtags from caption
    const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
    const hashtags = [];
    let match;

    while ((match = hashtagRegex.exec(this.caption)) !== null) {
      const hashtag = match[1].toLowerCase();
      if (!hashtags.includes(hashtag)) {
        hashtags.push(hashtag);
      }
    }

    this.hashtags = hashtags;
  }
  next();
});

// Instance method to check if user liked this post
postSchema.methods.isLikedBy = function(userId) {
  return this.likes.includes(userId);
};

// Instance method to like/unlike post
postSchema.methods.toggleLike = async function(userId) {
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

// Instance method to increment comment count
postSchema.methods.incrementComments = async function() {
  this.commentsCount += 1;
  return await this.save();
};

// Instance method to decrement comment count
postSchema.methods.decrementComments = async function() {
  if (this.commentsCount > 0) {
    this.commentsCount -= 1;
  }
  return await this.save();
};

// Static method to get feed posts (public, non-blocked, sorted by date)
postSchema.statics.getFeedPosts = function(page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  return this.find({
    isPublic: true,
    isBlocked: false
  })
  .populate('userId', 'username fullName profilePicture')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
};

// Static method to get posts by user
postSchema.statics.getPostsByUser = function(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  return this.find({
    userId,
    isBlocked: false
  })
  .populate('userId', 'username fullName profilePicture')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
};

// Static method to get posts by hashtag
postSchema.statics.getPostsByHashtag = function(hashtag, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  return this.find({
    hashtags: hashtag.toLowerCase(),
    isPublic: true,
    isBlocked: false
  })
  .populate('userId', 'username fullName profilePicture')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
};

// Static method to get posts by location (nearby)
postSchema.statics.getPostsByLocation = function(lat, lng, radiusKm = 10, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  return this.find({
    'location.lat': {
      $gte: lat - (radiusKm / 111.32), // Rough conversion km to degrees
      $lte: lat + (radiusKm / 111.32)
    },
    'location.lng': {
      $gte: lng - (radiusKm / (111.32 * Math.cos(lat * Math.PI / 180))),
      $lte: lng + (radiusKm / (111.32 * Math.cos(lat * Math.PI / 180)))
    },
    isPublic: true,
    isBlocked: false
  })
  .populate('userId', 'username fullName profilePicture')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
};

// Static method to search posts
postSchema.statics.searchPosts = function(query, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  return this.find({
    $text: { $search: query },
    isPublic: true,
    isBlocked: false
  })
  .populate('userId', 'username fullName profilePicture')
  .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
  .skip(skip)
  .limit(limit);
};

// Admin method to block post
postSchema.statics.blockPost = async function(postId, adminId, reason) {
  return this.findByIdAndUpdate(postId, {
    isBlocked: true,
    blockedReason: reason,
    blockedBy: adminId,
    blockedAt: new Date()
  }, { new: true });
};

module.exports = mongoose.model('Post', postSchema);
