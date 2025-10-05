import { Job, Worker } from "bullmq";
import nodemailer from "nodemailer";
import { config } from "../config";
import logger from "../config/logger";
import { redis } from "../config/redis";

// Configure transporter
const transporter = nodemailer.createTransport({
  service: "gmail", // or another provider
  auth: {
    user: config.SMTP_EMAIL_USER,
    pass: config.SMTP_EMAIL_PASS,
  },
  // logger: true, // Log to console
  // debug: true, // Include SMTP traffic in logs
});

// Email job data interface
interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  attachments?: {
    filename: string;
    content: string;
    encoding: string;
    cid: string;
  }[];
}

export const emailWorker = new Worker(
  "emails",
  async (job: Job<EmailJobData>) => {
    const { to, subject, html, attachments } = job.data;

    try {
      await transporter.sendMail({
        from: `"Tixin" <${config.SMTP_EMAIL_USER}>`,
        to,
        subject,
        html,
        attachments: attachments || [],
      });

      logger.info(`✅ Email sent to ${to}`);
    } catch (err) {
      logger.error(`❌ Failed to send email to ${to}`, err);
      throw err; // For retry
    }
  },
  { connection: redis },
);

emailWorker.on("failed", (job: any, err) => {
  logger.error(`Email job ${job.id} failed:`, err);
});
