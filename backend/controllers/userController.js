const User = require('../models/User');
const Post = require('../models/Post');
const Trip = require('../models/Trip');
const Notification = require('../models/Notification');
const { validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// @desc    Get user profile by ID or username
// @route   GET /api/users/profile/:identifier
// @access  Public
const getUserProfile = async (req, res, next) => {
  try {
    const { identifier } = req.params;

    // Check if identifier is ObjectId or username
    let user;
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      // It's an ObjectId
      user = await User.findById(identifier)
        .populate('followers', 'username fullName profilePicture')
        .populate('following', 'username fullName profilePicture')
        .select('-password -refreshToken');
    } else {
      // It's a username
      user = await User.findOne({ username: identifier.toLowerCase() })
        .populate('followers', 'username fullName profilePicture')
        .populate('following', 'username fullName profilePicture')
        .select('-password -refreshToken');
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's posts count
    const postsCount = await Post.countDocuments({
      userId: user._id,
      isBlocked: false
    });

    // Get user's trips count
    const tripsCount = await Trip.countDocuments({
      $or: [
        { createdBy: user._id },
        { members: user._id }
      ]
    });

    // Get recent posts for profile grid
    const recentPosts = await Post.find({
      userId: user._id,
      isBlocked: false,
      isPublic: true
    })
    .select('media likes commentsCount createdAt')
    .sort({ createdAt: -1 })
    .limit(12);

    // Get user's trips
    const userTrips = await Trip.find({
      $or: [
        { createdBy: user._id },
        { members: user._id }
      ]
    })
    .select('tripName startDate endDate coverImage')
    .sort({ startDate: -1 })
    .limit(6);

    // Update user stats
    user.postsCount = postsCount;
    user.tripsCount = tripsCount;

    res.status(200).json({
      success: true,
      data: {
        user,
        posts: recentPosts.map(post => ({
          id: post._id,
          imageUrl: post.media[0] || '/assets/images/trip-placeholder.jpg',
          likes: post.likes.length,
          comments: post.commentsCount,
          createdAt: post.createdAt
        })),
        trips: userTrips.map(trip => ({
          id: trip._id,
          title: trip.tripName,
          coverImage: trip.coverImage || '/assets/images/trip-placeholder.jpg',
          startDate: trip.startDate,
          endDate: trip.endDate
        }))
      }
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user profile'
    });
  }
};

// @desc    Update current user's profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const fieldsToUpdate = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      fullName: req.body.fullName,
      bio: req.body.bio,
      interests: req.body.interests,
      travelHistory: req.body.travelHistory,
      profilePicture: req.body.profilePicture,
      coverImage: req.body.coverImage
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key => {
      if (fieldsToUpdate[key] === undefined) {
        delete fieldsToUpdate[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      fieldsToUpdate,
      {
        new: true,
        runValidators: true
      }
    ).select('-password -refreshToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Follow a user
// @route   POST /api/users/follow/:userId
// @access  Private
const followUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    if (userId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot follow yourself'
      });
    }

    const userToFollow = await User.findById(userId);
    if (!userToFollow) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!userToFollow.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot follow inactive user'
      });
    }

    const currentUser = await User.findById(currentUserId);

    // Check if already following
    if (currentUser.following.some(id => id.toString() === userId.toString())) {
      return res.status(400).json({
        success: false,
        message: 'You are already following this user'
      });
    }

    // Follow the user
    await currentUser.follow(userId);

    // Create notification
    await Notification.createFollowNotification(userId, currentUserId);

    res.status(200).json({
      success: true,
      message: 'User followed successfully'
    });

  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while following user'
    });
  }
};

// @desc    Unfollow a user
// @route   DELETE /api/users/follow/:userId
// @access  Private
const unfollowUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    if (userId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot unfollow yourself'
      });
    }

    const currentUser = await User.findById(currentUserId);

    // Check if currently following
    if (!currentUser.following.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'You are not following this user'
      });
    }

    // Unfollow the user
    await currentUser.unfollow(userId);

    res.status(200).json({
      success: true,
      message: 'User unfollowed successfully'
    });

  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while unfollowing user'
    });
  }
};

