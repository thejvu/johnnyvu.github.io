const mongoose = require('mongoose');
const Trip = require('../models/travlr');
const Model = mongoose.model('trips');
const logger = require('../config/logger');
const cache = require('../utils/cache');

// GET: /trips - lists all the trips (WITH CACHING)
const tripsList = async (req, res) => {
    const cacheKey = 'all_trips';
    
    // Check cache first
    const cachedTrips = cache.get(cacheKey);
    if (cachedTrips) {
        logger.info(`Returning ${cachedTrips.length} trips from cache`);
        return res.status(200).json(cachedTrips);
    }
    
    // Cache miss - fetch from database
    try {
        const q = await Model
            .find({})
            .exec();

        if (!q || q.length === 0) {
            logger.warn('No trips found in database');
            return res
                .status(404)
                .json({ message: "No trips exist in our database" });
        } else {
            logger.info(`Retrieved ${q.length} trips from database`);
            
            // Store in cache
            cache.set(cacheKey, q);
            
            return res
                .status(200)
                .json(q);
        }
    } catch (err) {
        logger.error('Error fetching trips:', err);
        return res
            .status(500)
            .json({ error: err.message });
    }
};

// GET: /trips/:tripCode - lists a single trip
const tripsFindByCode = async (req, res) => {
    try {
        const q = await Model
            .find({ 'code': req.params.tripCode })
            .exec();

        if (!q || q.length === 0) {
            logger.warn(`Trip not found: ${req.params.tripCode}`);
            return res
                .status(404)
                .json({ message: "Trip not found" });
        } else {
            logger.info(`Retrieved trip: ${req.params.tripCode}`);
            return res
                .status(200)
                .json(q);
        }
    } catch (err) {
        logger.error('Error finding trip:', err);
        return res
            .status(500)
            .json({ error: err.message });
    }
};

// POST: /trips - Adds a new Trip (CLEAR CACHE ON CREATE)
const tripsAddTrip = async(req, res) => {
    logger.info('Adding new trip', { code: req.body.code, name: req.body.name });
    
    const newTrip = new Model({
        code: req.body.code,
        name: req.body.name,
        length: req.body.length,
        start: req.body.start,
        resort: req.body.resort,
        perPerson: req.body.perPerson,
        image: req.body.image,
        description: req.body.description
    });

    try {
        const q = await newTrip.save();
        
        if(!q) {
            logger.error('Failed to save new trip');
            return res.status(400).json({ message: "Failed to add trip" });
        } else {
            logger.info(`Successfully created trip: ${q.code}`);
            
            // Invalidate cache when new trip is added
            cache.clear('all_trips');
            
            return res.status(201).json(q);
        }
    } catch (err) {
        logger.error('Error adding trip:', err);
        return res.status(500).json({ error: err.message });
    }
};

// PUT: /trips/:tripCode - Updates a trip (CLEAR CACHE ON UPDATE)
const tripsUpdateTrip = async(req, res) => {
    logger.info(`Updating trip: ${req.params.tripCode}`);
    
    try {
        const q = await Model.findOneAndUpdate(
            { 'code': req.params.tripCode },
            {
                code: req.body.code,
                name: req.body.name,
                length: req.body.length,
                start: req.body.start,
                resort: req.body.resort,
                perPerson: req.body.perPerson,
                image: req.body.image,
                description: req.body.description
            },
            { new: true }
        ).exec();
        
        if(!q) {
            logger.warn(`Trip not found for update: ${req.params.tripCode}`);
            return res.status(404).json({ message: "Trip not found" });
        } else {
            logger.info(`Successfully updated trip: ${q.code}`);
            
            // Invalidate cache when trip is updated
            cache.clear('all_trips');
            
            return res.status(200).json(q);
        }
    } catch (err) {
        logger.error('Error updating trip:', err);
        return res.status(500).json({ error: err.message });
    }
};

