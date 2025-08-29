import ejs from "ejs";
import path from "path";
import QRCode from "qrcode";
import logger from "../config/logger";
import {
  EventUpdateEmailContent,
  TicketEmailContent,
} from "../types/emailContent";
import { emailQueue } from "./queues";

type EmailPayload =
  | { type: "ticket"; content: TicketEmailContent }
  | { type: "event-update"; content: EventUpdateEmailContent };

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

    const qrData = payload.content.ticket.ticketId;
    const qrCodeBase64 = await QRCode.toDataURL(qrData);

    // Strip prefix for Nodemailer attachment
    const qrImageBuffer = qrCodeBase64.split(",")[1];

    templateData = {
      name,
      ticket: payload.content.ticket,
    };

    attachments.push({
      filename: "ticket-qr.png",
      content: qrImageBuffer,
      encoding: "base64",
      cid: "ticketqr@eventify",
    });
  } else if (payload.type === "event-update") {
    templateFile = "event-update.ejs";

    templateData = {
      name,
      eventUpdate: payload.content.eventUpdate,
    };
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
