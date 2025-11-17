import { getLogger } from "@repo/logger";
import { config } from ".";

const logger: any = getLogger(config.SERVICE_NAME || "server", "debug");

export default logger;
