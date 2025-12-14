const logger = require('../config/logger');

// Simple in-memory cache with TTL (Time To Live)
class SimpleCache {
    constructor() {
        this.cache = new Map();
        this.ttl = 5 * 60 * 1000; // 5 minutes in milliseconds
    }

    // Store data in cache with timestamp
    set(key, value) {
        const item = {
            value: value,
            timestamp: Date.now()
        };
        this.cache.set(key, item);
        logger.info(`Cache SET: ${key}`);
    }

    // Retrieve data from cache if not expired
    get(key) {
        const item = this.cache.get(key);
        
        if (!item) {
            logger.info(`Cache MISS: ${key}`);
            return null;
        }

        // Check if cache entry has expired
        const now = Date.now();
        if (now - item.timestamp > this.ttl) {
            this.cache.delete(key);
            logger.info(`Cache EXPIRED: ${key}`);
            return null;
        }

        logger.info(`Cache HIT: ${key}`);
        return item.value;
    }

    // Clear specific cache entry
    clear(key) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
            logger.info(`Cache CLEARED: ${key}`);
        }
    }

    // Clear all cache entries
    clearAll() {
        this.cache.clear();
        logger.info('Cache CLEARED ALL');
    }

    // Get cache statistics
    getStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// Export singleton instance
module.exports = new SimpleCache();