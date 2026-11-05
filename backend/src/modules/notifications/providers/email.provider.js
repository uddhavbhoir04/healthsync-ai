/**
 * HealthSync AI - Transactional Email Provider Adapter
 * Uses official Resend SDK with automatic development mock fallback.
 */

let resendClient = null;

function getResendClient() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || apiKey.trim() === "" || apiKey === "re_test_mock") {
        return null; // Development mock mode
    }

    if (!resendClient) {
        try {
            const { Resend } = require("resend");
            resendClient = new Resend(apiKey);
        } catch (err) {
            console.warn("Resend SDK initialization failed, defaulting to mock email mode:", err.message);
            return null;
        }
    }
    return resendClient;
}

/**
 * Send an email via Resend or log preview in development mock mode.
 * @param {{ to: string, subject: string, html: string, text: string, from?: string }} options
 * @returns {Promise<{ success: boolean, messageId?: string, isMock: boolean }>}
 */
async function sendEmail({ to, subject, html, text, from }) {
    const sender = from || process.env.EMAIL_FROM || "HealthSync AI <onboarding@resend.dev>";
    const client = getResendClient();

    // Check if email notifications are enabled globally
    const emailEnabled = process.env.NOTIFICATION_EMAIL_ENABLED !== "false";
    if (!emailEnabled) {
        console.log(`[EMAIL DISABLED] Notification skipped for: ${to}`);
        return { success: true, isMock: true, skipped: true };
    }

    if (!client) {
        // Mock mode (free development mode, zero paid dependencies required)
        const timestamp = new Date().toLocaleTimeString();
        console.log(`\n================== [EMAIL PREVIEW (DEV MOCK)] ==================`);
        console.log(`Timestamp: ${timestamp}`);
        console.log(`From:      ${sender}`);
        console.log(`To:        ${to}`);
        console.log(`Subject:   ${subject}`);
        console.log(`Preview:   ${text.slice(0, 160).replace(/\n/g, " ")}...`);
        console.log(`================================================================\n`);
        return {
            success: true,
            messageId: `mock-resend-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            isMock: true
        };
    }

    try {
        const response = await client.emails.send({
            from: sender,
            to: Array.isArray(to) ? to : [to],
            subject,
            html,
            text
        });

        if (response.error) {
            console.error("Resend API responded with error:", response.error);
            throw new Error(response.error.message || "Resend failed to deliver email");
        }

        return {
            success: true,
            messageId: response.data?.id,
            isMock: false
        };
    } catch (err) {
        console.error(`✗ Failed to send email to ${to}:`, err.message);
        throw err;
    }
}

module.exports = {
    sendEmail,
    getResendClient
};

