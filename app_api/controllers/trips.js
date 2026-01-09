const mongoose = require('mongoose');
const Trip = require('../models/travlr');
const Model = mongoose.model('trips');

// GET: /trips - lists all the trips
const tripsList = async (req, res) => {
    try {
        const q = await Model
            .find({})
            .exec();

        if (!q || q.length === 0) {
            return res
                .status(404)
                .json({ message: "No trips exist in our database" });
        } else {
            return res
                .status(200)
                .json(q);
        }
    } catch (err) {
        return res
            .status(500)
            .json({ error: err.message });
    }
};

// GET: /trips/:tripCode - lists a single trip
const tripsFindByCode = async (req, res) => {
    try {
        const q = await Model
            .find({ 'code': req.params.tripCode })  // Use find() instead of findOne()
            .exec();

        if (!q || q.length === 0) {
            return res
                .status(404)
                .json({ message: "Trip not found" });
        } else {
            return res
                .status(200)
                .json(q);  // Returns array
        }
    } catch (err) {
        return res
            .status(500)
            .json({ error: err.message });
    }
};

// POST: /trips - Adds a new Trip
const tripsAddTrip = async(req, res) => {
    console.log('POST /api/trips');
    console.log(req.body);
    
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

    const q = await newTrip.save();
    
    if(!q) {
        return res.status(400).json({ message: "Failed to add trip" });
    } else {
        return res.status(201).json(q);
    }
};

// PUT: /trips/:tripCode - Updates a trip
const tripsUpdateTrip = async(req, res) => {
    console.log('PUT /api/trips/' + req.params.tripCode);
    console.log(req.body);
    
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
            { new: true }  // Returns the updated document
        ).exec();
        
        if(!q) {
            return res.status(404).json({ message: "Trip not found" });
        } else {
            return res.status(200).json(q);
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

module.exports = {
    tripsList,
    tripsFindByCode,
    tripsAddTrip,
    tripsUpdateTrip
};