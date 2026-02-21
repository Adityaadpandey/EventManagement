import { prisma } from "../config/db";
import logger from "../config/logger";
import { Prisma } from "../generated/prisma/client";
import { getAccountCache, setAccountCache } from "../lib/cache";

export class AccountService {
  async getAccountDetails(userId: string) {
    try {
      // Try cache first
      const cached = await getAccountCache(userId);
      if (cached) {
        logger.debug(`Account cache hit for user ${userId}`);
        return cached;
      }
      // Optimized query with select to fetch only needed fields
      const lister = await prisma.lister.findUnique({
        where: { userId },
        select: {
          listerId: true,
          Account: {
            select: {
              accountId: true,
              balance: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          BankDetails: true,
        },
      });

      if (!lister) {
        throw new Error("Lister profile not found");
      }

      // COMPREHENSIVE BALANCE CHECK FROM MULTIPLE SOURCES
      const [
        revenueAgg,
        payoutAgg,
        ledgerCredits,
        ledgerDebits,
        debitBreakdown,
        latestLedger,
      ] = await Promise.all([
        // Source 1: Aggregate revenue from EventAnalytics
        prisma.eventAnalytics.aggregate({
          _sum: {
            revenue: true,
          },
          where: {
            event: {
              listerId: lister.listerId,
            },
          },
        }),
        // Source 2: Completed payouts
        prisma.payout.aggregate({
          _sum: {
            approvedAmount: true,
          },
          where: {
            listerId: lister.listerId,
            status: "COMPLETED",
          },
        }),
        // Source 3: Sum of CREDIT entries
        prisma.ledgerEntry.aggregate({
          _sum: {
            amount: true,
          },
          where: {
            accountId: lister.Account?.accountId,
            entryType: "CREDIT",
          },
        }),
        // Source 4: Sum of DEBIT entries
        prisma.ledgerEntry.aggregate({
          _sum: {
            amount: true,
          },
          where: {
            accountId: lister.Account?.accountId,
            entryType: "DEBIT",
          },
        }),
        // Get breakdown of debit types
        prisma.ledgerEntry.groupBy({
          by: ["referenceType"],
          where: {
            accountId: lister.Account?.accountId,
            entryType: "DEBIT",
          },
          _sum: {
            amount: true,
          },
        }),
        // Source 5: Latest ledger balance
        prisma.ledgerEntry.findFirst({
          where: {
            accountId: lister.Account?.accountId,
          },
          orderBy: { createdAt: "desc" },
          select: { balanceAfter: true },
        }),
      ]);

      const totalRevenue = new Prisma.Decimal(revenueAgg._sum.revenue || 0);
      const totalPayouts = new Prisma.Decimal(
        payoutAgg._sum.approvedAmount || 0,
      );
      const totalLedgerCredits = new Prisma.Decimal(
        ledgerCredits._sum.amount || 0,
      );
      const totalLedgerDebits = new Prisma.Decimal(
        ledgerDebits._sum.amount || 0,
      );
      const totalLedgerAmount = totalLedgerCredits.minus(totalLedgerDebits);
      const computedBalance = totalRevenue.minus(totalPayouts);
      const ledgerBalance = latestLedger?.balanceAfter || new Prisma.Decimal(0);

      // Cross-verify all sources
      const currentBalance = lister.Account?.balance || new Prisma.Decimal(0);

      // Check if ledger exists
      const hasLedger =
        totalLedgerCredits.greaterThan(0) || totalLedgerDebits.greaterThan(0);

      // Determine which balance to trust
      let trustedBalance: Prisma.Decimal;
      let discrepancyReason: string | null = null;

      if (hasLedger) {
        // If ledger exists, it's the source of truth
        trustedBalance = ledgerBalance;

        // Check for discrepancies
        const revenueVsLedger = totalRevenue.minus(ledgerBalance);
        const payoutsVsDebits = totalLedgerDebits.minus(totalPayouts);

        if (!currentBalance.equals(ledgerBalance)) {
          discrepancyReason = `Account balance (${currentBalance}) doesn't match ledger (${ledgerBalance})`;
        } else if (!totalRevenue.equals(totalLedgerCredits)) {
          discrepancyReason = `Revenue (${totalRevenue}) doesn't match ledger credits (${totalLedgerCredits}). Missing: ${revenueVsLedger}`;
        } else if (!totalPayouts.equals(totalLedgerDebits)) {
          discrepancyReason = `Completed payouts (${totalPayouts}) don't match ledger debits (${totalLedgerDebits}). Extra debits: ${payoutsVsDebits} (possibly refunds or processing payouts)`;
        }
      } else {
        // No ledger, use computed balance
        trustedBalance = computedBalance;
        discrepancyReason = "No ledger entries found, using computed balance";
      }

      const balancesMatch =
        currentBalance.equals(trustedBalance) &&
        totalRevenue.equals(totalLedgerCredits) &&
        (totalPayouts.equals(totalLedgerDebits) || !hasLedger);

      if (!balancesMatch || discrepancyReason) {
        logger.warn("Balance discrepancy detected in account service", {
          listerId: lister.listerId,
          currentBalance: currentBalance.toString(),
          trustedBalance: trustedBalance.toString(),
          computedBalance: computedBalance.toString(),
          ledgerBalance: ledgerBalance.toString(),
          totalRevenue: totalRevenue.toString(),
          totalPayouts: totalPayouts.toString(),
          ledgerCredits: totalLedgerCredits.toString(),
          ledgerDebits: totalLedgerDebits.toString(),
          discrepancyReason,
        });
      }

      // Handle account creation or update
      let account = lister.Account;

      if (!account) {
        account = await prisma.account.create({
          data: {
            listerId: lister.listerId,
            balance: computedBalance,
          },
          include: {
            lister: {
              include: {
                BankDetails: true,
              },
            },
          },
        });
      } else if (!account.balance.equals(computedBalance)) {
        // Only update if balance changed
        account = await prisma.account.update({
          where: { accountId: account.accountId },
          data: {
            balance: computedBalance,
          },
          include: {
            lister: {
              include: {
                BankDetails: true,
              },
            },
          },
        });
      } else {
        // Balance is correct, just attach lister data
        account;
      }
      // Calculate discrepancies
      const revenueVsCredits = totalRevenue.minus(totalLedgerCredits);
      const payoutsVsDebits = totalLedgerDebits.minus(totalPayouts);
      const computedVsLedger = computedBalance.minus(ledgerBalance);

      // Format debit breakdown
      const debitsByType = debitBreakdown.reduce(
        (acc, item) => {
          acc[item.referenceType || "UNKNOWN"] =
            item._sum.amount?.toString() || "0";
          return acc;
        },
        {} as Record<string, string>,
      );

      // Get payout statistics
      const [pendingPayoutsAgg, processingPayoutsAgg] = await Promise.all([
        prisma.payout.aggregate({
          where: {
            listerId: lister.listerId,
            status: "PENDING",
          },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.payout.aggregate({
          where: {
            listerId: lister.listerId,
            status: "PROCESSING",
          },
          _sum: { amount: true },
          _count: true,
        }),
      ]);

      const pendingPayoutsAmount = new Prisma.Decimal(
        pendingPayoutsAgg._sum.amount || 0,
      );
      const processingPayoutsAmount = new Prisma.Decimal(
        processingPayoutsAgg._sum.amount || 0,
      );
      const lockedFunds = pendingPayoutsAmount.plus(processingPayoutsAmount);
      const availableBalance = currentBalance.minus(pendingPayoutsAmount);

      const result = {
        ...account,
        totalRevenue: totalRevenue.toString(),
        totalPayouts: totalPayouts.toString(),
        computedBalance: computedBalance.toString(),
        totalLedgerAmount: totalLedgerAmount.toString(),
        ledgerCredits: totalLedgerCredits.toString(),
        ledgerDebits: totalLedgerDebits.toString(),
        ledgerBalance: ledgerBalance.toString(),
        balancesMatch,
        debitBreakdown: debitsByType,
        payoutStats: {
          pendingPayouts: pendingPayoutsAmount.toString(),
          pendingPayoutsCount: pendingPayoutsAgg._count,
          processingPayouts: processingPayoutsAmount.toString(),
          processingPayoutsCount: processingPayoutsAgg._count,
          lockedFunds: lockedFunds.toString(),
          availableBalance: availableBalance.toString(),
        },
        verification: {
          accountBalance: currentBalance.toString(),
          computedFromRevenue: computedBalance.toString(),
          latestLedgerBalance: ledgerBalance.toString(),
          allMatch: balancesMatch,
          hasLedger,
          discrepancies: {
            revenueVsLedgerCredits: revenueVsCredits.toString(),
            payoutsVsLedgerDebits: payoutsVsDebits.toString(),
            computedVsLedger: computedVsLedger.toString(),
            reason: discrepancyReason,
          },
        },
      };

      // Cache the result for 30 seconds
      await setAccountCache(userId, result);

      return result;
    } catch (error) {
      logger.error(
        `Failed to fetch account details for user ${userId}: ${error}`,
      );
      throw new Error("Failed to fetch account details");
    }
  }
}
