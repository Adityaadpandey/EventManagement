// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { useRouter } from "next/navigation";
// import { useAppDispatch, useAppSelector } from "@/lib/hooks";
// import {
//   hydrateSession,
//   logout,
//   requestOtp,
//   verifyOtp,
// } from "@/lib/features/authSlice";
// import api from "@/lib/api";

// function Label({ children }: { children: React.ReactNode }) {
//   return (
//     <label className="block text-sm font-medium text-zinc-300">
//       {children}
//     </label>
//   );
// }
// function TextInput({
//   name,
//   value,
//   onChange,
//   type = "text",
//   placeholder,
//   disabled,
// }: {
//   name: string;
//   value: string;
//   onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
//   type?: string;
//   placeholder?: string;
//   disabled?: boolean;
// }) {
//   return (
//     <input
//       name={name}
//       value={value}
//       onChange={onChange}
//       type={type}
//       placeholder={placeholder}
//       disabled={disabled}
//       className={`w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 transition-all
//         ${disabled ? "bg-zinc-800 text-zinc-500" : "bg-zinc-900 text-white focus:ring-zinc-500"}
//         border-zinc-700 placeholder-zinc-500`}
//     />
//   );
// }
// function Button({
//   children,
//   onClick,
//   disabled,
//   variant = "primary",
//   type = "button",
// }: {
//   children: React.ReactNode;
//   onClick?: () => void;
//   disabled?: boolean;
//   variant?: "primary" | "neutral" | "danger" | "ghost";
//   type?: "button" | "submit";
// }) {
//   const base =
//     "w-full rounded-lg font-semibold p-3 transition duration-200 focus:ring-4";
//   const palette =
//     variant === "primary"
//       ? "bg-zinc-700 hover:bg-zinc-600 text-white focus:ring-zinc-500"
//       : variant === "neutral"
//         ? "bg-zinc-800 hover:bg-zinc-700 text-white focus:ring-zinc-600"
//         : variant === "danger"
//           ? "bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-200 focus:ring-zinc-700"
//           : "bg-transparent hover:bg-zinc-800 text-zinc-300";
//   return (
//     <button
//       type={type}
//       onClick={onClick}
//       disabled={disabled}
//       className={`${base} ${palette} disabled:opacity-60`}
//     >
//       {children}
//     </button>
//   );
// }
// function Divider() {
//   return <div className="h-px bg-zinc-800 my-4" />;
// }
// function SkeletonBlock({ h = "h-10" }: { h?: string }) {
//   return <div className={`w-full ${h} rounded-lg bg-zinc-800 animate-pulse`} />;
// }

// export default function Auth() {
//   const dispatch = useAppDispatch();
//   const router = useRouter();

//   const { user, token, loading, error, otpSent, hydrated } = useAppSelector(
//     (s) => s.auth,
//   );

//   const [form, setForm] = useState({ phone: "", otp: "", name: "", email: "" });
//   const [showSignup, setShowSignup] = useState(false);
//   const [resendTimer, setResendTimer] = useState(0);
//   const [savingProfile, setSavingProfile] = useState(false);

//   useEffect(() => {
//     dispatch(hydrateSession());
//   }, [dispatch]);

//   useEffect(() => {
//     if (user) {
//       setForm((f) => ({
//         ...f,
//         phone: user.phone || f.phone,
//         name: user.name || "",
//         email: user.email || "",
//       }));
//     }
//   }, [user]);

//   useEffect(() => {
//     if (resendTimer <= 0) return;
//     const t = setInterval(() => {
//       setResendTimer((v) => (v > 0 ? v - 1 : 0));
//     }, 1000);
//     return () => clearInterval(t);
//   }, [resendTimer]);

//   // after we’re hydrated, decide whether to redirect
//   const shouldRedirectHome = useMemo(
//     () => Boolean(hydrated && token && user && user.name && user.email),
//     [hydrated, token, user],
//   );
//   useEffect(() => {
//     if (shouldRedirectHome) {
//       router.replace("/");
//     }
//   }, [shouldRedirectHome, router]);

//   const needsProfile = useMemo(
//     () => Boolean(hydrated && token && user && (!user?.name || !user?.email)),
//     [hydrated, token, user],
//   );

//   const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
//     setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

//   const sendOtp = () => {
//     if (!form.phone.trim()) return alert("Phone number is required");
//     dispatch(requestOtp(form.phone));
//     setResendTimer(45);
//   };

//   const verify = async () => {
//     if (!form.phone.trim() || !form.otp.trim())
//       return alert("Phone and OTP are required");
//     await dispatch(
//       verifyOtp({
//         phone: form.phone.trim(),
//         otp: form.otp.trim(),
//         name: showSignup && form.name.trim() ? form.name.trim() : undefined,
//         email: showSignup && form.email.trim() ? form.email.trim() : undefined,
//       }),
//     );
//   };

//   const saveProfile = async () => {
//     if (!form.name.trim() || !form.email.trim())
//       return alert("Name and Email are required");
//     try {
//       setSavingProfile(true);
//       await api.patch("/user/profile", {
//         name: form.name.trim(),
//         email: form.email.trim(),
//       });
//       await dispatch(hydrateSession());
//     } catch (e: any) {
//       alert(
//         e?.response?.data?.message || e?.message || "Failed to save profile",
//       );
//     } finally {
//       setSavingProfile(false);
//     }
//   };

