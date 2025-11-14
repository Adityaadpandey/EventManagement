import { prisma } from "../config/db";
import logger from "../config/logger";
import { getDiscountCache, setDiscountCache } from "../lib/cache";

interface CreateDiscountParams {
  eventId: string;
  code: string;
  description?: string;
  discountType: "PERCENTAGE" | "FLAT";
  discountPct?: number;
  discountAmt?: number;
  maxDiscount?: number;
  minOrderAmt?: number;
  maxUses?: number;
  validFrom: Date;
  validTo: Date;
}

export class DiscountService {
  async createDiscountCode(params: CreateDiscountParams) {
    try {
      const newCode = await prisma.discountCode.create({
        data: {
          eventId: params.eventId,
          code: params.code.toUpperCase(),
          description: params.description,
          discountType: params.discountType,
          discountPct: params.discountPct ?? 0,
          discountAmt: params.discountAmt ?? 0,
          maxDiscount: params.maxDiscount,
          minOrderAmt: params.minOrderAmt,
          maxUses: params.maxUses,
          validFrom: params.validFrom,
          validTo: params.validTo,
        },
      });
      logger.info("Discount code created:", newCode);
      return newCode;
    } catch (error) {
      logger.error("Failed to create discount code:", error);
      throw new Error("Failed to create discount code");
    }
  }

  async getDiscountCodesByEvent(eventId: string) {
    try {
      const codes = await prisma.discountCode.findMany({
        where: { eventId },
        orderBy: { createdAt: "desc" },
      });
      return codes;
    } catch (error) {
      logger.error("Failed to get discount codes:", error);
      throw new Error("Failed to get the event's discount codes");
    }
  }

  async getCodeInfoById(code: string, eventId: string) {
    try {
      const cache = await getDiscountCache(code, eventId);
      if (cache) {
        return cache;
      }

      const codeInfo = await prisma.discountCode.findFirst({
        where: {
          code: code.toUpperCase(),
          eventId,
        },
      });
      if (!codeInfo) {
        throw new Error("Discount code not found");
      }
      setDiscountCache(code, eventId, codeInfo).catch((err) =>
        logger.warn("Failed to cache discount code:", err),
      );
      return codeInfo;
    } catch (error) {
      logger.error("Failed to get discount code info:", error);
      throw new Error("Failed to get discount code info");
    }
  }
}
