import "dotenv/config";

interface Config {
  SERVICE_NAME: string;
  PORT: number;
  CORS_ORIGIN: string;
  LOG_LEVEL: string;
  NODE_ENV: string;
  REDIS_URL: string;
  JWT_SECRET: string;

  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_PHONE_NUMBER: string;

  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  RAZORPAY_WEBHOOK_SECRET: string;

  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASS: string;
}

export const config: Config = {
  SERVICE_NAME: require("../../package.json").name || "user-server",
  PORT: Number.parseInt(process.env.PORT || "7001", 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || "https://www.tixin.in",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  NODE_ENV: process.env.NODE_ENV || "development",
  REDIS_URL: process.env.REDIS_URL || "",
  JWT_SECRET: process.env.JWT_SECRET || "default_secret_key",
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || "",
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || "",
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || "",
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || "",
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || "",
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || "",
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  // SMTP_EMAIL_USER: process.env.SMTP_EMAIL_USER || "",
  // SMTP_EMAIL_PASS: process.env.SMTP_EMAIL_PASS || "",
};
