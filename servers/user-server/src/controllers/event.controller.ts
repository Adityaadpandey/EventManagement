import type { Request, Response } from "express";
import logger from "../config/logger";
import {
	type CreateEventRequest,
	EventService,
} from "../services/event.service";
import type { AuthenticatedRequest } from "../types/auth";
import { sendError, sendSuccess } from "../utils/responseMsg";

export class EventController {
	private eventService: EventService;

	constructor() {
		this.eventService = new EventService();
	}

	async createEvent(req: AuthenticatedRequest, res: Response) {
		try {
			const userId = req.user?.userId;
			if (!userId) return sendError(res, "User ID is required", 400);

			const {
				title,
				description,
				banner_horizontal,
				banner_vertical,
				banner_square,
				date,
				time,
				location,
				capacity,
				samplePoster,
				socialMediaGraphic,
				eventFormat,
				requestedVenue,
				termsConditions,
				rulesRegulations,
				policies,
				dutyLeavesDetails,
				ticketTypes,
				customFields,
			} = req.body;

			// Validate required fields
			if (
				!title ||
				!description ||
				!banner_horizontal ||
				!banner_vertical ||
				!banner_square ||
				!date ||
				!time ||
				!location
			) {
				return sendError(
					res,
					"Missing required fields: title, description, banners, date, time, location",
					400,
				);
			}

			// Validate ticket types
			if (
				!ticketTypes ||
				!Array.isArray(ticketTypes) ||
				ticketTypes.length === 0
			) {
				return sendError(res, "At least one ticket type is required", 400);
			}

			// Validate each ticket type
			for (let i = 0; i < ticketTypes.length; i++) {
				const ticketType = ticketTypes[i];
				if (
					!ticketType.name ||
					typeof ticketType.price !== "number" ||
					typeof ticketType.quantity !== "number"
				) {
					return sendError(
						res,
						`Invalid ticket type at index ${i}. Name, price, and quantity are required`,
						400,
					);
				}
				if (ticketType.price < 0 || ticketType.quantity <= 0) {
					return sendError(
						res,
						`Invalid ticket type at index ${i}. Price must be non-negative and quantity must be positive`,
						400,
					);
				}
			}

			// Validate custom fields if provided
			if (customFields && Array.isArray(customFields)) {
				for (let i = 0; i < customFields.length; i++) {
					const field = customFields[i];
					if (!field.label || !field.fieldType) {
						return sendError(
							res,
							`Invalid custom field at index ${i}. Label and fieldType are required`,
							400,
						);
					}
					if (typeof field.required !== "boolean") {
						return sendError(
							res,
							`Invalid custom field at index ${i}. Required must be a boolean`,
							400,
						);
					}
				}
			}

			const eventData: CreateEventRequest = {
				title,
				description,
				banner_horizontal,
				banner_vertical,
				banner_square,
				date,
				time,
				location,
				capacity: capacity ? Number.parseInt(capacity) : undefined,
				samplePoster,
				socialMediaGraphic,
				eventFormat,
				requestedVenue,
				termsConditions,
				rulesRegulations,
				policies,
				dutyLeavesDetails,
				ticketTypes,
				customFields: customFields || [],
			};

			const result = await this.eventService.createEvent(userId, eventData);
			return sendSuccess(res, result.message, result.data, 201);
		} catch (error: any) {
			logger.error("Create event error:", error);
			return sendError(res, "Failed to create event", 500, error.message);
		}
	}

	async getPublicEvents(req: Request, res: Response) {
		try {
			const events = await this.eventService.getPublicEvents();
			return sendSuccess(
				res,
				"Public events retrieved successfully",
				events,
				200,
			);
		} catch (error: any) {
			logger.error("Failed to get public event:", error);
			return sendError(res, "Failed to get public event", 500, error.message);
		}
	}

	async getListerEvent(req: AuthenticatedRequest, res: Response) {}

	async patchEvent(req: AuthenticatedRequest, res: Response) {}

	async submitEventForApproval(req: AuthenticatedRequest, res: Response) {}

	async getEventAttendees(req: AuthenticatedRequest, res: Response) {}
}
