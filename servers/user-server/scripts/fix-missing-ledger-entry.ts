import "dotenv/config";
import { prisma } from "../src/config/db";
import { Prisma } from "../src/generated/prisma/client";

/**
 * Quick script to fix missing ledger entries for a specific user
 * Usage: npx tsx src/scripts/fix-missing-ledger-entry.ts <userId>
 */

async function fixMissingLedgerEntry(listerId: string) {
  console.log(`🔍 Checking user: ${listerId}\n`);

  try {
    // Get lister info
    const lister = await prisma.lister.findUnique({
      where: { listerId },
      include: {
        Account: true,
        Event: {
          include: {
            EventAnalytics: true,
          },
        },
      },
    });

    if (!lister) {
      console.log("❌ Lister not found");
      return;
    }

    console.log(`📊 Lister: ${lister.companyName || lister.listerId}`);
    console.log(`   Account Balance: ${lister.Account?.balance || 0}\n`);

    // Ensure account exists
    let account = lister.Account;
    if (!account) {
      account = await prisma.account.create({
        data: {
          listerId: lister.listerId,
          balance: 0,
        },
      });
      console.log(`✅ Created account for lister\n`);
    }

    // Check each event
    for (const event of lister.Event) {
      if (
        !event.EventAnalytics ||
        event.EventAnalytics.revenue <= Prisma.Decimal(0)
      ) {
        continue;
      }

      const eventRevenue = new Prisma.Decimal(event.EventAnalytics.revenue);

      // Get existing ledger entries
      const existingEntries = await prisma.ledgerEntry.findMany({
        where: {
          accountId: account.accountId,
          referenceType: "EVENT_REVENUE",
          referenceId: event.eventId,
          entryType: "CREDIT",
        },
      });

      const ledgerRevenue = existingEntries.reduce(
        (sum, entry) => sum.plus(entry.amount),
        new Prisma.Decimal(0),
      );

      const difference = eventRevenue.minus(ledgerRevenue);

      console.log(`\n📅 Event: ${event.title}`);
      console.log(`   Event ID: ${event.eventId}`);
      console.log(`   Analytics Revenue: ${eventRevenue}`);
      console.log(`   Ledger Revenue: ${ledgerRevenue}`);
      console.log(`   Difference: ${difference}`);

      if (difference.greaterThan(0)) {
        console.log(`   ⚠️  Missing ledger entry detected!`);
        console.log(`   Creating entry for ${difference}...`);

        // Get current balance
        const latestEntry = await prisma.ledgerEntry.findFirst({
          where: { accountId: account.accountId },
          orderBy: { createdAt: "desc" },
        });

        const currentBalance =
          latestEntry?.balanceAfter || new Prisma.Decimal(0);
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

        console.log(`   ✅ Created ledger entry`);
        console.log(`   New balance: ${newBalance}`);
      } else if (difference.lessThan(0)) {
        console.log(`   ❌ DUPLICATE DETECTED! Ledger > Analytics`);
        console.log(`   Manual cleanup required`);
      } else {
        console.log(`   ✅ Ledger matches analytics`);
      }
    }

    // Show final balance
    const finalAccount = await prisma.account.findUnique({
      where: { accountId: account.accountId },
    });

    console.log(`\n\n✅ Final Account Balance: ${finalAccount?.balance || 0}`);
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function fixAccountBalance(listerId: string) {
  console.log(`🔍 Fixing account for user: ${listerId}\n`);

  try {
    const lister = await prisma.lister.findUnique({
      where: { listerId },
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

const listerId = process.argv[2];

fixAccountBalance(listerId);

fixMissingLedgerEntry(listerId)
  .then(() => {
    console.log("\n✅ Script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
