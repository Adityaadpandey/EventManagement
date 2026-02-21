import { parsePhoneNumberFromString } from "libphonenumber-js";
import { prisma } from "../config/db";
import logger from "../config/logger";
import { redis } from "../config/redis";
import {
  buildCacheKey,
  CACHE_PREFIX,
  setTokenCache,
  setUserCache,
} from "../lib/cache";
import { createToken } from "../lib/jwt-token";
import { sendEmail } from "../lib/mail";
import { otpQueue } from "../lib/queues";
import {
  DatabaseError,
  ExternalServiceError,
  ForbiddenError,
  TooManyRequestsError,
  UnauthorizedError,
  ValidationError,
} from "../utils/errors";

class AuthService {
  async requestOtp(identifier: string): Promise<{ message: string }> {
    try {
      const isEmailType = this.isEmail(identifier);
      const isPhoneType = this.isPhone(identifier);

      if (!isEmailType && !isPhoneType) {
        throw new ValidationError("Invalid email or phone number format");
      }

      // Normalize email or phone
      const normalizedIdentifier = isPhoneType
        ? this.normalizePhone(identifier)
        : this.normalizeEmail(identifier);

      // Use consistent cache key patterns
      const otpKey = buildCacheKey(CACHE_PREFIX.OTP, normalizedIdentifier);
      const countKey = buildCacheKey(
        CACHE_PREFIX.OTP,
        "count",
        normalizedIdentifier,
      );
      const resendCooldownKey = buildCacheKey(
        CACHE_PREFIX.OTP,
        "cooldown",
        normalizedIdentifier,
      );

      // Limit total OTP requests per hour
      const requestCount = await redis.get(countKey);
      if (requestCount && Number.parseInt(requestCount, 10) >= 5) {
        throw new TooManyRequestsError(
          "Too many OTP requests. Please try again after 1 hour.",
        );
      }

      // Check resend cooldown (30s)
      const onCooldown = await redis.get(resendCooldownKey);
      if (onCooldown) {
        throw new TooManyRequestsError(
          "Please wait a few seconds before requesting OTP again.",
        );
      }

      // If an OTP already exists, reuse it (still valid)
      let otp = await redis.get(otpKey);

      if (!otp) {
        otp = Math.floor(100000 + Math.random() * 900000).toString();
        await redis.setex(otpKey, 300, otp); // Valid for 5 minutes
      }

      // Set resend cooldown (30s)
      await redis.setex(resendCooldownKey, 30, "1");

      // Increment request count (max 5/hour)
      const pipeline = redis.pipeline();
      pipeline.incr(countKey);
      pipeline.expire(countKey, 3600); // 1 hour TTL
      await pipeline.exec();

      // Try sending OTP via email or SMS
      try {
        if (isEmailType) {
          await sendEmail(
            normalizedIdentifier,
            "Your OTP for Login",
            { type: "otp", content: { otp } },
            "",
          );

          return { message: "OTP sent to your email address." };
        } else {
          await otpQueue.add(
            "send-otp",
            { otp, to: normalizedIdentifier },
            { attempts: 3, backoff: { type: "exponential", delay: 5000 } },
          );

          return { message: "OTP sent to your phone number." };
        }
      } catch (sendError) {
        // If sending fails, clean up if it was a newly generated OTP
        const existingOtp = await redis.get(otpKey);
        if (!existingOtp) await redis.del(otpKey);
        throw new ExternalServiceError(
          `Failed to send OTP via ${isEmailType ? "Email" : "SMS"}`,
        );
      }
    } catch (error) {
      logger.error("Error in requestOtp:", error);
      throw error;
    }
  }

