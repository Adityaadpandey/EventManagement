import "dotenv/config";

import cors from "cors";
import express, {
	type NextFunction,
	type Request,
	type Response,
} from "express";
import helmet from "helmet";

import { config } from "./config";
import logger from "./config/logger";
import { connectRedis } from "./config/redis";

import { limiter } from "./middlewares/rate-limit.middleware";
import { reqMiddleware } from "./middlewares/req.middleware";

import { authRouter } from "./routes/v1/auth.router";
import { eventsRouter } from "./routes/v1/events.router";
import { listerRouter } from "./routes/v1/lister.router";
import { userRouter } from "./routes/v1/user.router";
import { setupGracefulShutdown } from "./utils/gracefullShutdown";
import { healthCheck } from "./utils/healthCheck";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use(helmet());
app.use(cors({ origin: config.CORS_ORIGIN || "http://localhost:3000" }));
app.use(limiter);
app.use(reqMiddleware);

app.get("/health", async (_, res: Response) => {
	const status = await healthCheck();
	const allHealthy = Object.values(status).every(Boolean);

	res.status(allHealthy ? 200 : 503).json({
		...status,
		status: allHealthy ? "ok" : "unhealthy",
	});
});

// auth routes
app.use("/api/v1/auth", authRouter);

// user routes
app.use("/api/v1/user", userRouter);

// lister routes
app.use("/api/v1/lister", listerRouter);

// events routes
app.use("/api/v1/event", eventsRouter);

app.use((req: Request, res: Response) => {
	logger.warn(`Resource not found: ${req.method} ${req.url}`);
	res.status(404).json({ message: "Resource not found" });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
	logger.error("Unhandled error:", err);
	res.status(500).json({ message: "Internal server error" });
});

export const startServer = async () => {
	try {
		await connectRedis();
		const server = app.listen(config.PORT, () => {
			logger.info(`${config.SERVICE_NAME} running on port ${config.PORT}`);
		});
		setupGracefulShutdown(server);
	} catch (error) {
		logger.error("Failed to start server:", error);
		process.exit(1);
	}
};
