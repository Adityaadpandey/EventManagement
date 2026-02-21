-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'LISTER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('NOT_VIEWED', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLATION_REQUESTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TicketPaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ListerStatus" AS ENUM ('PENDING', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayoutType" AS ENUM ('FULL', 'PARTIAL');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FLAT');

-- CreateTable
CREATE TABLE "User" (
    "userId" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "password" TEXT,
    "name" TEXT,
    "avatar" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "profileComplete" BOOLEAN NOT NULL DEFAULT false,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Lister" (
    "listerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT,
    "companyLogo" TEXT,
    "bio" TEXT,
    "InstagramLink" TEXT,
    "FacebookLink" TEXT,
    "XLink" TEXT,
    "website" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "ListerStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Lister_pkey" PRIMARY KEY ("listerId")
);

-- CreateTable
CREATE TABLE "BankDetails" (
    "bankDetailsId" TEXT NOT NULL,
    "listerId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "ifscCode" TEXT NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "branchCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankDetails_pkey" PRIMARY KEY ("bankDetailsId")
);

-- CreateTable
CREATE TABLE "Account" (
    "accountId" TEXT NOT NULL,
    "listerId" TEXT NOT NULL,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("accountId")
);

-- CreateTable
CREATE TABLE "Payout" (
    "payoutId" TEXT NOT NULL,
    "listerId" TEXT NOT NULL,
    "eventId" TEXT,
    "type" "PayoutType" NOT NULL DEFAULT 'FULL',
    "amount" DECIMAL(65,30) NOT NULL,
    "approvedAmount" DECIMAL(65,30),
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "remark" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("payoutId")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "entryType" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "balanceAfter" DECIMAL(65,30) NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "eventId" TEXT NOT NULL,
    "listerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "banner_horizontal" TEXT NOT NULL,
    "banner_vertical" TEXT NOT NULL,
    "banner_square" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "longitude" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION,
    "capacity" INTEGER,
    "tags" TEXT[],
    "chips" TEXT[],
    "restrictions" TEXT,
    "canBuy" BOOLEAN NOT NULL DEFAULT true,
    "status" "Status" NOT NULL DEFAULT 'NOT_VIEWED',
    "rejection_comment" TEXT,
    "cancellation_note" TEXT,
    "samplePoster" TEXT,
    "socialMediaGraphic" TEXT,
    "eventFormat" TEXT,
    "requestedVenue" TEXT,
    "termsConditions" TEXT,
    "rulesRegulations" TEXT,
    "policies" TEXT,
    "dutyLeavesDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ticketCounter" INTEGER NOT NULL DEFAULT 0,
    "availableMailUpdates" INTEGER NOT NULL DEFAULT 2,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "CustomField" (
    "fieldId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "ticketTypeId" TEXT,
    "label" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" TEXT,

    CONSTRAINT "CustomField_pkey" PRIMARY KEY ("fieldId")
);

-- CreateTable
CREATE TABLE "TicketType" (
    "ticketTypeId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "discountedPrice" DOUBLE PRECISION,
    "discountReason" TEXT,
    "quantity" INTEGER NOT NULL,
    "salesCutoff" TIMESTAMP(3),
    "platformfee" INTEGER NOT NULL DEFAULT 0,
    "platformfeePerc" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "ticketPrefix" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "soldCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TicketType_pkey" PRIMARY KEY ("ticketTypeId")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "ticketId" TEXT NOT NULL,
    "ticketTypeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "TicketPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "quantity" INTEGER NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "qrCode" TEXT NOT NULL,
    "checkedIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "eventEventId" TEXT,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("ticketId")
);

-- CreateTable
CREATE TABLE "AttendeeFieldResponse" (
    "responseId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendeeFieldResponse_pkey" PRIMARY KEY ("responseId")
);

-- CreateTable
CREATE TABLE "TicketChecker" (
    "checkerId" TEXT NOT NULL,
    "listerId" TEXT NOT NULL,
    "eventId" TEXT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deprecated" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "TicketChecker_pkey" PRIMARY KEY ("checkerId")
);

-- CreateTable
CREATE TABLE "TicketScanLog" (
    "scanId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "checkerId" TEXT,
    "performedByUserId" TEXT,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "note" TEXT,
    "deviceInfo" TEXT,
    "ipAddress" TEXT,
    "eventEventId" TEXT,

    CONSTRAINT "TicketScanLog_pkey" PRIMARY KEY ("scanId")
);

-- CreateTable
CREATE TABLE "DiscountCode" (
    "codeId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" "DiscountType" NOT NULL,
    "discountPct" DOUBLE PRECISION,
    "discountAmt" DOUBLE PRECISION,
    "maxDiscount" DOUBLE PRECISION,
    "minOrderAmt" DOUBLE PRECISION,
    "maxUses" INTEGER,
    "usesCount" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("codeId")
);

-- CreateTable
CREATE TABLE "EventAnalytics" (
    "analyticsId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "ticketsSold" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewsByDay" JSONB,
    "clicksByDay" JSONB,
    "salesByDay" JSONB,
    "revenueByDay" JSONB,
    "ticketTypesSalesByDay" JSONB,
    "trafficSources" JSONB,
    "deviceBreakdown" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventAnalytics_pkey" PRIMARY KEY ("analyticsId")
);

-- CreateTable
CREATE TABLE "ListerAnalytics" (
    "id" TEXT NOT NULL,
    "listerId" TEXT NOT NULL,
    "totalEvents" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTicketsSold" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListerAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "refundId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "processedBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userUserId" TEXT,
    "eventEventId" TEXT,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("refundId")
);

-- CreateTable
CREATE TABLE "Notification" (
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "type" TEXT DEFAULT 'info',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("notificationId")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "subscriptionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("subscriptionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "User_email_isActive_idx" ON "User"("email", "isActive");

-- CreateIndex
CREATE INDEX "User_phone_isActive_idx" ON "User"("phone", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Lister_userId_key" ON "Lister"("userId");

-- CreateIndex
CREATE INDEX "Lister_status_createdAt_idx" ON "Lister"("status", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "BankDetails_listerId_key" ON "BankDetails"("listerId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_listerId_key" ON "Account"("listerId");

-- CreateIndex
CREATE INDEX "Account_balance_idx" ON "Account"("balance");

-- CreateIndex
CREATE INDEX "Payout_status_requestedAt_idx" ON "Payout"("status", "requestedAt" DESC);

-- CreateIndex
CREATE INDEX "Payout_listerId_status_idx" ON "Payout"("listerId", "status");

-- CreateIndex
CREATE INDEX "Payout_eventId_status_idx" ON "Payout"("eventId", "status");

-- CreateIndex
CREATE INDEX "LedgerEntry_accountId_createdAt_idx" ON "LedgerEntry"("accountId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "LedgerEntry_referenceType_referenceId_idx" ON "LedgerEntry"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "Event_status_date_idx" ON "Event"("status", "date");

-- CreateIndex
CREATE INDEX "Event_listerId_status_createdAt_idx" ON "Event"("listerId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Event_date_status_idx" ON "Event"("date", "status");

-- CreateIndex
CREATE INDEX "Event_tags_idx" ON "Event"("tags");

-- CreateIndex
CREATE INDEX "CustomField_eventId_required_idx" ON "CustomField"("eventId", "required");

-- CreateIndex
CREATE INDEX "CustomField_ticketTypeId_idx" ON "CustomField"("ticketTypeId");

-- CreateIndex
CREATE INDEX "TicketType_eventId_price_idx" ON "TicketType"("eventId", "price");

-- CreateIndex
CREATE INDEX "TicketType_salesCutoff_idx" ON "TicketType"("salesCutoff");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_qrCode_key" ON "Ticket"("qrCode");

-- CreateIndex
CREATE INDEX "Ticket_userId_status_createdAt_idx" ON "Ticket"("userId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Ticket_eventEventId_status_idx" ON "Ticket"("eventEventId", "status");

-- CreateIndex
CREATE INDEX "Ticket_eventEventId_checkedIn_idx" ON "Ticket"("eventEventId", "checkedIn");

-- CreateIndex
CREATE INDEX "Ticket_ticketTypeId_status_idx" ON "Ticket"("ticketTypeId", "status");

-- CreateIndex
CREATE INDEX "Ticket_status_createdAt_idx" ON "Ticket"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AttendeeFieldResponse_ticketId_idx" ON "AttendeeFieldResponse"("ticketId");

-- CreateIndex
CREATE INDEX "AttendeeFieldResponse_fieldId_value_idx" ON "AttendeeFieldResponse"("fieldId", "value");

-- CreateIndex
CREATE INDEX "TicketChecker_listerId_active_idx" ON "TicketChecker"("listerId", "active");

-- CreateIndex
CREATE INDEX "TicketChecker_eventId_active_idx" ON "TicketChecker"("eventId", "active");

-- CreateIndex
CREATE INDEX "TicketChecker_expiresAt_idx" ON "TicketChecker"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "TicketChecker_eventId_username_key" ON "TicketChecker"("eventId", "username");

-- CreateIndex
CREATE INDEX "TicketScanLog_eventEventId_scannedAt_idx" ON "TicketScanLog"("eventEventId", "scannedAt" DESC);

-- CreateIndex
CREATE INDEX "TicketScanLog_ticketId_scannedAt_idx" ON "TicketScanLog"("ticketId", "scannedAt" DESC);

-- CreateIndex
CREATE INDEX "TicketScanLog_checkerId_scannedAt_idx" ON "TicketScanLog"("checkerId", "scannedAt" DESC);

-- CreateIndex
CREATE INDEX "TicketScanLog_success_scannedAt_idx" ON "TicketScanLog"("success", "scannedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCode_code_key" ON "DiscountCode"("code");

-- CreateIndex
CREATE INDEX "DiscountCode_eventId_validFrom_validTo_idx" ON "DiscountCode"("eventId", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "DiscountCode_code_eventId_idx" ON "DiscountCode"("code", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventAnalytics_eventId_key" ON "EventAnalytics"("eventId");

-- CreateIndex
CREATE INDEX "EventAnalytics_revenue_idx" ON "EventAnalytics"("revenue" DESC);

-- CreateIndex
CREATE INDEX "EventAnalytics_ticketsSold_idx" ON "EventAnalytics"("ticketsSold" DESC);

-- CreateIndex
CREATE INDEX "EventAnalytics_lastUpdated_idx" ON "EventAnalytics"("lastUpdated" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ListerAnalytics_listerId_key" ON "ListerAnalytics"("listerId");

-- CreateIndex
CREATE INDEX "ListerAnalytics_totalRevenue_idx" ON "ListerAnalytics"("totalRevenue" DESC);

-- CreateIndex
CREATE INDEX "ListerAnalytics_totalTicketsSold_idx" ON "ListerAnalytics"("totalTicketsSold" DESC);

-- CreateIndex
CREATE INDEX "Refund_status_createdAt_idx" ON "Refund"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Refund_eventEventId_status_idx" ON "Refund"("eventEventId", "status");

-- CreateIndex
CREATE INDEX "Refund_userUserId_createdAt_idx" ON "Refund"("userUserId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Refund_ticketId_idx" ON "Refund"("ticketId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Notification_sent_createdAt_idx" ON "Notification"("sent", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_isActive_idx" ON "PushSubscription"("userId", "isActive");

-- AddForeignKey
ALTER TABLE "Lister" ADD CONSTRAINT "Lister_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankDetails" ADD CONSTRAINT "BankDetails_listerId_fkey" FOREIGN KEY ("listerId") REFERENCES "Lister"("listerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_listerId_fkey" FOREIGN KEY ("listerId") REFERENCES "Lister"("listerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_listerId_fkey" FOREIGN KEY ("listerId") REFERENCES "Lister"("listerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("eventId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("accountId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_listerId_fkey" FOREIGN KEY ("listerId") REFERENCES "Lister"("listerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomField" ADD CONSTRAINT "CustomField_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("eventId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomField" ADD CONSTRAINT "CustomField_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType"("ticketTypeId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketType" ADD CONSTRAINT "TicketType_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("eventId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType"("ticketTypeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_eventEventId_fkey" FOREIGN KEY ("eventEventId") REFERENCES "Event"("eventId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendeeFieldResponse" ADD CONSTRAINT "AttendeeFieldResponse_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("ticketId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendeeFieldResponse" ADD CONSTRAINT "AttendeeFieldResponse_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "CustomField"("fieldId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketChecker" ADD CONSTRAINT "TicketChecker_listerId_fkey" FOREIGN KEY ("listerId") REFERENCES "Lister"("listerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketChecker" ADD CONSTRAINT "TicketChecker_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("eventId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketScanLog" ADD CONSTRAINT "TicketScanLog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("ticketId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketScanLog" ADD CONSTRAINT "TicketScanLog_checkerId_fkey" FOREIGN KEY ("checkerId") REFERENCES "TicketChecker"("checkerId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketScanLog" ADD CONSTRAINT "TicketScanLog_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketScanLog" ADD CONSTRAINT "TicketScanLog_eventEventId_fkey" FOREIGN KEY ("eventEventId") REFERENCES "Event"("eventId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountCode" ADD CONSTRAINT "DiscountCode_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("eventId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAnalytics" ADD CONSTRAINT "EventAnalytics_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("eventId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListerAnalytics" ADD CONSTRAINT "ListerAnalytics_listerId_fkey" FOREIGN KEY ("listerId") REFERENCES "Lister"("listerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("ticketId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_userUserId_fkey" FOREIGN KEY ("userUserId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_eventEventId_fkey" FOREIGN KEY ("eventEventId") REFERENCES "Event"("eventId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
