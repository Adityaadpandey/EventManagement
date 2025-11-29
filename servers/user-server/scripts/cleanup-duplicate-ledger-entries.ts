import "dotenv/config";
import { prisma } from "../src/config/db";
import { Prisma } from "../src/generated/prisma/client";

/**
 * Script to clean up duplicate ledger entries
 * This fixes the issue where ledger entries were created twice:
 * 1. By payment service (correct)
 * 2. By ledger worker (incorrect - was creating duplicates)
 */

async function cleanupDuplicateLedgerEntries() {
  console.log("🔍 Starting duplicate ledger entry cleanup...\n");

  try {
    // Get all accounts
    const accounts = await prisma.account.findMany({
      include: {
        lister: {
          select: {
            companyName: true,
            userId: true,
          },
        },
        LedgerEntry: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    console.log(`Found ${accounts.length} accounts to check\n`);

    for (const account of accounts) {
      console.log(
        `\n📊 Checking account for ${account.lister.companyName || account.listerId}`,
      );
      console.log(`   Account Balance: ${account.balance}`);
      console.log(`   Total Ledger Entries: ${account.LedgerEntry.length}`);

      // Group entries by referenceType and referenceId
      const entriesByReference = new Map<string, typeof account.LedgerEntry>();

      for (const entry of account.LedgerEntry) {
        const key = `${entry.referenceType}:${entry.referenceId}`;
        if (!entriesByReference.has(key)) {
          entriesByReference.set(key, []);
        }
        entriesByReference.get(key)!.push(entry);
      }

      // Find duplicates
      const duplicates: Array<{
        referenceKey: string;
        entries: typeof account.LedgerEntry;
      }> = [];

      for (const [key, entries] of entriesByReference.entries()) {
        if (entries.length > 1 && key.startsWith("EVENT_REVENUE:")) {
          // Check if they have the same amount (likely duplicates)
          const amounts = entries.map((e) => e.amount.toString());
          const uniqueAmounts = new Set(amounts);

          if (uniqueAmounts.size === 1) {
            // All entries have same amount - definitely duplicates
            duplicates.push({ referenceKey: key, entries });
          }
        }
      }

      if (duplicates.length > 0) {
        console.log(`   ⚠️  Found ${duplicates.length} duplicate entry groups`);

        for (const dup of duplicates) {
          console.log(`\n   Duplicate for ${dup.referenceKey}:`);
          console.log(
            `   - ${dup.entries.length} entries with amount ${dup.entries[0].amount}`,
          );

          // Keep the first entry (oldest), delete the rest
          const entriesToDelete = dup.entries.slice(1);
          console.log(
            `   - Keeping entry ${dup.entries[0].id} (created ${dup.entries[0].createdAt})`,
          );
          console.log(`   - Deleting ${entriesToDelete.length} duplicate(s)`);

          for (const entry of entriesToDelete) {
            await prisma.ledgerEntry.delete({
              where: { id: entry.id },
            });
            console.log(`     ✅ Deleted entry ${entry.id}`);
          }
        }

        // Recalculate correct balance
        console.log(`\n   🔄 Recalculating balance...`);
        const remainingEntries = await prisma.ledgerEntry.findMany({
          where: { accountId: account.accountId },
          orderBy: { createdAt: "asc" },
        });

        let runningBalance = new Prisma.Decimal(0);

        for (const entry of remainingEntries) {
          if (entry.entryType === "CREDIT") {
            runningBalance = runningBalance.plus(entry.amount);
          } else if (entry.entryType === "DEBIT") {
            runningBalance = runningBalance.minus(entry.amount);
          }

          // Update balanceAfter for each entry
          await prisma.ledgerEntry.update({
            where: { id: entry.id },
            data: { balanceAfter: runningBalance },
          });
        }

        // Update account balance
        await prisma.account.update({
          where: { accountId: account.accountId },
          data: { balance: runningBalance },
        });

        console.log(
          `   ✅ New balance: ${runningBalance} (was ${account.balance})`,
        );
      } else {
        console.log(`   ✅ No duplicates found`);
      }
    }

    console.log("\n\n✅ Cleanup completed successfully!");
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupDuplicateLedgerEntries()
  .then(() => {
    console.log("\n✅ Script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
