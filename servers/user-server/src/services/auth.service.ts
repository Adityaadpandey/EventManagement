import { prisma } from "../config/db";
import logger from "../config/logger";
import { redis } from "../config/redis";
import { createToken, sendSMS } from "../lib";
import { setCachedUser } from "../lib/redis-fn";

class AuthService {
  async requestOtp(phone: string): Promise<{ message: string }> {
    try {
      // Check if the otp for this is already present
      const existingOtp = await redis.get(`otp:${phone}`);
      if (existingOtp) {
        throw new Error(
          "OTP already requested. Please wait before requesting a new one.",
        );
      }

      // Generate a random 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store OTP in Redis with 5 min TTL
      await redis.setex(`otp:${phone}`, 300, otp);

      // Send the OTP via SMS
      try {
        await sendSMS(otp, phone);
        return { message: "OTP sent successfully" };
      } catch (error) {
        // Clean up Redis if SMS fails
        await redis.del(`otp:${phone}`);
        throw new Error("Failed to send OTP via SMS");
      }
    } catch (error) {
      logger.error("Error in requestOtp:", error);
      throw error;
    }
  }

  async verifyOtp(phone: string, otp: string): Promise<any> {
    try {
      // Step 1: Verify OTP and get user in parallel
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

      // Step 2: Validate OTP
      if (!storedOtp) {
        throw new Error("OTP not found or expired");
      }

      if (storedOtp !== otp) {
        throw new Error("Invalid OTP");
      }

      // Step 3: Handle user creation/update and OTP deletion in parallel
      let user;

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

      // Step 4: Validate user
      if (!user || !user.userId) {
        throw new Error("Failed to create or retrieve user");
      }

      if (!user.isActive) {
        throw new Error("Account has been deactivated");
      }

      // Step 5: Create token and cache user data in parallel
      const token = createToken(user.userId);

      // Cache the user data for future auth middleware calls
      setCachedUser(user.userId, user).catch((error) => {
        logger.error("Failed to cache user:", error);
        // Don't throw as the main operation succeeded
      });

      // Step 6: Return response
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
