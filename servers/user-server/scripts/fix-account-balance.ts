import "dotenv/config";
import { prisma } from "../config/db";
import { Prisma } from "../generated/prisma/client";

/**
 * Script to recalculate and fix account balances based on ledger entries
 * This will:
 * 1. Recalculate the correct balance from all ledger entries
 * 2. Update the account balance to match
 * 3. Update all balanceAfter values in ledger entries
 */

async function fixAccountBalance(userId: string) {
  console.log(`🔍 Fixing account for user: ${userId}\n`);

  try {
    const lister = await prisma.lister.findUnique({
      where: { userId },
      include: {
        Account: {
          include: {
            LedgerEntry: {
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });

    if (!lister || !lister.Account) {
      console.log("❌ Lister or account not found");
      return;
    }

    const account = lister.Account;
    console.log(`📊 Account for: ${lister.companyName || lister.listerId}`);
    console.log(`   Current Balance: ${account.balance}`);
    console.log(`   Total Ledger Entries: ${account.LedgerEntry.length}\n`);

    // Recalculate balance from scratch
    let runningBalance = new Prisma.Decimal(0);
    const updates: Array<{ id: string; newBalance: Prisma.Decimal }> = [];

    console.log("📝 Recalculating balances...\n");

    for (const entry of account.LedgerEntry) {
      if (entry.entryType === "CREDIT") {
        runningBalance = runningBalance.plus(entry.amount);
        console.log(
          `   ${entry.createdAt.toISOString()} | CREDIT  | +${entry.amount} | Balance: ${runningBalance}`,
        );
      } else if (entry.entryType === "DEBIT") {
        runningBalance = runningBalance.minus(entry.amount);
        console.log(
          `   ${entry.createdAt.toISOString()} | DEBIT   | -${entry.amount} | Balance: ${runningBalance}`,
        );
      }

      // Store update if balanceAfter is wrong
      if (!entry.balanceAfter.equals(runningBalance)) {
        updates.push({ id: entry.id, newBalance: runningBalance });
      }
    }

    console.log(`\n✅ Correct Balance: ${runningBalance}`);
    console.log(`   Current Balance: ${account.balance}`);
    console.log(`   Entries to update: ${updates.length}\n`);

    // Update all entries with correct balanceAfter
    if (updates.length > 0) {
      console.log("🔄 Updating ledger entries...");
      for (const update of updates) {
        await prisma.ledgerEntry.update({
          where: { id: update.id },
          data: { balanceAfter: update.newBalance },
        });
      }
      console.log(`✅ Updated ${updates.length} ledger entries\n`);
    }

    // Update account balance
    if (!account.balance.equals(runningBalance)) {
      await prisma.account.update({
        where: { accountId: account.accountId },
        data: { balance: runningBalance },
      });
      console.log(
        `✅ Updated account balance: ${account.balance} → ${runningBalance}\n`,
      );
    } else {
      console.log(`✅ Account balance is already correct\n`);
    }

    // Show summary by event
    console.log("📊 Summary by Event:\n");
    const entriesByEvent = new Map<
      string,
      { credits: Prisma.Decimal; debits: Prisma.Decimal }
    >();

    for (const entry of account.LedgerEntry) {
      if (entry.referenceType === "EVENT_REVENUE" && entry.referenceId) {
        if (!entriesByEvent.has(entry.referenceId)) {
          entriesByEvent.set(entry.referenceId, {
            credits: new Prisma.Decimal(0),
            debits: new Prisma.Decimal(0),
          });
        }
        const eventData = entriesByEvent.get(entry.referenceId)!;
        if (entry.entryType === "CREDIT") {
          eventData.credits = eventData.credits.plus(entry.amount);
        } else if (entry.entryType === "DEBIT") {
          eventData.debits = eventData.debits.plus(entry.amount);
        }
      }
    }

    for (const [eventId, data] of entriesByEvent.entries()) {
      const net = data.credits.minus(data.debits);
      console.log(`   Event ${eventId}:`);
      console.log(`      Credits: ${data.credits}`);
      console.log(`      Debits:  ${data.debits}`);
      console.log(`      Net:     ${net}\n`);
    }

    console.log("✅ Account fixed successfully!");
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

const userId = process.argv[2] || "acd20072-0576-40a3-87b6-b81b8e84cc11";

fixAccountBalance(userId)
  .then(() => {
    console.log("\n✅ Script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
