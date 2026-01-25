#!/usr/bin/env node

/**
 * Generate VAPID keys for web push notifications
 * Run: node scripts/generate-vapid-keys.js
 */

const webpush = require("web-push");

console.log("\n🔑 Generating VAPID Keys for Push Notifications...\n");

const vapidKeys = webpush.generateVAPIDKeys();

console.log("✅ VAPID Keys Generated Successfully!\n");
console.log("Add these to your .env file:\n");
console.log("─".repeat(80));
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log("─".repeat(80));
console.log(
  "\n⚠️  Keep the private key secret! Never commit it to version control.\n",
);
console.log("📝 Also add the public key to your frontend environment:\n");
console.log(`NEXT_PUBLIC_VAPID_KEY=${vapidKeys.publicKey}\n`);
