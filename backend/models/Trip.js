const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  // Who created the trip
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Trip creator is required']
  },

  // Trip basic information
  tripName: {
    type: String,
    required: [true, 'Trip name is required'],
    maxlength: [200, 'Trip name cannot be more than 200 characters'],
    trim: true
  },

  description: {
    type: String,
    maxlength: [1000, 'Trip description cannot be more than 1000 characters'],
    trim: true
  },

  // Trip destination (primary location or summary)
  destination: {
    type: String,
    maxlength: [200, 'Destination cannot be more than 200 characters'],
    trim: true
  },

  // Trip destination coordinates
  destinationCoordinates: {
    lat: {
      type: Number,
      min: -90,
      max: 90
    },
    lng: {
      type: Number,
      min: -180,
      max: 180
    }
  },

  // Google Place ID for destination (for future reference)
  destinationPlaceId: {
    type: String,
    trim: true
  },

  // Trip dates
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },

  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },

  // Trip itinerary
  itinerary: [{
    day: {
      type: Number,
      required: true,
      min: 1
    },
    date: {
      type: Date
    },
    title: {
      type: String,
      required: [true, 'Itinerary item title is required'],
      maxlength: [200, 'Itinerary title cannot be more than 200 characters'],
      trim: true
    },
    location: {
      type: String,
      maxlength: [200, 'Location cannot be more than 200 characters'],
      trim: true
    },
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot be more than 1000 characters'],
      trim: true
    },
    startTime: {
      type: String // Format: "HH:MM"
    },
    endTime: {
      type: String // Format: "HH:MM"
    },
    cost: {
      type: Number,
      min: 0
    },
    coordinates: {
      lat: Number,
      lng: Number
    }
  }],

  // Trip checklist
  checklist: [{
    item: {
      type: String,
      required: [true, 'Checklist item is required'],
      maxlength: [200, 'Checklist item cannot be more than 200 characters'],
      trim: true
    },
    isDone: {
      type: Boolean,
      default: false
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    completedAt: {
      type: Date
    }
  }],

  // Trip members
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Collaborators with roles (owner is createdBy)
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    role: {
      type: String,
      enum: ['editor'],
      default: 'editor'
    }
  }],

  // Trip settings
  isPublic: {
    type: Boolean,
    default: false
  },

  maxMembers: {
    type: Number,
    default: 10,
    min: 1,
    max: 50
  },

  // Trip budget
  budget: {
    totalBudget: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD',
      maxlength: 3
    },
    expenses: [{
      description: {
        type: String,
        required: true,
        maxlength: 200
      },
      amount: {
        type: Number,
        required: true,
        min: 0
      },
      category: {
        type: String,
        enum: ['accommodation', 'transportation', 'food', 'activities', 'shopping', 'other'],
        default: 'other'
      },
      paidBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      splitAmong: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }],
      date: {
        type: Date,
        default: Date.now
      }
    }]
  },

  // Trip status
  status: {
    type: String,
    enum: ['planning', 'active', 'completed', 'cancelled'],
    default: 'planning'
  },

  // Trip tags
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],

  // Trip type (solo, couple, group, family)
  tripType: {
    type: String,
    enum: ['solo', 'couple', 'group', 'family'],
    required: [true, 'Trip type is required']
  },

  // Trip interests/themes
  interests: {
    type: [{
      type: String,
      enum: [
        'adventure',
        'culture-history',
        'food-cuisine',
        'nature-outdoors',
        'relaxation',
        'photography',
        'nightlife',
        'shopping',
        'wellness-spa',
        'business',
        'sports',
        'music-festivals',
        'art-museums',
        'wildlife',
        'beach-coastal',
        'mountains',
        'urban-exploration',
        'backpacking',
        'luxury',
        'budget-travel'
      ]
    }],
    validate: {
      validator: function(interests) {
        return interests.length <= 5; // Max 5 interests
      },
      message: 'Maximum 5 interests allowed'
    }
  },

  // Trip cover image
  coverImage: {
    type: String
  },

  // Trip photos
  photos: [{
    url: String,
    caption: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Sharing and join requests
tripSchema.add({
  shareCode: {
    type: String,
    unique: true,
    sparse: true
  },
  joinRequests: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    message: { type: String, maxlength: 500 },
    requestedAt: { type: Date, default: Date.now }
  }]
});

