const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middleware/auth');
const {
  createTrip,
  getTrip,
  updateTrip,
  deleteTrip,
  addItineraryItem,
  updateItineraryItem,
  deleteItineraryItem,
  addChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
  generateShareLink,
  requestJoin,
  handleJoinRequest,
  addCollaborator,
  removeCollaborator,
  listTripsForUser,
  getRequestedTrips,
  filterPublicTrips,
  getTripConstants,
  upload
} = require('../controllers/tripController');

// Get trip constants (types and interests)
router.get('/constants', getTripConstants);

// Filter public trips
router.get('/public', filterPublicTrips);

// List trips for current user
router.get('/', protect, listTripsForUser);

// Get requested trips for current user (must come before /:id route)
router.get('/requested', protect, getRequestedTrips);

// Create trip
router.post('/', protect, upload.single('coverImage'), createTrip);

// Single trip (must come after specific routes like /requested)
router.get('/:id', optionalAuth, getTrip);
router.put('/:id', protect, updateTrip);
router.delete('/:id', protect, deleteTrip);

// Itinerary
router.post('/:id/itinerary', protect, addItineraryItem);
router.put('/:id/itinerary/:itemId', protect, updateItineraryItem);
router.delete('/:id/itinerary/:itemId', protect, deleteItineraryItem);

// Checklist
router.post('/:id/checklist', protect, addChecklistItem);
router.patch('/:id/checklist/:itemId', protect, toggleChecklistItem);
router.delete('/:id/checklist/:itemId', protect, deleteChecklistItem);

// Collaborators
router.post('/:id/collaborators', protect, addCollaborator);
router.delete('/:id/collaborators/:userId', protect, removeCollaborator);

// Sharing and joining
router.post('/:id/share', protect, generateShareLink);
router.post('/:id/join', protect, requestJoin);
router.post('/:id/join/handle', protect, handleJoinRequest);

module.exports = router;
