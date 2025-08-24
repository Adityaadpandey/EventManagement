import { prisma } from "../config/db";
import logger from "../config/logger";

export class AdminService {
	async changeUserToListerStatus(
		adminId: string,
		data: { userId: string; newRole: "ADMIN" | "LISTER" | "USER" },
	) {
		try {
			// Check if the requesting user is an admin
			const adminUser = await prisma.user.findUnique({
				where: { userId: adminId },
			});

			if (!adminUser || adminUser.role !== "ADMIN") {
				throw new Error("Unauthorized: Only admins can change user roles");
			}

			// Update the user's role
			const updatedLister = await prisma.lister.updateMany({
				where: { userId: data.userId },
				data: { status: data.newRole === "LISTER" ? "COMPLETED" : "REJECTED" },
			});

			const updatedUser = await prisma.user.update({
				where: { userId: data.userId },
				data: { role: data.newRole },
				select: {
					userId: true,
					email: true,
					role: true,
					name: true,
				},
			});

			if (!updatedUser) {
				throw new Error("User not found");
			}

			return {
				message: `User role updated to ${data.newRole} successfully`,
				data: updatedUser,
			};
		} catch (error) {
			logger.error("Error changing user role:", error);
			throw error;
		}
	}

	async getAllListerRequests(adminId: string) {
		try {
			// Check if the requesting user is an admin
			const adminUser = await prisma.user.findUnique({
				where: { userId: adminId },
			});

			if (!adminUser || adminUser.role !== "ADMIN") {
				throw new Error("Unauthorized: Only admins can view lister requests");
			}

			// Fetch all users with role 'LISTER'
			const listerRequests = await prisma.lister.findMany({
				where: { status: "PENDING" },
				include: {
					user: {
						select: {
							userId: true,
							name: true,
							email: true,
							phone: true,
							profileComplete: true,
							createdAt: true,
						},
					},
				},
			});

			return {
				message: "Lister requests retrieved successfully",
				data: listerRequests,
			};
		} catch (error) {
			logger.error("Error fetching lister requests:", error);
			throw error;
		}
	}
	async changeEventStatus(
		adminId: string,
		data: {
			eventId: string;
			newStatus:
				| "NOT_VIEWED"
				| "PENDING"
				| "APPROVED"
				| "REJECTED"
				| "CANCELLATION_REQUESTED"
				| "CANCELLED";
		},
	) {
		try {
			// Check if the requesting user is an admin
			const adminUser = await prisma.user.findUnique({
				where: { userId: adminId },
			});

			if (!adminUser || adminUser.role !== "ADMIN") {
				throw new Error("Unauthorized: Only admins can change event status");
			}

			// Update the event's status
			const updatedEvent = await prisma.event.update({
				where: { eventId: data.eventId },
				data: { status: data.newStatus },
				include: {
					lister: {
						select: {
							user: {
								select: {
									userId: true,
									name: true,
									email: true,
								},
							},
						},
					},
				},
			});

			if (!updatedEvent) {
				throw new Error("Event not found");
			}

			return {
				message: `Event status updated to ${data.newStatus} successfully`,
				data: updatedEvent,
			};
		} catch (error) {
			logger.error("Error changing event status:", error);
			throw error;
		}
	}

	async getAllPendingEvents(adminId: string) {
		try {
			// Check if the requesting user is an admin
			const adminUser = await prisma.user.findUnique({
				where: { userId: adminId },
			});

			if (!adminUser || adminUser.role !== "ADMIN") {
				throw new Error("Unauthorized: Only admins can view pending events");
			}

			// Fetch all events with status 'PENDING'
			const pendingEvents = await prisma.event.findMany({
				where: { status: "PENDING" },
				include: {
					lister: {
						select: {
							user: {
								select: {
									userId: true,
									name: true,
									email: true,
								},
							},
						},
					},
				},
			});

			return {
				message: "Pending events retrieved successfully",
				data: pendingEvents,
			};
		} catch (error) {
			logger.error("Error fetching pending events:", error);
			throw error;
		}
	}
}
