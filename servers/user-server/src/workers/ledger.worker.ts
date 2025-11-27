import "dotenv/config";

import { getLogger } from "@repo/logger";
import { parentPort } from "worker_threads";
import { prisma } from "../config/db";
import { Prisma } from "../generated/prisma/client";

const logger: any = getLogger("Ledger Worker", "debug");

const SYNC_INTERVAL = 60000; // Run every 60 seconds (1 minute)

interface LedgerSyncResult {
  listerId: string;
  companyName: string;
  accountCreated: boolean;
  entriesCreated: number;
  adjustmentAmount: number;
  finalBalance: number;
}

/**
 * Sync ledger entries for all listers
 * Ensures every event's revenue has corresponding ledger entries
 */
async function syncAllLedgers() {
  try {
    logger.info("Starting ledger sync for all listers...");

    // Get all listers with their events and analytics
    const listers = await prisma.lister.findMany({
      include: {
        Account: true,
        Event: {
          include: {
            EventAnalytics: {
              select: {
                revenue: true,
              },
            },
          },
        },
      },
    });

    logger.info(`Found ${listers.length} listers to sync`);

    const results: LedgerSyncResult[] = [];

    for (const lister of listers) {
      try {
        const result = await syncListerLedger(lister);
        results.push(result);
      } catch (error) {
        logger.error(
          `Failed to sync ledger for lister ${lister.listerId}:`,
          error,
        );
      }
    }

    // Log summary
    const totalAccountsCreated = results.filter((r) => r.accountCreated).length;
    const totalEntriesCreated = results.reduce(
      (sum, r) => sum + r.entriesCreated,
      0,
    );
    const totalAdjustments = results.filter(
      (r) => r.adjustmentAmount !== 0,
    ).length;

    logger.info("Ledger sync completed:", {
      totalListers: listers.length,
      accountsCreated: totalAccountsCreated,
      entriesCreated: totalEntriesCreated,
      adjustmentsMade: totalAdjustments,
    });

    return results;
  } catch (error) {
    logger.error("Ledger sync failed:", error);
    throw error;
  }
}

/**
 * Sync ledger for a single lister
 */
async function syncListerLedger(lister: any): Promise<LedgerSyncResult> {
  const result: LedgerSyncResult = {
    listerId: lister.listerId,
    companyName: lister.companyName || "Unknown",
    accountCreated: false,
    entriesCreated: 0,
    adjustmentAmount: 0,
    finalBalance: 0,
  };

  // Step 1: Ensure account exists
  let account = lister.Account;
  if (!account) {
    account = await prisma.account.create({
      data: {
        listerId: lister.listerId,
        balance: 0,
      },
    });
    result.accountCreated = true;
    logger.info(`Created account for lister ${lister.listerId}`);
  }

  // Step 2: Get all events with revenue
  const eventsWithRevenue = lister.Event.filter(
    (event: any) => event.EventAnalytics && event.EventAnalytics.revenue > 0,
  );

  if (eventsWithRevenue.length === 0) {
    logger.debug(`No events with revenue for lister ${lister.listerId}`);
    result.finalBalance = Number(account.balance);
    return result;
  }

  // Step 3: For each event, check if ledger entry exists
  for (const event of eventsWithRevenue) {
    const eventRevenue = new Prisma.Decimal(event.EventAnalytics.revenue);

    // Get existing ledger entries for this event
    const existingEntries = await prisma.ledgerEntry.findMany({
      where: {
        accountId: account.accountId,
        referenceType: "EVENT_REVENUE",
        referenceId: event.eventId,
        entryType: "CREDIT",
      },
    });

    // Calculate total ledger revenue for this event
    const ledgerRevenue = existingEntries.reduce(
      (sum, entry) => sum.plus(entry.amount),
      new Prisma.Decimal(0),
    );

    // Check if there's a discrepancy
    const difference = eventRevenue.minus(ledgerRevenue);

    if (!difference.equals(0)) {
      // Need to create adjustment entry
      const currentBalance = await getCurrentBalance(account.accountId);
      const newBalance = currentBalance.plus(difference);

      await prisma.$transaction([
        prisma.ledgerEntry.create({
          data: {
            accountId: account.accountId,
            entryType: difference.greaterThan(0) ? "CREDIT" : "DEBIT",
            amount: difference.abs(),
            balanceAfter: newBalance,
            referenceType: "EVENT_REVENUE",
            referenceId: event.eventId,
          },
        }),
        prisma.account.update({
          where: { accountId: account.accountId },
          data: { balance: newBalance },
        }),
      ]);

      result.entriesCreated++;
      result.adjustmentAmount += Number(difference);

      logger.info(
        `Synced ledger for event ${event.eventId}: ${difference.greaterThan(0) ? "+" : ""}${difference.toString()}`,
      );
    }
  }

  // Step 4: Get final balance
  const finalBalance = await getCurrentBalance(account.accountId);
  result.finalBalance = Number(finalBalance);

  if (result.entriesCreated > 0) {
    logger.info(
      `Lister ${lister.listerId}: Created ${result.entriesCreated} entries, adjusted ${result.adjustmentAmount.toFixed(2)}, final balance: ${result.finalBalance.toFixed(2)}`,
    );
  }

  return result;
}

