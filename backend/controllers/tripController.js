const { validationResult } = require('express-validator');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const Trip = require('../models/Trip');
const User = require('../models/User');

const normalizeTripMedia = (trip, baseUrl) => {
  if (!trip) return trip;
  const t = trip.toObject ? trip.toObject() : trip;
  if (t.coverImage && t.coverImage.startsWith('/')) t.coverImage = `${baseUrl}${t.coverImage}`;
  if (Array.isArray(t.photos)) {
    t.photos = t.photos.map(p => ({
      ...p,
      url: p.url && p.url.startsWith('/') ? `${baseUrl}${p.url}` : p.url
    }));
  }
  return t;
};

exports.createTrip = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation errors', errors: errors.array() });
    }

    let { tripName, description, destination, destinationCoordinates, destinationPlaceId, startDate, endDate, isPublic, maxMembers, tags, tripType, interests } = req.body;

    // Handle FormData parsing for complex fields
    if (typeof destinationCoordinates === 'string') {
      try {
        destinationCoordinates = JSON.parse(destinationCoordinates);
      } catch (e) {
        destinationCoordinates = null;
      }
    }

    if (typeof interests === 'string') {
      try {
        interests = JSON.parse(interests);
      } catch (e) {
        interests = [];
      }
    }

    // Validate required fields
    if (!tripType) {
      return res.status(400).json({ success: false, message: 'Trip type is required' });
    }

    // Handle cover image upload
    let coverImagePath = null;
    if (req.file) {
      coverImagePath = `/uploads/trips/${req.file.filename}`;
    }

    const trip = await Trip.create({
      createdBy: req.user.id,
      tripName,
      description: description || '',
      destination: destination || '',
      destinationCoordinates: destinationCoordinates || null,
      destinationPlaceId: destinationPlaceId || null,
      startDate,
      endDate,
      isPublic: !!isPublic,
      maxMembers: maxMembers || 10,
      tags: Array.isArray(tags) ? tags : [],
      tripType,
      interests: Array.isArray(interests) ? interests.slice(0, 5) : [], // Limit to 5 interests
      coverImage: coverImagePath
    });

    // Creator is implicit owner, also set share code
    trip.shareCode = crypto.randomBytes(6).toString('hex');
    await trip.save();

    await trip.populate('createdBy', 'username fullName profilePicture');

    res.status(201).json({ success: true, message: 'Trip created', data: normalizeTripMedia(trip, process.env.BASE_URL || '') });
  } catch (error) {
    console.error('Create trip error:', error);
    res.status(500).json({ success: false, message: 'Server error while creating trip' });
  }
};

exports.getTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate('createdBy', 'username fullName profilePicture')
      .populate('members', 'username fullName profilePicture')
      .populate('collaborators.user', 'username fullName profilePicture')
      .populate('joinRequests.user', 'username fullName profilePicture');
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

    // Access control for private trips
    if (!trip.isPublic && !trip.isMember(req.user?.id || '')) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    res.status(200).json({ success: true, data: normalizeTripMedia(trip, process.env.BASE_URL || '') });
  } catch (error) {
    console.error('Get trip error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching trip' });
  }
};

exports.updateTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    if (!trip.isCreator(req.user.id)) return res.status(403).json({ success: false, message: 'Only the creator can update trip' });

    const fields = [ 'tripName','description','destination','destinationCoordinates','destinationPlaceId','startDate','endDate','isPublic','maxMembers','tags','status','tripType','interests' ];
    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        if (f === 'interests' && Array.isArray(req.body[f])) {
          trip[f] = req.body[f].slice(0, 5); // Limit to 5 interests
        } else {
          trip[f] = req.body[f];
        }
      }
    });

    await trip.save();
    await trip.populate('createdBy', 'username fullName profilePicture');
    res.status(200).json({ success: true, message: 'Trip updated', data: normalizeTripMedia(trip, process.env.BASE_URL || '') });
  } catch (error) {
    console.error('Update trip error:', error);
    res.status(500).json({ success: false, message: 'Server error while updating trip' });
  }
};

exports.deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    if (!trip.isCreator(req.user.id)) return res.status(403).json({ success: false, message: 'Only the creator can delete trip' });
    await trip.deleteOne();
    res.status(200).json({ success: true, message: 'Trip deleted' });
  } catch (error) {
    console.error('Delete trip error:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting trip' });
  }
};

exports.addItineraryItem = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    if (!trip.isMember(req.user.id)) return res.status(403).json({ success: false, message: 'Not a member of this trip' });
    const { day, date, title, location, notes, startTime, endTime, cost, coordinates } = req.body;
    await trip.addItineraryItem({ day, date, title, location, notes, startTime, endTime, cost, coordinates });
    res.status(200).json({ success: true, data: trip.itinerary });
  } catch (error) {
    console.error('Add itinerary error:', error);
    res.status(500).json({ success: false, message: 'Server error while adding itinerary' });
  }
};

