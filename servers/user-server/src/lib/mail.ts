import ejs from "ejs";
import path from "path";
import QRCode from "qrcode";
import logger from "../config/logger";
import {
  EventReviewEmailContent,
  EventUpdateEmailContent,
  OtpEmailContent,
  TicketEmailContent,
} from "../types/emailContent";
import { emailQueue } from "./queues";

type EmailPayload =
  | { type: "ticket"; content: TicketEmailContent }
  | { type: "event-update"; content: EventUpdateEmailContent }
  | { type: "otp"; content: OtpEmailContent }
  | { type: "event-publish-lister"; content: EventReviewEmailContent }
  | { type: "event-publish-admin"; content: EventReviewEmailContent }
  | { type: "event-approved"; content: EventReviewEmailContent }
  | { type: "event-rejected"; content: EventReviewEmailContent };

export const sendEmail = async (
  toEmail: string,
  subject: string,
  payload: EmailPayload,
  name = "User",
): Promise<boolean> => {
  if (!toEmail || !payload) {
    logger.error("Missing parameters: toEmail and content are required");
    return false;
  }

  let templateFile = "";
  let templateData: any = {};
  let attachments: any[] = [];

  if (payload.type === "ticket") {
    templateFile = "ticket.ejs";
    const qrCodeBase64 = await QRCode.toDataURL(
      payload.content.ticket.ticketQR,
    );
    const qrImageBuffer = qrCodeBase64.split(",")[1];
    templateData = { name, ticket: payload.content.ticket };
    attachments.push({
      filename: "ticket-qr.png",
      content: qrImageBuffer,
      encoding: "base64",
      cid: "ticketqr@Tixin",
    });
  } else if (payload.type === "event-update") {
    templateFile = "event-update.ejs";
    templateData = { name, eventUpdate: payload.content.eventUpdate };
  } else if (payload.type === "otp") {
    templateFile = "otp.ejs";
    templateData = { name, otp: payload.content.otp };
  } else if (
    payload.type === "event-publish-lister" ||
    payload.type === "event-publish-admin" ||
    payload.type === "event-approved" ||
    payload.type === "event-rejected"
  ) {
    templateFile = `${payload.type}.ejs`;
    templateData = { name, ...payload.content };
  } else {
    logger.error("Invalid email type provided");
    return false;
  }

  try {
    const templatePath = path.join(__dirname, "..", "templates", templateFile);
    const html = await ejs.renderFile(templatePath, templateData);

    await emailQueue.add("sendEmail", {
      to: toEmail,
      subject,
      html,
      attachments,
    });

    logger.info(`Email enqueued for ${toEmail} [${payload.type}]`);
    return true;
  } catch (err) {
    logger.error("Error rendering or enqueuing email:", err);
    return false;
  }
};