//   if (!hydrated && !token) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white px-4">
//         <div className="w-full max-w-md bg-zinc-900 rounded-xl border border-zinc-800 p-8 space-y-4">
//           <SkeletonBlock h="h-8" />
//           <Divider />
//           <SkeletonBlock />
//           <SkeletonBlock />
//           <SkeletonBlock />
//           <Divider />
//           <SkeletonBlock />
//         </div>
//       </div>
//     );
//   }

//   if (shouldRedirectHome) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white px-4">
//         <div className="w-full max-w-md bg-zinc-900 rounded-xl border border-zinc-800 p-8 space-y-4">
//           <SkeletonBlock h="h-6" />
//           <SkeletonBlock />
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 text-white px-4">
//       <div className="w-full max-w-md bg-zinc-900 rounded-xl shadow-xl p-4 border border-zinc-800 space-y-6">
//         <div className="text-center space-y-1">
//           <h1 className="text-2xl font-bold text-zinc-100">
//             {token ? "Welcome" : "Sign in with Phone"}
//           </h1>
//           <p className="text-xs text-zinc-400">
//             {token
//               ? needsProfile
//                 ? "Finish your profile to continue"
//                 : "You are signed in"
//               : "We’ll text you a one-time code to verify"}
//           </p>
//         </div>

//         {!token && (
//           <div className="space-y-4">
//             <div className="space-y-2">
//               <Label>Phone</Label>
//               <div className="flex flex-col gap-2">
//                 <TextInput
//                   name="phone"
//                   value={form.phone}
//                   onChange={onChange}
//                   type="tel"
//                   placeholder="+91 98XXXXXXXX"
//                 />
//                 <Button
//                   onClick={sendOtp}
//                   disabled={loading || !form.phone.trim()}
//                 >
//                   {otpSent ? "Code Sent" : loading ? "Sending..." : "Get Code"}
//                 </Button>
//               </div>
//               {otpSent && (
//                 <p className="text-xs text-zinc-500">
//                   We’ve sent a code to your phone.{" "}
//                   {resendTimer > 0 ? `Resend in ${resendTimer}s` : ""}
//                 </p>
//               )}
//             </div>

//             {otpSent && (
//               <div className="space-y-2">
//                 <Label>Verification Code</Label>
//                 <div className="flex gap-2">
//                   <TextInput
//                     name="otp"
//                     value={form.otp}
//                     onChange={onChange}
//                     placeholder="Enter OTP"
//                   />
//                   <Button
//                     onClick={verify}
//                     disabled={loading || !form.otp.trim()}
//                   >
//                     {loading ? "Verifying..." : "Verify"}
//                   </Button>
//                 </div>
//                 <div className="flex gap-2">
//                   <Button
//                     variant="neutral"
//                     onClick={sendOtp}
//                     disabled={loading || resendTimer > 0}
//                   >
//                     {resendTimer > 0
//                       ? `Resend in ${resendTimer}s`
//                       : "Resend OTP"}
//                   </Button>
//                   <Button
//                     variant="ghost"
//                     onClick={() => setShowSignup((s) => !s)}
//                   >
//                     {showSignup ? "Hide name & email" : "Add name & email"}
//                   </Button>
//                 </div>
//               </div>
//             )}

//             {showSignup && (
//               <>
//                 <Divider />
//                 <div className="space-y-3">
//                   <div className="space-y-2">
//                     <Label>Full Name</Label>
//                     <TextInput
//                       name="name"
//                       value={form.name}
//                       onChange={onChange}
//                       placeholder="Your name"
//                     />
//                   </div>
//                   <div className="space-y-2">
//                     <Label>Email</Label>
//                     <TextInput
//                       name="email"
//                       value={form.email}
//                       onChange={onChange}
//                       type="email"
//                       placeholder="you@example.com"
//                     />
//                   </div>
//                   <p className="text-xs text-zinc-500">
//                     If your profile doesn’t have these yet, we’ll save them
//                     after you verify.
//                   </p>
//                 </div>
//               </>
//             )}
//           </div>
//         )}

//         {/* Logged in but missing profile → completion form */}
//         {token && needsProfile && (
//           <div className="space-y-4">
//             <Divider />
//             <div className="space-y-3">
//               <div className="space-y-2">
//                 <Label>Full Name</Label>
//                 <TextInput
//                   name="name"
//                   value={form.name}
//                   onChange={onChange}
//                   placeholder="Your name"
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label>Email</Label>
//                 <TextInput
//                   name="email"
//                   value={form.email}
//                   onChange={onChange}
//                   type="email"
//                   placeholder="you@example.com"
//                 />
//               </div>
//               <Button
//                 onClick={saveProfile}
//                 disabled={
//                   savingProfile || !form.name.trim() || !form.email.trim()
//                 }
//               >
//                 {savingProfile ? "Saving..." : "Save & Continue"}
//               </Button>
//               <p className="text-xs text-zinc-500">
//                 We’ll only ask this once. You can edit later in your profile.
//               </p>
//             </div>
//           </div>
//         )}

//         {token && !needsProfile && (
//           <div className="space-y-3">
//             <Button variant="danger" onClick={() => dispatch(logout())}>
//               Sign Out
//             </Button>
//           </div>
//         )}

//         {error && (
//           <div className="bg-zinc-950 text-zinc-200 border border-zinc-800 rounded p-3 text-sm">
//             {error}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

const page = () => {
  return <div>page</div>;
};

export default page;
