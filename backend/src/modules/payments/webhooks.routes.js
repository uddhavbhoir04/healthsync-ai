const express = require("express");
const controller = require("./payments.controller");

const router = express.Router();

// Razorpay webhook endpoint (No JWT authentication; verified by HMAC SHA256 header)
router.post("/razorpay", controller.handleRazorpayWebhook);

module.exports = router;

