import { prisma } from "../config/db";
import logger from "../config/logger";
import { Prisma } from "../generated/prisma/client";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../utils/errors";

export class PayoutService {
  /**
   * Initialize ledger for a lister account
   * Creates CREDIT entries for all past revenue that doesn't have ledger entries
   */
  async initializeLedger(accountId: string, listerId: string) {
    try {
      // Check if ledger is already initialized

      const existingEntries = await prisma.ledgerEntry.count({
        where: { accountId },
      });

      if (existingEntries > 0) {
        logger.info(`Ledger already initialized for account ${accountId}`);
        return;
      }

      // Get all events for this lister with their revenue
      const events = await prisma.event.findMany({
        where: { listerId },
        include: {
          EventAnalytics: {
            select: {
              revenue: true,
            },
          },
        },
      });

      let runningBalance = new Prisma.Decimal(0);

      // Create ledger entries for each event's revenue
      for (const event of events) {
        const revenue = event.EventAnalytics?.revenue || new Prisma.Decimal(0);

        if (revenue.greaterThan(0)) {
          runningBalance = runningBalance.plus(revenue);

          await prisma.ledgerEntry.create({
            data: {
              accountId,
              entryType: "CREDIT",
              amount: revenue,
              balanceAfter: runningBalance,
              referenceType: "EVENT_REVENUE",
              referenceId: event.eventId,
            },
          });

          logger.info(
            `Created ledger entry for event ${event.eventId}: ${revenue}`,
          );
        }
      }

      // Update account balance
      await prisma.account.update({
        where: { accountId },
        data: { balance: runningBalance },
      });

      logger.info(
        `Ledger initialized for account ${accountId} with balance ${runningBalance}`,
      );
    } catch (error) {
      logger.error(`Failed to initialize ledger: ${error}`);
      throw new Error("Failed to initialize ledger");
    }
  }

  /**
   * Create a ledger entry and update account balance
   */
  private async createLedgerEntry(
    accountId: string,
    entryType: "CREDIT" | "DEBIT",
    amount: Prisma.Decimal,
    referenceType: string,
    referenceId: string,
  ) {
    try {
      // Get current balance
      const account = await prisma.account.findUnique({
        where: { accountId },
        select: { balance: true },
      });

      if (!account) {
        throw new NotFoundError("Account not found");
      }

      // Calculate new balance
      const newBalance =
        entryType === "CREDIT"
          ? account.balance.plus(amount)
          : account.balance.minus(amount);

      // Create ledger entry and update balance in a transaction
      const [ledgerEntry] = await prisma.$transaction([
        prisma.ledgerEntry.create({
          data: {
            accountId,
            entryType,
            amount,
            balanceAfter: newBalance,
            referenceType,
            referenceId,
          },
        }),
        prisma.account.update({
          where: { accountId },
          data: { balance: newBalance },
        }),
      ]);

      logger.info(
        `Ledger entry created: ${entryType} ${amount} for ${referenceType} ${referenceId}`,
      );

      return ledgerEntry;
    } catch (error) {
      logger.error(`Failed to create ledger entry: ${error}`);
      throw new Error("Failed to create ledger entry");
    }
  }

