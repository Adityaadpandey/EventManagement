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

    // Get ALL existing ledger entries for this event (both CREDIT and DEBIT)
    const existingEntries = await prisma.ledgerEntry.findMany({
      where: {
        accountId: account.accountId,
        referenceType: "EVENT_REVENUE",
        referenceId: event.eventId,
      },
      orderBy: { createdAt: "asc" },
    });

    // Calculate net ledger revenue for this event (credits - debits)
    const ledgerRevenue = existingEntries.reduce((sum, entry) => {
      if (entry.entryType === "CREDIT") {
        return sum.plus(entry.amount);
      } else if (entry.entryType === "DEBIT") {
        return sum.minus(entry.amount);
      }
      return sum;
    }, new Prisma.Decimal(0));

    // Check if there's a discrepancy (with tolerance for floating point)
    const difference = eventRevenue.minus(ledgerRevenue);

    // Only create adjustment if difference is significant (> 0.01)
    if (difference.abs().greaterThan(0.01)) {
      const currentBalance = await getCurrentBalance(account.accountId);

      if (difference.greaterThan(0)) {
        // Ledger is LESS than analytics - missing revenue (create CREDIT)
        const newBalance = currentBalance.plus(difference);

        await prisma.$transaction([
          prisma.ledgerEntry.create({
            data: {
              accountId: account.accountId,
              entryType: "CREDIT",
              amount: difference,
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
          `✅ Created adjustment (CREDIT) for event ${event.eventId}: +${difference}`,
        );
      } else {
        // Ledger is MORE than analytics - platform fee changed or duplicate (create DEBIT adjustment)
        const adjustmentAmount = difference.abs();
        const newBalance = currentBalance.minus(adjustmentAmount);

        await prisma.$transaction([
          prisma.ledgerEntry.create({
            data: {
              accountId: account.accountId,
              entryType: "DEBIT",
              amount: adjustmentAmount,
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
          `✅ Created adjustment (DEBIT) for event ${event.eventId}: ${difference} (platform fee change or correction)`,
        );
      }
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
 * Get current balance by recalculating from ALL ledger entries
 * This ensures we always have the correct balance even if balanceAfter is wrong
 */
async function getCurrentBalance(accountId: string): Promise<Prisma.Decimal> {
  const allEntries = await prisma.ledgerEntry.findMany({
    where: { accountId },
    orderBy: { createdAt: "asc" },
    select: { entryType: true, amount: true },
  });

  let balance = new Prisma.Decimal(0);

  for (const entry of allEntries) {
    if (entry.entryType === "CREDIT") {
      balance = balance.plus(entry.amount);
    } else if (entry.entryType === "DEBIT") {
      balance = balance.minus(entry.amount);
    }
  }

  return balance;
}

/**
 * Verify and fix ledger integrity for all accounts
 * Recalculates all balanceAfter values and ensures account balance matches
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
        LedgerEntry: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    let fixedAccounts = 0;
    let fixedEntries = 0;

    for (const account of accounts) {
      if (account.LedgerEntry.length === 0) {
        continue;
      }

      // Recalculate balance from scratch
      let runningBalance = new Prisma.Decimal(0);
      let needsUpdate = false;

      for (const entry of account.LedgerEntry) {
        // Calculate what the balance should be
        if (entry.entryType === "CREDIT") {
          runningBalance = runningBalance.plus(entry.amount);
        } else if (entry.entryType === "DEBIT") {
          runningBalance = runningBalance.minus(entry.amount);
        }

        // Check if balanceAfter is wrong
        if (!entry.balanceAfter.equals(runningBalance)) {
          needsUpdate = true;
          // Fix the balanceAfter
          await prisma.ledgerEntry.update({
            where: { id: entry.id },
            data: { balanceAfter: runningBalance },
          });
          fixedEntries++;
        }
      }

      // Check if account balance matches final calculated balance
      if (!account.balance.equals(runningBalance)) {
        needsUpdate = true;
        await prisma.account.update({
          where: { accountId: account.accountId },
          data: { balance: runningBalance },
        });
        fixedAccounts++;

        logger.info(
          `Fixed account ${account.lister.companyName || account.accountId}: ${account.balance} → ${runningBalance}`,
        );
      }
    }

    if (fixedAccounts > 0 || fixedEntries > 0) {
      logger.info(
        `✅ Fixed ${fixedAccounts} accounts and ${fixedEntries} ledger entries`,
      );
    } else {
      logger.info("✅ All account balances and ledger entries are correct");
    }

    return { fixedAccounts, fixedEntries };
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