// GET: /trips/search - Search and filter trips
const tripsSearch = async (req, res) => {
    const { q, minPrice, maxPrice, minLength, maxLength, resort, sortBy, sortOrder } = req.query;
    
    try {
        logger.info(`Search request: ${q || 'all'} with filters`, { minPrice, maxPrice, resort });
        
        // Build query object
        let query = {};
        let sort = {};
        
        // Text search if query provided
        if (q && q.trim() !== '') {
            query.$text = { $search: q };
            // Default to relevance score for text searches
            if (!sortBy) {
                sort = { score: { $meta: 'textScore' } };
            }
        }
        
        // Price range filter
        if (minPrice || maxPrice) {
            query.perPerson = {};
            if (minPrice) query.perPerson.$gte = parseFloat(minPrice);
            if (maxPrice) query.perPerson.$lte = parseFloat(maxPrice);
        }
        
        // Length filter
        if (minLength || maxLength) {
            query.length = {};
            if (minLength) query.length.$gte = parseInt(minLength);
            if (maxLength) query.length.$lte = parseInt(maxLength);
        }
        
        // Resort filter
        if (resort) {
            query.resort = new RegExp(resort, 'i'); // Case-insensitive regex
        }
        
        // Build sort object if not already set
        if (sortBy) {
            const order = sortOrder === 'desc' ? -1 : 1;
            sort[sortBy] = order;
        } else if (Object.keys(sort).length === 0) {
            // Default sort by name if no text search
            sort = { name: 1 };
        }
        
        // Execute query
        const trips = await Model
            .find(query)
            .sort(sort)
            .exec();
        
        logger.info(`Found ${trips.length} trips matching criteria`);
        
        return res.status(200).json({
            results: trips,
            count: trips.length,
            query: { q, minPrice, maxPrice, minLength, maxLength, resort, sortBy, sortOrder }
        });
        
    } catch (err) {
        logger.error('Error searching trips:', err);
        return res.status(500).json({ error: err.message });
    }
};

// GET: /trips/:tripCode/similar - Get similar trips (recommendation)
const tripsSimilar = async (req, res) => {
    try {
        const currentTrip = await Model.findOne({ code: req.params.tripCode }).exec();
        
        if (!currentTrip) {
            logger.warn(`Trip not found for recommendations: ${req.params.tripCode}`);
            return res.status(404).json({ message: 'Trip not found' });
        }
        
        logger.info(`Finding similar trips to: ${currentTrip.name}`);
        
        // Get all other trips
        const allTrips = await Model.find({ code: { $ne: currentTrip.code } }).exec();
        
        // Calculate similarity scores
        const similarities = allTrips.map(trip => {
            let score = 0;
            
            // Price similarity (within $500)
            const priceDiff = Math.abs(trip.perPerson - currentTrip.perPerson);
            if (priceDiff < 500) score += 3;
            else if (priceDiff < 1000) score += 2;
            else if (priceDiff < 2000) score += 1;
            
            // Duration similarity (within 2 days)
            const durationDiff = Math.abs(trip.length - currentTrip.length);
            if (durationDiff <= 2) score += 3;
            else if (durationDiff <= 5) score += 2;
            else if (durationDiff <= 7) score += 1;
            
            // Same resort = high similarity
            if (trip.resort === currentTrip.resort) score += 5;
            
            return { trip, score };
        });
        
        // Sort by score and return top 3
        similarities.sort((a, b) => b.score - a.score);
        const recommendations = similarities.slice(0, 3).map(s => s.trip);
        
        logger.info(`Found ${recommendations.length} similar trips`);
        
        return res.status(200).json({
            basedOn: {
                code: currentTrip.code,
                name: currentTrip.name
            },
            recommendations: recommendations
        });
        
    } catch (err) {
        logger.error('Error finding similar trips:', err);
        return res.status(500).json({ error: err.message });
    }
};

