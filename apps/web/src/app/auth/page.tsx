"use client";

import { useEffect, useState } from "react";
import {
	hydrateSession,
	logout,
	requestOtp,
	verifyOtp,
} from "@/lib/features/authSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";

export default function Auth() {
	const dispatch = useAppDispatch();
	const { user, token, loading, error, otpSent } = useAppSelector(
		(s) => s.auth,
	);

	const [form, setForm] = useState({
		name: "",
		email: "",
		phone: "",
		otp: "",
	});

	// Hydrate session on first load
	useEffect(() => {
		dispatch(hydrateSession());
	}, [dispatch]);

	// Prefill when user loads
	useEffect(() => {
		if (user) {
			setForm({
				name: user.name || "",
				email: user.email || "",
				phone: user.phone || "",
				otp: "",
			});
		}
	}, [user]);

	const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
		setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

	const onSendOtp = () => {
		if (!form.phone) return alert("Phone is required");
		dispatch(requestOtp(form.phone));
	};

	const onVerify = () => {
		if (!form.phone || !form.otp) return alert("Phone and OTP are required");
		dispatch(
			verifyOtp({
				phone: form.phone,
				otp: form.otp,
				name: form.name,
				email: form.email,
			}),
		);
	};

	// Logged-in view: prefilled, disabled, logout only
	if (token && user) {
		return (
			<div className="mx-auto max-w-md space-y-4 p-6">
				<h1 className="font-semibold text-2xl">You’re logged in</h1>
				<div className="space-y-2">
					<input
						className="w-full rounded border p-2"
						value={form.name}
						disabled
					/>
					<input
						className="w-full rounded border p-2"
						value={form.email}
						disabled
					/>
					<input
						className="w-full rounded border p-2"
						value={form.phone}
						disabled
					/>
				</div>
				<button
					className="w-full rounded bg-rose-600 p-2 text-white"
					onClick={() => dispatch(logout())}
					disabled={loading}
				>
					Logout
				</button>
				{error ? <p className="text-red-600 text-sm">{error}</p> : null}
			</div>
		);
	}

	// Not logged in view: name, email, phone; OTP after request
	return (
		<div className="mx-auto max-w-md space-y-4 p-6">
			<h1 className="font-semibold text-2xl">Login / Register</h1>

			<input
				name="name"
				placeholder="Full name"
				value={form.name}
				onChange={onChange}
				className="w-full rounded border p-2"
			/>
			<input
				name="email"
				type="email"
				placeholder="Email"
				value={form.email}
				onChange={onChange}
				className="w-full rounded border p-2"
			/>
			<input
				name="phone"
				placeholder="Phone (e.g. +9198...)"
				value={form.phone}
				onChange={onChange}
				className="w-full rounded border p-2"
			/>

			{!otpSent ? (
				<button
					className="w-full rounded bg-blue-600 p-2 text-white"
					onClick={onSendOtp}
					disabled={loading}
				>
					{loading ? "Sending OTP..." : "Send OTP"}
				</button>
			) : (
				<>
					<input
						name="otp"
						placeholder="Enter OTP"
						value={form.otp}
						onChange={onChange}
						className="w-full rounded border p-2"
					/>
					<button
						className="w-full rounded bg-green-600 p-2 text-white"
						onClick={onVerify}
						disabled={loading}
					>
						{loading ? "Verifying..." : "Verify & Continue"}
					</button>
				</>
			)}

			{error ? <p className="text-red-600 text-sm">{error}</p> : null}
		</div>
	);
}
