const Comment = require('../models/Comment');
const Post = require('../models/Post');
const { validationResult } = require('express-validator');

// @desc    Get comments for a post
// @route   GET /api/comments/post/:postId
// @access  Public
const getCommentsForPost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Get comments
    const comments = await Comment.getCommentsForPost(postId, page, limit);
    const totalComments = await Comment.countDocuments({
      postId,
      parentComment: null,
      isBlocked: false
    });

    res.status(200).json({
      success: true,
      data: {
        comments,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalComments / limit),
          totalItems: totalComments,
          hasNext: page < Math.ceil(totalComments / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching comments'
    });
  }
};

// @desc    Create a new comment
// @route   POST /api/comments
// @access  Private
const createComment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { postId, commentText, parentComment } = req.body;

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // If this is a reply, check if parent comment exists
    if (parentComment) {
      const parentCommentDoc = await Comment.findById(parentComment);
      if (!parentCommentDoc) {
        return res.status(404).json({
          success: false,
          message: 'Parent comment not found'
        });
      }
    }

    // Create comment
    const comment = new Comment({
      postId,
      userId: req.user.id,
      commentText,
      parentComment: parentComment || null
    });

    await comment.save();

    // Populate user data for response
    await comment.populate('userId', 'username fullName profilePicture');

    res.status(201).json({
      success: true,
      message: 'Comment created successfully',
      data: comment
    });

  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating comment'
    });
  }
};

// @desc    Update a comment
// @route   PUT /api/comments/:id
// @access  Private (owner only)
const updateComment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { commentText } = req.body;
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if user owns the comment
    if (!comment.userId.equals(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this comment'
      });
    }

    // Update comment
    comment.commentText = commentText;
    await comment.save();

    // Populate user data for response
    await comment.populate('userId', 'username fullName profilePicture');

    res.status(200).json({
      success: true,
      message: 'Comment updated successfully',
      data: comment
    });

  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating comment'
    });
  }
};

// @desc    Delete a comment
// @route   DELETE /api/comments/:id
// @access  Private (owner or admin)
const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if user owns the comment or is admin
    if (!comment.userId.equals(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment'
      });
    }

    await comment.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully'
    });

  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting comment'
    });
  }
};

// @desc    Like/unlike a comment
// @route   POST /api/comments/:id/like
// @access  Private
const toggleLikeComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Toggle like
    await comment.toggleLike(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        isLiked: comment.isLikedBy(req.user.id),
        likesCount: comment.likesCount
      }
    });

  } catch (error) {
    console.error('Toggle comment like error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while toggling comment like'
    });
  }
};

// @desc    Get replies for a comment
// @route   GET /api/comments/:id/replies
// @access  Public
const getRepliesForComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Check if parent comment exists
    const parentComment = await Comment.findById(id);
    if (!parentComment) {
      return res.status(404).json({
        success: false,
        message: 'Parent comment not found'
      });
    }

    // Get replies
    const replies = await Comment.getRepliesForComment(id, page, limit);
    const totalReplies = await Comment.countDocuments({
      parentComment: id,
      isBlocked: false
    });

    res.status(200).json({
      success: true,
      data: {
        replies,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalReplies / limit),
          totalItems: totalReplies,
          hasNext: page < Math.ceil(totalReplies / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get replies error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching replies'
    });
  }
};

module.exports = {
  getCommentsForPost,
  createComment,
  updateComment,
  deleteComment,
  toggleLikeComment,
  getRepliesForComment
};
