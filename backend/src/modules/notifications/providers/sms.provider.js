/**
 * HealthSync AI - SMS Provider Interface (Mock / Extension Point)
 * SMS is disabled by default to avoid external paid telephony costs.
 */

async function sendSMS({ to, message }) {
    const isSmsEnabled = process.env.NOTIFICATION_SMS_ENABLED === "true";

    if (!isSmsEnabled) {
        // Disabled by default
        return { success: true, isMock: true, skipped: true, reason: "SMS_DISABLED_BY_CONFIG" };
    }

    // Development mock implementation
    console.log(`\n[SMS MOCK] To: ${to} | Message: "${message}"`);
    return {
        success: true,
        messageId: `mock-sms-${Date.now()}`,
        isMock: true,
        delivered: false,
        status: "ACCEPTED_MOCK"
    };
}

module.exports = {
    sendSMS
};

