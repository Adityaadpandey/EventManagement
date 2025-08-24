"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
	type CreateEventRequest,
	createEvent,
} from "@/lib/features/eventsSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";

export default function ListerCreateEventPage() {
	const dispatch = useAppDispatch();
	const router = useRouter();
	const { user, token } = useAppSelector((s) => s.auth);
	const { loading, error, lastCreated } = useAppSelector(
		(s) => s.events.create,
	);

	const isLister = token && user?.role === "LISTER";

	useEffect(() => {
		if (!isLister) {
			router.push("/auth");
		}
	}, [isLister, router]);

	const [form, setForm] = useState<Partial<CreateEventRequest>>({
		title: "",
		description: "",
		banner_horizontal: "",
		banner_vertical: "",
		banner_square: "",
		date: "",
		time: "",
		location: "",
		capacity: undefined,
		samplePoster: "",
		socialMediaGraphic: "",
		eventFormat: "",
		requestedVenue: "",
		termsConditions: "",
		rulesRegulations: "",
		policies: "",
		dutyLeavesDetails: "",
		ticketTypes: [{ name: "", price: 0, quantity: 1 }],
		customFields: [],
	});

	const setValue = (k: keyof CreateEventRequest, v: any) =>
		setForm((f) => ({ ...f, [k]: v }));

	const addTicket = () =>
		setValue("ticketTypes", [
			...(form.ticketTypes || []),
			{ name: "", price: 0, quantity: 1 },
		]);

	const removeTicket = (i: number) =>
		setValue(
			"ticketTypes",
			(form.ticketTypes || []).filter((_, idx) => idx !== i),
		);

	const updateTicket = (i: number, k: "name" | "price" | "quantity", v: any) =>
		setValue(
			"ticketTypes",
			(form.ticketTypes || []).map((t, idx) =>
				idx === i
					? { ...t, [k]: k === "price" || k === "quantity" ? Number(v) : v }
					: t,
			),
		);

	const addCustomField = () =>
		setValue("customFields", [
			...(form.customFields || []),
			{ label: "", fieldType: "text", required: false },
		]);

	const removeCustomField = (i: number) =>
		setValue(
			"customFields",
			(form.customFields || []).filter((_, idx) => idx !== i),
		);

	const updateCustomField = (
		i: number,
		k: "label" | "fieldType" | "required",
		v: any,
	) =>
		setValue(
			"customFields",
			(form.customFields || []).map((c, idx) =>
				idx === i ? { ...c, [k]: k === "required" ? Boolean(v) : v } : c,
			),
		);

	const validate = (): string | null => {
		const req = [
			"title",
			"description",
			"banner_horizontal",
			"banner_vertical",
			"banner_square",
			"date",
			"time",
			"location",
		] as (keyof CreateEventRequest)[];
		for (const key of req) {
			if (
				!form[key] ||
				(typeof form[key] === "string" && (form[key] as string).trim() === "")
			) {
				return `Missing required field: ${key}`;
			}
		}
		if (
			!form.ticketTypes ||
			!Array.isArray(form.ticketTypes) ||
			form.ticketTypes.length === 0
		) {
			return "At least one ticket type is required";
		}
		for (let i = 0; i < form.ticketTypes.length; i++) {
			const t = form.ticketTypes[i]!;
			if (
				!t.name ||
				typeof t.price !== "number" ||
				typeof t.quantity !== "number"
			) {
				return `Invalid ticket type at index ${i}`;
			}
			if (t.price < 0 || t.quantity <= 0) {
				return `Ticket type ${t.name || i} must have non-negative price and positive quantity`;
			}
		}
		if (form.customFields && Array.isArray(form.customFields)) {
			for (let i = 0; i < form.customFields.length; i++) {
				const c = form.customFields[i]!;
				if (!c.label || !c.fieldType)
					return `Invalid custom field at index ${i}`;
				if (typeof c.required !== "boolean")
					return `Custom field 'required' must be boolean at index ${i}`;
			}
		}
		return null;
	};

	const onSubmit = async () => {
		const err = validate();
		if (err) {
			alert(err);
			return;
		}

		const payload: CreateEventRequest = {
			title: form.title!,
			description: form.description!,
			banner_horizontal: form.banner_horizontal!,
			banner_vertical: form.banner_vertical!,
			banner_square: form.banner_square!,
			date: form.date!,
			time: form.time!,
			location: form.location!,
			capacity: form.capacity ? Number(form.capacity) : undefined,
			samplePoster: form.samplePoster || undefined,
			socialMediaGraphic: form.socialMediaGraphic || undefined,
			eventFormat: form.eventFormat || undefined,
			requestedVenue: form.requestedVenue || undefined,
			termsConditions: form.termsConditions || undefined,
			rulesRegulations: form.rulesRegulations || undefined,
			policies: form.policies || undefined,
			dutyLeavesDetails: form.dutyLeavesDetails || undefined,
			ticketTypes: form.ticketTypes!,
			customFields:
				form.customFields && form.customFields.length ? form.customFields : [],
		};

		const action = await dispatch(createEvent(payload));
		if (createEvent.fulfilled.match(action)) {
			alert(
				"Event submitted for approval. An admin will approve it before it goes public.",
			);
			const createdId = action.payload?.eventId;
			if (createdId) {
			} else {
				router.push("/");
			}
		}
	};

	if (!isLister) return null;

	return (
		<div className="mx-auto max-w-3xl space-y-6">
			<h1 className="font-semibold text-2xl">Create Event</h1>

			{/* Basic Info */}
			<section className="space-y-3">
				<input
					className="w-full rounded border p-2"
					placeholder="Title"
					value={form.title || ""}
					onChange={(e) => setValue("title", e.target.value)}
				/>
				<textarea
					className="w-full rounded border p-2"
					placeholder="Description"
					value={form.description || ""}
					onChange={(e) => setValue("description", e.target.value)}
				/>

				<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
					<input
						className="rounded border p-2"
						placeholder="Banner Horizontal URL"
						value={form.banner_horizontal || ""}
						onChange={(e) => setValue("banner_horizontal", e.target.value)}
					/>
					<input
						className="rounded border p-2"
						placeholder="Banner Vertical URL"
						value={form.banner_vertical || ""}
						onChange={(e) => setValue("banner_vertical", e.target.value)}
					/>
					<input
						className="rounded border p-2"
						placeholder="Banner Square URL"
						value={form.banner_square || ""}
						onChange={(e) => setValue("banner_square", e.target.value)}
					/>
				</div>

				<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
					<input
						className="rounded border p-2"
						placeholder="Date (YYYY-MM-DD)"
						value={form.date || ""}
						onChange={(e) => setValue("date", e.target.value)}
					/>
					<input
						className="rounded border p-2"
						placeholder="Time (HH:mm)"
						value={form.time || ""}
						onChange={(e) => setValue("time", e.target.value)}
					/>
					<input
						className="rounded border p-2"
						placeholder="Location"
						value={form.location || ""}
						onChange={(e) => setValue("location", e.target.value)}
					/>
				</div>

				<input
					className="w-full rounded border p-2"
					placeholder="Capacity (optional)"
					value={form.capacity ?? ""}
					onChange={(e) => setValue("capacity", e.target.value)}
				/>
			</section>

			{/* Ticket Types */}
			<section className="space-y-3">
				<div className="flex items-center justify-between">
					<h2 className="font-semibold">Ticket Types</h2>
					<button className="rounded border px-2 py-1" onClick={addTicket}>
						Add
					</button>
				</div>

				{(form.ticketTypes || []).map((t, i) => (
					<div
						key={i}
						className="grid grid-cols-1 items-center gap-3 sm:grid-cols-4"
					>
						<input
							className="rounded border p-2"
							placeholder="Name"
							value={t.name}
							onChange={(e) => updateTicket(i, "name", e.target.value)}
						/>
						<input
							type="number"
							className="rounded border p-2"
							placeholder="Price"
							value={t.price}
							onChange={(e) => updateTicket(i, "price", e.target.value)}
						/>
						<input
							type="number"
							className="rounded border p-2"
							placeholder="Quantity"
							value={t.quantity}
							onChange={(e) => updateTicket(i, "quantity", e.target.value)}
						/>
						<button
							className="rounded border px-2 py-1"
							onClick={() => removeTicket(i)}
						>
							Remove
						</button>
					</div>
				))}
			</section>

			{/* Optional / Advanced */}
			<section className="space-y-3">
				<h2 className="font-semibold">Advanced (optional)</h2>
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<input
						className="rounded border p-2"
						placeholder="Sample Poster URL"
						value={form.samplePoster || ""}
						onChange={(e) => setValue("samplePoster", e.target.value)}
					/>
					<input
						className="rounded border p-2"
						placeholder="Social Media Graphic URL"
						value={form.socialMediaGraphic || ""}
						onChange={(e) => setValue("socialMediaGraphic", e.target.value)}
					/>
					<input
						className="rounded border p-2"
						placeholder="Event Format"
						value={form.eventFormat || ""}
						onChange={(e) => setValue("eventFormat", e.target.value)}
					/>
					<input
						className="rounded border p-2"
						placeholder="Requested Venue"
						value={form.requestedVenue || ""}
						onChange={(e) => setValue("requestedVenue", e.target.value)}
					/>
				</div>
				<textarea
					className="w-full rounded border p-2"
					placeholder="Terms & Conditions"
					value={form.termsConditions || ""}
					onChange={(e) => setValue("termsConditions", e.target.value)}
				/>
				<textarea
					className="w-full rounded border p-2"
					placeholder="Rules & Regulations"
					value={form.rulesRegulations || ""}
					onChange={(e) => setValue("rulesRegulations", e.target.value)}
				/>
				<textarea
					className="w-full rounded border p-2"
					placeholder="Policies"
					value={form.policies || ""}
					onChange={(e) => setValue("policies", e.target.value)}
				/>
				<textarea
					className="w-full rounded border p-2"
					placeholder="Duty Leaves Details"
					value={form.dutyLeavesDetails || ""}
					onChange={(e) => setValue("dutyLeavesDetails", e.target.value)}
				/>
			</section>

			{/* Custom Fields */}
			<section className="space-y-3">
				<div className="flex items-center justify-between">
					<h2 className="font-semibold">Custom Fields (optional)</h2>
					<button className="rounded border px-2 py-1" onClick={addCustomField}>
						Add
					</button>
				</div>

				{(form.customFields || []).map((c, i) => (
					<div
						key={i}
						className="grid grid-cols-1 items-center gap-3 sm:grid-cols-5"
					>
						<input
							className="rounded border p-2"
							placeholder="Label"
							value={c.label}
							onChange={(e) => updateCustomField(i, "label", e.target.value)}
						/>
						<input
							className="rounded border p-2"
							placeholder="Field Type (e.g. text, select)"
							value={c.fieldType}
							onChange={(e) =>
								updateCustomField(i, "fieldType", e.target.value)
							}
						/>
						<label className="flex items-center gap-2">
							<input
								type="checkbox"
								checked={c.required}
								onChange={(e) =>
									updateCustomField(i, "required", e.target.checked)
								}
							/>
							Required
						</label>
						<button
							className="rounded border px-2 py-1"
							onClick={() => removeCustomField(i)}
						>
							Remove
						</button>
					</div>
				))}
			</section>

			<div className="pt-2">
				<button
					className="rounded bg-green-600 px-4 py-2 text-white"
					onClick={onSubmit}
					disabled={loading}
				>
					{loading ? "Submitting..." : "Submit for Approval"}
				</button>
				{error ? <p className="mt-2 text-red-600 text-sm">{error}</p> : null}
				{lastCreated ? (
					<p className="mt-2 text-green-700 text-sm">
						Event submitted. Awaiting admin approval before public listing.
					</p>
				) : null}
			</div>
		</div>
	);
}
