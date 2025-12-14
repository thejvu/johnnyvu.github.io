const express = require('express');
const router = express.Router();
const { expressjwt: jwt } = require('express-jwt');
const auth = jwt({
    secret: process.env.JWT_SECRET,
    algorithms: ['HS256'],
    userProperty: 'payload'
});

const tripsController = require('../controllers/trips');
const authController = require('../controllers/authentication');
const { validateTrip, handleValidationErrors } = require('../middleware/validators');

// Statistics and aggregations - BEFORE other routes
router
    .route('/trips/stats')
    .get(tripsController.tripsGetStats);

router
    .route('/trips/top-rated')
    .get(tripsController.tripsTopRated);

// Search - BEFORE specific route patterns
router
    .route('/trips/search')
    .get(tripsController.tripsSearch);

// trips
router
    .route('/trips')
    .get(tripsController.tripsList)
    .post(auth, validateTrip, handleValidationErrors, tripsController.tripsAddTrip);

// Reviews for specific trip
router
    .route('/trips/:tripCode/reviews')
    .get(tripsController.tripsGetReviews)
    .post(tripsController.tripsAddReview); // No auth for demo purposes

// Similar trips (recommendations) - BEFORE :tripCode
router
    .route('/trips/:tripCode/similar')
    .get(tripsController.tripsSimilar);

router
    .route('/trips/:tripCode')
    .get(tripsController.tripsFindByCode)
    .put(auth, validateTrip, handleValidationErrors, tripsController.tripsUpdateTrip);

// authentication
router
    .route('/login')
    .post(authController.login);

router
    .route('/register')
    .post(authController.register);

module.exports = router;