  /**
   * Request a payout for a specific event or across all events
   * OPTIMIZED: Simplified balance checks, trusts ledger worker for reconciliation
   */
  async requestPayout(
    userId: string,
    data: {
      amount: number;
      eventId?: string;
      type: "FULL" | "PARTIAL";
      remark?: string;
    },
  ) {
    try {
      // Optimized query with selective fields
      const lister = await prisma.lister.findUnique({
        where: { userId },
        select: {
          listerId: true,
          Account: {
            select: {
              accountId: true,
              balance: true,
            },
          },
          BankDetails: {
            select: {
              bankDetailsId: true,
            },
          },
        },
      });

      if (!lister) {
        throw new NotFoundError("Lister profile not found");
      }

      // Check if bank details exist
      if (!lister.BankDetails) {
        throw new BadRequestError(
          "Please add bank details before requesting payout",
        );
      }

      // Check if account exists
      if (!lister.Account) {
        throw new BadRequestError(
          "Account not initialized. Please contact support.",
        );
      }

      // Validate amount
      const requestedAmount = new Prisma.Decimal(data.amount);

      if (requestedAmount.lessThanOrEqualTo(0)) {
        throw new BadRequestError("Payout amount must be greater than 0");
      }

      // SIMPLIFIED BALANCE CHECK - Trust ledger worker for reconciliation
      // Only check account balance and locked funds
      const [pendingPayouts, eventCheck] = await Promise.all([
        // Get locked funds (PENDING + PROCESSING)
        prisma.payout.aggregate({
          where: {
            listerId: lister.listerId,
            status: { in: ["PENDING", "PROCESSING"] },
          },
          _sum: { amount: true },
        }),
        // If event-specific, verify event exists and belongs to lister
        data.eventId
          ? prisma.event.findFirst({
              where: {
                eventId: data.eventId,
                listerId: lister.listerId,
              },
              select: { eventId: true },
            })
          : Promise.resolve(null),
      ]);

      // Verify event ownership if event-specific payout
      if (data.eventId && !eventCheck) {
        throw new NotFoundError("Event not found or access denied");
      }

      const accountBalance = lister.Account.balance;
      const lockedFunds = new Prisma.Decimal(pendingPayouts._sum.amount || 0);
      const availableBalance = accountBalance.minus(lockedFunds);

      // Simple balance check - trust ledger worker for reconciliation
      if (requestedAmount.greaterThan(availableBalance)) {
        throw new BadRequestError(
          `Insufficient available balance. Total Balance: ${accountBalance}, Locked: ${lockedFunds}, Available: ${availableBalance}, Requested: ${requestedAmount}`,
        );
      }

      // Create payout request
      const payoutData: any = {
        listerId: lister.listerId,
        type: data.type,
        amount: requestedAmount,
        status: "PENDING",
        remark: data.remark,
      };

      // Only add eventId if provided (for event-specific payouts)
      if (data.eventId) {
        payoutData.eventId = data.eventId;
      }

      const payout = await prisma.payout.create({
        data: payoutData,
        include: {
          event: {
            select: {
              title: true,
              eventId: true,
            },
          },
          lister: {
            select: {
              companyName: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      logger.info(
        `Payout request created: ${payout.payoutId} for ${requestedAmount}`,
      );

      return payout;
    } catch (error) {
      logger.error(`Payout request failed for user ${userId}: ${error}`);
      throw error;
    }
  }

  /**
   * Get all payout requests for a lister
   */
  async getPayouts(userId: string, status?: string) {
    try {
      const lister = await prisma.lister.findUnique({
        where: { userId },
      });

      if (!lister) {
        throw new NotFoundError("Lister profile not found");
      }

      const whereClause: any = {
        listerId: lister.listerId,
      };

      if (status) {
        whereClause.status = status;
      }

      const payouts = await prisma.payout.findMany({
        where: whereClause,
        include: {
          event: {
            select: {
              title: true,
              eventId: true,
              date: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return payouts;
    } catch (error) {
      logger.error(`Failed to fetch payouts for user ${userId}: ${error}`);
      throw new Error("Failed to fetch payouts");
    }
  }

  /**
   * Get payout details by ID
   */
  async getPayoutById(payoutId: string, userId: string) {
    try {
      const payout = await prisma.payout.findUnique({
        where: { payoutId },
        include: {
          event: {
            select: {
              title: true,
              eventId: true,
              date: true,
            },
          },
          lister: {
            select: {
              userId: true,
              companyName: true,
              BankDetails: true,
            },
          },
        },
      });

      if (!payout) {
        throw new NotFoundError("Payout not found");
      }

      // Verify ownership
      if (payout.lister.userId !== userId) {
        throw new UnauthorizedError("Access denied");
      }

      return payout;
    } catch (error) {
      logger.error(`Failed to fetch payout ${payoutId}: ${error}`);
      throw new Error("Failed to fetch payout details");
    }
  }

  /**
   * Admin: Approve payout request
   */
  async approvePayout(
    payoutId: string,
    approvedAmount?: number,
    adminRemark?: string,
  ) {
    try {
      const payout = await prisma.payout.findUnique({
        where: { payoutId },
        include: {
          lister: {
            include: {
              Account: true,
            },
          },
        },
      });

      if (!payout) {
        throw new NotFoundError("Payout not found");
      }

      if (payout.status !== "PENDING") {
        throw new BadRequestError(
          `Cannot approve payout with status ${payout.status}`,
        );
      }

      const account = payout.lister.Account;
      if (!account) {
        throw new NotFoundError("Account not found for lister");
      }

      // Use approved amount or requested amount
      const finalAmount = approvedAmount
        ? new Prisma.Decimal(approvedAmount)
        : payout.amount;

      // Validate balance
      if (finalAmount.greaterThan(account.balance)) {
        throw new BadRequestError(
          `Insufficient balance. Available: ${account.balance}, Approved: ${finalAmount}`,
        );
      }

      // Update payout status to PROCESSING
      const updatedPayout = await prisma.payout.update({
        where: { payoutId },
        data: {
          status: "PROCESSING",
          approvedAmount: finalAmount,
          approvedAt: new Date(),
          remark: adminRemark || payout.remark,
        },
      });

      // Create DEBIT ledger entry
      await this.createLedgerEntry(
        account.accountId,
        "DEBIT",
        finalAmount,
        "PAYOUT",
        payoutId,
      );

      logger.info(`Payout ${payoutId} approved for amount ${finalAmount}`);

      return updatedPayout;
    } catch (error) {
      logger.error(`Failed to approve payout ${payoutId}: ${error}`);
      throw new Error("Payout approval failed");
    }
  }

  /**
   * Admin: Mark payout as completed (after bank transfer)
   */
  async completePayout(payoutId: string) {
    try {
      const payout = await prisma.payout.findUnique({
        where: { payoutId },
      });

      if (!payout) {
        throw new NotFoundError("Payout not found");
      }

      if (payout.status !== "PROCESSING") {
        throw new BadRequestError(
          `Cannot complete payout with status ${payout.status}`,
        );
      }

      const updatedPayout = await prisma.payout.update({
        where: { payoutId },
        data: {
          status: "COMPLETED",
          paidAt: new Date(),
        },
        include: {
          lister: {
            select: {
              companyName: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          event: {
            select: {
              title: true,
            },
          },
        },
      });

      logger.info(`Payout ${payoutId} marked as completed`);

      return updatedPayout;
    } catch (error) {
      logger.error(`Failed to complete payout ${payoutId}: ${error}`);
      throw error;
    }
  }

  /**
   * Admin: Reject payout request
   * If payout is PENDING: just mark as FAILED
   * If payout is PROCESSING: reverse the ledger entry and mark as FAILED
   */
  async rejectPayout(payoutId: string, reason?: string) {
    try {
      const payout = await prisma.payout.findUnique({
        where: { payoutId },
        include: {
          lister: {
            include: {
              Account: true,
            },
          },
        },
      });

      if (!payout) {
        throw new NotFoundError("Payout not found");
      }

      // Can reject PENDING or PROCESSING payouts
      if (!["PENDING", "PROCESSING"].includes(payout.status)) {
        throw new BadRequestError(
          `Cannot reject payout with status ${payout.status}. Use reverse for COMPLETED payouts.`,
        );
      }

      // If PROCESSING, need to reverse the ledger entry
      if (payout.status === "PROCESSING") {
        const account = payout.lister.Account;
        if (!account) {
          throw new NotFoundError("Account not found for lister");
        }

        // Create CREDIT ledger entry to reverse the debit
        const reversalAmount = payout.approvedAmount || payout.amount;
        await this.createLedgerEntry(
          account.accountId,
          "CREDIT",
          reversalAmount,
          "PAYOUT_REVERSAL",
          payoutId,
        );

        logger.info(
          `Reversed ledger entry for rejected payout ${payoutId}: +${reversalAmount}`,
        );
      }

      const updatedPayout = await prisma.payout.update({
        where: { payoutId },
        data: {
          status: "FAILED",
          remark: reason
            ? `Rejected: ${reason}`
            : payout.remark
              ? `Rejected: ${payout.remark}`
              : "Rejected",
        },
      });

      logger.info(
        `Payout ${payoutId} rejected (was ${payout.status}, now FAILED)`,
      );

      return updatedPayout;
    } catch (error) {
      logger.error(`Failed to reject payout ${payoutId}: ${error}`);
      throw new Error("Payout rejection failed");
    }
  }

  /**
   * Cancel payout request (by lister, only if PENDING)
   */
  async cancelPayout(payoutId: string, userId: string) {
    try {
      const payout = await prisma.payout.findUnique({
        where: { payoutId },
        include: {
          lister: {
            select: {
              userId: true,
            },
          },
        },
      });

      if (!payout) {
        throw new NotFoundError("Payout not found");
      }

      // Verify ownership
      if (payout.lister.userId !== userId) {
        throw new UnauthorizedError("Access denied");
      }

      if (payout.status !== "PENDING") {
        throw new BadRequestError(
          `Cannot cancel payout with status ${payout.status}`,
        );
      }

      const updatedPayout = await prisma.payout.update({
        where: { payoutId },
        data: {
          status: "CANCELLED",
        },
      });

      logger.info(`Payout ${payoutId} cancelled by user`);

      return updatedPayout;
    } catch (error) {
      logger.error(`Failed to cancel payout ${payoutId}: ${error}`);
      throw new Error("Payout cancellation failed");
    }
  }

  /**
   * Reverse a payout (admin only, if payment failed after PROCESSING)
   */
  async reversePayout(payoutId: string, reason: string) {
    try {
      const payout = await prisma.payout.findUnique({
        where: { payoutId },
        include: {
          lister: {
            include: {
              Account: true,
            },
          },
        },
      });

      if (!payout) {
        throw new NotFoundError("Payout not found");
      }

      if (payout.status !== "PROCESSING") {
        throw new BadRequestError(
          `Cannot reverse payout with status ${payout.status}`,
        );
      }

      const account = payout.lister.Account;
      if (!account) {
        throw new NotFoundError("Account not found for lister");
      }

      // Create CREDIT ledger entry to reverse the debit
      await this.createLedgerEntry(
        account.accountId,
        "CREDIT",
        payout.approvedAmount || payout.amount,
        "PAYOUT_REVERSAL",
        payoutId,
      );

      // Update payout status
      const updatedPayout = await prisma.payout.update({
        where: { payoutId },
        data: {
          status: "FAILED",
          remark: `Reversed: ${reason}`,
        },
      });

      logger.info(`Payout ${payoutId} reversed`);

      return updatedPayout;
    } catch (error) {
      logger.error(`Failed to reverse payout ${payoutId}: ${error}`);
      throw new Error("Payout reversal failed");
    }
  }

  /**
   * Get ledger entries for a lister
   */
  async getLedger(userId: string, limit = 50, offset = 0) {
    try {
      const lister = await prisma.lister.findUnique({
        where: { userId },
        include: {
          Account: true,
        },
      });

      if (!lister || !lister.Account) {
        throw new NotFoundError("Account not found");
      }

      // Initialize ledger if needed
      await this.initializeLedger(lister.Account.accountId, lister.listerId);

      const [entries, total] = await Promise.all([
        prisma.ledgerEntry.findMany({
          where: { accountId: lister.Account.accountId },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        }),
        prisma.ledgerEntry.count({
          where: { accountId: lister.Account.accountId },
        }),
      ]);
      // Enrich entries with reference details
      const enrichedEntries = await Promise.all(
        entries.map(async (entry) => {
          let referenceDetails = null;

          if (entry.referenceType === "EVENT_REVENUE" && entry.referenceId) {
            const event = await prisma.event.findUnique({
              where: { eventId: entry.referenceId },
              select: { title: true, date: true },
            });
            referenceDetails = event;
          } else if (
            (entry.referenceType === "PAYOUT" ||
              entry.referenceType === "PAYOUT_REVERSAL") &&
            entry.referenceId
          ) {
            const payout = await prisma.payout.findUnique({
              where: { payoutId: entry.referenceId },
              select: { status: true, remark: true },
            });
            referenceDetails = payout;
          }

          return {
            ...entry,
            referenceDetails,
          };
        }),
      );

      return {
        entries: enrichedEntries,
        total,
        currentBalance: lister.Account.balance,
      };
    } catch (error) {
      logger.error(`Failed to fetch ledger for user ${userId}: ${error}`);
      throw new Error("Failed to fetch ledger");
    }
  }

  /**
   * Admin: Get all payout requests
   */
  async getAllPayouts(status?: string, limit = 50, offset = 0) {
    try {
      const whereClause: any = {};

      if (status) {
        whereClause.status = status;
      }

      const [payouts, total] = await Promise.all([
        prisma.payout.findMany({
          where: whereClause,
          include: {
            lister: {
              select: {
                companyName: true,
                BankDetails: true,
                user: {
                  select: {
                    name: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
            event: {
              select: {
                title: true,
                date: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        }),
        prisma.payout.count({
          where: whereClause,
        }),
      ]);

      return {
        payouts,
        total,
      };
    } catch (error) {
      logger.error(`Failed to fetch all payouts: ${error}`);
      throw new Error("Failed to fetch payouts");
    }
  }

  /**
   * Reconcile account balance from multiple sources
   * This ensures data integrity by cross-checking all sources
   */
  async reconcileBalance(listerId: string) {
    try {
      const lister = await prisma.lister.findUnique({
        where: { listerId },
        include: { Account: true },
      });

      if (!lister || !lister.Account) {
        throw new NotFoundError("Account not found");
      }

      // Get balance from all sources
      const [totalRevenue, completedPayouts, ledgerEntries] = await Promise.all(
        [
          // Source 1: EventAnalytics revenue
          prisma.eventAnalytics.aggregate({
            where: {
              event: { listerId },
            },
            _sum: { revenue: true },
          }),
          // Source 2: Completed payouts
          prisma.payout.aggregate({
            where: {
              listerId,
              status: "COMPLETED",
            },
            _sum: { approvedAmount: true },
          }),
          // Source 3: Ledger entries
          prisma.ledgerEntry.aggregate({
            where: {
              accountId: lister.Account.accountId,
            },
            _sum: { amount: true },
            _count: true,
          }),
        ],
      );

      // Get latest ledger balance
      const latestLedger = await prisma.ledgerEntry.findFirst({
        where: { accountId: lister.Account.accountId },
        orderBy: { createdAt: "desc" },
        select: { balanceAfter: true },
      });

      // Calculate expected balances
      const revenueTotal = new Prisma.Decimal(totalRevenue._sum.revenue || 0);
      const payoutsTotal = new Prisma.Decimal(
        completedPayouts._sum.approvedAmount || 0,
      );
      const computedFromRevenue = revenueTotal.minus(payoutsTotal);
      const ledgerBalance = latestLedger?.balanceAfter || new Prisma.Decimal(0);
      const currentAccountBalance = lister.Account.balance;

      // Determine the correct balance
      let correctBalance: Prisma.Decimal;
      let source: string;

      if (ledgerEntries._count > 0) {
        // If ledger exists, trust it as the source of truth
        correctBalance = ledgerBalance;
        source = "ledger";
      } else {
        // If no ledger, use computed from revenue
        correctBalance = computedFromRevenue;
        source = "computed";
      }

      // Check for discrepancies
      const discrepancy = !currentAccountBalance.equals(correctBalance);

      if (discrepancy) {
        logger.warn("Balance discrepancy detected during reconciliation", {
          listerId,
          currentBalance: currentAccountBalance.toString(),
          correctBalance: correctBalance.toString(),
          source,
          revenue: revenueTotal.toString(),
          payouts: payoutsTotal.toString(),
          ledgerBalance: ledgerBalance.toString(),
        });

        // Update account balance
        await prisma.account.update({
          where: { accountId: lister.Account.accountId },
          data: { balance: correctBalance },
        });

        logger.info("Account balance reconciled", {
          listerId,
          oldBalance: currentAccountBalance.toString(),
          newBalance: correctBalance.toString(),
        });
      }

      return {
        reconciled: discrepancy,
        previousBalance: currentAccountBalance.toString(),
        currentBalance: correctBalance.toString(),
        source,
        breakdown: {
          totalRevenue: revenueTotal.toString(),
          completedPayouts: payoutsTotal.toString(),
          computedBalance: computedFromRevenue.toString(),
          ledgerBalance: ledgerBalance.toString(),
          ledgerEntryCount: ledgerEntries._count,
        },
      };
    } catch (error) {
      logger.error(
        `Failed to reconcile balance for lister ${listerId}: ${error}`,
      );
      throw new Error("Balance reconciliation failed");
    }
  }
}
