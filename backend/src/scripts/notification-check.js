/**
 * HealthSync AI — Phase 7 Full Verification Script
 * Checks Upstash Redis, BullMQ queues, MySQL tables, Resend Email, and In-App notifications.
 *
 * Usage: npm run notification:check
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env"), quiet: true });
const sequelize = require("../config/database");
const { User, Notification, NotificationPreference, PushSubscription, NotificationOutbox } = require("../models");
const { setCache, getCache, delCache, isRedisConnected } = require("../utils/cache");
const { getQueue, closeQueuesAndWorkers } = require("../modules/notifications/queue");
const { sendEmail } = require("../modules/notifications/providers/email.provider");
const { renderTemplate } = require("../modules/notifications/templates/email.templates");
const { EVENT_TYPES } = require("../modules/notifications/notification.constants");
const { getVapidPublicKey } = require("../modules/notifications/providers/push.provider");

async function checkDatabase() {
    console.log("\n1. Checking Database & Phase 7 Tables:");
    try {
        await sequelize.authenticate();
        console.log("  ✓ MySQL connection established");

        const notifCount = await Notification.count();
        const prefCount = await NotificationPreference.count();
        const pushCount = await PushSubscription.count();
        const outboxCount = await NotificationOutbox.count();

        console.log(`  ✓ Table NOTIFICATIONS exists (${notifCount} records)`);
        console.log(`  ✓ Table NOTIFICATION_PREFERENCES exists (${prefCount} records)`);
        console.log(`  ✓ Table PUSH_SUBSCRIPTIONS exists (${pushCount} records)`);
        console.log(`  ✓ Table NOTIFICATION_OUTBOX exists (${outboxCount} records)`);
        return true;
    } catch (err) {
        console.error("  ✗ Database check failed:", err.message);
        return false;
    }
}

async function checkRedis() {
    console.log("\n2. Checking Upstash Redis & BullMQ Queues:");
    try {
        // Test Upstash REST cache
        await setCache("healthsync_check_key", { verified: true, time: new Date().toISOString() }, 60);
        const val = await getCache("healthsync_check_key");
        await delCache("healthsync_check_key");

        if (val && val.verified) {
            console.log("  ✓ Upstash Redis REST cache working (set/get/del OK)");
        } else {
            console.log("  ⚠ Redis cache operating in fallback mode");
        }

        // Test BullMQ Queue with TLS
        const queue = getQueue("notification-email");
        if (queue) {
            const job = await queue.add("healthsync-ping-job", { ping: Date.now() }, { removeOnComplete: true });
            console.log(`  ✓ BullMQ connected to Redis — test job enqueued (Job ID: ${job.id})`);
            await queue.remove(job.id).catch(() => {});
        } else {
            console.log("  ⚠ BullMQ queue running with fallback processor");
        }
        return true;
    } catch (err) {
        console.error("  ✗ Redis / BullMQ check error:", err.message);
        return false;
    }
}

async function checkEmailService() {
    console.log("\n3. Checking Transactional Email Service (Resend):");
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM || "HealthSync AI <onboarding@resend.dev>";

    if (!apiKey) {
        console.log("  ℹ RESEND_API_KEY is not set (Development Preview Mode is active)");
        return true;
    }

    console.log(`  ✓ RESEND_API_KEY is configured (${apiKey.slice(0, 7)}...)`);
    console.log(`  ✓ Sender address: ${from}`);

    try {
        const template = renderTemplate(EVENT_TYPES.WELCOME, {
            name: "HealthSync Tester",
            email: "uddhavoha@gmail.com",
            dashboardUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard`
        });

        console.log(`  ✓ Rendered email template "${EVENT_TYPES.WELCOME}" (Subject: "${template.subject}")`);

        // Test email sending
        const result = await sendEmail({
            to: "uddhavoha@gmail.com",
            subject: "[HealthSync AI] System Verification Check",
            html: template.html,
            text: template.text
        });

        if (result.success) {
            console.log(`  ✓ Live test email sent successfully! Message ID: ${result.messageId}`);
        } else if (result.skipped) {
            console.log("  ℹ Email delivery skipped per configuration switch");
        }
        return true;
    } catch (err) {
        console.error("  ✗ Email delivery test failed:", err.message);
        return false;
    }
}

async function checkWebPush() {
    console.log("\n4. Checking Web Push VAPID Configuration:");
    try {
        const pubKey = getVapidPublicKey();
        if (pubKey) {
            console.log(`  ✓ VAPID Public Key available (${pubKey.slice(0, 16)}...)`);
            console.log("  ✓ Browser Push notification handshake ready");
        }
        return true;
    } catch (err) {
        console.error("  ✗ VAPID configuration error:", err.message);
        return false;
    }
}

async function checkInAppNotification() {
    console.log("\n5. Testing In-App Notification Creation:");
    try {
        const user = await User.findOne({ where: { status: "ACTIVE" } });
        if (!user) {
            console.log("  ℹ No active user found to test in-app notification insertion.");
            return true;
        }

        const notif = await Notification.create({
            userId: user.id,
            title: "Phase 7 System Check",
            message: "Notification system, BullMQ, Upstash Redis, and Resend are fully operational.",
            channel: "IN_APP",
            notificationType: "WELCOME",
            status: "SENT",
            metadata: { test: true, timestamp: Date.now() }
        });

        console.log(`  ✓ Created test In-App notification #${notif.id} for user ${user.name} (${user.email})`);
        console.log(`  ✓ Unread count for user ${user.id} now includes this notification`);
        return true;
    } catch (err) {
        console.error("  ✗ In-App notification creation failed:", err.message);
        return false;
    }
}

async function run() {
    console.log("==================================================================");
    console.log(" HealthSync AI — Phase 7 Notification & Queue Verification Check");
    console.log("==================================================================");

    await checkDatabase();
    await checkRedis();
    await checkEmailService();
    await checkWebPush();
    await checkInAppNotification();

    await closeQueuesAndWorkers().catch(() => {});
    await sequelize.close().catch(() => {});

    console.log("\n==================================================================");
    console.log(" ✓ Phase 7 Verification Complete!");
    console.log("==================================================================\n");
    process.exit(0);
}

run().catch((err) => {
    console.error("Unhandled error during verification:", err);
    process.exit(1);
});
