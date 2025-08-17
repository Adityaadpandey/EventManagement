# To setup just run

```bash
make setup
```

and then run the the app u want

# Complete REST API endpoints (v1) — tidy, lyrical, and exhaustive

sweet — below is a full, production-ready list of endpoints for your event/ticket platform. each endpoint includes HTTP method, path, who can call it, key request/response shapes, and important notes (auth, rate-limits, idempotency, transactions). use `/api/v1/...` as the base. treat this as a contract you can hand to frontend / mobile / backend devs.

---

## Auth & Account

**Auth:** JWT access tokens. `Authorization: Bearer <token>`. Use refresh tokens where needed.

### `POST /api/v1/auth/register`

- **Who:** public
- **Body (JSON):**

```json
{ "phone": "", "email": "?", "password": "", "name": "?" }
```

- **Resp:** `201 Created` `{ "userId": "...", "accessToken": "...", "refreshToken": "..." }`
- **Notes:** If phone exists, returns `409`. If OAuth later, password nullable.

### `POST /api/v1/auth/login`

- **Who:** public
- **Body:**

```json
{ "phoneOrEmail": "", "password": "" }
```

- **Resp:** `200` `{ "accessToken":"", "refreshToken":"", "user": { ... } }`

### `POST /api/v1/auth/oauth/callback`

- **Who:** public
- **Body:** provider token info (Google, Apple)
- **Resp:** `200` issues JWTs; creates account if not exists.

### `POST /api/v1/auth/refresh`

- **Who:** public (refresh token)
- **Body:** `{ "refreshToken": "..." }`
- **Resp:** `200` new tokens.

### `POST /api/v1/auth/logout`

- **Who:** authenticated
- **Body:** `{ "refreshToken": "..." }`
- **Resp:** `204 No Content` (revoke refresh)

---

## OTP (phone verification / login)

### `POST /api/v1/otp/send`

- **Who:** public
- **Body:** `{ "phone": "...", "purpose":"PHONE_VERIFICATION" }`
- **Resp:** `200` `{ "otpId": "...", "expiresAt": "...", "resendAllowedAt": "..." }`
- **Notes:** enforce `resendCount` & rate-limit; store idempotency/resend windows.

### `POST /api/v1/otp/verify`

- **Who:** public
- **Body:** `{ "otpId":"", "code":"" }`
- **Resp:** `200` on success (mark phoneVerified true, issue JWT if login flow).

---

## Users

### `GET /api/v1/users/me`

- **Who:** authenticated
- **Resp:** `200` user profile

### `PATCH /api/v1/users/me`

- **Who:** authenticated
- **Body:** partial user fields `name`, `avatar`, `email`
- **Resp:** `200` updated user

### `GET /api/v1/users/:userId`

- **Who:** ADMIN / SUPER_ADMIN or owner
- **Resp:** `200` user

### `DELETE /api/v1/users/:userId`

- **Who:** SUPER_ADMIN or owner (soft delete)
- **Resp:** `204`

---

## Lister (hosts)

### `POST /api/v1/listers/apply`

- **Who:** authenticated (role USER -> becomes LISTER after approval)
- **Body:** `{ "companyName","companyLogo","bio" }`
- **Resp:** `201` `{ "listerId": "..." }`

### `GET /api/v1/listers/me`

- **Who:** authenticated LISTER
- **Resp:** lister profile

### `GET /api/v1/listers/:listerId`

- **Who:** public (basic info) / admins see full
- **Resp:** `200`

### `PATCH /api/v1/listers/:listerId`

- **Who:** owner (lister) or ADMIN
- **Body:** updatable fields
- **Resp:** `200`

---

## Events

### `POST /api/v1/events`

- **Who:** authenticated LISTER
- **Body:** (multipart or JSON + presigned images)

```json
{
  "title": "...",
  "description": "...",
  "date": "2025-09-01",
  "time": "2025-09-01T18:00:00Z",
  "location": "...",
  "capacity": 200,
  "banner_horizontal": "s3://...",
  "banner_vertical": "...",
  "banner_square": "...",
  "customFields": [
    { "label": "College ID", "fieldType": "text", "required": true }
  ]
}
```

