import type { Response } from "express";
import { ListerServer } from "../services/lister.service";
import type { AuthenticatedRequest } from "../types/auth";
import { sendError, sendSuccess } from "../utils/responseMsg";
import {
	applyForListerSchema,
	updateListerSchema,
} from "../validators/lister.validator";

export class ListerController {
	private listerService: ListerServer;

	constructor() {
		this.listerService = new ListerServer();
	}

	async applyForLister(req: AuthenticatedRequest, res: Response) {
		const userId = req.user?.userId;
		if (!userId) return sendError(res, "User ID is required", 400);

		const validatedData = applyForListerSchema.parse(req.body);

		try {
			const lister = await this.listerService.applyForLister(
				userId,
				validatedData,
			);
			return sendSuccess(res, "Lister applied successfully", lister);
		} catch (error: any) {
			return sendError(res, "Failed to apply for lister", 500, error.message);
		}
	}

	async meLister(req: AuthenticatedRequest, res: Response) {
		const userId = req.user?.userId;
		if (!userId) return sendError(res, "User ID is required", 400);

		try {
			const lister = await this.listerService.meLister(userId);
			return sendSuccess(res, "Lister found", lister);
		} catch (error: any) {
			return sendError(res, "Lister not found", 500, error.message);
		}
	}

	async updateLister(req: AuthenticatedRequest, res: Response) {
		const userId = req.user?.userId;
		if (!userId) return sendError(res, "User ID is required", 400);

		const validatedData = updateListerSchema.parse(req.body);

		try {
			const updatedLister = await this.listerService.updateLister(
				userId,
				validatedData,
			);
			return sendSuccess(res, "Lister updated successfully", updatedLister);
		} catch (error: any) {
			return sendError(res, "Failed to update lister", 500, error.message);
		}
	}

	async getLister(req: AuthenticatedRequest, res: Response) {
		const listerId = req.params.listerId;
		if (!listerId) {
			return sendError(res, "Lister ID is required", 400);
		}

		try {
			const lister = await this.listerService.getLister(listerId);
			return sendSuccess(res, "Lister found", lister);
		} catch (error: any) {
			return sendError(res, "Failed to fetch lister", 500, error.message);
		}
	}

	async getListerAnalytics(req: AuthenticatedRequest, res: Response) {
		const userId = req.user?.userId;
		if (!userId) return sendError(res, "User ID is required", 400);

		try {
			const analytics = await this.listerService.getListerAnalytics(userId);
			return sendSuccess(res, "Lister analytics retrieved", analytics);
		} catch (error: any) {
			return sendError(res, "Failed to get analytics", 500, error.message);
		}
	}
}
