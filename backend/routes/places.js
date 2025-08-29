const express = require('express');
const placesController = require('../controllers/placesController');

const router = express.Router();

// POST /api/places/search-text - Search places by text
router.post('/search-text', placesController.searchText);

// POST /api/places/search-nearby - Search places by coordinates
router.post('/search-nearby', placesController.searchNearby);

module.exports = router;
