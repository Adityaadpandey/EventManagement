# Promotions Service API

The Promotions Service allows event listers to send promotional emails to previous ticket buyers.

## Features

- Send promotional emails to all previous buyers from a lister's events
- Target specific event's buyers
- Track available promotional email credits per event (default: 2)
- Automatic email queueing with retry logic
- Deduplication of recipients (users only receive one email even if they bought multiple tickets)

## API Endpoints

### 1. Send Promotional Email

**Endpoint:** `POST /api/v1/event/:eventId/promote`

**Auth:** Required (LISTER or ADMIN role)

**Description:** Send promotional emails to previous ticket buyers about a new event.

**Request Body:**
```json
{
  "content": "Don't miss our biggest event yet! Early bird tickets available.",
  "toEventId": "optional-specific-event-id",
  "emailTemplate": "promotion.ejs"
}
```

**Parameters:**
- `content` (optional): Custom message to include in the email
- `toEventId` (optional): Target only buyers from a specific event. If not provided, targets all previous buyers from the lister's events
- `emailTemplate` (optional): Email template filename (defaults to "promotion.ejs")

**Response:**
```json
{
  "success": true,
  "message": "Promotional emails queued successfully",
  "emailsSent": 150,
  "remainingMailUpdates": 1
}
```

**Example cURL:**
```bash
curl -X POST https://api.tixin.in/api/v1/event/event-123/promote \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Special discount for our loyal attendees!"
  }'
```

---

### 2. Get Promotion Reach

**Endpoint:** `GET /api/v1/event/:eventId/promotion-reach`

**Auth:** Required (LISTER or ADMIN role)

**Description:** Get the count of potential recipients before sending promotional emails.

**Query Parameters:**
- `toEventId` (optional): Check reach for a specific event's buyers

**Response:**
```json
{
  "success": true,
  "potentialRecipients": 150
}
```

**Example cURL:**
```bash
curl -X GET "https://api.tixin.in/api/v1/event/event-123/promotion-reach?toEventId=event-456" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Email Template

The default email template (`promotion.ejs`) includes:
- Event banner image
- Event title, date, time, and location
- Custom promotional message
- Call-to-action button linking to the event page
- Professional Tixin branding

You can customize the template by modifying `servers/user-server/src/templates/promotion.ejs`.

---

## Database Schema

The service uses the `availableMailUpdates` field on the Event model:
- Default value: 2 promotional emails per event
- Decrements by 1 each time promotional emails are sent
- Prevents spam by limiting promotional sends

---

## How It Works

1. **Verification**: Checks if the user is authorized and has remaining promotional email credits
2. **Target Selection**: Finds all unique users who bought tickets from:
   - A specific event (if `toEventId` provided)
   - All previous approved events by the lister (if no `toEventId`)
3. **Deduplication**: Ensures each user receives only one email
4. **Email Queueing**: Adds emails to BullMQ queue with retry logic
5. **Credit Decrement**: Reduces available promotional emails by 1

---

## Error Handling

- Returns 401 if user is not authenticated
- Returns 403 if user is not the event lister
- Returns 400 if no promotional emails remaining
- Returns 404 if event not found
- Emails are retried 3 times with exponential backoff on failure

---

## Usage Example (Frontend)

```typescript
// Check how many people will receive the email
const reachResponse = await fetch(
  `/api/v1/event/${eventId}/promotion-reach`,
  {
    headers: { Authorization: `Bearer ${token}` }
  }
);
const { potentialRecipients } = await reachResponse.json();

// Send promotional email
const response = await fetch(
  `/api/v1/event/${eventId}/promote`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content: 'Join us for an unforgettable experience!'
    })
  }
);

const result = await response.json();
console.log(`Sent to ${result.emailsSent} people`);
```