/**
 * Get current balance from latest ledger entry
 */
async function getCurrentBalance(accountId: string): Promise<Prisma.Decimal> {
  const latestEntry = await prisma.ledgerEntry.findFirst({
    where: { accountId },
    orderBy: { createdAt: "desc" },
    select: { balanceAfter: true },
  });

  if (latestEntry) {
    return latestEntry.balanceAfter;
  }

  // If no ledger entries, get from account
  const account = await prisma.account.findUnique({
    where: { accountId },
    select: { balance: true },
  });

  return account?.balance || new Prisma.Decimal(0);
}

/**
 * Verify ledger integrity for all accounts
 * Checks that account balance matches latest ledger entry
 */
async function verifyLedgerIntegrity() {
  try {
    logger.info("Verifying ledger integrity...");

    const accounts = await prisma.account.findMany({
      include: {
        lister: {
          select: {
            companyName: true,
          },
        },
      },
    });

    const mismatches: Array<{
      accountId: string;
      companyName: string;
      accountBalance: string;
      ledgerBalance: string;
      difference: string;
    }> = [];

    for (const account of accounts) {
      const latestEntry = await prisma.ledgerEntry.findFirst({
        where: { accountId: account.accountId },
        orderBy: { createdAt: "desc" },
        select: { balanceAfter: true },
      });

      if (latestEntry) {
        if (!account.balance.equals(latestEntry.balanceAfter)) {
          const difference = account.balance.minus(latestEntry.balanceAfter);
          mismatches.push({
            accountId: account.accountId,
            companyName: account.lister.companyName || "Unknown",
            accountBalance: account.balance.toString(),
            ledgerBalance: latestEntry.balanceAfter.toString(),
            difference: difference.toString(),
          });

          logger.warn("Balance mismatch detected:", {
            accountId: account.accountId,
            accountBalance: account.balance.toString(),
            ledgerBalance: latestEntry.balanceAfter.toString(),
          });

          // Fix the mismatch by updating account balance to match ledger
          await prisma.account.update({
            where: { accountId: account.accountId },
            data: { balance: latestEntry.balanceAfter },
          });

          logger.info(
            `Fixed balance mismatch for account ${account.accountId}`,
          );
        }
      }
    }

    if (mismatches.length > 0) {
      logger.warn(`Found and fixed ${mismatches.length} balance mismatches`);
    } else {
      logger.info("✅ All account balances match ledger entries");
    }

    return mismatches;
  } catch (error) {
    logger.error("Ledger integrity verification failed:", error);
    throw error;
  }
}

/**
 * Clean up orphaned ledger entries
 * Removes entries that reference non-existent events or accounts
 */
async function cleanupOrphanedEntries() {
  try {
    logger.info("Checking for orphaned ledger entries...");

    // Find entries with non-existent events
    const orphanedEventEntries = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT le.id
      FROM "LedgerEntry" le
      LEFT JOIN "Event" e ON e."eventId" = le."referenceId"
      WHERE le."referenceType" = 'EVENT_REVENUE'
        AND e."eventId" IS NULL
    `;

    if (orphanedEventEntries.length > 0) {
      logger.warn(
        `Found ${orphanedEventEntries.length} orphaned event entries`,
      );
      // Don't delete automatically - just log for manual review
    }

    // Find entries with non-existent accounts
    const orphanedAccountEntries = await prisma.$queryRaw<
      Array<{ id: string }>
    >`
      SELECT le.id
      FROM "LedgerEntry" le
      LEFT JOIN "Account" a ON a."accountId" = le."accountId"
      WHERE a."accountId" IS NULL
    `;

    if (orphanedAccountEntries.length > 0) {
      logger.warn(
        `Found ${orphanedAccountEntries.length} orphaned account entries`,
      );
      // Don't delete automatically - just log for manual review
    }

    return {
      orphanedEvents: orphanedEventEntries.length,
      orphanedAccounts: orphanedAccountEntries.length,
    };
  } catch (error) {
    logger.error("Cleanup failed:", error);
    throw error;
  }
}

/**
 * Main worker loop
 */
async function startWorker() {
  logger.info("Ledger worker started");
  logger.info(`Sync interval: ${SYNC_INTERVAL / 1000} seconds`);

  // Run initial sync
  await runFullSync();

  // Schedule periodic syncs
  setInterval(async () => {
    await runFullSync();
  }, SYNC_INTERVAL);
}

/**
 * Run full sync cycle
 */
async function runFullSync() {
  try {
    const startTime = Date.now();

    // Step 1: Sync all ledgers
    await syncAllLedgers();

    // Step 2: Verify integrity
    await verifyLedgerIntegrity();

    // Step 3: Check for orphaned entries (every 10 minutes)
    const now = new Date();
    if (now.getMinutes() % 10 === 0) {
      await cleanupOrphanedEntries();
    }

    const duration = Date.now() - startTime;
    logger.info(`Full sync completed in ${duration}ms`);
  } catch (error) {
    logger.error("Full sync failed:", error);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("Ledger worker shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("Ledger worker shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});

// Start the worker
startWorker().catch((err) => {
  logger.error("Failed to start ledger worker:", err);
  process.exit(1);
});

if (parentPort) parentPort.postMessage({ status: "ready" });