- **Resp:** `201` created event with `status: NOT_VIEWED`
- **Notes:** default admin workflow: NOT_VIEWED → PENDING → APPROVED/REJECTED

### `GET /api/v1/events` (browse)

- **Who:** public
- **Query params:** `?q=&date_from=&date_to=&location=&status=APPROVED&page=&limit=&sort=...`
- **Resp:** paginated list (pagination: `page`, `limit` OR cursor support)

### `GET /api/v1/events/:eventId`

- **Who:** public (if APPROVED) else owner/admin
- **Resp:** full event object (includes `TicketType` summary, `CustomField` definitions)

### `PATCH /api/v1/events/:eventId`

- **Who:** lister owner (if approved — some fields allowed), ADMIN can edit any
- **Body:** partial update
- **Resp:** `200`

### `DELETE /api/v1/events/:eventId`

- **Who:** lister owner (request cancellation) / ADMIN to force-delete
- **Behavior:** if live → create cancellation request (status→CANCELLATION_REQUESTED) and notify admin. admin confirms to CANCELLED.

### `POST /api/v1/events/:eventId/submit-for-approval`

- **Who:** lister
- **Resp:** `200` (status -> NOT_VIEWED or PENDING depending on workflow)

### `GET /api/v1/events/:eventId/attendees`

- **Who:** lister (owner) / ADMIN
- **Query:** `?ticketTypeId=&checkedIn=`
- **Resp:** paginated attendee list (for export)

### `GET /api/v1/events/:eventId/export-attendees`

- **Who:** lister / ADMIN
- **Resp:** CSV download. `Content-Type: text/csv` / pre-signed export if big.

---

## Custom Fields (Lister-defined)

### `POST /api/v1/events/:eventId/custom-fields`

- **Who:** lister owner
- **Body:** `{ label, fieldType, required, options? }`
- **Resp:** `201`

### `GET /api/v1/events/:eventId/custom-fields`

- **Who:** public (to show on booking form)
- **Resp:** list

### `DELETE /api/v1/events/:eventId/custom-fields/:fieldId`

- **Who:** lister (owner)
- **Resp:** `204` (note: delete only allowed if no responses OR archive and keep responses for existing tickets)

---

## TicketTypes (tiers)

### `POST /api/v1/events/:eventId/ticket-types`

- **Who:** lister owner
- **Body:** `{ name, description, price, quantity, salesCutoff? }`
- **Resp:** `201`

### `PATCH /api/v1/events/:eventId/ticket-types/:ticketTypeId`

