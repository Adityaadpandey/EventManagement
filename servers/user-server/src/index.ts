import { startServer } from "./app";
import { startSubscriptionCleanupJob } from "./jobs/cleanup-subscriptions.job";
import { startEventReminderJob } from "./jobs/schedule-event-reminders.job";

startServer();
startEventReminderJob();
startSubscriptionCleanupJob();
