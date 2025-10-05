"use client";

import { useState, useEffect, useRef } from "react";
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

export default function AuthPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const { user, token, otpSent, loading, error, hydrated } = useAppSelector(
    (s) => s.auth,
  );

  const [form, setForm] = useState({ name: "", email: "", otp: "" });
  const [localMsg, setLocalMsg] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [step, setStep] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const submittedRef = useRef<string | null>(null); // guard against duplicate submits

  // Redirect if already logged in
  useEffect(() => {
    if (hydrated && token && user?.name && user?.email) {
      router.replace("/");
    }
  }, [hydrated, token, user, router]);

  // hydrate session
  useEffect(() => {
    if (!hydrated) dispatch(hydrateSession());
  }, [hydrated, dispatch]);

  // resend timer
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

  // focus first OTP input when entering step 1
  useEffect(() => {
    if (step === 1) {
      // small timeout to ensure inputs mounted
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    }
  }, [step]);

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
      // clear any previous OTP
      setForm((s) => ({ ...s, otp: "" }));
      submittedRef.current = null;
      setStep(1);
    } catch (err: any) {
      setLocalMsg(err?.message || "Failed to send OTP.");
    }
  };

  // verify accepts optional otpParam so we can auto-call with immediate value
  const verify = async (otpParam?: string) => {
    const otpToUse = otpParam ?? form.otp ?? "";
    setLocalMsg(null);

    if (!form.email.trim() || otpToUse.length !== 6) {
      setLocalMsg("Enter the full 6-digit OTP.");
      return;
    }

    // prevent duplicate verify while a request is in-flight or same code already submitted
    if (loading) return;
    if (submittedRef.current === otpToUse) return;
    submittedRef.current = otpToUse;

    try {
      await dispatch(
        verifyOtp({
          identifier: form.email, // matches authSlice signature
          otp: otpToUse,
          name: form.name,
          email: form.email,
        }),
      ).unwrap();

      setLocalMsg(null);
      setForm((s) => ({ ...s, otp: "" }));
      submittedRef.current = null;
      router.replace("/");
    } catch (err: any) {
      // allow retry on failure
      submittedRef.current = null;
      setLocalMsg(err?.message || "Invalid OTP.");
    }
  };

  // ------- OTP input handling -------
  const ensureOtpArray = (otpStr: string) => {
    const arr = otpStr.split("");
    while (arr.length < 6) arr.push("");
    return arr.slice(0, 6);
  };

  const handleOtpChange = (val: string, idx: number) => {
    // only allow a single digit
    const digit = val.replace(/\D/g, "").slice(-1);
    const otpArr = ensureOtpArray(form.otp);
    otpArr[idx] = digit;
    const newOtp = otpArr.join("");
    setForm((s) => ({ ...s, otp: newOtp }));
    setLocalMsg(null);

    if (digit && idx < 5) {
      otpRefs.current[idx + 1]?.focus();
    }

    // If all filled (no empty strings), auto-verify
    if (otpArr.every((d) => d !== "")) {
      verify(newOtp);
    }
  };

  const handleOtpKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number,
  ) => {
    const key = e.key;
    // backspace behavior
    if (key === "Backspace") {
      const otpArr = ensureOtpArray(form.otp);
      if (otpArr[idx]) {
        // clear current
        otpArr[idx] = "";
        setForm((s) => ({ ...s, otp: otpArr.join("") }));
        // keep focus on same input
        return;
      }
      if (idx > 0) {
        otpRefs.current[idx - 1]?.focus();
        const otpArr2 = ensureOtpArray(form.otp);
        otpArr2[idx - 1] = "";
        setForm((s) => ({ ...s, otp: otpArr2.join("") }));
      }
    }

    // allow arrow navigation
    if (key === "ArrowLeft" && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
    if (key === "ArrowRight" && idx < 5) {
      otpRefs.current[idx + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (!pasted) return;
    const padded = pasted.padEnd(6, "");
    setForm((s) => ({ ...s, otp: padded }));
    // fill the visible inputs
    padded.split("").forEach((d, i) => {
      if (otpRefs.current[i]) otpRefs.current[i]!.value = d;
    });
    // auto verify if full 6
    if (pasted.length === 6) {
      verify(pasted);
    } else {
      // focus next empty
      const nextEmpty = padded.split("").findIndex((c) => c === "");
      otpRefs.current[nextEmpty >= 0 ? nextEmpty : 5]?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-white/60 backdrop-blur-xl">
      <motion.div
        role="dialog"
        aria-modal="true"
        className="relative md:max-w-[524px] w-screen bg-white rounded-t-3xl md:rounded-4xl max-h-[90vh] sm:p-9 p-[8.9vw] sm:pb-32 md:pb-9 pb-32 sm:pt-9 pt-2 z-10 overflow-hidden"
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
              className="space-y-6 md:pt-0 pt-6 w-full md:max-w-[524px]"
              layout
            >
              <h1 className="text-xl font-medium">Verify OTP</h1>
              <p className="text-sm text-zinc-500">
                We’ve sent a code to <strong>{form.email}</strong>
              </p>

              <div
                className="space-y-2 w-full"
                // handle paste at container level so any input can be used to paste
                onPaste={handleOtpPaste}
              >
                <div className="text-base">Enter OTP sent on your Email</div>
                <div className="flex justify-center md:gap-3 gap-2 w-full">
                  {ensureOtpArray(form.otp).map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-${idx}`}
                      ref={(el) => (otpRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={form.otp[idx] || ""}
                      onChange={(e) => handleOtpChange(e.target.value, idx)}
                      onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                      className="md:h-16 h-[12.3076vw] w-full text-center text-base border md:rounded-2xl rounded-[4.102vw] border-[#E5E5E5] focus:outline-none text-black"
                      aria-label={`OTP digit ${idx + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => verify()}
                  disabled={loading || form.otp.length !== 6}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white bg-black disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify OTP"}
                </button>
              </div>

              {localMsg && <p className="text-sm text-zinc-500">{localMsg}</p>}
              {error && <p className="text-sm text-red-500">{error}</p>}

              <button
                onClick={sendOtp}
                disabled={resendTimer > 0 || loading}
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
