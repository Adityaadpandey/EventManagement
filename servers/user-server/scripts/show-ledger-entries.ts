import "dotenv/config";
import { prisma } from "../src/config/db";

/**
 * Quick script to show all ledger entries for a user
 */

async function showLedgerEntries(userId: string) {
  console.log(`🔍 Showing ledger entries for user: ${userId}\n`);

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
    console.log(`   Account Balance: ${account.balance}`);
    console.log(`   Total Entries: ${account.LedgerEntry.length}\n`);

    console.log("📝 Ledger Entries:\n");
    console.log(
      "Date                     | Type    | Amount      | Balance After | Reference",
    );
    console.log(
      "-------------------------|---------|-------------|---------------|----------------------------------",
    );

    for (const entry of account.LedgerEntry) {
      const date = entry.createdAt.toISOString().substring(0, 19);
      const type = entry.entryType.padEnd(7);
      const amount = entry.amount.toString().padStart(11);
      const balance = entry.balanceAfter.toString().padStart(13);
      const ref = `${entry.referenceType}:${entry.referenceId?.substring(0, 8)}`;

      console.log(`${date} | ${type} | ${amount} | ${balance} | ${ref}`);
    }

    console.log("\n📊 Summary:");
    const credits = account.LedgerEntry.filter(
      (e) => e.entryType === "CREDIT",
    ).reduce((sum, e) => sum + Number(e.amount), 0);
    const debits = account.LedgerEntry.filter(
      (e) => e.entryType === "DEBIT",
    ).reduce((sum, e) => sum + Number(e.amount), 0);

    console.log(`   Total Credits: ${credits}`);
    console.log(`   Total Debits:  ${debits}`);
    console.log(`   Net Balance:   ${credits - debits}`);
    console.log(`   Account Balance: ${account.balance}`);
    console.log(
      `   Latest Entry Balance: ${account.LedgerEntry[account.LedgerEntry.length - 1]?.balanceAfter || 0}`,
    );
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

const userId = process.argv[2] || "acd20072-0576-40a3-87b6-b81b8e84cc11";

showLedgerEntries(userId)
  .then(() => {
    console.log("\n✅ Done");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Failed:", error);
    process.exit(1);
  });