  async verifyOtp(identifier: string, otp: string): Promise<any> {
    try {
      const isEmailType = this.isEmail(identifier);
      const isPhoneType = this.isPhone(identifier);

      if (!isEmailType && !isPhoneType) {
        throw new ValidationError("Invalid email or phone number format");
      }

      // Normalize email or phone number
      const normalizedIdentifier = isPhoneType
        ? this.normalizePhone(identifier)
        : this.normalizeEmail(identifier);

      // Use consistent cache key pattern
      const otpKey = buildCacheKey(CACHE_PREFIX.OTP, normalizedIdentifier);

      const [storedOtp, existingUser] = await Promise.all([
        redis.get(otpKey),
        isEmailType
          ? prisma.user.findUnique({
              where: { email: normalizedIdentifier },
              select: {
                userId: true,
                name: true,
                phone: true,
                role: true,
                profileComplete: true,
                email: true,
                avatar: true,
                phoneVerified: true,
                emailVerified: true,
                isActive: true,
              },
            })
          : prisma.user.findUnique({
              where: { phone: normalizedIdentifier },
              select: {
                userId: true,
                name: true,
                phone: true,
                role: true,
                profileComplete: true,
                email: true,
                avatar: true,
                phoneVerified: true,
                emailVerified: true,
                isActive: true,
              },
            }),
      ]);

      // Validate OTP
      if (!storedOtp) {
        throw new UnauthorizedError("OTP not found or expired");
      }

      if (storedOtp !== otp) {
        throw new UnauthorizedError("Invalid OTP");
      }

      let user: any;

      if (!existingUser) {
        // Create new user and delete OTP in parallel
        const userData = isEmailType
          ? { email: normalizedIdentifier, emailVerified: true, phone: null }
          : { phone: normalizedIdentifier, phoneVerified: true, email: null };

        const [newUser] = await Promise.all([
          prisma.user.create({
            data: userData,
            select: {
              userId: true,
              name: true,
              phone: true,
              role: true,
              profileComplete: true,
              email: true,
              avatar: true,
              phoneVerified: true,
              emailVerified: true,
              isActive: true,
            },
          }),
          redis.del(otpKey),
        ]);
        user = newUser;
      } else {
        // Update existing user if not already verified and delete OTP in parallel
        const needsUpdate = isEmailType
          ? !existingUser.emailVerified
          : !existingUser.phoneVerified;

        if (needsUpdate) {
          const updateData = isEmailType
            ? { emailVerified: true }
            : { phoneVerified: true };

          const [, updatedUser] = await Promise.all([
            redis.del(otpKey),
            prisma.user.update({
              where: isEmailType
                ? { email: normalizedIdentifier }
                : { phone: normalizedIdentifier },
              data: updateData,
              select: {
                userId: true,
                name: true,
                phone: true,
                role: true,
                profileComplete: true,
                email: true,
                avatar: true,
                phoneVerified: true,
                emailVerified: true,
                isActive: true,
              },
            }),
          ]);
          user = updatedUser;
        } else {
          await redis.del(otpKey);
          user = existingUser;
        }
      }

      // Validate user
      if (!user || !user.userId) {
        throw new DatabaseError("Failed to create or retrieve user");
      }

      if (!user.isActive) {
        throw new ForbiddenError("Account has been deactivated");
      }

      // Create token
      const token = createToken(user.userId, user.role);

      // Cache user data and token in parallel (don't await to avoid blocking)
      Promise.all([
        setUserCache(user.userId, user),
        setTokenCache(token, user.userId),
      ]).catch((error) => {
        logger.error("Failed to cache user/token:", error);
        // Don't throw as the main operation succeeded
      });

      // Return response
      return {
        token,
        user: {
          userId: user.userId,
          name: user.name || null,
          phone: user.phone,
          role: user.role,
          profileComplete: user.profileComplete || false,
          email: user.email || null,
          avatar: user.avatar || null,
          phoneVerified: user.phoneVerified || false,
          emailVerified: user.emailVerified || false,
          isActive: user.isActive !== undefined ? user.isActive : true,
        },
      };
    } catch (error) {
      logger.error("Error in verifyOtp:", error);
      throw error;
    }
  }

  private isEmail(input: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input);
  }

  private isPhone(input: string): boolean {
    const phone = parsePhoneNumberFromString(input, "IN");
    return phone?.isValid() || false;
  }

  private normalizePhone(rawPhone: string): string {
    const phone = parsePhoneNumberFromString(rawPhone, "IN");
    if (!phone?.isValid()) throw new ValidationError("Invalid phone number");
    return phone.number;
  }

  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }
}

export default AuthService;
