"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { fetchPublicEvents } from "@/lib/features/eventsSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";

export default function HomePage() {
	const dispatch = useAppDispatch();
	const { items, loading, error, page, totalPages } = useAppSelector(
		(s) => s.events.list,
	);

	useEffect(() => {
		dispatch(fetchPublicEvents({ page: 1, limit: 20 }));
	}, [dispatch]);

	if (loading) return <p>Loading events...</p>;
	if (error) return <p className="text-red-600">{error}</p>;
	if (!items.length) return <p>No events found.</p>;

	return (
		<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{items.map((ev) => (
				<Link
					key={ev.eventId}
					href={`/event/${ev.eventId}`}
					className="overflow-hidden rounded-lg border hover:shadow"
				>
					{ev.banner_square || ev.banner_horizontal ? (
						<div className="relative h-48 w-full">
							<Image
								alt={ev.title}
								src={(ev.banner_square || ev.banner_horizontal) as string}
								fill
								className="object-cover"
							/>
						</div>
					) : (
						<div className="h-48 w-full bg-gray-100" />
					)}
					<div className="p-4">
						<h3 className="line-clamp-1 font-semibold">{ev.title}</h3>
						<p className="text-sm opacity-80">
							{ev.date || ""} {ev.time ? `• ${ev.time}` : ""}
						</p>
						<p className="text-sm opacity-80">{ev.location || ""}</p>
					</div>
				</Link>
			))}

			<div className="col-span-full flex items-center justify-center pt-4">
				<span className="text-sm opacity-70">
					Page {page} of {totalPages}
				</span>
			</div>
		</div>
	);
}
