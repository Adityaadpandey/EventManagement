import { prisma } from "../config/db";
import logger from "../config/logger";

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
      return { data: newCode };
    } catch (error) {
      logger.error("Failed to create discount code:", error);
      return { error: "Failed to create discount code" };
    }
  }

  async getDiscountCodesByEvent(eventId: string) {
    try {
      const codes = await prisma.discountCode.findMany({
        where: { eventId },
        orderBy: { createdAt: "desc" },
      });
      return { data: codes };
    } catch (error) {
      logger.error("Failed to get discount codes:", error);
      return { error: "Failed to Get the Event's Discount Codes" };
    }
  }

  async getCodeInfoById(code: string, eventId: string) {
    try {
      const codeInfo = await prisma.discountCode.findFirst({
        where: {
          code: code.toUpperCase(),
          eventId,
        },
      });
      if (!codeInfo) {
        return { error: "Discount code not found" };
      }
      return { data: codeInfo };
    } catch (error) {
      logger.error("Failed to get discount code info:", error);
      return { error: "Failed to get discount code Info" };
    }
  }

  /**
   * Calculate discount amount based on order total
   */
  calculateDiscount(
    orderAmount: number,
    discount: any,
  ): {
    discountAmount: number;
    finalPrice: number;
    discountApplied: boolean;
    reason?: string;
  } {
    // Check minimum order amount
    if (discount.minOrderAmt && orderAmount < discount.minOrderAmt) {
      return {
        discountAmount: 0,
        finalPrice: orderAmount,
        discountApplied: false,
        reason: `Minimum order amount of ₹${discount.minOrderAmt} required`,
      };
    }

    let discountAmount = 0;

    // Calculate based on discount type
    if (discount.discountType === "PERCENTAGE" && discount.discountPct) {
      discountAmount = (orderAmount * discount.discountPct) / 100;
    } else if (discount.discountType === "FLAT" && discount.discountAmt) {
      discountAmount = discount.discountAmt;
    }

    // Apply max discount cap if specified
    if (discount.maxDiscount && discountAmount > discount.maxDiscount) {
      discountAmount = discount.maxDiscount;
    }

    // Ensure discount doesn't exceed order amount
    discountAmount = Math.min(discountAmount, orderAmount);

    const finalPrice = Math.max(0, orderAmount - discountAmount);

    return {
      discountAmount,
      finalPrice,
      discountApplied: true,
    };
  }
}
