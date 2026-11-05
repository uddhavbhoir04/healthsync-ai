const assert = require("assert");
const { verifyCheckoutSignature } = require("../utils/razorpay");
const { payOnCollectionSchema } = require("../modules/payments/payments.validation");

console.log("=== Testing Simulated Payment & Pay On Collection ===");

// 1. Validation for payOnCollectionSchema
const validPoc = payOnCollectionSchema.safeParse({ bookingId: 12, paymentMethod: "PAY_ON_COLLECTION" });
assert.strictEqual(validPoc.success, true, "Valid pay on collection payload should pass");
assert.strictEqual(validPoc.data.paymentMethod, "PAY_ON_COLLECTION");

const numericStringPoc = payOnCollectionSchema.safeParse({ bookingId: "42" });
assert.strictEqual(numericStringPoc.success, true, "Numeric string bookingId should coerce to number");
assert.strictEqual(numericStringPoc.data.bookingId, 42);

const invalidPoc = payOnCollectionSchema.safeParse({ bookingId: -5 });
assert.strictEqual(invalidPoc.success, false, "Negative booking ID should fail validation");

console.log("✓ Pay on collection schema validations passed");

// 2. Simulated Razorpay Checkout Signature Verification
const simOrderId = "order_1234567890";
const simPaymentId = `pay_sim_${Date.now()}`;
const simSignature = "simulated_razorpay_signature";

const isSimValid = verifyCheckoutSignature(simOrderId, simPaymentId, simSignature);
assert.strictEqual(isSimValid, true, "Simulated signature with pay_sim_ prefix must verify as true");

const invalidSig = verifyCheckoutSignature(simOrderId, simPaymentId, "invalid_sig_hacker");
assert.strictEqual(invalidSig, false, "Invalid signature should fail");

console.log("✓ Simulated Razorpay payment verification rules passed");
console.log("=== All Simulated Payment Tests Passed Successfully! ===");