// @desc    Get user's followers
// @route   GET /api/users/followers/:userId
// @access  Public
const getUserFollowers = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const user = await User.findById(userId)
      .populate({
        path: 'followers',
        select: 'username fullName profilePicture bio',
        options: {
          skip,
          limit
        }
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const totalFollowers = user.followers.length;

    res.status(200).json({
      success: true,
      data: {
        followers: user.followers,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalFollowers / limit),
          totalItems: totalFollowers,
          hasNext: page < Math.ceil(totalFollowers / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching followers'
    });
  }
};

// @desc    Get user's following
// @route   GET /api/users/following/:userId
// @access  Public
const getUserFollowing = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const user = await User.findById(userId)
      .populate({
        path: 'following',
        select: 'username fullName profilePicture bio',
        options: {
          skip,
          limit
        }
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const totalFollowing = user.following.length;

    res.status(200).json({
      success: true,
      data: {
        following: user.following,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalFollowing / limit),
          totalItems: totalFollowing,
          hasNext: page < Math.ceil(totalFollowing / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching following'
    });
  }
};

// @desc    Search users
// @route   GET /api/users/search
// @access  Public
const searchUsers = async (req, res, next) => {
  try {
    const { q: query, page = 1, limit = 20 } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.searchUsers(query.trim())
      .skip(skip)
      .limit(parseInt(limit));

    // If user is authenticated, add following status
    let usersWithFollowingStatus = users;
    if (req.user) {
      const currentUser = await User.findById(req.user.id);
      if (currentUser) {
        usersWithFollowingStatus = users.map(user => {
          const userObj = user.toObject();
          userObj.isFollowing = currentUser.following.includes(user._id);
          return userObj;
        });
      }
    }

    const totalUsers = await User.countDocuments({
      $or: [
        { username: { $regex: query.trim(), $options: 'i' } },
        { firstName: { $regex: query.trim(), $options: 'i' } },
        { lastName: { $regex: query.trim(), $options: 'i' } },
        { fullName: { $regex: query.trim(), $options: 'i' } }
      ],
      isActive: true
    });

    res.status(200).json({
      success: true,
      data: {
        users: usersWithFollowingStatus,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalUsers / parseInt(limit)),
          totalItems: totalUsers,
          hasNext: parseInt(page) < Math.ceil(totalUsers / parseInt(limit)),
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching users'
    });
  }
};

// @desc    Get all users (admin/public listing)
// @route   GET /api/users
// @access  Public
const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const users = await User.find({ isActive: true })
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalUsers = await User.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalUsers / limit),
          totalItems: totalUsers,
          hasNext: page < Math.ceil(totalUsers / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
};

// File upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/profile');
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  },
  fileFilter: function (req, file, cb) {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// @desc    Upload profile picture
// @route   POST /api/users/upload/avatar
// @access  Private
const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const fileUrl = `/uploads/profile/${req.file.filename}`;

    // Update user's profile picture
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profilePicture: fileUrl },
      { new: true }
    ).select('-password -refreshToken');

    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        profilePicture: fileUrl,
        user
      }
    });

  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading avatar'
    });
  }
};

// @desc    Upload cover image
// @route   POST /api/users/upload/cover
// @access  Private
const uploadCover = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const fileUrl = `/uploads/profile/${req.file.filename}`;

    // Update user's cover image
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { coverImage: fileUrl },
      { new: true }
    ).select('-password -refreshToken');

    res.status(200).json({
      success: true,
      message: 'Cover image uploaded successfully',
      data: {
        coverImage: fileUrl,
        user
      }
    });

  } catch (error) {
    console.error('Upload cover error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading cover image'
    });
  }
};

module.exports = {
  getUserProfile,
  updateProfile,
  followUser,
  unfollowUser,
  getUserFollowers,
  getUserFollowing,
  searchUsers,
  getAllUsers,
  uploadAvatar,
  uploadCover,
  upload
};
