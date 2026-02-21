# Event Info Update Feature — Design Doc

**Date**: 2026-02-20
**Status**: Approved

---

## Overview

Add a "Send Update" button to each event card on the lister events page (`/lister/events`). Clicking it opens a modal where the lister can compose a message that gets emailed and push-notified to all ticket holders via the existing `POST /event/info-update/:eventId` endpoint.

Simultaneously fix three backend bugs in the same endpoint's service method.

---

## Endpoint

`POST /api/v1/event/info-update/:eventId`

**Request body:**
```json
{ "update": "string (required)", "imageUrl": "string (optional)" }
```

**Auth:** LISTER or ADMIN role required.

**Current bugs (to be fixed):**
1. `availableMailUpdates` (default 2 per event) is never checked or decremented.
2. `userId` in push notification queue loop can be `undefined` (`.find()` by email can miss).
3. `imageUrl` is injected into the email template without URL validation.

---

## Frontend Changes

### File: `apps/web/src/app/lister/events/page.tsx`

- Add "Send Update" button to each event card action row (alongside Copy Link, Analytics, Edit, Attendees).
- Button shows a mail icon and a small badge with `availableMailUpdates` count.
  - Yellow badge if count > 0.
  - Muted/gray badge if count === 0.
- Button appears on all events regardless of status.
- Clicking sets `selectedEvent` state and opens the modal.
- `availableMailUpdates` must be present in the event objects returned by `/event/lister`.

### File: `apps/web/src/components/EventUpdateModal.tsx` (new)

Modal fields:
- Event name (read-only, shown at top for context).
- "Updates remaining: X" badge — yellow if > 0, gray if 0.
- Textarea: "Message to attendees" (required, character count hint).
- Image URL input (optional).
- If remaining === 0: textarea + submit button disabled; note: "No updates remaining for this event".
- Footer: Cancel (neutral) | Send Update (primary yellow).
- Loading state while awaiting API response.
- Success toast on completion; error toast on failure.
- On success: decrement the `availableMailUpdates` count in local state.

---

## Backend Changes

### File: `servers/user-server/src/services/event.service.ts` — `updateInfo()` method

**Fix 1 — Enforce update limit:**
```typescript
if (event.availableMailUpdates <= 0) {
  throw new BadRequestError("No more email updates available for this event");
}
// After all emails sent:
await prisma.event.update({
  where: { eventId },
  data: { availableMailUpdates: { decrement: 1 } },
});
```

**Fix 2 — Reliable userId in notification queue:**
Replace `.find()` by email with a direct loop over tickets using a `Set` for deduplication:
```typescript
const notifiedUserIds = new Set<string>();
for (const ticket of event.Ticket) {
  const uid = ticket.user?.userId;
  if (uid && !notifiedUserIds.has(uid)) {
    await notificationQueue.add("send-notification", { userId: uid, ... });
    notifiedUserIds.add(uid);
  }
}
```

**Fix 3 — Validate imageUrl:**
```typescript
if (imageUrl) {
  try { new URL(imageUrl); } catch { imageUrl = undefined; }
}
```

### Expose `availableMailUpdates` in lister events API

Verify that the `/event/lister` service/controller includes `availableMailUpdates` in the returned event shape. Add it if missing.

---

## Non-goals

- No new colors or design tokens beyond what exists in `globals.css`.
- No changes to the email template (`event-update.ejs`) — it already matches the theme.
- No unsubscribe link (separate concern).
- No email bounce handling (separate concern).
