import { prisma } from "../config/db";
import logger from "../config/logger";

export class DiscountService {
  async createDiscountCode(
    eventId: string,
    code: string,
    discountPct: number,
    maxUses: number,
    validFrom: Date,
    validTo: Date,
  ) {
    try {
      const newCode = await prisma.discountCode.create({
        data: {
          eventId,
          code,
          discountPct,
          maxUses,
          validFrom,
          validTo,
        },
      });
      logger.info("Discount code created:", newCode);
      return { data: newCode };
    } catch (error) {
      return { error: "Failed to create discount code" };
    }
  }

  async getDiscountCodesByEvent(eventId: string) {
    try {
      const codes = await prisma.discountCode.findMany({
        where: { eventId },
      });
      return { data: codes };
    } catch (error) {
      return { error: "Failed to Get the Event's Discount Codes" };
    }
  }

  async getCodeInfoById(codeId: string) {
    try {
      const codeInfo = await prisma.discountCode.findUnique({
        where: { codeId },
      });
      if (!codeInfo) {
        return { error: "Discount code not found" };
      }
      return { data: codeInfo };
    } catch (error) {
      return { error: "Failed to get discount code Info" };
    }
  }
}
