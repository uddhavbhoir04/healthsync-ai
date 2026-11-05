/**
 * HealthSync AI - Resilient Multi-Tier Cache Layer
 * Supports Upstash Redis REST, native Redis (IORedis TCP), and in-memory TTL fallback.
 * Guarantees zero application crashes if Redis is offline or uninstalled.
 */

const localCache = new Map();
let upstashClient = null;
let redisClient = null;
let isRedisAvailable = false;

// 1. Initialize Upstash Redis REST if credentials are provided
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
        const { Redis: UpstashRedis } = require("@upstash/redis");
        upstashClient = new UpstashRedis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN
        });
        isRedisAvailable = true;
        console.log("✓ Connected to Upstash Redis REST");
    } catch (err) {
        console.warn("Could not initialize @upstash/redis REST client:", err.message);
    }
}

// 2. Initialize IORedis connection (used if Upstash REST is not configured or for TCP operations)
if (!upstashClient) {
    try {
        const Redis = require("ioredis");
        const redisUrl = process.env.REDIS_URL;
        const redisHost = process.env.REDIS_HOST || "127.0.0.1";
        const redisPort = Number(process.env.REDIS_PORT || 6379);

        if (redisUrl) {
            redisClient = new Redis(redisUrl, {
                maxRetriesPerRequest: 1,
                retryStrategy: () => null,
                lazyConnect: true
            });
        } else {
            redisClient = new Redis({
                host: redisHost,
                port: redisPort,
                maxRetriesPerRequest: 1,
                retryStrategy: () => null,
                lazyConnect: true
            });
        }

        redisClient.on("connect", () => {
            isRedisAvailable = true;
            console.log("✓ Connected to Redis Cache server");
        });

        redisClient.on("error", () => {
            if (!upstashClient) isRedisAvailable = false;
        });

        redisClient.connect().catch(() => {
            if (!upstashClient) isRedisAvailable = false;
        });
    } catch {
        if (!upstashClient) isRedisAvailable = false;
    }
}

/**
 * Get cached item by key
 * @param {string} key
 * @returns {Promise<any|null>}
 */
async function getCache(key) {
    if (upstashClient) {
        try {
            const data = await upstashClient.get(key);
            if (data === null || data === undefined) return null;
            if (typeof data === "string") {
                try {
                    return JSON.parse(data);
                } catch {
                    return data;
                }
            }
            return data;
        } catch {
            // Fall through to local cache
        }
    }

    try {
        if (isRedisAvailable && redisClient) {
            const data = await redisClient.get(key);
            return data ? JSON.parse(data) : null;
        }
    } catch {
        // Fallback to local cache
    }

    // Local in-memory fallback
    const entry = localCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
        localCache.delete(key);
        return null;
    }

    return entry.value;
}

/**
 * Set cached item with TTL in seconds
 * @param {string} key
 * @param {any} value
 * @param {number} ttlSeconds
 */
async function setCache(key, value, ttlSeconds = 300) {
    if (upstashClient) {
        try {
            await upstashClient.set(key, JSON.stringify(value), { ex: ttlSeconds });
            return;
        } catch {
            // Fall through to local cache
        }
    }

    try {
        if (isRedisAvailable && redisClient) {
            await redisClient.set(key, JSON.stringify(value), "EX", ttlSeconds);
            return;
        }
    } catch {
        // Fallback to local cache
    }

    localCache.set(key, {
        value,
        expiry: Date.now() + ttlSeconds * 1000
    });
}

/**
 * Delete a specific cached key
 * @param {string} key
 */
async function delCache(key) {
    if (upstashClient) {
        try {
            await upstashClient.del(key);
        } catch {
            // Ignore errors
        }
    }

    try {
        if (isRedisAvailable && redisClient) {
            await redisClient.del(key);
        }
    } catch {
        // Ignore errors
    }
    localCache.delete(key);
}

/**
 * Invalidate all keys matching a prefix or pattern (e.g. 'doctors:*', 'tests:*', 'packages:*', 'search:*')
 * @param {string} prefix
 */
async function invalidatePattern(prefix) {
    try {
        // Clear matching keys from local cache
        for (const key of localCache.keys()) {
            if (key.startsWith(prefix) || key.includes(prefix)) {
                localCache.delete(key);
            }
        }

        // Clear matching keys from Upstash REST
        if (upstashClient) {
            const keys = await upstashClient.keys(`${prefix}*`);
            if (keys && keys.length > 0) {
                await upstashClient.del(...keys);
            }
        }

        // Clear matching keys from IORedis
        if (redisClient && isRedisAvailable) {
            const keys = await redisClient.keys(`${prefix}*`);
            if (keys && keys.length > 0) {
                await redisClient.del(...keys);
            }
        }
    } catch (err) {
        console.warn(`Cache invalidation notice for pattern '${prefix}':`, err.message);
    }
}

/**
 * Atomically increment a counter that expires after ttlSeconds (used for rate limiting)
 * @param {string} key
 * @param {number} ttlSeconds
 * @returns {Promise<number>} the counter value after increment
 */
async function incrCounter(key, ttlSeconds = 60) {
    if (upstashClient) {
        try {
            const val = await upstashClient.incr(key);
            if (val === 1) {
                await upstashClient.expire(key, ttlSeconds);
            }
            return val;
        } catch {
            // Fall through to local cache
        }
    }

    try {
        if (isRedisAvailable && redisClient) {
            const value = await redisClient.incr(key);
            if (value === 1) {
                await redisClient.expire(key, ttlSeconds);
            }
            return value;
        }
    } catch {
        // Fallback to local cache
    }

    const entry = localCache.get(key);
    if (!entry || Date.now() > entry.expiry) {
        localCache.set(key, { value: 1, expiry: Date.now() + ttlSeconds * 1000 });
        return 1;
    }
    entry.value += 1;
    return entry.value;
}

module.exports = {
    getCache,
    incrCounter,
    setCache,
    delCache,
    invalidatePattern,
    isRedisConnected: () => isRedisAvailable
};
