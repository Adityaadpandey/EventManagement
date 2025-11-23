import "dotenv/config";

interface Config {
  SERVICE_NAME: string;
  PORT: number;
  CORS_ORIGIN: string;
  DATABASE_URL: string;
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

  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;

  AWS_REGION: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
}

/**
 * Validate that required environment variables are present
 */
const validateEnv = () => {
  const isProduction = process.env.NODE_ENV === "production";
  const requiredVars: Array<{
    key: string;
    value: string | undefined;
    productionOnly?: boolean;
  }> = [
    // { key: "DATABASE_URL", value: process.env.DATABASE_URL },
    { key: "REDIS_URL", value: process.env.REDIS_URL },
    { key: "JWT_SECRET", value: process.env.JWT_SECRET, productionOnly: true },
    {
      key: "RAZORPAY_KEY_ID",
      value: process.env.RAZORPAY_KEY_ID,
      productionOnly: true,
    },
    {
      key: "RAZORPAY_KEY_SECRET",
      value: process.env.RAZORPAY_KEY_SECRET,
      productionOnly: true,
    },
    { key: "SMTP_HOST", value: process.env.SMTP_HOST, productionOnly: true },
    { key: "SMTP_USER", value: process.env.SMTP_USER, productionOnly: true },
    { key: "SMTP_PASS", value: process.env.SMTP_PASS, productionOnly: true },
  ];

  const missingVars: string[] = [];

  for (const { key, value, productionOnly } of requiredVars) {
    // Skip production-only checks in development
    if (productionOnly && !isProduction) continue;

    if (!value || value.trim() === "") {
      missingVars.push(key);
    }
  }

  // Check for insecure defaults in production
  if (isProduction) {
    if (process.env.JWT_SECRET === "default_secret_key") {
      missingVars.push("JWT_SECRET (using insecure default)");
    }
  }

  if (missingVars.length > 0) {
    const errorMsg = `Missing required environment variables: ${missingVars.join(", ")}`;
    console.error(`${errorMsg}`);
    throw new Error(errorMsg);
  }

  console.log("Environment variables validated successfully");
};

// Validate environment on module load
validateEnv();

export const config: Config = {
  SERVICE_NAME: require("../../package.json").name || "server",
  PORT: Number.parseInt(process.env.PORT || "7001", 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || "https://www.tixin.in",
  DATABASE_URL: process.env.DATABASE_URL || "",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  NODE_ENV: process.env.NODE_ENV || "development",
  REDIS_URL: process.env.REDIS_URL!,
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

  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || "",
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || "",

  AWS_REGION: process.env.AWS_REGION || "us-east-1",
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || "",
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || "",
};
