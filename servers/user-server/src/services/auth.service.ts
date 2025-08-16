import { prisma } from "../config/db";
import { redis } from "../config/redis";
import { createToken, sendSMS } from "../lib";

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
      console.error("Error in requestOtp:", error);
      throw error;
    }
  }

  async verifyOtp(phone: string, otp: string): Promise<any> {
    try {
      // Retrieve the OTP from Redis
      const storedOtp = await redis.get(`otp:${phone}`);
      if (!storedOtp) {
        throw new Error("OTP not found or expired");
      }

      // Check if the provided OTP matches the stored OTP
      if (storedOtp !== otp) {
        throw new Error("Invalid OTP");
      }

      // If valid, delete the OTP from Redis
      await redis.del(`otp:${phone}`);

      let user = await prisma.user.findUnique({ where: { phone } });

      // If user does not exist, create a new user
      if (!user) {
        user = await prisma.user.create({
          data: { phone, phoneVerified: true },
        });
      } else {
        user = await prisma.user.update({
          where: { phone },
          data: { phoneVerified: true },
        });
      }

      // Verify user object exists and has required properties
      if (!user) {
        throw new Error("Failed to create or retrieve user");
      }

      if (!user.userId) {
        throw new Error("User object missing userId property");
      }

      // Create a token for the user
      const token = createToken(user.userId);

      // Safely destructure with defaults
      const { userId = user.userId, name = null, role = "user" } = user;

      return {
        token,
        user: { userId, phone, name, role },
      };
    } catch (error) {
      console.error("Error in verifyOtp:", error);
      throw error;
    }
  }
}

export default AuthService;
