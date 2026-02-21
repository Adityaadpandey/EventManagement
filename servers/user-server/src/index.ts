import { startServer } from "./app";
import { startSubscriptionCleanupJob } from "./jobs/cleanup-subscriptions.job";
import { startEventReminderJob } from "./jobs/schedule-event-reminders.job";
import "./workers/notification.worker";

startServer();
// to be done for prod also
startEventReminderJob();
startSubscriptionCleanupJob();
