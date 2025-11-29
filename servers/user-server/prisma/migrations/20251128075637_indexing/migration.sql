-- This is an empty migration.



CREATE INDEX idx_event_tags_gin ON "Event" USING GIN ("tags");
CREATE INDEX idx_event_chips_gin ON "Event" USING GIN ("chips");

-- 2. PARTIAL INDEXES (Only index rows that matter)
-- Dramatically reduces index size and improves write performance

-- Only index successful tickets (most queries filter on SUCCESS)
CREATE INDEX idx_ticket_success_user
ON "Ticket" ("userId", "createdAt" DESC)
WHERE status = 'SUCCESS';

CREATE INDEX idx_ticket_success_event
ON "Ticket" ("eventEventId", "createdAt" DESC)
WHERE status = 'SUCCESS';

-- Only index approved events (most user-facing queries)
CREATE INDEX idx_event_approved_date
ON "Event" (date, "listerId")
WHERE status = 'APPROVED';

-- Only index unread notifications
CREATE INDEX idx_notification_unread
ON "Notification" ("userId", "createdAt" DESC)
WHERE read = false;

-- Only index unsent notifications for background job
CREATE INDEX idx_notification_unsent
ON "Notification" ("createdAt")
WHERE sent = false;

-- Only index pending refunds for admin dashboard
CREATE INDEX idx_refund_pending
ON "Refund" ("createdAt" DESC)
WHERE status = 'PENDING';

-- Only index active ticket checkers
CREATE INDEX idx_ticketchecker_active
ON "TicketChecker" ("eventId", "listerId")
WHERE active = true AND deprecated = false;

-- Only index pending/processing payouts
CREATE INDEX idx_payout_pending
ON "Payout" ("listerId", "requestedAt" DESC)
WHERE status IN ('PENDING', 'PROCESSING');

-- 3. COVERING INDEXES (Include frequently accessed columns)
-- Allows index-only scans without touching the main table

-- Event list queries often need title
CREATE INDEX idx_event_list_covering
ON "Event" (status, date, "listerId")
INCLUDE (title, location, banner_square);

-- Ticket queries often need price and quantity
CREATE INDEX idx_ticket_user_covering
ON "Ticket" ("userId", status, "createdAt" DESC)
INCLUDE ("totalPrice", quantity, "qrCode");

-- 4. EXPRESSION INDEXES (For case-insensitive searches)

-- Case-insensitive email/phone lookup
CREATE INDEX idx_user_email_lower ON "User" (LOWER(email)) WHERE email IS NOT NULL;
CREATE INDEX idx_user_phone_normalized ON "User" (REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) WHERE phone IS NOT NULL;

-- Case-insensitive discount code lookup
CREATE INDEX idx_discountcode_lower ON "DiscountCode" (LOWER(code), "eventId");

-- 5. GEOSPATIAL INDEX FOR LOCATION QUERIES
-- Requires earthdistance extension for distance calculations

CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- Spatial index for location-based queries
CREATE INDEX idx_event_location_gist
ON "Event" USING GIST (ll_to_earth(latitude, longitude))
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND status = 'APPROVED';

-- 6. JSONB INDEXES FOR ANALYTICS
-- If you query specific JSON fields frequently

CREATE INDEX idx_eventanalytics_viewsbyday
ON "EventAnalytics" USING GIN ("viewsByDay");

CREATE INDEX idx_eventanalytics_salesbyday
ON "EventAnalytics" USING GIN ("salesByDay");

-- 7. FOREIGN KEY INDEXES FOR JOIN PERFORMANCE
-- PostgreSQL doesn't auto-index foreign keys

CREATE INDEX idx_ticket_tickettypeid ON "Ticket" ("ticketTypeId");
CREATE INDEX idx_customfield_eventid ON "CustomField" ("eventId");
CREATE INDEX idx_tickettype_eventid ON "TicketType" ("eventId");
CREATE INDEX idx_discountcode_eventid ON "DiscountCode" ("eventId");



CREATE INDEX idx_payout_pending_priority
ON "Payout" (status, "requestedAt" DESC, "listerId")
WHERE status IN ('PENDING', 'PROCESSING');

-- Partial index for completed payouts (for reconciliation)
CREATE INDEX idx_payout_completed
ON "Payout" ("paidAt" DESC, "listerId", "amount")
WHERE status = 'COMPLETED';

-- Index for payout amount filtering (e.g., large payouts)
CREATE INDEX idx_payout_amount_status
ON "Payout" ("amount" DESC, status)
WHERE status != 'CANCELLED';

-- Event-specific payout tracking
CREATE INDEX idx_payout_event_type
ON "Payout" ("eventId", type, status, "requestedAt" DESC)
WHERE "eventId" IS NOT NULL;

-- Ledger entry indexes for account statements
CREATE INDEX idx_ledger_account_type_date
ON "LedgerEntry" ("accountId", "entryType", "createdAt" DESC);

-- Ledger by reference (trace transactions)
CREATE INDEX idx_ledger_reference_complete
ON "LedgerEntry" ("referenceType", "referenceId", "createdAt" DESC)
WHERE "referenceType" IS NOT NULL AND "referenceId" IS NOT NULL;

-- Ledger balance tracking (for audit)
CREATE INDEX idx_ledger_balance
ON "LedgerEntry" ("accountId", "balanceAfter", "createdAt" DESC);

-- Account balance ranges (find accounts needing payouts)
CREATE INDEX idx_account_high_balance
ON "Account" (balance DESC, "listerId")
WHERE balance > 1000;

-- Covering index for account summary queries
CREATE INDEX idx_ledger_summary_covering
ON "LedgerEntry" ("accountId", "createdAt" DESC)
INCLUDE ("entryType", amount, "balanceAfter", "referenceType");

-- Partial index for credit entries only (revenue tracking)
CREATE INDEX idx_ledger_credits
ON "LedgerEntry" ("accountId", "createdAt" DESC, amount)
WHERE "entryType" = 'CREDIT';

-- Partial index for debit entries only (payout tracking)
CREATE INDEX idx_ledger_debits
ON "LedgerEntry" ("accountId", "createdAt" DESC, amount)
WHERE "entryType" = 'DEBIT';
