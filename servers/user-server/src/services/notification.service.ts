import webpush from "web-push";
import { config } from "../config";

webpush.setVapidDetails(
  "mailto:your-email@example.com",
  config.VAPID_PUBLIC_KEY!,
  config.VAPID_PRIVATE_KEY!,
);

export class NotificationService {}
