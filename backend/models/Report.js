const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  // Who made the report
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Reporter ID is required']
  },

  // What type of content is being reported
  reportedType: {
    type: String,
    required: [true, 'Reported type is required'],
    enum: ['post', 'comment', 'user', 'message', 'trip']
  },

  // ID of the reported content
  reportedId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Reported ID is required']
  },

  // Reference to the reported content model
  reportedModel: {
    type: String,
    required: true,
    enum: ['Post', 'Comment', 'User', 'Message', 'Trip']
  },

  // Reason for the report
  reason: {
    type: String,
    required: [true, 'Report reason is required'],
    enum: [
      'spam',
      'harassment',
      'hate_speech',
      'violence',
      'nudity',
      'false_information',
      'copyright',
      'impersonation',
      'inappropriate_content',
      'other'
    ]
  },

  // Additional details
  description: {
    type: String,
    maxlength: [1000, 'Description cannot be more than 1000 characters'],
    trim: true
  },

  // Report status
  status: {
    type: String,
    enum: ['pending', 'investigating', 'resolved', 'dismissed'],
    default: 'pending'
  },

  // Admin who handled the report
  handledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Admin notes
  adminNotes: {
    type: String,
    maxlength: [1000, 'Admin notes cannot be more than 1000 characters']
  },

  // Action taken
  actionTaken: {
    type: String,
    enum: ['none', 'warning', 'content_removed', 'user_suspended', 'user_banned'],
    default: 'none'
  },

  // Resolution timestamp
  resolvedAt: {
    type: Date
  },

  // Priority level
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  // Evidence attachments
  evidence: [{
    type: String, // URLs to evidence files/screenshots
    description: String
  }]
}, {
  timestamps: true
});

// Virtual for report age in hours
reportSchema.virtual('ageInHours').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  return Math.floor(diff / (1000 * 60 * 60));
});

// Virtual to check if report is overdue
reportSchema.virtual('isOverdue').get(function() {
  if (this.status === 'resolved' || this.status === 'dismissed') return false;

  const maxHours = this.priority === 'urgent' ? 2 :
                   this.priority === 'high' ? 8 :
                   this.priority === 'medium' ? 24 : 72;

  return this.ageInHours > maxHours;
});

// Indexes for performance
reportSchema.index({ reporterId: 1, createdAt: -1 });
reportSchema.index({ reportedType: 1, reportedId: 1 });
reportSchema.index({ status: 1, priority: 1 });
reportSchema.index({ handledBy: 1 });
reportSchema.index({ createdAt: -1 });

// Instance method to resolve report
reportSchema.methods.resolve = async function(adminId, actionTaken, adminNotes) {
  this.status = 'resolved';
  this.handledBy = adminId;
  this.actionTaken = actionTaken;
  this.adminNotes = adminNotes;
  this.resolvedAt = new Date();

  return await this.save();
};

// Instance method to dismiss report
reportSchema.methods.dismiss = async function(adminId, adminNotes) {
  this.status = 'dismissed';
  this.handledBy = adminId;
  this.actionTaken = 'none';
  this.adminNotes = adminNotes;
  this.resolvedAt = new Date();

  return await this.save();
};

// Instance method to assign to admin
reportSchema.methods.assignTo = async function(adminId) {
  this.status = 'investigating';
  this.handledBy = adminId;

  return await this.save();
};

// Static method to create report
reportSchema.statics.createReport = async function(data) {
  const {
    reporterId,
    reportedType,
    reportedId,
    reportedModel,
    reason,
    description,
    evidence = []
  } = data;

  // Check if user already reported this content
  const existingReport = await this.findOne({
    reporterId,
    reportedType,
    reportedId,
    status: { $in: ['pending', 'investigating'] }
  });

  if (existingReport) {
    throw new Error('You have already reported this content');
  }

  // Determine priority based on reason
  let priority = 'medium';
  if (['violence', 'hate_speech', 'harassment'].includes(reason)) {
    priority = 'high';
  } else if (['nudity', 'inappropriate_content'].includes(reason)) {
    priority = 'urgent';
  } else if (['spam', 'false_information'].includes(reason)) {
    priority = 'low';
  }

  const report = new this({
    reporterId,
    reportedType,
    reportedId,
    reportedModel,
    reason,
    description,
    evidence,
    priority
  });

  return await report.save();
};

// Static method to get pending reports for admin
reportSchema.statics.getPendingReports = function(page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  return this.find({
    status: { $in: ['pending', 'investigating'] }
  })
  .populate('reporterId', 'username fullName profilePicture')
  .populate('handledBy', 'username fullName')
  .sort({ priority: -1, createdAt: 1 }) // Urgent first, then oldest first
  .skip(skip)
  .limit(limit);
};

// Static method to get reports by status
reportSchema.statics.getReportsByStatus = function(status, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  return this.find({ status })
  .populate('reporterId', 'username fullName profilePicture')
  .populate('handledBy', 'username fullName')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
};

// Static method to get reports for specific content
reportSchema.statics.getReportsForContent = function(reportedType, reportedId) {
  return this.find({
    reportedType,
    reportedId
  })
  .populate('reporterId', 'username fullName profilePicture')
  .populate('handledBy', 'username fullName')
  .sort({ createdAt: -1 });
};

// Static method to get reports by admin
reportSchema.statics.getReportsByAdmin = function(adminId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  return this.find({ handledBy: adminId })
  .populate('reporterId', 'username fullName profilePicture')
  .sort({ resolvedAt: -1 })
  .skip(skip)
  .limit(limit);
};

// Static method to get report statistics
reportSchema.statics.getReportStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const reasonStats = await this.aggregate([
    {
      $match: { status: { $in: ['pending', 'investigating'] } }
    },
    {
      $group: {
        _id: '$reason',
        count: { $sum: 1 }
      }
    }
  ]);

  const overdueCount = await this.countDocuments({
    status: { $in: ['pending', 'investigating'] },
    $expr: {
      $gt: [
        { $divide: [{ $subtract: [new Date(), '$createdAt'] }, 1000 * 60 * 60] },
        {
          $switch: {
            branches: [
              { case: { $eq: ['$priority', 'urgent'] }, then: 2 },
              { case: { $eq: ['$priority', 'high'] }, then: 8 },
              { case: { $eq: ['$priority', 'medium'] }, then: 24 }
            ],
            default: 72
          }
        }
      ]
    }
  });

  return {
    statusStats: stats,
    reasonStats: reasonStats,
    overdueCount
  };
};

// Static method to auto-escalate overdue reports
reportSchema.statics.escalateOverdueReports = async function() {
  const overdueReports = await this.find({
    status: { $in: ['pending', 'investigating'] },
    $expr: {
      $gt: [
        { $divide: [{ $subtract: [new Date(), '$createdAt'] }, 1000 * 60 * 60] },
        {
          $switch: {
            branches: [
              { case: { $eq: ['$priority', 'urgent'] }, then: 2 },
              { case: { $eq: ['$priority', 'high'] }, then: 8 },
              { case: { $eq: ['$priority', 'medium'] }, then: 24 }
            ],
            default: 72
          }
        }
      ]
    }
  });

  // Escalate priority
  for (const report of overdueReports) {
    if (report.priority === 'low') report.priority = 'medium';
    else if (report.priority === 'medium') report.priority = 'high';
    else if (report.priority === 'high') report.priority = 'urgent';

    await report.save();
  }

  return overdueReports.length;
};

module.exports = mongoose.model('Report', reportSchema);
