/**
 * HealthSync AI - BullMQ Queue & Worker Layer
 * Manages background queues for Email, Browser Push, and Delayed Reminders.
 * Provides resilient fallback if Redis is offline during development.
 */

const { Queue, Worker } = require("bullmq");
const IORedis = require("ioredis");
const { QUEUE_NAMES } = require("./notification.constants");

let redisConnection = null;
let isRedisReady = false;
const queues = {};
const workers = {};

function getRedisOptions() {
    // If Upstash Redis REST credentials are provided
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        try {
            const host = new URL(process.env.UPSTASH_REDIS_REST_URL).hostname;
            return {
                host,
                port: 6379,
                username: "default",
                password: process.env.UPSTASH_REDIS_REST_TOKEN,
                tls: {},
                maxRetriesPerRequest: null
            };
        } catch {
            // fallback
        }
    }

    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
        try {
            const parsed = new URL(redisUrl);
            const isTls = parsed.protocol === "rediss:";
            return {
                host: parsed.hostname,
                port: Number(parsed.port || (isTls ? 6380 : 6379)),
                username: parsed.username || "default",
                password: parsed.password || undefined,
                ...(isTls ? { tls: {} } : {}),
                maxRetriesPerRequest: null
            };
        } catch {
            return redisUrl;
        }
    }

    return {
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: Number(process.env.REDIS_PORT || 6379),
        maxRetriesPerRequest: null // Required by BullMQ
    };
}

function initRedisConnection() {
    if (redisConnection) return redisConnection;

    const opts = getRedisOptions();
    try {
        if (typeof opts === "string") {
            redisConnection = new IORedis(opts, {
                maxRetriesPerRequest: null,
                retryStrategy: (times) => (times <= 3 ? 1000 : null),
                lazyConnect: true
            });
        } else {
            redisConnection = new IORedis({
                ...opts,
                maxRetriesPerRequest: null,
                retryStrategy: (times) => (times <= 3 ? 1000 : null),
                lazyConnect: true
            });
        }

        redisConnection.on("connect", () => {
            isRedisReady = true;
            console.log("✓ BullMQ connected to Redis");
        });

        redisConnection.on("error", (err) => {
            isRedisReady = false;
            // Suppress uncaught noise if redis is not running locally
        });

        redisConnection.connect().catch(() => {
            isRedisReady = false;
        });
    } catch (err) {
        isRedisReady = false;
    }

    return redisConnection;
}

const defaultJobOptions = {
    attempts: Number(process.env.QUEUE_MAX_ATTEMPTS || 5),
    backoff: {
        type: "exponential",
        delay: 2000
    },
    removeOnComplete: 200,
    removeOnFail: 500
};

function getQueue(queueName) {
    if (queues[queueName]) return queues[queueName];

    initRedisConnection();
    try {
        const queue = new Queue(queueName, {
            connection: getRedisOptions(),
            defaultJobOptions
        });
        queues[queueName] = queue;
        return queue;
    } catch (err) {
        console.warn(`Could not create BullMQ queue [${queueName}]:`, err.message);
        return null;
    }
}

/**
 * Register a worker processor for a queue.
 * @param {string} queueName
 * @param {Function} processor
 */
function registerWorker(queueName, processor) {
    if (workers[queueName]) return workers[queueName];

    initRedisConnection();
    const concurrency = Number(process.env.QUEUE_CONCURRENCY || 5);

    try {
        const worker = new Worker(queueName, processor, {
            connection: getRedisOptions(),
            concurrency
        });

        worker.on("failed", (job, err) => {
            console.error(`[Worker ${queueName}] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
        });

        worker.on("completed", (job) => {
            // Safe debug log
        });

        worker.on("error", (err) => {
            // Suppress terminal crashes when Redis is offline in local development
        });

        workers[queueName] = worker;
        return worker;
    } catch (err) {
        console.warn(`Could not start BullMQ worker [${queueName}]:`, err.message);
        return null;
    }
}

/**
 * Add a job to a queue safely. Returns null if Redis is offline so the fallback dispatcher handles it.
 */
async function addJob(queueName, jobName, data, opts = {}) {
    try {
        const queue = getQueue(queueName);
        if (!queue) return null;
        const job = await queue.add(jobName, data, {
            ...defaultJobOptions,
            ...opts
        });
        return job;
    } catch (err) {
        // Redis offline or command failed -> return null for graceful direct outbox processing
        return null;
    }
}

async function closeQueuesAndWorkers() {
    console.log("Shutting down BullMQ queues and workers...");
    for (const name of Object.keys(workers)) {
        try {
            await workers[name].close();
        } catch { }
    }
    for (const name of Object.keys(queues)) {
        try {
            await queues[name].close();
        } catch { }
    }
    if (redisConnection) {
        try {
            await redisConnection.quit();
        } catch { }
    }
}

module.exports = {
    getQueue,
    registerWorker,
    addJob,
    closeQueuesAndWorkers,
    getRedisOptions,
    QUEUE_NAMES
};

