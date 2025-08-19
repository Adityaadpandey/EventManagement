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
				capacity: capacity ? Number.parseInt(capacity, 10) : undefined,
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

	//  all the event details for public view
	async getPublicEvents(req: Request, res: Response) {
		try {
			const page = Number.parseInt(req.query.page as string, 10) || 1;
			const limit = Number.parseInt(req.query.limit as string, 10) || 20;

			const { events, total } = await this.eventService.getPublicEvents(
				page,
				limit,
			);

			const totalPages = Math.ceil(total / limit);

			return sendSuccess(
				res,
				"Public events retrieved successfully",
				events,
				200,
				{
					page,
					limit,
					total,
					totalPages,
				},
			);
		} catch (error: any) {
			logger.error("Failed to get public events:", error);
			return sendError(res, "Failed to get public events", 500, error.message);
		}
	}

	// for getting lister events
	async getListerEvents(req: AuthenticatedRequest, res: Response) {
		try {
			const userId = req.user?.userId;
			if (!userId) return sendError(res, "User ID is required", 400);

			const events = await this.eventService.getListerEvents(userId);
			return sendSuccess(
				res,
				"Lister events retrieved successfully",
				events,
				200,
			);
		} catch (error: any) {
			logger.error("Failed to get lister event:", error);
			return sendError(res, "Failed to get lister event", 500, error.message);
		}
	}

	// for getting specific event details
	async getPublicEventDetails(req: Request, res: Response) {
		try {
			const eventId = req.params.eventId;
			if (!eventId) return sendError(res, "Event ID is required", 400);

			const eventDetails =
				await this.eventService.getPublicEventDetails(eventId);

			if (!eventDetails) {
				return sendError(res, "Event not found", 404);
			}

			return sendSuccess(
				res,
				"Public event details retrieved successfully",
				eventDetails,
				200,
			);
		} catch (error: any) {
			logger.error("Failed to get public event details:", error);
			return sendError(
				res,
				"Failed to get public event details",
				500,
				error.message,
			);
		}
	}

	async getEventDetails(req: AuthenticatedRequest, res: Response) {
		try {
			const userId = req.user?.userId;
			if (!userId) return sendError(res, "User ID is required", 400);

			const eventId = req.params.eventId;
			if (!eventId) return sendError(res, "Event ID is required", 400);
			const eventDetails = await this.eventService.getEventDetails(
				userId,
				eventId,
			);
			if (!eventDetails) {
				return sendError(res, "Event not found", 404);
			}

			return sendSuccess(
				res,
				"Event details retrieved successfully",
				eventDetails,
				200,
			);
		} catch (error: any) {
			logger.error("Failed to get event details:", error);
			return sendError(res, "Failed to get event details", 500, error.message);
		}
	}

	async patchEvent(req: AuthenticatedRequest, res: Response) {
		try {
			const userId = req.user?.userId;
			if (!userId) return sendError(res, "User ID is required", 400);

			const eventId = req.params.eventId;
			if (!eventId) return sendError(res, "Event ID is required", 400);

			const updateData = req.body;

			// Validate required fields
			// if (
			// 	!updateData.title ||
			// 	!updateData.description ||
			// 	!updateData.banner_horizontal ||
			// 	!updateData.banner_vertical ||
			// 	!updateData.banner_square ||
			// 	!updateData.date ||
			// 	!updateData.time ||
			// 	!updateData.location
			// ) {
			// 	return sendError(
			// 		res,
			// 		"Missing required fields: title, description, banners, date, time, location",
			// 		400,
			// 	);
			// }

			const updatedEvent = await this.eventService.patchEvent(
				userId,
				eventId,
				updateData,
			);
			return sendSuccess(
				res,
				`Update succesfully executed for eventId:${eventId}`,
				updatedEvent,
				200,
			);
		} catch (error: any) {
			logger.error("Failed to patch event:", error);
			return sendError(res, "Failed to patch event", 500, error.message);
		}
	}

	async submitEventForApproval(_req: AuthenticatedRequest, _res: Response) {}

	async getEventAttendees(_req: AuthenticatedRequest, _res: Response) {}
}
