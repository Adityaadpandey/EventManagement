import { prisma } from "../config/db";
import logger from "../config/logger";
import { redis } from "../config/redis";
import { createToken } from "../lib/jwt-token";
import { setCachedUser } from "../lib/redis-fn";
import { sendSMS } from "../lib/twilio-sms";

class AuthService {
  async requestOtp(phone: string): Promise<{ message: string }> {
    try {
      const otpKey = `otp:${phone}`;
      const countKey = `otp:count:${phone}`;

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
        sendSMS(otp, phone).catch((err) =>
          logger.error("Failed to send SMS:", err),
        );
        return { message: "OTP request received. SMS is being sent." };
      } catch (_error) {
        // Clean up Redis if SMS sending fails
        await redis.del(otpKey);
        throw new Error("Failed to send OTP via SMS");
      }
    } catch (error) {
      logger.error("Error in requestOtp:", error);
      throw error;
    }
  }

  async verifyOtp(phone: string, otp: string): Promise<any> {
    try {
      const [storedOtp, existingUser] = await Promise.all([
        redis.get(`otp:${phone}`),
        prisma.user.findUnique({
          where: { phone },
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
        const [newUser] = await Promise.all([
          prisma.user.create({
            data: {
              phone,
              phoneVerified: true,
            },
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
          redis.del(`otp:${phone}`),
        ]);
        user = newUser;
      } else {
        // Update existing user if not already verified and delete OTP in parallel
        if (!existingUser.phoneVerified) {
          const [, updatedUser] = await Promise.all([
            redis.del(`otp:${phone}`),
            prisma.user.update({
              where: { phone },
              data: { phoneVerified: true },
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
          await redis.del(`otp:${phone}`);
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
