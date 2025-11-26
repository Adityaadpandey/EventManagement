/**
 * Script to fix payout discrepancies caused by rejecting PROCESSING payouts
 * without reversing the ledger entry
 */

import { prisma } from "../src/config/db";
import { Prisma } from "../src/generated/prisma/client";

async function fixPayoutDiscrepancies() {
  console.log("Starting payout discrepancy fix...\n");

  // Find all FAILED payouts that might have ledger entries
  const failedPayouts = await prisma.payout.findMany({
    where: {
      status: "FAILED",
      approvedAt: { not: null }, // Was approved at some point
    },
    include: {
      lister: {
        include: {
          Account: true,
        },
      },
    },
  });

  console.log(
    `Found ${failedPayouts.length} failed payouts that were previously approved\n`,
  );

  for (const payout of failedPayouts) {
    console.log(`\nChecking payout ${payout.payoutId}:`);
    console.log(`  Amount: ${payout.approvedAmount || payout.amount}`);
    console.log(`  Lister: ${payout.listerId}`);

    if (!payout.lister.Account) {
      console.log("  ⚠️  No account found, skipping");
      continue;
    }

    // Check if there's a DEBIT entry for this payout
    const debitEntry = await prisma.ledgerEntry.findFirst({
      where: {
        accountId: payout.lister.Account.accountId,
        referenceType: "PAYOUT",
        referenceId: payout.payoutId,
        entryType: "DEBIT",
      },
    });

    if (!debitEntry) {
      console.log("  ✅ No debit entry found, no fix needed");
      continue;
    }

    // Check if there's already a reversal
    const reversalEntry = await prisma.ledgerEntry.findFirst({
      where: {
        accountId: payout.lister.Account.accountId,
        referenceType: "PAYOUT_REVERSAL",
        referenceId: payout.payoutId,
        entryType: "CREDIT",
      },
    });

    if (reversalEntry) {
      console.log("  ✅ Reversal already exists, no fix needed");
      continue;
    }

    // Need to create reversal
    console.log("  🔧 Creating reversal entry...");

    const amount = new Prisma.Decimal(debitEntry.amount);
    const currentBalance = payout.lister.Account.balance;
    const newBalance = currentBalance.plus(amount);

    // Create reversal entry
    await prisma.$transaction([
      prisma.ledgerEntry.create({
        data: {
          accountId: payout.lister.Account.accountId,
          entryType: "CREDIT",
          amount: amount,
          balanceAfter: newBalance,
          referenceType: "PAYOUT_REVERSAL",
          referenceId: payout.payoutId,
        },
      }),
      prisma.account.update({
        where: { accountId: payout.lister.Account.accountId },
        data: { balance: newBalance },
      }),
    ]);

    console.log(`  ✅ Fixed! Reversed ${amount}, new balance: ${newBalance}`);
  }

  console.log("\n\n=== Summary ===");

  // Show final balances for all listers
  const listers = await prisma.lister.findMany({
    include: {
      Account: true,
      user: {
        select: { name: true, email: true },
      },
    },
  });

  for (const lister of listers) {
    if (!lister.Account) continue;

    const [revenue, payouts, ledger] = await Promise.all([
      prisma.eventAnalytics.aggregate({
        where: { event: { listerId: lister.listerId } },
        _sum: { revenue: true },
      }),
      prisma.payout.aggregate({
        where: { listerId: lister.listerId, status: "COMPLETED" },
        _sum: { approvedAmount: true },
      }),
      prisma.ledgerEntry.findFirst({
        where: { accountId: lister.Account.accountId },
        orderBy: { createdAt: "desc" },
        select: { balanceAfter: true },
      }),
    ]);

    const totalRevenue = new Prisma.Decimal(revenue._sum.revenue || 0);
    const totalPayouts = new Prisma.Decimal(payouts._sum.approvedAmount || 0);
    const computedBalance = totalRevenue.minus(totalPayouts);
    const ledgerBalance = ledger?.balanceAfter || new Prisma.Decimal(0);
    const accountBalance = lister.Account.balance;

    const isCorrect =
      accountBalance.equals(ledgerBalance) &&
      accountBalance.equals(computedBalance);

    console.log(`\n${lister.user.name} (${lister.listerId}):`);
    console.log(`  Account Balance: ${accountBalance}`);
    console.log(`  Ledger Balance:  ${ledgerBalance}`);
    console.log(`  Computed:        ${computedBalance}`);
    console.log(`  Status: ${isCorrect ? "✅ Correct" : "❌ Mismatch"}`);
  }

  console.log("\n\nDone!");
}

async function makeLedgers() {
  const listers = await prisma.lister.findMany({
    include: {
      Account: true,
    },
  });

  for (const lister of listers) {
    if (!lister.Account) continue;

    const payoutService = new (
      await import("../src/services/payout.service")
    ).PayoutService();
    console.log(`Initializing ledger for lister ${lister.listerId}...`);
    const _ = await payoutService.initializeLedger(
      lister.Account.accountId,
      lister.listerId,
    );
    console.log(`Done for lister ${lister.listerId}`);
  }
}

fixPayoutDiscrepancies();
makeLedgers();