// Validation: End date must be after start date
tripSchema.pre('save', function(next) {
  if (this.endDate <= this.startDate) {
    return next(new Error('End date must be after start date'));
  }
  next();
});

// Virtual for trip duration in days
tripSchema.virtual('durationDays').get(function() {
  const diffTime = Math.abs(this.endDate - this.startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for member count
tripSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// Virtual for completed checklist items count
tripSchema.virtual('checklistCompletedCount').get(function() {
  return this.checklist.filter(item => item.isDone).length;
});

// Virtual for checklist completion percentage
tripSchema.virtual('checklistCompletionPercentage').get(function() {
  if (this.checklist.length === 0) return 100;
  return Math.round((this.checklistCompletedCount / this.checklist.length) * 100);
});

// Virtual for total expenses
tripSchema.virtual('totalExpenses').get(function() {
  if (!this.budget || !this.budget.expenses) return 0;
  return this.budget.expenses.reduce((total, expense) => total + expense.amount, 0);
});

// Virtual for remaining budget
tripSchema.virtual('remainingBudget').get(function() {
  if (!this.budget || !this.budget.totalBudget) return null;
  return this.budget.totalBudget - this.totalExpenses;
});

// Indexes for performance
tripSchema.index({ createdBy: 1, createdAt: -1 });
tripSchema.index({ members: 1 });
tripSchema.index({ startDate: 1, endDate: 1 });
tripSchema.index({ isPublic: 1, status: 1 });
tripSchema.index({ tags: 1 });
tripSchema.index({ status: 1 });
// shareCode index is automatically created by unique: true
tripSchema.index({ destination: 1 });
// tripSchema.index({ destinationCoordinates: '2dsphere' }); // Temporarily disabled - format mismatch
tripSchema.index({ tripType: 1 });
tripSchema.index({ interests: 1 });
tripSchema.index({ isPublic: 1, tripType: 1, interests: 1 }); // Compound index for filtering

// Instance method to check if user is member
tripSchema.methods.isMember = function(userId) {
  return this.members.includes(userId) || this.createdBy.toString() === userId.toString();
};

// Instance method to check if user is creator
tripSchema.methods.isCreator = function(userId) {
  return this.createdBy.toString() === userId.toString();
};

// Instance method to add member
tripSchema.methods.addMember = async function(userId) {
  if (this.members.length >= this.maxMembers) {
    throw new Error('Trip has reached maximum member limit');
  }

  if (!this.isMember(userId)) {
    this.members.push(userId);
    await this.save();
  }

  return this;
};

// Instance method to approve join request and add member
tripSchema.methods.approveJoin = async function(userId) {
  const req = this.joinRequests.find(r => r.user.toString() === userId.toString());
  if (!req) throw new Error('Join request not found');
  if (req.status === 'approved') return this;
  await this.addMember(userId);
  req.status = 'approved';
  await this.save();
  return this;
};

// Instance method to reject join request
tripSchema.methods.rejectJoin = async function(userId) {
  const req = this.joinRequests.find(r => r.user.toString() === userId.toString());
  if (!req) throw new Error('Join request not found');
  req.status = 'rejected';
  await this.save();
  return this;
};

// Instance method to remove member
tripSchema.methods.removeMember = async function(userId, removedBy) {
  // Creator cannot be removed
  if (this.createdBy.toString() === userId.toString()) {
    throw new Error('Trip creator cannot be removed');
  }

  // Only creator or the user themselves can remove
  if (this.createdBy.toString() !== removedBy.toString() && userId.toString() !== removedBy.toString()) {
    throw new Error('Only trip creator or the user themselves can remove members');
  }

  this.members = this.members.filter(id => id.toString() !== userId.toString());
  await this.save();

  return this;
};

// Instance method to add itinerary item
tripSchema.methods.addItineraryItem = async function(item) {
  this.itinerary.push(item);
  this.itinerary.sort((a, b) => a.day - b.day); // Keep sorted by day
  return await this.save();
};

// Instance method to add checklist item
tripSchema.methods.addChecklistItem = async function(item, addedBy) {
  this.checklist.push({
    ...item,
    addedBy
  });
  return await this.save();
};

// Instance method to check if user is a member of the trip
tripSchema.methods.isMember = function(userId) {
  return this.members.some(member => member.toString() === userId.toString()) || this.createdBy.toString() === userId.toString();
};

// Instance method to check if user is the creator of the trip
tripSchema.methods.isCreator = function(userId) {
  return this.createdBy.toString() === userId.toString();
};

// Instance method to approve a join request
tripSchema.methods.approveJoin = async function(userId) {
  const request = this.joinRequests.find(r => r.user.toString() === userId.toString() && r.status === 'pending');
  if (!request) {
    throw new Error('Join request not found or already processed');
  }

  request.status = 'approved';
  if (!this.members.some(member => member.toString() === userId.toString())) {
    this.members.push(userId);
  }

  return await this.save();
};

// Instance method to reject a join request
tripSchema.methods.rejectJoin = async function(userId) {
  const request = this.joinRequests.find(r => r.user.toString() === userId.toString() && r.status === 'pending');
  if (!request) {
    throw new Error('Join request not found or already processed');
  }

  request.status = 'rejected';
  return await this.save();
};

// Instance method to toggle checklist item
tripSchema.methods.toggleChecklistItem = async function(itemId, userId) {
  const item = this.checklist.id(itemId);
  if (!item) {
    throw new Error('Checklist item not found');
  }

  item.isDone = !item.isDone;
  if (item.isDone) {
    item.completedBy = userId;
    item.completedAt = new Date();
  } else {
    item.completedBy = undefined;
    item.completedAt = undefined;
  }

  return await this.save();
};

// Instance method to add expense
tripSchema.methods.addExpense = async function(expense) {
  if (!this.budget) {
    this.budget = { expenses: [] };
  }

  this.budget.expenses.push(expense);
  return await this.save();
};

// Static method to get public trips
tripSchema.statics.getPublicTrips = function(page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  return this.find({
    isPublic: true,
    status: { $in: ['planning', 'active'] }
  })
  .populate('createdBy', 'username fullName profilePicture')
  .populate('members', 'username fullName profilePicture')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
};

// Static method to get trips by user
tripSchema.statics.getTripsByUser = function(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  return this.find({
    $or: [
      { createdBy: userId },
      { members: userId }
    ]
  })
  .populate('createdBy', 'username fullName profilePicture')
  .populate('members', 'username fullName profilePicture')
  .sort({ startDate: -1 })
  .skip(skip)
  .limit(limit);
};

// Static method to search trips
tripSchema.statics.searchTrips = function(query, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  return this.find({
    $or: [
      { tripName: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } }
    ],
    isPublic: true,
    status: { $in: ['planning', 'active'] }
  })
  .populate('createdBy', 'username fullName profilePicture')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
};

// Static method to filter trips by type and interests
tripSchema.statics.filterTrips = function(filters = {}, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const query = {
    isPublic: true,
    status: { $in: ['planning', 'active'] }
  };

  // Add trip type filter
  if (filters.tripType && filters.tripType.length > 0) {
    query.tripType = { $in: filters.tripType };
  }

  // Add interests filter
  if (filters.interests && filters.interests.length > 0) {
    query.interests = { $in: filters.interests };
  }

  // Add destination filter
  if (filters.destination) {
    query.destination = { $regex: filters.destination, $options: 'i' };
  }

  // Add date range filter
  if (filters.startDate || filters.endDate) {
    query.$and = [];
    if (filters.startDate) {
      query.$and.push({ startDate: { $gte: new Date(filters.startDate) } });
    }
    if (filters.endDate) {
      query.$and.push({ endDate: { $lte: new Date(filters.endDate) } });
    }
  }

  // Add location-based filter (find trips near coordinates)
  if (filters.near && filters.near.lat && filters.near.lng) {
    const maxDistance = filters.maxDistance || 50000; // Default 50km radius
    query.destinationCoordinates = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [filters.near.lng, filters.near.lat] // GeoJSON uses [lng, lat] order
        },
        $maxDistance: maxDistance // Distance in meters
      }
    };
  }

  return this.find(query)
    .populate('createdBy', 'username fullName profilePicture')
    .populate('members', 'username fullName profilePicture')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to find trips near a location
tripSchema.statics.findTripsNearLocation = function(lat, lng, maxDistanceKm = 50, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const maxDistanceMeters = maxDistanceKm * 1000;

  return this.find({
    isPublic: true,
    status: { $in: ['planning', 'active'] },
    destinationCoordinates: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat] // GeoJSON uses [lng, lat] order
        },
        $maxDistance: maxDistanceMeters
      }
    }
  })
  .populate('createdBy', 'username fullName profilePicture')
  .populate('members', 'username fullName profilePicture')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
};

module.exports = mongoose.model('Trip', tripSchema);
