const axios = require('axios');

// Google Places API (New) controller
const placesController = {
  // Search for places using text query
  async searchText(req, res) {
    try {
      const { textQuery, maxResultCount = 5, languageCode = 'en' } = req.body;

      if (!textQuery) {
        return res.status(400).json({
          success: false,
          message: 'Text query is required'
        });
      }

      const requestBody = {
        textQuery,
        maxResultCount,
        languageCode
      };

      const headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types'
      };

      const response = await axios.post(
        'https://places.googleapis.com/v1/places:searchText',
        requestBody,
        { headers }
      );

      res.json({
        success: true,
        data: response.data
      });

    } catch (error) {
      console.error('Places API search text error:', error.response?.data || error.message);

      if (error.response?.status === 401) {
        return res.status(401).json({
          success: false,
          message: 'Google Places API authentication failed. Please check API key and ensure Places API (New) is enabled.',
          error: error.response?.data
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to search places',
        error: error.message
      });
    }
  },

  // Search for nearby places using coordinates
  async searchNearby(req, res) {
    try {
      const { latitude, longitude, maxResultCount = 1, rankPreference = 'DISTANCE' } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }

      const requestBody = {
        location: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        },
        maxResultCount,
        rankPreference
      };

      const headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types'
      };

      const response = await axios.post(
        'https://places.googleapis.com/v1/places:searchNearby',
        requestBody,
        { headers }
      );

      res.json({
        success: true,
        data: response.data
      });

    } catch (error) {
      console.error('Places API search nearby error:', error.response?.data || error.message);

      if (error.response?.status === 401) {
        return res.status(401).json({
          success: false,
          message: 'Google Places API authentication failed. Please check API key and ensure Places API (New) is enabled.',
          error: error.response?.data
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to search nearby places',
        error: error.message
      });
    }
  }
};

module.exports = placesController;
