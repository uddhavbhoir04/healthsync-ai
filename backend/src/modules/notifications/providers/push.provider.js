/**
 * HealthSync AI - Web Push Notification Provider (VAPID)
 * Powered by web-push package with automatic local development fallback.
 */

const webpush = require("web-push");

// Safe fallback VAPID keys for immediate zero-config local development
const DEFAULT_VAPID = {
    publicKey: process.env.VAPID_PUBLIC_KEY || "BNo_G9sB8J4h2jHkHjK2hKj4h2kHj4h2kHj4h2kHj4h2kHj4h2kHj4h2kHj4h2kHj4h2kHj4h2kHj4h2kHj4h2k",
    privateKey: process.env.VAPID_PRIVATE_KEY || "dummy_private_key_for_local_testing_healthsync",
    subject: process.env.VAPID_SUBJECT || "mailto:support@healthsync.local"
};

let vapidConfigured = false;

function ensureVapidConfigured() {
    if (vapidConfigured) return true;

    const pub = process.env.VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || "mailto:support@healthsync.local";

    if (pub && priv) {
        try {
            webpush.setVapidDetails(subject, pub, priv);
            vapidConfigured = true;
            return true;
        } catch (err) {
            console.warn("Failed to configure VAPID details with provided keys:", err.message);
            return false;
        }
    }

    // In dev without keys, generate a pair once on startup so Web Push works out of the box
    try {
        const generated = webpush.generateVAPIDKeys();
        webpush.setVapidDetails(subject, generated.publicKey, generated.privateKey);
        process.env.VAPID_PUBLIC_KEY = generated.publicKey;
        process.env.VAPID_PRIVATE_KEY = generated.privateKey;
        vapidConfigured = true;
        console.log("✓ Auto-generated development VAPID keys for Web Push");
        return true;
    } catch (err) {
        console.warn("Could not auto-generate VAPID keys:", err.message);
        return false;
    }
}

function getVapidPublicKey() {
    ensureVapidConfigured();
    return process.env.VAPID_PUBLIC_KEY || DEFAULT_VAPID.publicKey;
}

/**
 * Send a browser push notification.
 * @param {{ endpoint: string, p256dh: string, auth: string }} subscription
 * @param {{ title: string, body: string, url?: string, icon?: string, tag?: string }} payload
 * @returns {Promise<{ success: boolean, expired?: boolean, isMock?: boolean }>}
 */
async function sendPushNotification(subscription, payload) {
    const pushEnabled = process.env.NOTIFICATION_PUSH_ENABLED !== "false";
    if (!pushEnabled) {
        return { success: true, isMock: true, skipped: true };
    }

    const isReady = ensureVapidConfigured();
    if (!isReady) {
        console.log(`[PUSH MOCK] Browser push to ${subscription.endpoint.slice(0, 30)}...: "${payload.title}"`);
        return { success: true, isMock: true };
    }

    const pushPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || "/icons/icon-192x192.png",
        badge: "/icons/badge-72x72.png",
        url: payload.url || "/dashboard/notifications",
        tag: payload.tag || "healthsync-alert",
        timestamp: Date.now()
    });

    const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth
        }
    };

    try {
        await webpush.sendNotification(pushSubscription, pushPayload);
        return { success: true, isMock: false };
    } catch (err) {
        const statusCode = err.statusCode || err.code;
        // 404 Not Found or 410 Gone indicates the push subscription has expired or was unsubscribed
        if (statusCode === 404 || statusCode === 410) {
            console.log(`[PUSH EXPIRED] Subscription ${subscription.endpoint.slice(0, 40)} is no longer active.`);
            return { success: false, expired: true, error: "SUBSCRIPTION_EXPIRED" };
        }
        console.error(`✗ Web Push failed (HTTP ${statusCode}):`, err.message);
        throw err;
    }
}

module.exports = {
    sendPushNotification,
    getVapidPublicKey,
    ensureVapidConfigured
};