exports.updateItineraryItem = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    if (!trip.isMember(req.user.id)) return res.status(403).json({ success: false, message: 'Not a member of this trip' });
    const item = trip.itinerary.id(req.params.itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Itinerary item not found' });
    Object.assign(item, req.body);
    await trip.save();
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    console.error('Update itinerary error:', error);
    res.status(500).json({ success: false, message: 'Server error while updating itinerary' });
  }
};

exports.deleteItineraryItem = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    if (!trip.isMember(req.user.id)) return res.status(403).json({ success: false, message: 'Not a member of this trip' });
    const item = trip.itinerary.id(req.params.itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Itinerary item not found' });
    item.deleteOne();
    await trip.save();
    res.status(200).json({ success: true, message: 'Itinerary item deleted' });
  } catch (error) {
    console.error('Delete itinerary error:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting itinerary item' });
  }
};

exports.addChecklistItem = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    if (!trip.isMember(req.user.id)) return res.status(403).json({ success: false, message: 'Not a member of this trip' });
    const { item } = req.body;
    await trip.addChecklistItem({ item }, req.user.id);
    res.status(200).json({ success: true, data: trip.checklist });
  } catch (error) {
    console.error('Add checklist error:', error);
    res.status(500).json({ success: false, message: 'Server error while adding checklist item' });
  }
};

exports.toggleChecklistItem = async (req, res) => {
  try {
    console.log('=== BACKEND TOGGLE CHECKLIST ===');
    console.log('Trip ID:', req.params.id);
    console.log('Item ID:', req.params.itemId);
    console.log('User ID:', req.user.id);

    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      console.log('Trip not found');
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    console.log('Trip found:', trip.tripName);
    console.log('Trip members:', trip.members);
    console.log('Trip creator:', trip.createdBy);

    if (!trip.isMember(req.user.id)) {
      console.log('User is not a member');
      return res.status(403).json({ success: false, message: 'Not a member of this trip' });
    }

    console.log('User is a member, proceeding with toggle');
    const updated = await trip.toggleChecklistItem(req.params.itemId, req.user.id);
    const updatedItem = updated.checklist.id(req.params.itemId);

    console.log('Toggle completed, updated item:', updatedItem);
    res.status(200).json({ success: true, data: updatedItem });
  } catch (error) {
    console.error('Toggle checklist error:', error);
    res.status(500).json({ success: false, message: 'Server error while toggling checklist' });
  }
};

exports.deleteChecklistItem = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    if (!trip.isMember(req.user.id)) return res.status(403).json({ success: false, message: 'Not a member of this trip' });
    const item = trip.checklist.id(req.params.itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Checklist item not found' });
    item.deleteOne();
    await trip.save();
    res.status(200).json({ success: true, message: 'Checklist item deleted' });
  } catch (error) {
    console.error('Delete checklist error:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting checklist item' });
  }
};

exports.generateShareLink = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    if (!trip.isCreator(req.user.id)) return res.status(403).json({ success: false, message: 'Only the creator can generate share link' });
    trip.shareCode = crypto.randomBytes(6).toString('hex');
    await trip.save();
    const base = process.env.FRONTEND_URL || 'http://localhost:4200';
    const url = `${base}/trips/${trip._id}?code=${trip.shareCode}`;
    res.status(200).json({ success: true, data: { code: trip.shareCode, url } });
  } catch (error) {
    console.error('Generate share link error:', error);
    res.status(500).json({ success: false, message: 'Server error while generating share link' });
  }
};

exports.requestJoin = async (req, res) => {
  try {
    const { message } = req.body;
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    if (trip.isMember(req.user.id)) return res.status(400).json({ success: false, message: 'Already a member' });
    const exists = trip.joinRequests.find(r => r.user.equals(req.user.id) && r.status === 'pending');
    if (exists) return res.status(400).json({ success: false, message: 'Join request already pending' });
    trip.joinRequests.push({ user: req.user.id, message });
    await trip.save();
    res.status(200).json({ success: true, message: 'Join request submitted' });
  } catch (error) {
    console.error('Request join error:', error);
    res.status(500).json({ success: false, message: 'Server error while requesting to join' });
  }
};

exports.handleJoinRequest = async (req, res) => {
  try {
    const { action, userId } = req.body; // action: 'approve' | 'reject'
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    if (!trip.isCreator(req.user.id)) return res.status(403).json({ success: false, message: 'Only the creator can handle join requests' });

    if (action === 'approve') {
      await trip.approveJoin(userId);
    } else {
      await trip.rejectJoin(userId);
    }

    // Populate user data for response
    await trip.populate({
      path: 'joinRequests.user',
      select: 'username fullName profilePicture'
    });

    res.status(200).json({
      success: true,
      message: `Join request ${action}ed`,
      data: {
        joinRequests: trip.joinRequests
      }
    });
  } catch (error) {
    console.error('Handle join request error:', error);
    res.status(500).json({ success: false, message: 'Server error while handling join request' });
  }
};