// POST: /trips/:tripCode/reviews - Add a review to a trip
const tripsAddReview = async (req, res) => {
    try {
        const trip = await Model.findOne({ code: req.params.tripCode });
        
        if (!trip) {
            logger.warn(`Trip not found for review: ${req.params.tripCode}`);
            return res.status(404).json({ message: 'Trip not found' });
        }
        
        // Add new review to the reviews array
        trip.reviews.push({
            author: req.body.author,
            rating: req.body.rating,
            comment: req.body.comment
        });
        
        // Save will trigger pre-save hook to update rating stats
        const savedTrip = await trip.save();
        
        logger.info(`Added review to trip ${trip.code}. New average: ${savedTrip.averageRating}`);
        
        // Invalidate cache when reviews are added
        cache.clear('all_trips');
        
        return res.status(201).json({
            message: 'Review added successfully',
            trip: savedTrip,
            newAverageRating: savedTrip.averageRating,
            totalReviews: savedTrip.totalReviews
        });
        
    } catch (err) {
        logger.error('Error adding review:', err);
        return res.status(500).json({ error: err.message });
    }
};

// GET: /trips/:tripCode/reviews - Get all reviews for a trip
const tripsGetReviews = async (req, res) => {
    try {
        const trip = await Model.findOne({ code: req.params.tripCode }, 'reviews averageRating totalReviews name');
        
        if (!trip) {
            logger.warn(`Trip not found: ${req.params.tripCode}`);
            return res.status(404).json({ message: 'Trip not found' });
        }
        
        logger.info(`Retrieved ${trip.reviews.length} reviews for trip ${req.params.tripCode}`);
        
        return res.status(200).json({
            tripName: trip.name,
            averageRating: trip.averageRating,
            totalReviews: trip.totalReviews,
            reviews: trip.reviews
        });
        
    } catch (err) {
        logger.error('Error fetching reviews:', err);
        return res.status(500).json({ error: err.message });
    }
};

// GET: /trips/stats - Get trip statistics using aggregation
const tripsGetStats = async (req, res) => {
    try {
        logger.info('Fetching trip statistics');
        
        const stats = await Model.aggregate([
            {
                $group: {
                    _id: null,
                    totalTrips: { $sum: 1 },
                    averagePrice: { $avg: '$perPerson' },
                    minPrice: { $min: '$perPerson' },
                    maxPrice: { $max: '$perPerson' },
                    averageDuration: { $avg: '$length' },
                    totalReviews: { $sum: '$totalReviews' },
                    averageRating: { $avg: '$averageRating' }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalTrips: 1,
                    averagePrice: { $round: ['$averagePrice', 2] },
                    minPrice: 1,
                    maxPrice: 1,
                    averageDuration: { $round: ['$averageDuration', 1] },
                    totalReviews: 1,
                    averageRating: { $round: ['$averageRating', 1] }
                }
            }
        ]);
        
        logger.info('Statistics calculated successfully');
        
        return res.status(200).json({
            statistics: stats[0] || {
                totalTrips: 0,
                averagePrice: 0,
                minPrice: 0,
                maxPrice: 0,
                averageDuration: 0,
                totalReviews: 0,
                averageRating: 0
            }
        });
        
    } catch (err) {
        logger.error('Error calculating statistics:', err);
        return res.status(500).json({ error: err.message });
    }
};

// GET: /trips/top-rated - Get top rated trips using aggregation
const tripsTopRated = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        
        logger.info(`Fetching top ${limit} rated trips`);
        
        const topTrips = await Model.aggregate([
            {
                $match: {
                    totalReviews: { $gt: 0 } // Only trips with reviews
                }
            },
            {
                $sort: {
                    averageRating: -1,
                    totalReviews: -1
                }
            },
            {
                $limit: limit
            },
            {
                $project: {
                    code: 1,
                    name: 1,
                    resort: 1,
                    perPerson: 1,
                    averageRating: 1,
                    totalReviews: 1,
                    image: 1
                }
            }
        ]);
        
        logger.info(`Found ${topTrips.length} top-rated trips`);
        
        return res.status(200).json({
            topRatedTrips: topTrips,
            count: topTrips.length
        });
        
    } catch (err) {
        logger.error('Error fetching top-rated trips:', err);
        return res.status(500).json({ error: err.message });
    }
};

module.exports = {
    tripsList,
    tripsFindByCode,
    tripsAddTrip,
    tripsUpdateTrip,
    tripsSearch,
    tripsSimilar,
    tripsAddReview,
    tripsGetReviews,
    tripsGetStats,
    tripsTopRated
};