- **Who:** lister / admin
- **Resp:** `200`
- **Notes:** allow price/qty updates; enforce constraints (can't reduce below soldCount).

### `DELETE /api/v1/events/:eventId/ticket-types/:ticketTypeId`

- **Who:** lister / admin
- **Resp:** `204` (if no active tickets sold, else archive)

---

## Ticket Purchase & Orders

**Important:** purchases must be atomic transactions. use DB transactions and `Idempotency-Key` header to prevent double-charges.

### `POST /api/v1/events/:eventId/purchase`

- **Who:** authenticated user (or guest phone/email flow auto-creates user)
- **Headers:** `Idempotency-Key: <uuid>`
- **Body:**

```json
{
  "ticketTypeId":"...", "quantity":2,
  "paymentMethod":"payment_gateway_x",
  "attendeeFields":[ { "fieldId":"...", "value":"..." } ],
  "buyer": { "name","phone","email" } // optional if not logged in
}
```

- **Resp (success):** `201` `{ "orderId":"...", "tickets":[ { "ticketId","qrCode" } ], "payment": { "status":"PAID" } }`
- **Resp (insufficient inventory):** `409` `{ "error":"NOT_ENOUGH_TICKETS" }`
- **Notes:** Use transactional decrement of `TicketType.quantity` and increment `soldCount`, `Event.ticketsSold`, `Event.revenue`. Return `qrCode` (unique, signed).

### `POST /api/v1/payments/webhook`

- **Who:** payment gateway
- **Body:** gateway event (verify signature)
- **Resp:** `200`
- **Notes:** update order/ticket status; handle chargebacks/refunds.

### `GET /api/v1/users/me/tickets`

- **Who:** authenticated user
- **Query:** `?past=true&page=&limit=`
- **Resp:** paginated tickets

### `GET /api/v1/tickets/:ticketId`

- **Who:** owner or lister or admin or checker (if assigned event)
- **Resp:** ticket details including `qrCode`, purchase info, attendee fields.

---

## QR / Ticket validation (Checker endpoints)

### `POST /api/v1/checkers/login`

- **Who:** TicketChecker (credentials created by lister)
- **Body:** `{ "username":"", "password":"" }`
- **Resp:** `200` `{ "token":"...", "checkerId":"..." }`
- **Notes:** token scope limited: only `scan` and `ticket:list` for assigned event(s).

### `POST /api/v1/checkers/:checkerId/deprecate`

- **Who:** lister owner or admin
- **Body:** `{ "reason":"", "deprecatedBy":"userId" }`
- **Resp:** `200` sets `deprecated=true`, `revokedAt`.

### `POST /api/v1/tickets/scan`

- **Who:** authenticated checker token (or admin/lister)
- **Body:**

```json
{ "qrCode": "<scanned_code>", "deviceInfo": "...", "ip": "..." }
```

- **Resp (success):** `200` `{ "success": true, "ticketId":"...", "checkedIn":true, "message":"Checked-in" }`
- **Resp (already used):** `409` `{ "success": false, "reason":"ALREADY_CHECKED_IN", "lastScannedAt":"..." }`
- **Resp (invalid):** `404` `{ "success": false, "reason":"NOT_FOUND" }`
- **Notes:** create `TicketScanLog`, mark `Ticket.checkedIn` atomically; support `override` param for authorized checkers (audit stored).

### `POST /api/v1/tickets/:ticketId/reset-checkin`

- **Who:** lister owner or admin
- **Body:** `{ "reason":"", "performedBy":"..." }`
- **Resp:** `200` (creates log with action `RESET`)

---

## TicketChecker Management (by Lister)

### `POST /api/v1/listers/:listerId/checkers`

- **Who:** lister owner
- **Body:** `{ "username","password","eventId?" ,"expiresAt?" }`
- **Resp:** `201` `{ "checkerId":"..." }`

### `GET /api/v1/listers/:listerId/checkers`

- **Who:** lister owner / admin
- **Resp:** list

### `PATCH /api/v1/listers/:listerId/checkers/:checkerId`

- **Who:** lister owner / admin
- **Body:** enable/disable/expire/deprecate
- **Resp:** `200`

---

## Ticket Scan Logs & Auditing

### `GET /api/v1/events/:eventId/scan-logs`

- **Who:** lister owner / admin
- **Query:** `?from=&to=&success=&checkerId=&limit=&page=`
- **Resp:** paginated logs

---

## Refunds

### `POST /api/v1/tickets/:ticketId/refund`

- **Who:** user (request) or lister/admin (initiate)
- **Body:** `{ "reason":"", "amount": <number> }`
- **Resp:** `201` refund record `PENDING`

### `GET /api/v1/refunds/:refundId`

- **Who:** user/admin
- **Resp:** refund status

### `POST /api/v1/refunds/:refundId/process`

- **Who:** admin
- **Body:** `{ "action":"APPROVE"|"REJECT", "processedBy":"adminUserId" }`
- **Resp:** `200` (calls payment gateway refund API, updates `Refund.status` to COMPLETED/REJECTED)

---

## Analytics & Metrics

### `GET /api/v1/events/:eventId/analytics`

- **Who:** lister owner / admin
- **Resp:** aggregated metrics `{ views, clicks, ticketsSold, revenue, conversionRate, daily:[{date,views,ticketsSold,revenue}] }`

### `GET /api/v1/listers/:listerId/analytics`

- **Who:** lister owner / admin / super admin
- **Resp:** totals `{ totalEvents, totalRevenue, totalTicketsSold }`

### `POST /api/v1/events/:eventId/track-view`

- **Who:** public (client-side)
- **Body:** `{ "page":"details" }`
- **Resp:** `204` (increment viewsCount safely using background job or batched writes)

**Note:** use event-level increments in DB but prefer batched counters or analytics service if heavy traffic.

---

## Admin & Moderation

### `GET /api/v1/admin/events?status=NOT_VIEWED`

- **Who:** ADMIN / SUPER_ADMIN
- **Resp:** list to review

### `POST /api/v1/admin/events/:eventId/approve`

- **Who:** ADMIN
- **Body:** `{ "adminId":"", "notes":"" }`
- **Resp:** `200` (status -> APPROVED)

### `POST /api/v1/admin/events/:eventId/reject`

- **Who:** ADMIN
- **Body:** `{ "rejection_comment": "..." }`
- **Resp:** `200` (status -> REJECTED, notify lister)

### `POST /api/v1/admin/events/:eventId/force-cancel`

- **Who:** ADMIN
- **Body:** `{ "reason":"", "refundPolicy":"..." }`
- **Resp:** `200` (status -> CANCELLED, trigger refunds/notifications)

### `GET /api/v1/admin/users`

- **Who:** ADMIN / SUPER_ADMIN
- **Resp:** user list, filters

### `POST /api/v1/admin/assign-role`

- **Who:** SUPER_ADMIN
- **Body:** `{ "userId", "role" }`
- **Resp:** `200`

---

## Super Admin

All CRUD endpoints plus:

- `DELETE /api/v1/admin/events/:eventId` (hard delete)
- `POST /api/v1/super/override-event/:eventId` (force publish/unpublish)
- global analytics endpoints

---

## Files / Uploads (banners, posters)

### `POST /api/v1/uploads/presign`

- **Who:** authenticated LISTER or ADMIN
- **Body:** `{ "fileName":"", "contentType": "image/jpeg", "purpose":"banner_horizontal" }`
- **Resp:** `200` `{ "uploadUrl":"", "fileUrl":"s3://..." }`

### `POST /api/v1/uploads/complete`

- **Who:** authenticated
- **Body:** `{ "fileUrl":"", "metadata":{...} }`
- **Resp:** store link in event or ticketType

---

## Utilities

### `GET /api/v1/events/:eventId/ticket-types/availability`

- **Who:** public
- **Resp:** availability for each tier (soldCount, remaining)

### `GET /api/v1/events/:eventId/qrcode/:ticketId/preview`

- **Who:** owner/admin/checker
- **Resp:** image or svg of QR (or signed URL)

---

## Security / Operational Notes (must-read)

- **Auth:** Use JWT + refresh tokens; Checker tokens limited-scope & short TTL. Store hashed passwords for checkers.
- **Idempotency:** require `Idempotency-Key` for purchase endpoints to prevent double charge.
- **Transactions:** Ticket purchase must decrement inventory, create ticket rows, update counters, and confirm payment inside a DB transaction. Use pessimistic or optimistic locking.
- **Rate-limit/Throttle:** OTP endpoints, purchase endpoints, track-view endpoints.
- **Audit:** record all `TicketScanLog` and admin actions (who, what, when).
- **Expiry & deprecation:** `TicketChecker.expiresAt` + `deprecated` flag + `revokedAt` endpoints to disable old creds.
- **CSV Export:** generate async if large; provide pre-signed link once ready.
- **Analytics:** keep fast counters on `Event` row for UI; store snapshots/daily aggregates in `EventAnalytics` for reporting.

---

## Example flows (quick)

**Buy flow**

1. Client requests ticket availability.
2. Client posts `POST /purchase` with `Idempotency-Key`.
3. Server starts transaction, verifies quantity, creates tickets, reserves inventory.
4. Server creates payment intent and returns payment URL.
5. On payment webhook, server confirms payment, marks tickets PAID, issues QR codes, updates counters, emails tickets.

**Scan flow**

1. Checker logs in `POST /checkers/login` → token.
2. Scanner posts `POST /tickets/scan` with `qrCode`.
3. Server validates ticket, atomic check-in, writes `TicketScanLog`, returns result.

---

if you want, i can:

- generate a **Postman collection** or **OpenAPI (Swagger) YAML** for these routes, ready for devs to import, or
- produce **example request/response JSONs** and Prisma queries for the critical flows (purchase, scan, checker lifecycle).

what should i spin up next — swagger file or Postman? I'll make it ✨ real ✨ (no waiting, no guessing).