exports.addCollaborator = async (req, res) => {
  try {
    const { username, role } = req.body;
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    if (!trip.isCreator(req.user.id)) return res.status(403).json({ success: false, message: 'Only the creator can add collaborators' });
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const exists = trip.collaborators.find(c => c.user.equals(user._id));
    if (!exists) {
      trip.collaborators.push({ user: user._id, role: role === 'editor' ? 'editor' : 'editor' });
      await trip.save();
    }
    res.status(200).json({ success: true, data: trip.collaborators });
  } catch (error) {
    console.error('Add collaborator error:', error);
    res.status(500).json({ success: false, message: 'Server error while adding collaborator' });
  }
};

exports.removeCollaborator = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    if (!trip.isCreator(req.user.id)) return res.status(403).json({ success: false, message: 'Only the creator can remove collaborators' });
    trip.collaborators = trip.collaborators.filter(c => !c.user.equals(req.params.userId));
    await trip.save();
    res.status(200).json({ success: true, message: 'Collaborator removed' });
  } catch (error) {
    console.error('Remove collaborator error:', error);
    res.status(500).json({ success: false, message: 'Server error while removing collaborator' });
  }
};

exports.listTripsForUser = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const userId = req.user.id;

    const trips = await Trip.find({
      $or: [ { createdBy: userId }, { members: userId } ]
    })
    .populate('createdBy', 'username fullName profilePicture')
    .populate('members', 'username fullName profilePicture')
    .sort({ startDate: -1 })
    .skip(skip)
    .limit(limit);

    res.status(200).json({ success: true, data: { trips } });
  } catch (error) {
    console.error('List trips error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching trips' });
  }
};

exports.getRequestedTrips = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const userId = req.user.id;

    // Find trips where the user has a pending join request
    const trips = await Trip.find({
      'joinRequests.user': userId,
      'joinRequests.status': 'pending'
    })
    .populate('createdBy', 'username fullName profilePicture')
    .populate('members', 'username fullName profilePicture')
    .populate('joinRequests.user', 'username fullName profilePicture')
    .sort({ 'joinRequests.requestedAt': -1 })
    .skip(skip)
    .limit(limit);

    // Normalize the trips and add request status
    const baseUrl = process.env.BASE_URL || '';
    const normalizedTrips = trips.map(trip => {
      const normalizedTrip = normalizeTripMedia(trip, baseUrl);
      // Find the user's join request for this trip
      const userRequest = trip.joinRequests.find(req => req.user._id.toString() === userId);
      return {
        ...normalizedTrip,
        requestStatus: userRequest?.status || 'pending',
        requestMessage: userRequest?.message || '',
        requestedAt: userRequest?.requestedAt || ''
      };
    });

    res.status(200).json({ success: true, data: { trips: normalizedTrips } });
  } catch (error) {
    console.error('Get requested trips error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching requested trips' });
  }
};

exports.filterPublicTrips = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filters = {};

    // Extract filter parameters
    if (req.query.tripType) {
      filters.tripType = Array.isArray(req.query.tripType) ? req.query.tripType : [req.query.tripType];
    }
    if (req.query.interests) {
      filters.interests = Array.isArray(req.query.interests) ? req.query.interests : [req.query.interests];
    }
    if (req.query.destination) {
      filters.destination = req.query.destination;
    }
    if (req.query.startDate) {
      filters.startDate = req.query.startDate;
    }
    if (req.query.endDate) {
      filters.endDate = req.query.endDate;
    }
    if (req.query.query) {
      filters.destination = req.query.query;
    }

    const trips = await Trip.filterTrips(filters, page, limit);
    const baseUrl = process.env.BASE_URL || '';
    const normalizedTrips = trips.map(trip => normalizeTripMedia(trip, baseUrl));

    res.status(200).json({
      success: true,
      data: {
        trips: normalizedTrips,
        page,
        hasMore: trips.length === limit
      }
    });
  } catch (error) {
    console.error('Filter trips error:', error);
    res.status(500).json({ success: false, message: 'Server error while filtering trips' });
  }
};

exports.getTripConstants = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        tripTypes: ['solo', 'couple', 'group', 'family'],
        interests: [
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
      }
    });
  } catch (error) {
    console.error('Get trip constants error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching constants' });
  }
};

// Multer storage configuration for trip uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/trips');
    fs.mkdir(uploadPath, { recursive: true })
      .then(() => cb(null, uploadPath))
      .catch(err => cb(err));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `trip-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// Multer upload middleware for trips
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

exports.upload = upload;

