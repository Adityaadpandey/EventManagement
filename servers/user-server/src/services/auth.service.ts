import { parsePhoneNumberFromString } from "libphonenumber-js";
import { prisma } from "../config/db";
import logger from "../config/logger";
import { redis } from "../config/redis";
import { createToken } from "../lib/jwt-token";
import { sendEmail } from "../lib/mail";
import { setCachedUser } from "../lib/redis-fn";
import { sendSMS } from "../lib/twilio-sms";

class AuthService {
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
    if (!phone?.isValid()) throw new Error("Invalid phone number");
    return phone.number;
  }

  async requestOtp(identifier: string): Promise<{ message: string }> {
    try {
      const isEmailType = this.isEmail(identifier);
      const isPhoneType = this.isPhone(identifier);

      if (!isEmailType && !isPhoneType) {
        throw new Error("Invalid email or phone number format");
      }

      // Normalize phone number if it's a phone
      const normalizedIdentifier = isPhoneType
        ? this.normalizePhone(identifier)
        : identifier;

      const otpKey = `otp:${normalizedIdentifier}`;
      const countKey = `otp:count:${normalizedIdentifier}`;

      // Check if the OTP is already active
      const existingOtp = await redis.get(otpKey);
      if (existingOtp) {
        throw new Error(
          "OTP already requested. Please wait before requesting a new one.",
        );
      }

      const requestCount = await redis.get(countKey);
      if (requestCount && Number.parseInt(requestCount, 10) >= 3) {
        throw new Error(
          "Too many OTP requests. Please try again after 1 hour.",
        );
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store with 5-minute TTL
      await redis.setex(otpKey, 300, otp);

      const pipeline = redis.pipeline();
      pipeline.incr(countKey);
      pipeline.expire(countKey, 3600); // 1 hour TTL
      await pipeline.exec();

      try {
        if (isEmailType) {
          // Send OTP email
          await sendEmail(
            normalizedIdentifier,
            "Your OTP for Login",
            { type: "otp", content: { otp } },
            "",
          );
          return { message: "OTP request received. Email is being sent." };
        } else {
          // Send SMS
          sendSMS(otp, normalizedIdentifier).catch((err) =>
            logger.error("Failed to send SMS:", err),
          );
          return { message: "OTP request received. SMS is being sent." };
        }
      } catch (_error) {
        // Clean up Redis if sending fails
        await redis.del(otpKey);
        throw new Error(
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
        throw new Error("Invalid email or phone number format");
      }

      // Normalize phone number if it's a phone
      const normalizedIdentifier = isPhoneType
        ? this.normalizePhone(identifier)
        : identifier;

      const [storedOtp, existingUser] = await Promise.all([
        redis.get(`otp:${normalizedIdentifier}`),
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
        throw new Error("OTP not found or expired");
      }

      if (storedOtp !== otp) {
        throw new Error("Invalid OTP");
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
          redis.del(`otp:${normalizedIdentifier}`),
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
            redis.del(`otp:${normalizedIdentifier}`),
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
          await redis.del(`otp:${normalizedIdentifier}`);
          user = existingUser;
        }
      }

      // Validate user
      if (!user || !user.userId) {
        throw new Error("Failed to create or retrieve user");
      }

      if (!user.isActive) {
        throw new Error("Account has been deactivated");
      }

      // Create token and cache user data in parallel
      const token = createToken(user.userId, user.role);

      // Cache the user data for future auth middleware calls
      setCachedUser(user.userId, user).catch((error) => {
        logger.error("Failed to cache user:", error);
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
}

export default AuthService;
