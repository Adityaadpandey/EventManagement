import { Request, Response } from "express";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import AuthService from "../services/auth.service";

const normalizePhone = (rawPhone: string) => {
  const phone = parsePhoneNumberFromString(rawPhone, "IN");
  if (!phone?.isValid()) throw new Error("Invalid phone number");
  return phone.number;
};

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async requestOtp(req: Request, res: Response) {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    try {
      const normalizedPhone = normalizePhone(phone);
      await this.authService.requestOtp(normalizedPhone);
      res.status(200).json({ message: "OTP sent successfully" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async verifyOtp(req: Request, res: Response) {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res
        .status(400)
        .json({ error: "Phone number and OTP are required" });
    }

    try {
      const normalizedPhone = normalizePhone(phone);
      const data = await this.authService.verifyOtp(normalizedPhone, otp);
      res.status(200).json({ data });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
