const { body } = require('express-validator');

// Validation rules for user registration
const validateRegister = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),

  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),

  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .custom(value => {
      // Check if username starts with a letter
      if (!/^[a-zA-Z]/.test(value)) {
        throw new Error('Username must start with a letter');
      }
      return true;
    }),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  body('fullName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Full name cannot be more than 100 characters'),

  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot be more than 500 characters'),

  body('interests')
    .optional()
    .isArray()
    .withMessage('Interests must be an array')
    .custom(value => {
      if (value && value.length > 20) {
        throw new Error('Cannot have more than 20 interests');
      }
      return true;
    }),

  body('interests.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each interest must be between 1 and 50 characters'),

  body('travelHistory')
    .optional()
    .isArray()
    .withMessage('Travel history must be an array')
    .custom(value => {
      if (value && value.length > 50) {
        throw new Error('Cannot have more than 50 travel history entries');
      }
      return true;
    }),

  body('travelHistory.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Each travel history entry must be between 1 and 100 characters')
];

// Validation rules for user login
const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email or username is required')
    .isLength({ min: 3, max: 255 })
    .withMessage('Email or username must be between 3 and 255 characters'),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

// Validation rules for password change
const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    })
];

// Validation rules for forgot password
const validateForgotPassword = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
];

// Validation rules for reset password
const validateResetPassword = [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

// Validation rules for profile update
const validateUpdateProfile = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),

  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),

  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot be more than 500 characters'),

  body('interests')
    .optional()
    .isArray()
    .withMessage('Interests must be an array')
    .custom(value => {
      if (value && value.length > 20) {
        throw new Error('Cannot have more than 20 interests');
      }
      return true;
    }),

  body('interests.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each interest must be between 1 and 50 characters'),

  body('travelHistory')
    .optional()
    .isArray()
    .withMessage('Travel history must be an array')
    .custom(value => {
      if (value && value.length > 50) {
        throw new Error('Cannot have more than 50 travel history entries');
      }
      return true;
    }),

  body('travelHistory.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Each travel history entry must be between 1 and 100 characters'),

  body('profilePicture')
    .optional()
    .isURL()
    .withMessage('Profile picture must be a valid URL')
];

// Validation rules for refresh token
const validateRefreshToken = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
    .isJWT()
    .withMessage('Invalid refresh token format')
];

// Validation rules for user search
const validateUserSearch = [
  body('q')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .trim()
];

// Validation rules for follow/unfollow
const validateFollowUser = [
  body('userId')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID format')
];

// Validation rules for creating posts
const validateCreatePost = [
  body('caption')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Caption cannot be more than 2000 characters')
    .trim(),

  body('location')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (parsed.lat && (typeof parsed.lat !== 'number' || parsed.lat < -90 || parsed.lat > 90)) {
            throw new Error('Invalid latitude');
          }
          if (parsed.lng && (typeof parsed.lng !== 'number' || parsed.lng < -180 || parsed.lng > 180)) {
            throw new Error('Invalid longitude');
          }
          return true;
        } catch (error) {
          throw new Error('Invalid location format');
        }
      }
      return true;
    }),

  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean value')
];

// Validation rules for updating posts
const validateUpdatePost = [
  body('caption')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Caption cannot be more than 2000 characters')
    .trim(),

  body('location')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (parsed.lat && (typeof parsed.lat !== 'number' || parsed.lat < -90 || parsed.lat > 90)) {
            throw new Error('Invalid latitude');
          }
          if (parsed.lng && (typeof parsed.lng !== 'number' || parsed.lng < -180 || parsed.lng > 180)) {
            throw new Error('Invalid longitude');
          }
          return true;
        } catch (error) {
          throw new Error('Invalid location format');
        }
      }
      return true;
    }),

  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean value')
];

// Validation rules for creating comments
const validateCreateComment = [
  body('postId')
    .notEmpty()
    .withMessage('Post ID is required')
    .isMongoId()
    .withMessage('Invalid post ID format'),

  body('commentText')
    .trim()
    .notEmpty()
    .withMessage('Comment text is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters'),

  body('parentComment')
    .optional()
    .isMongoId()
    .withMessage('Invalid parent comment ID format')
];

// Validation rules for updating comments
const validateUpdateComment = [
  body('commentText')
    .trim()
    .notEmpty()
    .withMessage('Comment text is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters')
];

// Validation rules for creating conversations
const validateCreateConversation = [
  body('userId')
    .optional()
    .isMongoId()
    .withMessage('User ID must be a valid MongoDB ID'),

  body('isGroup')
    .optional()
    .isBoolean()
    .withMessage('isGroup must be a boolean'),

  body('groupName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Group name must be between 1 and 100 characters'),

  body('memberIds')
    .optional()
    .isArray()
    .withMessage('Member IDs must be an array')
    .custom(value => {
      if (value && value.length < 2) {
        throw new Error('Group must have at least 2 members');
      }
      return true;
    }),

  body('memberIds.*')
    .optional()
    .isMongoId()
    .withMessage('Each member ID must be a valid MongoDB ID')
];

// Validation rules for sending messages
const validateSendMessage = [
  body('messageText')
    .trim()
    .notEmpty()
    .withMessage('Message text is required')
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message must be between 1 and 5000 characters'),

  body('messageType')
    .optional()
    .isIn(['text', 'image', 'video', 'file', 'location'])
    .withMessage('Invalid message type'),

  body('mediaUrl')
    .optional()
    .isURL()
    .withMessage('Media URL must be a valid URL'),

  body('replyTo')
    .optional()
    .isMongoId()
    .withMessage('Reply message ID must be a valid MongoDB ID')
];

// Validation rules for adding reactions
const validateAddReaction = [
  body('emoji')
    .trim()
    .notEmpty()
    .withMessage('Emoji is required')
    .isLength({ min: 1, max: 10 })
    .withMessage('Emoji must be between 1 and 10 characters')
];

module.exports = {
  validateRegister,
  validateLogin,
  validateChangePassword,
  validateForgotPassword,
  validateResetPassword,
  validateUpdateProfile,
  validateRefreshToken,
  validateUserSearch,
  validateFollowUser,
  validateCreatePost,
  validateUpdatePost,
  validateCreateComment,
  validateUpdateComment,
  validateCreateConversation,
  validateSendMessage,
  validateAddReaction
};
