const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Multer storage configuration for posts
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/posts');
    fs.mkdir(uploadPath, { recursive: true })
      .then(() => cb(null, uploadPath))
      .catch(err => cb(err));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `post-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// Multer upload middleware for posts
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for videos
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|webm/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and videos are allowed!'));
    }
  }
});

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private
const createPost = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { caption, location, isPublic } = req.body;

    // Process uploaded media files
    const mediaUrls = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        mediaUrls.push(`/uploads/posts/${file.filename}`);
      });
    }

    // Validate that we have either caption or media
    if (!caption && mediaUrls.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Post must have either caption or media'
      });
    }

    // Parse location if provided
    let locationData = null;
    if (location) {
      try {
        const parsedLocation = typeof location === 'string' ? JSON.parse(location) : location;
        if (parsedLocation.name || (parsedLocation.lat && parsedLocation.lng)) {
          locationData = {
            name: parsedLocation.name || '',
            lat: parsedLocation.lat || null,
            lng: parsedLocation.lng || null
          };
        }
      } catch (error) {
        console.log('Location parsing error:', error);
      }
    }

    // Create post
    const post = new Post({
      userId: req.user.id,
      caption: caption || '',
      media: mediaUrls,
      location: locationData,
      isPublic: isPublic !== undefined ? isPublic : true
    });

    await post.save();

    // Populate user data
    await post.populate('userId', 'username fullName profilePicture');

    // Update user's posts count
    await User.findByIdAndUpdate(req.user.id, { $inc: { postsCount: 1 } });

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: post
    });

  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating post',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get all posts (feed)
// @route   GET /api/posts
// @access  Public
const getAllPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const posts = await Post.find({
      isPublic: true,
      isBlocked: false
    })
    .populate('userId', 'username fullName profilePicture')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    const totalPosts = await Post.countDocuments({
      isPublic: true,
      isBlocked: false
    });

    res.status(200).json({
      success: true,
      data: {
        posts,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalPosts / limit),
          totalItems: totalPosts,
          hasNext: page < Math.ceil(totalPosts / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching posts'
    });
  }
};

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Public
const getPostById = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('userId', 'username fullName profilePicture')
      .populate({
        path: 'likes',
        select: 'username fullName profilePicture'
      });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (!post.isPublic && (!req.user || !req.user.id.equals(post.userId._id))) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to private post'
      });
    }

    res.status(200).json({
      success: true,
      data: post
    });

  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching post'
    });
  }
};

// @desc    Update post
// @route   PUT /api/posts/:id
// @access  Private (owner only)
const updatePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user owns the post
    if (!post.userId.equals(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this post'
      });
    }

    const { caption, location, isPublic } = req.body;

    // Update allowed fields
    if (caption !== undefined) post.caption = caption;
    if (isPublic !== undefined) post.isPublic = isPublic;

    // Update location if provided
    if (location) {
      try {
        const parsedLocation = typeof location === 'string' ? JSON.parse(location) : location;
        post.location = {
          name: parsedLocation.name || '',
          lat: parsedLocation.lat || null,
          lng: parsedLocation.lng || null
        };
      } catch (error) {
        console.log('Location parsing error:', error);
      }
    }

    await post.save();
    await post.populate('userId', 'username fullName profilePicture');

    res.status(200).json({
      success: true,
      message: 'Post updated successfully',
      data: post
    });

  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating post'
    });
  }
};

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private (owner only)
const deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user owns the post
    if (!post.userId.equals(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this post'
      });
    }

    // Delete media files
    if (post.media && post.media.length > 0) {
      for (const mediaUrl of post.media) {
        try {
          const filePath = path.join(__dirname, '..', mediaUrl);
          await fs.unlink(filePath);
        } catch (error) {
          console.log('Error deleting media file:', error);
        }
      }
    }

    await Post.findByIdAndDelete(req.params.id);

    // Update user's posts count
    await User.findByIdAndUpdate(req.user.id, { $inc: { postsCount: -1 } });

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully'
    });

  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting post'
    });
  }
};

// @desc    Like/unlike post
// @route   POST /api/posts/:id/like
// @access  Private
const toggleLikePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const isLiked = post.isLikedBy(req.user.id);
    await post.toggleLike(req.user.id);

    // Create notification for post owner (if not self-like)
    if (!isLiked && !post.userId.equals(req.user.id)) {
      await Notification.createLikeNotification(post._id, req.user.id, post.userId);
    }

    res.status(200).json({
      success: true,
      message: isLiked ? 'Post unliked' : 'Post liked',
      data: {
        isLiked: !isLiked,
        likesCount: post.likes.length
      }
    });

  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while toggling like'
    });
  }
};

// @desc    Get posts by user
// @route   GET /api/posts/user/:userId
// @access  Public
const getPostsByUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Check if viewing own posts or public posts
    const query = { userId, isBlocked: false };
    if (!req.user || !req.user.id.equals(userId)) {
      query.isPublic = true;
    }

    const posts = await Post.find(query)
      .populate('userId', 'username fullName profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPosts = await Post.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        posts,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalPosts / limit),
          totalItems: totalPosts,
          hasNext: page < Math.ceil(totalPosts / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user posts'
    });
  }
};

// @desc    Get posts by hashtag
// @route   GET /api/posts/hashtag/:hashtag
// @access  Public
const getPostsByHashtag = async (req, res, next) => {
  try {
    const { hashtag } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const posts = await Post.find({
      hashtags: hashtag.toLowerCase(),
      isPublic: true,
      isBlocked: false
    })
    .populate('userId', 'username fullName profilePicture')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    const totalPosts = await Post.countDocuments({
      hashtags: hashtag.toLowerCase(),
      isPublic: true,
      isBlocked: false
    });

    res.status(200).json({
      success: true,
      data: {
        posts,
        hashtag: hashtag,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalPosts / limit),
          totalItems: totalPosts,
          hasNext: page < Math.ceil(totalPosts / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get hashtag posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching hashtag posts'
    });
  }
};

// @desc    Get posts by location (nearby)
// @route   GET /api/posts/location
// @access  Public
const getPostsByLocation = async (req, res, next) => {
  try {
    const { lat, lng, radius = 10, page = 1, limit = 20 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const radiusKm = parseFloat(radius);

    const posts = await Post.find({
      'location.lat': {
        $gte: parseFloat(lat) - (radiusKm / 111.32),
        $lte: parseFloat(lat) + (radiusKm / 111.32)
      },
      'location.lng': {
        $gte: parseFloat(lng) - (radiusKm / (111.32 * Math.cos(parseFloat(lat) * Math.PI / 180))),
        $lte: parseFloat(lng) + (radiusKm / (111.32 * Math.cos(parseFloat(lat) * Math.PI / 180)))
      },
      isPublic: true,
      isBlocked: false
    })
    .populate('userId', 'username fullName profilePicture')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        posts,
        location: { lat: parseFloat(lat), lng: parseFloat(lng) },
        radius: radiusKm
      }
    });

  } catch (error) {
    console.error('Get location posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching location posts'
    });
  }
};

// @desc    Search posts
// @route   GET /api/posts/search
// @access  Public
const searchPosts = async (req, res, next) => {
  try {
    const { q: query, page = 1, limit = 20 } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const posts = await Post.find({
      $text: { $search: query.trim() },
      isPublic: true,
      isBlocked: false
    })
    .populate('userId', 'username fullName profilePicture')
    .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        posts,
        query: query.trim(),
        pagination: {
          currentPage: parseInt(page)
        }
      }
    });

  } catch (error) {
    console.error('Search posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching posts'
    });
  }
};

module.exports = {
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
  toggleLikePost,
  getPostsByUser,
  getPostsByHashtag,
  getPostsByLocation,
  searchPosts,
  upload
};
