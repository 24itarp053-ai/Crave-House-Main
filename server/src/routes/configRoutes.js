/**
 * configRoutes.js
 * Routes for public restaurant configuration endpoint.
 */

const express = require('express');
const router = express.Router();
const { getRestaurantConfig } = require('../controllers/configController');

// Public route to retrieve public restaurant settings
router.get('/', getRestaurantConfig);

module.exports = router;
