const authController = require('../controllers/authentication');
const express = require('express');
const router = express.Router();

const tripsController = require('../controllers/trips');

router
    .route('/trips')
    .get(tripsController.tripsList)
    .post(tripsController.tripsAddTrip);

router
    .route('/trips/:tripCode')
    .get(tripsController.tripsFindByCode)
    .put(tripsController.tripsUpdateTrip);

// define route for registration endpoint
router
    .route('/register')
    .post(authController.register);

// define route for login endpoint
router
    .route('/login')
    .post(authController.login);

    module.exports = router;