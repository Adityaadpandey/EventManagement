import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db";
import logger from "../config/logger";

export class TicketValidationService {
	async checkerLogin(username: string, password: string) {
		try {
			const checker = await prisma.ticketChecker.findFirst({
				where: {
					username,
					active: true,
					deprecated: false,
					OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
					revokedAt: null,
				},
				include: {
					event: {
						select: {
							eventId: true,
							title: true,
							date: true,
							time: true,
							location: true,
						},
					},
					lister: {
						select: {
							companyName: true,
							user: {
								select: {
									name: true,
								},
							},
						},
					},
				},
			});

			if (!checker) {
				throw new Error("Invalid credentials or checker is inactive/expired");
			}

			const isPasswordValid = await bcrypt.compare(password, checker.password);
			if (!isPasswordValid) {
				throw new Error("Invalid credentials");
			}

			// Generate JWT token
			const token = jwt.sign(
				{
					checkerId: checker.checkerId,
					username: checker.username,
					eventId: checker.eventId,
					listerId: checker.listerId,
				},
				process.env.JWT_SECRET || "your-secret-key",
				{ expiresIn: "12h" },
			);

			// Remove password from response
			const { password: _, ...checkerData } = checker;

			return {
				token,
				checker: checkerData,
			};
		} catch (error: any) {
			logger.error("Error in checker login:", error);
			throw new Error(error.message || "Failed to login checker");
		}
	}

	async scanTicket(
		qrCode: string,
		checkerId: string,
		deviceInfo?: string,
		ipAddress?: string,
		note?: string,
	) {
		try {
			// Verify checker is valid and active
			const checker = await prisma.ticketChecker.findFirst({
				where: {
					checkerId,
					active: true,
					deprecated: false,
					OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
					revokedAt: null,
				},
			});

			if (!checker) {
				throw new Error("Invalid or expired checker credentials");
			}

			// Find the ticket by QR code
			const ticket = await prisma.ticket.findUnique({
				where: {
					qrCode,
				},
				include: {
					ticketType: {
						include: {
							event: true,
						},
					},
					user: {
						select: {
							name: true,
							phone: true,
							email: true,
						},
					},
					AttendeeFieldResponse: {
						include: {
							field: true,
						},
					},
				},
			});

			if (!ticket) {
				// Log failed scan
				await this.logScan(
					"",
					checkerId,
					"SCAN",
					false,
					"Ticket not found",
					deviceInfo,
					ipAddress,
				);
				throw new Error("Invalid ticket QR code");
			}

			// Verify ticket is for the correct event (if checker is event-specific)
			if (
				checker.eventId &&
				ticket.ticketType.event.eventId !== checker.eventId
			) {
				await this.logScan(
					ticket.ticketId,
					checkerId,
					"SCAN",
					false,
					"Ticket not for this event",
					deviceInfo,
					ipAddress,
				);
				throw new Error("Ticket is not valid for this event");
			}

			// Check if ticket payment is successful
			if (ticket.status !== "SUCCESS") {
				await this.logScan(
					ticket.ticketId,
					checkerId,
					"SCAN",
					false,
					"Ticket payment not completed",
					deviceInfo,
					ipAddress,
				);
				throw new Error("Ticket payment is not completed");
			}

			// Check if ticket is already checked in
			if (ticket.checkedIn) {
				await this.logScan(
					ticket.ticketId,
					checkerId,
					"SCAN",
					false,
					"Ticket already checked in",
					deviceInfo,
					ipAddress,
				);
				return {
					success: false,
					message: "Ticket already checked in",
					ticket: {
						ticketId: ticket.ticketId,
						eventTitle: ticket.ticketType.event.title,
						ticketType: ticket.ticketType.name,
						attendeeName: ticket.user.name,
						checkedIn: ticket.checkedIn,
						alreadyScanned: true,
					},
				};
			}

			// Mark ticket as checked in
			await prisma.ticket.update({
				where: {
					ticketId: ticket.ticketId,
				},
				data: {
					checkedIn: true,
				},
			});

			// Log successful scan
			await this.logScan(
				ticket.ticketId,
				checkerId,
				"SCAN",
				true,
				note || "Successful check-in",
				deviceInfo,
				ipAddress,
				ticket.ticketType.event.eventId,
			);

			return {
				success: true,
				message: "Ticket successfully scanned and checked in",
				ticket: {
					ticketId: ticket.ticketId,
					eventTitle: ticket.ticketType.event.title,
					ticketType: ticket.ticketType.name,
					attendeeName: ticket.user.name,
					attendeePhone: ticket.user.phone,
					attendeeEmail: ticket.user.email,
					quantity: ticket.quantity,
					totalPrice: ticket.totalPrice,
					checkedIn: true,
					customFields: ticket.AttendeeFieldResponse.map((response) => ({
						label: response.field.label,
						value: response.value,
					})),
				},
			};
		} catch (error: any) {
			logger.error("Error scanning ticket:", error);
			throw new Error(error.message || "Failed to scan ticket");
		}
	}

	async resetTicketScan(ticketId: string, checkerId: string, note?: string) {
		try {
			// Verify checker is valid and active
			const checker = await prisma.ticketChecker.findFirst({
				where: {
					checkerId,
					active: true,
					deprecated: false,
					OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
					revokedAt: null,
				},
			});

			if (!checker) {
				throw new Error("Invalid or expired checker credentials");
			}

			// Find and update the ticket
			const ticket = await prisma.ticket.update({
				where: {
					ticketId,
				},
				data: {
					checkedIn: false,
				},
				include: {
					ticketType: {
						include: {
							event: true,
						},
					},
				},
			});

			// Log the reset action
			await this.logScan(
				ticketId,
				checkerId,
				"RESET",
				true,
				note || "Ticket scan reset",
				undefined,
				undefined,
				ticket.ticketType.event.eventId,
			);

			return {
				success: true,
				message: "Ticket scan reset successfully",
				ticketId: ticket.ticketId,
			};
		} catch (error: any) {
			logger.error("Error resetting ticket scan:", error);
			throw new Error(error.message || "Failed to reset ticket scan");
		}
	}

	private async logScan(
		ticketId: string,
		checkerId: string,
		action: string,
		success: boolean,
		note?: string,
		deviceInfo?: string,
		ipAddress?: string,
		eventId?: string,
	) {
		try {
			await prisma.ticketScanLog.create({
				data: {
					ticketId: ticketId,
					checkerId,
					action,
					success,
					note,
					deviceInfo,
					ipAddress,
					eventEventId: eventId,
					scannedAt: new Date(),
				},
			});
		} catch (error) {
			logger.error("Error logging scan:", error);
			// Don't throw here as this is just logging
		}
	}

	async getScanHistory(checkerId: string, page = 1, limit = 20) {
		try {
			const offset = (page - 1) * limit;

			const logs = await prisma.ticketScanLog.findMany({
				where: {
					checkerId,
				},
				include: {
					ticket: {
						include: {
							user: {
								select: {
									name: true,
									phone: true,
								},
							},
							ticketType: {
								select: {
									name: true,
									event: {
										select: {
											title: true,
										},
									},
								},
							},
						},
					},
				},
				orderBy: {
					scannedAt: "desc",
				},
				skip: offset,
				take: limit,
			});

			const total = await prisma.ticketScanLog.count({
				where: {
					checkerId,
				},
			});

			return {
				logs,
				pagination: {
					page,
					limit,
					total,
					pages: Math.ceil(total / limit),
				},
			};
		} catch (error: any) {
			logger.error("Error getting scan history:", error);
			throw new Error("Failed to get scan history");
		}
	}
}
