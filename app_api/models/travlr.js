const mongoose = require('mongoose');

// Define the review sub-schema (embedded document)
const reviewSchema = new mongoose.Schema({
    author: {
        type: String,
        required: [true, 'Review author is required'],
        trim: true,
        maxlength: [100, 'Author name cannot exceed 100 characters']
    },
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5'],
        validate: {
            validator: Number.isInteger,
            message: 'Rating must be a whole number'
        }
    },
    comment: {
        type: String,
        required: [true, 'Review comment is required'],
        trim: true,
        minlength: [10, 'Comment must be at least 10 characters'],
        maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Define the trip Schema with enhanced validation
const tripSchema = new mongoose.Schema({
    code: { 
        type: String, 
        required: [true, 'Trip code is required'],
        unique: true,
        uppercase: true,
        trim: true,
        index: true,
        match: [/^[A-Z0-9]+$/, 'Trip code must contain only uppercase letters and numbers']
    },
    name: { 
        type: String, 
        required: [true, 'Trip name is required'],
        trim: true,
        minlength: [3, 'Trip name must be at least 3 characters'],
        maxlength: [100, 'Trip name cannot exceed 100 characters'],
        index: true
    },
    length: { 
        type: Number, 
        required: [true, 'Trip length is required'],
        min: [1, 'Trip length must be at least 1 day'],
        max: [365, 'Trip length cannot exceed 365 days']
    },
    start: { 
        type: Date, 
        required: [true, 'Start date is required']
    },
    resort: { 
        type: String, 
        required: [true, 'Resort name is required'],
        trim: true,
        maxlength: [100, 'Resort name cannot exceed 100 characters'],
        index: true
    },
    perPerson: { 
        type: Number, 
        required: [true, 'Price per person is required'],
        min: [0, 'Price cannot be negative']
    },
    image: { 
        type: String, 
        required: [true, 'Image URL is required'],
        trim: true,
        validate: {
            validator: function(v) {
                // Simple URL validation or just filename
                return v && v.length > 0;
            },
            message: 'Image URL is required'
        }
    },
    description: { 
        type: String, 
        required: [true, 'Description is required'],
        trim: true,
        minlength: [10, 'Description must be at least 10 characters'],
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    reviews: [reviewSchema], // Embedded reviews array
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    totalReviews: {
        type: Number,
        default: 0,
        min: 0
    }
});

// Create compound index for common queries
tripSchema.index({ resort: 1, perPerson: 1 });
tripSchema.index({ name: 'text', description: 'text' }); // Text search index

// Method to calculate and update average rating
tripSchema.methods.updateRatingStats = function() {
    if (this.reviews.length === 0) {
        this.averageRating = 0;
        this.totalReviews = 0;
    } else {
        const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
        this.averageRating = Math.round((sum / this.reviews.length) * 10) / 10; // Round to 1 decimal
        this.totalReviews = this.reviews.length;
    }
};

// Pre-save hook to update rating stats automatically
tripSchema.pre('save', function(next) {
    if (this.isModified('reviews')) {
        this.updateRatingStats();
    }
    next();
});

mongoose.model('trips', tripSchema);