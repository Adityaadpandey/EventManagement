import { startServer } from "./app";
import { startEventReminderJob } from "./jobs/schedule-event-reminders.job";

startServer();
startEventReminderJob();
