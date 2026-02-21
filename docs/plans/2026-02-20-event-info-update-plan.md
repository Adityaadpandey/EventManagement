# Event Info Update Feature — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Send Update" modal to the lister events page that lets listers email/notify all ticket holders, while fixing three bugs in the backend endpoint.

**Architecture:** Two independent work streams — backend service fixes and a new frontend modal component wired into the existing events page. The backend changes are in `event.service.ts` (the `updateInfo` method). The frontend adds a `EventUpdateModal` component and wires it into `lister/events/page.tsx`.

**Tech Stack:** Next.js 15 (React 19, TypeScript, Tailwind CSS v4), Express.js backend, Prisma ORM, Bull Queue for email/notifications.

---

## Task 1: Fix `updateInfo` service — imageUrl validation + userId threading

**Files:**
- Modify: `servers/user-server/src/services/event.service.ts:574-676`
- Modify: `servers/user-server/src/controllers/event.controller.ts:274-306`

**Context:**
The `updateInfo` method signature is `updateInfo(eventId, update, imageUrl?)`. We need to thread `userId` through from the controller so we can invalidate the lister events cache after decrementing `availableMailUpdates`.

**Step 1: Update the service method signature**

In `event.service.ts`, change the method signature at line 574:

```typescript
// BEFORE:
async updateInfo(eventId: string, update: string, imageUrl?: string) {

// AFTER:
async updateInfo(eventId: string, update: string, userId: string, imageUrl?: string) {
```

