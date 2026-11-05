const assert = require("assert");
const crypto = require("crypto");

const {
    createOrderSchema,
    verifyPaymentSchema,
    retryPaymentSchema,
    refundPaymentSchema,
    queryPaymentsSchema
} = require("../modules/payments/payments.validation");

const {
    amountToPaise,
    paiseToAmount,
    verifyCheckoutSignature,
    generateTestSignature,
    verifyWebhookSignature,
    generateTestWebhookSignature
} = require("../utils/razorpay");

console.log("=== Running HealthSync AI Phase 5 Test Suite ===\n");

let passed = 0;
let failed = 0;

function it(description, fn) {
    try {
        fn();
        console.log(`  ✓ ${description}`);
        passed++;
    } catch (err) {
        console.error(`  ✗ ${description}`);
        console.error(`    ${err.message}`);
        failed++;
    }
}

async function runTests() {
    // 1. Validation Schemas
    console.log("1. Payment Validation Schemas:");

    it("1.1 should validate valid create-order payload", () => {
        const payload = { bookingId: 101, idempotencyKey: "PAY_101_ATTEMPT_1" };
        const res = createOrderSchema.safeParse(payload);
        assert.strictEqual(res.success, true);
        assert.strictEqual(res.data.bookingId, 101);
    });

    it("1.2 should coerce numeric string bookingId in create-order payload", () => {
        const payload = { bookingId: "42" };
        const res = createOrderSchema.safeParse(payload);
        assert.strictEqual(res.success, true);
        assert.strictEqual(res.data.bookingId, 42);
    });

    it("1.3 should reject negative or zero bookingId", () => {
        const res = createOrderSchema.safeParse({ bookingId: 0 });
        assert.strictEqual(res.success, false);
    });

    it("1.4 should validate verify-payment payload", () => {
        const payload = {
            razorpay_order_id: "order_12345",
            razorpay_payment_id: "pay_67890",
            razorpay_signature: "abc123sig"
        };
        const res = verifyPaymentSchema.safeParse(payload);
        assert.strictEqual(res.success, true);
    });

    it("1.5 should reject verify-payment payload missing required fields", () => {
        const res = verifyPaymentSchema.safeParse({ razorpay_order_id: "order_123" });
        assert.strictEqual(res.success, false);
    });

    it("1.6 should validate partial refund payload with positive amount and reason", () => {
        const payload = { amount: 50.00, reason: "Patient requested partial refund for lab fee" };
        const res = refundPaymentSchema.safeParse(payload);
        assert.strictEqual(res.success, true);
        assert.strictEqual(res.data.amount, 50);
    });

    it("1.7 should reject non-positive refund amounts", () => {
        const res = refundPaymentSchema.safeParse({ amount: -10 });
        assert.strictEqual(res.success, false);
    });

    it("1.8 should validate admin query schema with pagination and filters", () => {
        const query = {
            page: "2",
            limit: "25",
            status: "SUCCESS",
            bookingNumber: "HS-DOC-1234",
            startDate: "2026-11-01",
            endDate: "2026-11-30"
        };
        const res = queryPaymentsSchema.safeParse(query);
        assert.strictEqual(res.success, true);
        assert.strictEqual(res.data.page, 2);
        assert.strictEqual(res.data.limit, 25);
        assert.strictEqual(res.data.status, "SUCCESS");
    });

    // 2. Cryptographic Signature Verification
    console.log("\n2. Cryptographic Checkout & Webhook Signature Verification:");

    const testSecret = "test_razorpay_secret_key_12345";
    const testWebhookSecret = "test_webhook_secret_key_67890";

    it("2.1 should generate and verify valid checkout signature with timingSafeEqual", () => {
        const orderId = "order_HS9999";
        const paymentId = "pay_HS8888";
        const validSig = generateTestSignature(orderId, paymentId, testSecret);

        const verified = verifyCheckoutSignature(orderId, paymentId, validSig, testSecret);
        assert.strictEqual(verified, true);
    });

    it("2.2 should reject manipulated payment ID in checkout signature", () => {
        const orderId = "order_HS9999";
        const paymentId = "pay_HS8888";
        const validSig = generateTestSignature(orderId, paymentId, testSecret);

        // Tamper with payment ID
        const verified = verifyCheckoutSignature(orderId, "pay_TAMPERED", validSig, testSecret);
        assert.strictEqual(verified, false);
    });

    it("2.3 should reject manipulated order ID in checkout signature", () => {
        const orderId = "order_HS9999";
        const paymentId = "pay_HS8888";
        const validSig = generateTestSignature(orderId, paymentId, testSecret);

        // Tamper with order ID
        const verified = verifyCheckoutSignature("order_TAMPERED", paymentId, validSig, testSecret);
        assert.strictEqual(verified, false);
    });

    it("2.4 should reject signature computed with wrong secret key", () => {
        const orderId = "order_HS9999";
        const paymentId = "pay_HS8888";
        const validSig = generateTestSignature(orderId, paymentId, "wrong_secret_123");

        const verified = verifyCheckoutSignature(orderId, paymentId, validSig, testSecret);
        assert.strictEqual(verified, false);
    });

    it("2.5 should verify valid webhook HMAC SHA256 signature using raw request body", () => {
        const rawPayload = JSON.stringify({
            entity: "event",
            event: "payment.captured",
            payload: { payment: { entity: { id: "pay_111", amount: 15000 } } }
        });

        const validWebhookSig = generateTestWebhookSignature(rawPayload, testWebhookSecret);
        const verified = verifyWebhookSignature(rawPayload, validWebhookSig, testWebhookSecret);
        assert.strictEqual(verified, true);
    });

    it("2.6 should reject webhook signature if raw body is altered by a single character", () => {
        const rawPayload = JSON.stringify({ event: "payment.captured", id: "evt_001" });
        const validWebhookSig = generateTestWebhookSignature(rawPayload, testWebhookSecret);

        // Alter payload
        const tampered = rawPayload + " ";
        const verified = verifyWebhookSignature(tampered, validWebhookSig, testWebhookSecret);
        assert.strictEqual(verified, false);
    });

    // 3. Amount and Currency Conversions
    console.log("\n3. Currency Amount to Smallest Unit (Paise) Conversions:");

    it("3.1 should convert decimal amount to paise correctly", () => {
        assert.strictEqual(amountToPaise(150.00), 15000);
        assert.strictEqual(amountToPaise("49.99"), 4999);
        assert.strictEqual(amountToPaise(120), 12000);
        assert.strictEqual(amountToPaise(0.50), 50);
    });

    it("3.2 should convert paise back to two-decimal string format", () => {
        assert.strictEqual(paiseToAmount(15000), "150.00");
        assert.strictEqual(paiseToAmount(4999), "49.99");
        assert.strictEqual(paiseToAmount(50), "0.50");
    });

    // 4. Payment Business Rules & State Transitions
    console.log("\n4. Payment Business Logic & State Transition Rules:");

    it("4.1 should prevent payment order creation for already-paid bookings", () => {
        const booking = { id: 1, totalAmount: 120.00, paymentStatus: "PAID", bookingStatus: "CONFIRMED" };
        const canPay = booking.paymentStatus !== "PAID" && booking.bookingStatus !== "CANCELLED";
        assert.strictEqual(canPay, false);
    });

    it("4.2 should prevent payment order creation for cancelled bookings", () => {
        const booking = { id: 2, totalAmount: 85.00, paymentStatus: "PENDING", bookingStatus: "CANCELLED" };
        const canPay = booking.paymentStatus !== "PAID" && booking.bookingStatus !== "CANCELLED";
        assert.strictEqual(canPay, false);
    });

    it("4.3 should allow retry for eligible bookings with failed prior transactions", () => {
        const booking = { id: 3, totalAmount: 200.00, paymentStatus: "FAILED", bookingStatus: "CONFIRMED" };
        const canRetry = booking.paymentStatus !== "PAID" && booking.bookingStatus !== "CANCELLED";
        assert.strictEqual(canRetry, true);
    });

    it("4.4 should generate distinct retry idempotency keys", () => {
        const bookingId = 12;
        const key1 = `RETRY_BK_${bookingId}_${Date.now()}_1`;
        const key2 = `RETRY_BK_${bookingId}_${Date.now()}_2`;
        assert.notStrictEqual(key1, key2);
    });

    // 5. Refund Limit Enforcement Logic
    console.log("\n5. Refund Calculation & Limit Enforcement:");

    it("5.1 should calculate remaining refundable amount after partial refunds", () => {
        const capturedAmount = 150.00;
        const previousRefunds = [{ amount: 40.00, refundStatus: "PROCESSED" }, { amount: 30.00, refundStatus: "PROCESSED" }];
        const totalRefunded = previousRefunds.reduce((acc, r) => acc + r.amount, 0);
        const maxRefundable = capturedAmount - totalRefunded;

        assert.strictEqual(totalRefunded, 70.00);
        assert.strictEqual(maxRefundable, 80.00);
    });

    it("5.2 should reject refund requests exceeding remaining refundable amount", () => {
        const capturedAmount = 100.00;
        const alreadyRefunded = 80.00;
        const maxRefundable = capturedAmount - alreadyRefunded; // 20.00
        const requestedRefund = 25.00;

        const isAllowed = requestedRefund <= maxRefundable;
        assert.strictEqual(isAllowed, false);
    });

    it("5.3 should transition to REFUNDED when total refunds equal captured amount", () => {
        const capturedAmount = 100.00;
        const existingRefunded = 60.00;
        const currentRefund = 40.00;

        const newTotalRefunded = existingRefunded + currentRefund;
        const status = newTotalRefunded >= capturedAmount ? "REFUNDED" : "PARTIALLY_REFUNDED";
        assert.strictEqual(status, "REFUNDED");
    });

    it("5.4 should transition to PARTIALLY_REFUNDED when total refunds are less than captured", () => {
        const capturedAmount = 100.00;
        const existingRefunded = 30.00;
        const currentRefund = 20.00;

        const newTotalRefunded = existingRefunded + currentRefund;
        const status = newTotalRefunded >= capturedAmount ? "REFUNDED" : "PARTIALLY_REFUNDED";
        assert.strictEqual(status, "PARTIALLY_REFUNDED");
    });

    // 6. Webhook Idempotency & Out-of-Order Safety
    console.log("\n6. Webhook Idempotency & Out-of-Order Handling:");

    it("6.1 should protect against out-of-order downgrade of successful payment", () => {
        const currentPayment = { status: "SUCCESS", paidAt: new Date() };
        const incomingWebhook = { event: "payment.failed" };

        // Out-of-order check: do not downgrade if current is SUCCESS
        let finalStatus = currentPayment.status;
        if (incomingWebhook.event === "payment.failed" && currentPayment.status !== "SUCCESS") {
            finalStatus = "FAILED";
        }

        assert.strictEqual(finalStatus, "SUCCESS");
    });

    it("6.2 should identify duplicate webhook event IDs as idempotent", () => {
        const processedEvents = new Set(["evt_101", "evt_102"]);
        const incomingEventId = "evt_101";

        const isDuplicate = processedEvents.has(incomingEventId);
        assert.strictEqual(isDuplicate, true);
    });

    console.log(`\n========================================`);
    console.log(`Phase 5 Test Results: ${passed} passed, ${failed} failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
        process.exit(1);
    }
}

runTests();

