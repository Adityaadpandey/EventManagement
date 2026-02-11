// Test script to verify Razorpay webhook signature validation
const crypto = require("crypto");

// Sample webhook payload from Razorpay
const samplePayload = {
  entity: "event",
  account_id: "acc_test",
  event: "payment.captured",
  contains: ["payment"],
  payload: {
    payment: {
      entity: {
        id: "pay_test123",
        entity: "payment",
        amount: 50000,
        currency: "INR",
        status: "captured",
        order_id: "order_test123",
        invoice_id: null,
        international: false,
        method: "card",
        amount_refunded: 0,
        refund_status: null,
        captured: true,
        description: "Test Payment",
        card_id: "card_test",
        bank: null,
        wallet: null,
        vpa: null,
        email: "test@example.com",
        contact: "+919999999999",
        notes: {
          ticketId: "ticket_test123",
        },
        fee: 1180,
        tax: 180,
        error_code: null,
        error_description: null,
        error_source: null,
        error_step: null,
        error_reason: null,
        acquirer_data: {},
        created_at: 1676383200,
      },
    },
  },
  created_at: 1676383200,
};

// Test with your webhook secret (replace with actual secret)
const webhookSecret =
  process.env.RAZORPAY_WEBHOOK_SECRET || "your_webhook_secret_here";

// Convert payload to JSON string (this is what Razorpay sends)
const rawBody = JSON.stringify(samplePayload);

// Generate signature (this is what Razorpay does)
const expectedSignature = crypto
  .createHmac("sha256", webhookSecret)
  .update(rawBody)
  .digest("hex");

console.log("=== Webhook Signature Test ===");
console.log("Webhook Secret:", webhookSecret.substring(0, 10) + "...");
console.log("Raw Body Length:", rawBody.length);
console.log("Expected Signature:", expectedSignature);
console.log("\nTo test with curl:");
console.log(`curl -X POST http://localhost:PORT/api/v1/payment/webhook \\
  -H "Content-Type: application/json" \\
  -H "X-Razorpay-Signature: ${expectedSignature}" \\
  -d '${rawBody}'`);

// Test Buffer conversion
const buffer = Buffer.from(rawBody, "utf8");
const reconstructed = buffer.toString("utf8");
console.log("\n=== Buffer Round-trip Test ===");
console.log("Original === Reconstructed:", rawBody === reconstructed);
console.log("Match:", rawBody === reconstructed ? "✓ PASS" : "✗ FAIL");