**Step 2: Add imageUrl validation after the try { block opens (after line 575)**

Add immediately after `try {`:

```typescript
// Validate imageUrl if provided
if (imageUrl) {
  try {
    new URL(imageUrl);
  } catch {
    logger.warn("Invalid imageUrl provided — ignoring");
    imageUrl = undefined;
  }
}
```

**Step 3: Add availableMailUpdates check after event is fetched (after `if (!event)` block, around line 592)**

Add after the `if (!event) { throw ... }` block:

```typescript
if (event.availableMailUpdates <= 0) {
  throw new BadRequestError(
    "No more email updates available for this event",
  );
}
```

**Step 4: Fix the uniqueUsersMap to include userId**

Replace lines 605–616 (the map construction):

```typescript
// BEFORE:
const uniqueUsersMap = new Map<string, { email: string; name: string }>();
ticketedUsers.forEach((u) => {
  if (!uniqueUsersMap.has(u.userId) && u.email) {
    uniqueUsersMap.set(u.userId, {
      email: u.email,
      name: u.name || "Unknown",
    });
  }
});
const uniqueUsers = Array.from(uniqueUsersMap.values());

// AFTER:
const uniqueUsersMap = new Map<
  string,
  { email: string; name: string; userId: string }
>();
ticketedUsers.forEach((u) => {
  if (!uniqueUsersMap.has(u.userId) && u.email) {
    uniqueUsersMap.set(u.userId, {
      email: u.email,
      name: u.name || "Unknown",
      userId: u.userId,
    });
  }
});
const uniqueUsers = Array.from(uniqueUsersMap.values());
```

**Step 5: Fix the notification queue loop (lines 654–666)**

Replace the notification loop to use `user.userId` directly instead of `.find()`:

```typescript
// BEFORE:
for (const user of uniqueUsers) {
  await notificationQueue.add("send-notification", {
    userId: ticketedUsers.find((u) => u.email === user.email)?.userId,
    type: "EVENT_UPDATE",
    title: `Update: ${eventTitle}`,
    body: update,
    link: `/events/${eventId}`,
    metadata: {
      eventId,
      imageUrl: imageUrl || undefined,
    },
  });
}

// AFTER:
for (const user of uniqueUsers) {
  await notificationQueue.add("send-notification", {
    userId: user.userId,
    type: "EVENT_UPDATE",
    title: `Update: ${eventTitle}`,
    body: update,
    link: `/events/${eventId}`,
    metadata: {
      eventId,
      imageUrl: imageUrl || undefined,
    },
  });
}
```

**Step 6: Add availableMailUpdates decrement + cache invalidation after the email loop**

Add after the notification loop (after line 666, before the `return` statement):

```typescript
// Decrement available updates and invalidate cache
await prisma.event.update({
  where: { eventId },
  data: { availableMailUpdates: { decrement: 1 } },
});
await invalidateEventCaches(eventId, userId);
```

Make sure `invalidateEventCaches` is imported — check the top of the file; it should already be there from `../lib/cache`.

**Step 7: Update the return to include remaining count**

```typescript
// BEFORE:
return {
  message: `Update sent to ${uniqueUsers.length} ticket holders for event "${eventTitle}"`,
  emailsSent: uniqueUsers.length,
};

// AFTER:
return {
  message: `Update sent to ${uniqueUsers.length} ticket holders for event "${eventTitle}"`,
  emailsSent: uniqueUsers.length,
  updatesRemaining: event.availableMailUpdates - 1,
};
```

**Step 8: Update the controller call to pass userId**

In `event.controller.ts`, line 286, update the service call:

```typescript
// BEFORE:
const result = await this.eventService.updateInfo(
  eventId,
  update,
  imageUrl,
);

// AFTER:
const result = await this.eventService.updateInfo(
  eventId,
  update,
  userId,
  imageUrl,
);
```

**Step 9: Commit**

```bash
git add servers/user-server/src/services/event.service.ts \
        servers/user-server/src/controllers/event.controller.ts
git commit -m "fix: enforce availableMailUpdates limit, fix userId in notifications, validate imageUrl"
```

---

## Task 2: Add `availableMailUpdates` to frontend type

**Files:**
- Modify: `apps/web/src/app/lister/events/page.tsx:8-22`

**Context:**
The API already returns `availableMailUpdates` (it's a Prisma field on Event), but the `ListerEvent` TypeScript type doesn't include it.

**Step 1: Update the ListerEvent type**

```typescript
// BEFORE (lines 8-22):
type ListerEvent = {
  eventId: string;
  title: string;
  status:
    | "NOT_VIEWED"
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "CANCELLATION_REQUESTED"
    | "CANCELLED";
  date: string | null;
  banner_square: string | null;
  banner_horizontal: string | null;
  location: string | null;
};

// AFTER:
type ListerEvent = {
  eventId: string;
  title: string;
  status:
    | "NOT_VIEWED"
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "CANCELLATION_REQUESTED"
    | "CANCELLED";
  date: string | null;
  banner_square: string | null;
  banner_horizontal: string | null;
  location: string | null;
  availableMailUpdates: number;
};
```

**Step 2: Commit**

```bash
git add apps/web/src/app/lister/events/page.tsx
git commit -m "feat: add availableMailUpdates to ListerEvent type"
```

---

## Task 3: Create `EventUpdateModal` component

**Files:**
- Create: `apps/web/src/components/EventUpdateModal.tsx`

**Context:**
Modal opens when lister clicks "Send Update" on an event card. Fields: message (required textarea) + imageUrl (optional). Shows remaining count. Disabled if count is 0. Calls `POST /api/v1/event/info-update/:eventId`. On success, calls `onSuccess(eventId)` so parent can decrement the local count.

**Step 1: Create the file**

```tsx
"use client";

import { useState } from "react";
import { Mail, X } from "lucide-react";
import api from "@/lib/api";

type Props = {
  eventId: string;
  eventTitle: string;
  availableMailUpdates: number;
  onClose: () => void;
  onSuccess: (eventId: string) => void;
};

export default function EventUpdateModal({
  eventId,
  eventTitle,
  availableMailUpdates,
  onClose,
  onSuccess,
}: Props) {
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exhausted = availableMailUpdates <= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (exhausted || !message.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await api.post(`/event/info-update/${eventId}`, {
        update: message.trim(),
        ...(imageUrl.trim() ? { imageUrl: imageUrl.trim() } : {}),
      });
      onSuccess(eventId);
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Failed to send update. Try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal */}
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Send Update to Attendees
            </h2>
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
              {eventTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Updates remaining badge */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Updates remaining:</span>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              exhausted
                ? "bg-gray-100 text-gray-500"
                : "bg-[#FFE348] text-gray-900"
            }`}
          >
            {availableMailUpdates}
          </span>
        </div>

        {exhausted ? (
          <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-4 py-3">
            You&apos;ve used all available updates for this event.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Message textarea */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="update-message"
                className="text-sm font-medium text-gray-700"
              >
                Message to attendees
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <textarea
                id="update-message"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Venue has changed to XYZ Hall. Gates open at 5 PM."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFE348] focus:border-transparent resize-none"
                required
              />
              <p className="text-xs text-gray-400 text-right">
                {message.length} chars
              </p>
            </div>

            {/* Image URL (optional) */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="update-image"
                className="text-sm font-medium text-gray-700"
              >
                Image URL{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="update-image"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFE348] focus:border-transparent"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Footer buttons */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="text-sm font-medium text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !message.trim()}
                className="text-sm font-semibold bg-[#FFE348] hover:bg-yellow-300 text-gray-900 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-gray-700 border-t-transparent rounded-full animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Mail size={15} />
                    Send Update
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/EventUpdateModal.tsx
git commit -m "feat: add EventUpdateModal component for sending attendee updates"
```

---

## Task 4: Wire "Send Update" button into the events page

**Files:**
- Modify: `apps/web/src/app/lister/events/page.tsx`

**Context:**
We need to:
1. Import `EventUpdateModal` and `Mail` (lucide icon)
2. Add state: `updateModalEvent` (the selected event, or null when closed)
3. Add a `handleUpdateSuccess` callback that decrements `availableMailUpdates` in local state
4. Add the "Send Update" button to each card's action grid
5. Render the modal conditionally

**Step 1: Update imports**

```typescript
// BEFORE (line 6):
import { BarChart, Edit, Users } from "lucide-react";

// AFTER:
import { BarChart, Edit, Mail, Users } from "lucide-react";
import EventUpdateModal from "@/components/EventUpdateModal";
```

**Step 2: Add modal state + success handler inside `ListerEventsPage`**

Add after `const [copiedId, setCopiedId] = useState<string | null>(null);` (line 57):

```typescript
const [updateModalEvent, setUpdateModalEvent] = useState<ListerEvent | null>(null);

const handleUpdateSuccess = (eventId: string) => {
  setItems((prev) =>
    prev.map((ev) =>
      ev.eventId === eventId
        ? { ...ev, availableMailUpdates: Math.max(0, ev.availableMailUpdates - 1) }
        : ev,
    ),
  );
};
```

**Step 3: Add "Send Update" button to each event card**

In the Action Links grid (around line 177), add a new button after the Attendees link:

```tsx
<button
  onClick={() => setUpdateModalEvent(ev)}
  className="text-gray-700 hover:text-gray-900 transition duration-200 flex items-center gap-2 justify-center sm:justify-start border border-gray-200 rounded-md px-3 py-2 hover:bg-gray-50"
>
  <Mail size={16} />
  Send Update
  {ev.availableMailUpdates > 0 ? (
    <span className="ml-auto text-xs font-semibold bg-[#FFE348] text-gray-900 rounded-full px-1.5 py-0.5 leading-none">
      {ev.availableMailUpdates}
    </span>
  ) : (
    <span className="ml-auto text-xs font-medium bg-gray-100 text-gray-400 rounded-full px-1.5 py-0.5 leading-none">
      0
    </span>
  )}
</button>
```

**Step 4: Render modal at the bottom of the returned JSX**

Add just before the closing `</div>` of the outermost container (after line 217):

```tsx
{/* Event Update Modal */}
{updateModalEvent && (
  <EventUpdateModal
    eventId={updateModalEvent.eventId}
    eventTitle={updateModalEvent.title}
    availableMailUpdates={updateModalEvent.availableMailUpdates}
    onClose={() => setUpdateModalEvent(null)}
    onSuccess={handleUpdateSuccess}
  />
)}
```

**Step 5: Verify TypeScript compiles cleanly**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors.

**Step 6: Commit**

```bash
git add apps/web/src/app/lister/events/page.tsx
git commit -m "feat: add Send Update button and modal to lister events page"
```

---

## Task 5: Fix the analytics error message typo (minor cleanup)

**Files:**
- Modify: `servers/user-server/src/services/event.service.ts`

**Context:** Line ~693 has `"analyticsxxx"` instead of `"analytics"`.

**Step 1: Fix the typo**

Search for `analyticsxxx` in `event.service.ts` and remove the `xxx` suffix from the error message string.

**Step 2: Commit**

```bash
git add servers/user-server/src/services/event.service.ts
git commit -m "fix: typo in analytics error message"
```

---

## Verification Checklist

After all tasks:

- [ ] TypeScript compiles: `cd apps/web && npx tsc --noEmit`
- [ ] Backend compiles: `cd servers/user-server && npx tsc --noEmit`
- [ ] Linter passes: `pnpm biome check --write .` from root
- [ ] Manual test: Open `/lister/events`, click "Send Update" on an event — modal opens, shows remaining count, textarea works, Cancel closes it
- [ ] Manual test: If `availableMailUpdates === 0` — button shows `0` badge, modal opens but shows exhausted state, no form rendered
- [ ] Manual test: Submit with a message — loading spinner appears, success closes the modal, badge decrements by 1
- [ ] Manual test: Submit with an invalid imageUrl — backend should ignore it gracefully (no crash)
- [ ] Backend test: `POST /event/info-update/:eventId` with `availableMailUpdates: 0` returns 400 with clear message
