/**
 * configController.js
 * Controller for serving sanitized public restaurant configuration.
 */

const restaurantConfig = require('../config/restaurantConfig');

/**
 * GET /api/config
 * Access: Public
 * Returns the sanitized, public configuration for client-side rendering.
 * Does NOT expose database credentials, secrets, or internal server keys.
 */
const getRestaurantConfig = (req, res) => {
  try {
    const config = restaurantConfig.getPublicConfig();
    return res.status(200).json({
      success: true,
      config
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve restaurant configuration'
    });
  }
};

module.exports = {
  getRestaurantConfig
};
