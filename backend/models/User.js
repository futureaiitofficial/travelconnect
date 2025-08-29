const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot be more than 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot be more than 50 characters']
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot be more than 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },

  // Profile Information (matching schema)
  fullName: {
    type: String,
    maxlength: [100, 'Full name cannot be more than 100 characters']
  },
  profilePicture: {
    type: String,
    default: ''
  },
  coverImage: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot be more than 500 characters'],
    default: ''
  },

  // Travel Information
  interests: [{
    type: String,
    trim: true
  }],
  travelHistory: [{
    type: String,
    trim: true
  }],

  // Social Features
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },

  // Authentication
  refreshToken: {
    type: String,
    select: false
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  emailVerificationToken: String,
  emailVerificationExpires: Date,

  // Statistics (computed fields)
  postsCount: {
    type: Number,
    default: 0
  },
  tripsCount: {
    type: Number,
    default: 0
  },

  // Login tracking
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true, // adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for display name (fallback to fullName or construct from firstName/lastName)
userSchema.virtual('displayName').get(function() {
  return this.fullName || `${this.firstName} ${this.lastName}`;
});

// Virtual for follower count
userSchema.virtual('followersCount').get(function() {
  return this.followers ? this.followers.length : 0;
});

// Virtual for following count
userSchema.virtual('followingCount').get(function() {
  return this.following ? this.following.length : 0;
});

// Indexes for performance
// username and email indexes are automatically created by unique: true
userSchema.index({ 'followers': 1 });
userSchema.index({ 'following': 1 });
userSchema.index({ location: 1 });
userSchema.index({ interests: 1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method to check password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Instance method to check if user is following another user
userSchema.methods.isFollowing = function(userId) {
  return this.following.some(id => id.toString() === userId.toString());
};

// Instance method to follow a user
userSchema.methods.follow = async function(userId) {
  if (!this.following.some(id => id.toString() === userId.toString())) {
    this.following.push(userId);
    await this.save();

    // Add this user to the target user's followers
    const targetUser = await this.constructor.findById(userId);
    if (targetUser && !targetUser.followers.some(id => id.toString() === this._id.toString())) {
      targetUser.followers.push(this._id);
      await targetUser.save();
    }
  }
};

// Instance method to unfollow a user
userSchema.methods.unfollow = async function(userId) {
      this.following = this.following.filter(id => id.toString() !== userId.toString());
  await this.save();

  // Remove this user from the target user's followers
  const targetUser = await this.constructor.findById(userId);
  if (targetUser) {
    targetUser.followers = targetUser.followers.filter(id => id.toString() !== this._id.toString());
    await targetUser.save();
  }
};

// Static method to find users by interests
userSchema.statics.findByInterests = function(interests) {
  return this.find({
    interests: { $in: interests },
    isActive: true
  }).select('-password -refreshToken');
};

// Static method to search users
userSchema.statics.searchUsers = function(query) {
  return this.find({
    $or: [
      { username: { $regex: query, $options: 'i' } },
      { firstName: { $regex: query, $options: 'i' } },
      { lastName: { $regex: query, $options: 'i' } },
      { fullName: { $regex: query, $options: 'i' } }
    ],
    isActive: true
  }).select('-password -refreshToken');
};

// Instance method to check if user is admin
userSchema.methods.isAdmin = function() {
  return this.role === 'admin';
};

// Static method to get all admins
userSchema.statics.getAdmins = function() {
  return this.find({ role: 'admin', isActive: true }).select('-password -refreshToken');
};

// Static method to promote user to admin (can only be done by existing admin)
userSchema.statics.promoteToAdmin = async function(userId, promotedBy) {
  const promoter = await this.findById(promotedBy);
  if (!promoter || !promoter.isAdmin()) {
    throw new Error('Only admins can promote users to admin');
  }

  return this.findByIdAndUpdate(userId, { role: 'admin' }, { new: true });
};

module.exports = mongoose.model('User', userSchema);
