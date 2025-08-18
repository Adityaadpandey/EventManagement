import { prisma } from "../config/db";
import logger from "../config/logger";

export class ListerServer {
	async applyForLister(
		userId: string,
		listerData: { companyName: string; companyLogo?: string; bio: string },
	) {
		try {
			// Check if the user exists and is not already a lister
			const existingUser = await prisma.user.findUnique({
				where: { userId },
				include: {
					Lister: true,
				},
			});

			if (!existingUser) {
				throw new Error("User not found.");
			}

			if (existingUser.Lister) {
				throw new Error("User is already a lister.");
			}

			// Create new lister
			const lister = await prisma.lister.create({
				data: {
					userId,
					companyName: listerData.companyName,
					companyLogo: listerData.companyLogo,
					bio: listerData.bio,
				},
				select: {
					listerId: true,
					userId: true,
					companyName: true,
					companyLogo: true,
					bio: true,
					status: true,
					createdAt: true,
				},
			});

			return lister;
		} catch (error) {
			logger.error("Error in applyForLister:", error);
			throw error;
		}
	}

	async meLister(userId: string) {
		try {
			const lister = await prisma.lister.findUnique({
				where: {
					userId: userId,
				},
				select: {
					listerId: true,
					companyName: true,
					companyLogo: true,
					bio: true,
					status: true,
					createdAt: true,
					updatedAt: true,
					ListerAnalytics: {
						select: {
							totalEvents: true,
							totalRevenue: true,
							totalTicketsSold: true,
							lastUpdated: true,
						},
					},
					user: {
						select: {
							userId: true,
							name: true,
							email: true,
							phone: true,
							avatar: true,
							role: true,
							profileComplete: true,
							createdAt: true,
						},
					},
				},
			});

			if (!lister) {
				throw new Error("Lister not found for given userId");
			}
			return lister;
		} catch (error) {
			logger.error("Error in meLister:", error);
			throw error;
		}
	}

	async updateLister(
		userId: string,
		updateData: {
			companyName?: string;
			companyLogo?: string;
			bio?: string;
		},
	) {
		try {
			// First check if the lister exists
			const existingLister = await prisma.lister.findUnique({
				where: { userId },
			});

			if (!existingLister) {
				throw new Error("Lister not found for given userId");
			}

			// Update the lister
			const updatedLister = await prisma.lister.update({
				where: { userId },
				data: {
					...(updateData.companyName !== undefined && {
						companyName: updateData.companyName,
					}),
					...(updateData.companyLogo !== undefined && {
						companyLogo: updateData.companyLogo,
					}),
					...(updateData.bio !== undefined && { bio: updateData.bio }),
				},
				select: {
					listerId: true,
					userId: true,
					companyName: true,
					companyLogo: true,
					bio: true,
					status: true,
					createdAt: true,
					updatedAt: true,
				},
			});

			return updatedLister;
		} catch (error) {
			logger.error("Error in updateLister:", error);
			throw error;
		}
	}

	async getLister(listerId: string) {
		try {
			const lister = await prisma.lister.findUnique({
				where: {
					listerId,
				},
				select: {
					listerId: true,
					status: true,
					user: {
						select: {
							name: true,
							email: true,
							phone: true,
							avatar: true,
						},
					},
					createdAt: true,
					companyLogo: true,
					companyName: true,
					bio: true,
					Event: {
						select: {
							eventId: true,
							title: true,
							date: true,
							banner_horizontal: true,
							banner_vertical: true,
							banner_square: true,
							status: true,
							ticketsSold: true,
							revenue: true,
						},
						orderBy: {
							createdAt: "desc",
						},
					},
					ListerAnalytics: {
						select: {
							totalEvents: true,
							totalRevenue: true,
							totalTicketsSold: true,
							lastUpdated: true,
						},
					},
				},
			});

			if (!lister) {
				throw new Error("Lister not found for given listerId");
			}

			return lister;
		} catch (error) {
			logger.error("Error in getLister:", error);
			throw error;
		}
	}

	async getListerAnalytics(userId: string) {
		try {
			const lister = await prisma.lister.findUnique({
				where: {
					userId,
				},
				select: {
					listerId: true,
				},
			});
			if (!lister?.listerId) {
				throw new Error("User is not a Lister");
			}
			const { listerId } = lister;
			const analytics = await prisma.listerAnalytics.findUnique({
				where: { listerId },
				select: {
					totalEvents: true,
					totalRevenue: true,
					totalTicketsSold: true,
					lastUpdated: true,
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

			if (!analytics) {
				// Create analytics record if it doesn't exist
				const newAnalytics = await prisma.listerAnalytics.create({
					data: {
						listerId,
						totalEvents: 0,
						totalRevenue: 0,
						totalTicketsSold: 0,
					},
					select: {
						totalEvents: true,
						totalRevenue: true,
						totalTicketsSold: true,
						lastUpdated: true,
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
				return newAnalytics;
			}

			return analytics;
		} catch (error) {
			logger.error("Error in getListerAnalytics:", error);
			throw error;
		}
	}
}
