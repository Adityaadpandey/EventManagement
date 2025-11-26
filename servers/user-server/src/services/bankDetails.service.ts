import { prisma } from "../config/db";
import logger from "../config/logger";
import { BankDetails, Lister } from "../generated/prisma/client";
import { BankDetailsCreateWithoutListerInput } from "../generated/prisma/models";
import { NotFoundError } from "../utils/errors";

export class BankDetailsService {
  async addOrUpdateBankDetails(
    userId: string,
    payload: BankDetailsCreateWithoutListerInput,
  ): Promise<BankDetails> {
    try {
      // Check if the lister exists for the given userId
      const lister = await prisma.lister.findUnique({
        where: { userId },
      });
      if (!lister) {
        throw new NotFoundError("Lister not found for the given user ID");
      }

      // Upsert bank details for the lister
      const bankDetails = await prisma.bankDetails.upsert({
        where: { listerId: lister.listerId },
        create: {
          bankName: payload.bankName,
          accountNumber: payload.accountNumber,
          ifscCode: payload.ifscCode,
          branchCode: payload.branchCode || null,
          accountHolderName: payload.accountHolderName,
          lister: {
            connect: { listerId: lister.listerId },
          },
        },
        update: {
          bankName: payload.bankName,
          accountNumber: payload.accountNumber,
          ifscCode: payload.ifscCode,
          branchCode: payload.branchCode,
        },
      });

      return bankDetails;
    } catch (error) {
      logger.error("Error adding bank details:", error);
      throw new Error("Failed to add bank details");
    }
  }

  async getBankDetails(userId: string): Promise<Lister> {
    try {
      // Find the lister associated with the userId
      const bankDetails = await prisma.lister.findUnique({
        where: { userId },
        include: {
          BankDetails: true,
        },
      });
      if (!bankDetails || !bankDetails.BankDetails) {
        throw new NotFoundError(
          "Banking Details not found for the given user ID",
        );
      }
      return bankDetails;
    } catch (error) {
      logger.error("Error fetching bank details:", error);
      throw new Error("Failed to fetch bank details");
    }
  }
}
