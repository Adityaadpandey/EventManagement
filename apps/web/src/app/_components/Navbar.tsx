"use client";

import Link from "next/link";
import { useEffect } from "react";
import { hydrateSession, logout } from "@/lib/features/authSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";

export default function Navbar() {
	const dispatch = useAppDispatch();
	const { user, token } = useAppSelector((s) => s.auth);

	useEffect(() => {
		dispatch(hydrateSession());
	}, [dispatch]);

	const isLister = token && user?.role === "LISTER";

	return (
		<nav className="w-full border-b">
			<div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
				<Link href="/" className="font-bold text-xl">
					Tixin
				</Link>

				<div className="flex items-center gap-3">
					{isLister && (
						<Link
							href="/lister/create"
							className="rounded border px-3 py-1 hover:bg-gray-50"
						>
							Create Event
						</Link>
					)}

					{token && user ? (
						<>
							<span className="text-sm opacity-80">
								Hi, {user.name || "Lister"}
							</span>
							<button
								className="rounded bg-rose-600 px-3 py-1 text-white"
								onClick={() => dispatch(logout())}
							>
								Logout
							</button>
						</>
					) : (
						<Link
							href="/auth"
							className="rounded bg-blue-600 px-3 py-1 text-white"
						>
							Login
						</Link>
					)}
				</div>
			</div>
		</nav>
	);
}
