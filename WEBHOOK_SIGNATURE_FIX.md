# Razorpay Webhook Signature Validation Fix

## Problem

Razorpay webhooks were failing with "Invalid webhook signature" error (Status 400).

## Root Cause

**Middleware Ordering Issue:**

1. Global `express.json()` middleware (app.ts:100-106) parses ALL `application/json` requests
2. This parsing happens BEFORE route-specific middleware
3. The webhook route's `express.raw()` middleware runs too late - body is already parsed
4. Signature verification fails because:
   - Razorpay signs the **raw JSON bytes**
   - `JSON.stringify()` cannot reconstruct the exact original string (whitespace, property order differ)
   - Generated signature doesn't match Razorpay's signature

## Solution

**Modified:** `servers/user-server/src/app.ts` (lines 99-110)

```typescript
// Before: Global JSON parsing for all routes
app.use(express.json({ ... }));

// After: Conditional JSON parsing, skip webhook routes
app.use((req, res, next) => {
  if (req.path === "/api/v1/payment/webhook") {
    return next();
  }
  express.json({
    limit: "5mb",
    strict: true,
    type: "application/json",
  })(req, res, next);
});
```

**Modified:** `servers/user-server/src/controllers/webhook.controller.ts` (lines 15-40)

- Added diagnostic logging to track body type (Buffer vs Object)
- Enhanced error logging with signature comparison details

## How It Works Now

1. Request arrives at `/api/v1/payment/webhook`
2. Global middleware checks path and **skips JSON parsing**
3. Route-specific `express.raw()` captures body as Buffer
4. Webhook controller:
   - Converts Buffer to string
   - Generates signature from raw string
   - Compares with Razorpay's signature
   - ✓ Signatures match!
   - Parses body for processing

## Testing

### 1. Build the Changes

```bash
cd servers/user-server
npm run build
```

### 2. Test Signature Generation Locally

```bash
# Set your webhook secret
export RAZORPAY_WEBHOOK_SECRET="your_secret_here"

# Run test script
node test-webhook-signature.js
```

### 3. Test with Razorpay Webhook

After deployment:
1. Go to Razorpay Dashboard → Settings → Webhooks
2. Click "Test Webhook" or trigger a real payment
3. Check logs - should see:
   - `isBuffer: true` (confirms raw body captured)
   - `Webhook processed successfully` (Status 200)

## Deployment Checklist

- [x] Build TypeScript: `npm run build`
- [ ] Deploy to staging/production
- [ ] Monitor logs for next webhook
- [ ] Verify `isBuffer: true` in logs
- [ ] Verify Status 200 response
- [ ] Test with Razorpay test payment

## Files Changed

1. `servers/user-server/src/app.ts` - Skip JSON parsing for webhooks
2. `servers/user-server/src/controllers/webhook.controller.ts` - Enhanced logging
3. `servers/user-server/test-webhook-signature.js` - Test utility (new)

## Related Commits

- `257f4a6` - Previous webhook fix attempt (didn't work due to middleware ordering)
- Current fix - Properly excludes webhook from global JSON parsing

## Verification Logs

After fix, expect to see:
```
[INFO] Webhook body type check
  isBuffer: true
  bodyType: object
  bodyLength: 1234
[INFO] Successfully processed payment via webhook
```

Before fix (error):
```
[ERROR] Invalid webhook signature
  expectedSignature: abc123...
  receivedSignature: xyz789...
```
