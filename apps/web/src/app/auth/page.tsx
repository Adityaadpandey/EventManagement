"use client";

import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  requestOtp,
  verifyOtp,
  hydrateSession,
} from "@/lib/features/authSlice";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const stepVariants = {
  initial: { opacity: 0, y: 40, x: 40 },
  animate: { opacity: 1, y: 0, x: 0 },
  exit: { opacity: 0, y: -40, x: -40 },
  transition: { duration: 0.4, ease: "easeOut" },
};

export default function AuthModal() {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const { user, token, otpSent, loading, error, hydrated } = useAppSelector(
    (s) => s.auth,
  );

  const [form, setForm] = useState({ name: "", email: "", otp: "" });
  const [localMsg, setLocalMsg] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [step, setStep] = useState(0); // modal steps

  // If user is already logged in → redirect
  useEffect(() => {
    if (hydrated && token && user?.name && user?.email) {
      router.replace("/");
    }
  }, [hydrated, token, user, router]);

  // hydrate session on first load
  useEffect(() => {
    if (!hydrated) dispatch(hydrateSession());
  }, [hydrated, dispatch]);

  // resend timer countdown
  useEffect(() => {
    if (!otpSent || resendTimer <= 0) return;
    const id = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) {
          clearInterval(id);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [otpSent, resendTimer]);

  const onChange =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((s) => ({ ...s, [k]: e.target.value }));
      setLocalMsg(null);
    };

  const sendOtp = async () => {
    if (!form.email.trim() || !form.name.trim()) {
      setLocalMsg("Name and Email are required.");
      return;
    }
    try {
      await dispatch(requestOtp(form.email)).unwrap();
      setLocalMsg("OTP sent to your email.");
      setResendTimer(60);
      setStep(1);
    } catch (err: any) {
      setLocalMsg(err?.message || "Failed to send OTP.");
    }
  };

  const verify = async () => {
    if (!form.email.trim() || !form.otp.trim()) {
      setLocalMsg("Email and OTP are required.");
      return;
    }
    try {
      await dispatch(
        verifyOtp({
          phone: form.email, // ✅ matches updated thunk
          otp: form.otp,
          name: form.name,
          email: form.email,
        }),
      ).unwrap();
      setLocalMsg(null);
      router.replace("/");
    } catch (err: any) {
      setLocalMsg(err?.message || "Invalid OTP.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-white/60 backdrop-blur-xl">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        onClick={(e) => {
          if (e.target === e.currentTarget) router.replace("/");
        }}
      />

      {/* Modal */}
      <motion.div
        role="dialog"
        aria-modal="true"
        className="relative md:min-w-[524px] min-w-screen bg-white rounded-t-3xl md:rounded-4xl max-h-[90vh] sm:p-9 p-[8.9vw] sm:pb-32 md:pb-9 pb-32 sm:pt-9 pt-2 z-10 overflow-hidden"
        style={{ boxShadow: "0 0 54px 10px rgba(0, 0, 0, 0.08)" }}
        layout
        initial={{
          y:
            typeof window !== "undefined" && window.innerWidth < 768
              ? "100%"
              : 0,
          opacity: 0,
        }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        drag={
          typeof window !== "undefined" && window.innerWidth < 768 ? "y" : false
        }
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.3}
        onDragEnd={(event, info) => {
          if (info.offset.y > 100) router.replace("/");
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {step === 0 && (
            <motion.div
              key="step-0"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={stepVariants}
              transition={stepVariants.transition}
              className="space-y-6 md:pt-0 pt-6"
              layout
            >
              <h1 className="text-xl font-medium">Welcome to TIXIN</h1>
              <p className="text-sm text-zinc-500">
                Enter your name & email to continue
              </p>

              <div className="space-y-3">
                <input
                  type="text"
                  value={form.name}
                  onChange={onChange("name")}
                  placeholder="Full name"
                  className="w-full p-4 text-base border border-zinc-300 rounded-2xl bg-zinc-100"
                />
                <input
                  type="email"
                  value={form.email}
                  onChange={onChange("email")}
                  placeholder="you@example.com"
                  className="w-full p-4 text-base border border-zinc-300 rounded-2xl bg-zinc-100"
                />
              </div>

              {localMsg && <p className="text-sm text-zinc-500">{localMsg}</p>}
              {error && <p className="text-sm text-red-500">{error}</p>}

              <button
                onClick={sendOtp}
                disabled={loading}
                className="w-full py-4 bg-yellow-400 rounded-full text-black font-medium disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step-1"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={stepVariants}
              transition={stepVariants.transition}
              className="space-y-6 md:pt-0 pt-6"
              layout
            >
              <h1 className="text-xl font-medium">Verify OTP</h1>
              <p className="text-sm text-zinc-500">
                We’ve sent a code to <strong>{form.email}</strong>
              </p>

              <input
                type="text"
                value={form.otp}
                onChange={onChange("otp")}
                placeholder="Enter OTP"
                className="w-full p-4 text-base border border-zinc-300 rounded-2xl bg-zinc-100"
              />

              {localMsg && <p className="text-sm text-zinc-500">{localMsg}</p>}
              {error && <p className="text-sm text-red-500">{error}</p>}

              <button
                onClick={verify}
                disabled={loading}
                className="w-full py-4 bg-yellow-400 rounded-full text-black font-medium disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>

              <button
                onClick={sendOtp}
                disabled={resendTimer > 0}
                className="w-full py-3 border border-zinc-300 rounded-full text-zinc-600 disabled:opacity-50"
              >
                {resendTimer > 0
                  ? `Resend OTP in ${resendTimer}s`
                  : "Resend OTP"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
