import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { getLogger } from "@repo/logger";
import { Job, Worker } from "bullmq";
import { config } from "../config";
import { redis } from "../config/redis";

const logger: any = getLogger("Email Worker", "debug");

// Configure AWS SES client
const sesClient = new SESClient({
  region: config.AWS_REGION,
  credentials: {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  },
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
      // Basic email without attachments
      if (!attachments || attachments.length === 0) {
        const command = new SendEmailCommand({
          Source: "Tixin <noreply@tixin.in>",
          Destination: {
            ToAddresses: [to],
          },
          Message: {
            Subject: {
              Data: subject,
              Charset: "UTF-8",
            },
            Body: {
              Html: {
                Data: html,
                Charset: "UTF-8",
              },
            },
          },
        });

        await sesClient.send(command);
        logger.info(`Email sent to ${to}`);
      } else {
        // For emails with attachments, use SendRawEmail
        const { SendRawEmailCommand } = await import("@aws-sdk/client-ses");

        // Build MIME message
        const boundary = `----=_Part_${Date.now()}`;
        let rawMessage = [
          `From: Tixin <noreply@tixin.in>`,
          `To: ${to}`,
          `Subject: ${subject}`,
          `MIME-Version: 1.0`,
          `Content-Type: multipart/mixed; boundary="${boundary}"`,
          ``,
          `--${boundary}`,
          `Content-Type: text/html; charset=UTF-8`,
          `Content-Transfer-Encoding: 7bit`,
          ``,
          html,
        ];

        // Add attachments
        attachments.forEach((attachment) => {
          rawMessage.push(
            `--${boundary}`,
            `Content-Type: application/octet-stream; name="${attachment.filename}"`,
            `Content-Transfer-Encoding: ${attachment.encoding}`,
            `Content-Disposition: attachment; filename="${attachment.filename}"`,
            `Content-ID: <${attachment.cid}>`,
            ``,
            attachment.content,
          );
        });

        rawMessage.push(`--${boundary}--`);

        const command = new SendRawEmailCommand({
          RawMessage: {
            Data: Buffer.from(rawMessage.join("\r\n")),
          },
        });

        await sesClient.send(command);
        logger.info(`Email with attachments sent to ${to}`);
      }
    } catch (err) {
      logger.error(`Failed to send email to ${to}`, err);
      throw err; // For retry
    }
  },
  {
    connection: redis,
    limiter: {
      max: 12, // Max 12 jobs
      duration: 1000, // Per 1000ms = 1 sec
    },
  },
);

emailWorker.on("failed", (job: any, err) => {
  logger.error(`Email job ${job.id} failed:`, err);
});
