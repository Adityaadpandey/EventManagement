import React, { useState, useRef, useEffect, useCallback } from "react";

interface OtpInputProps {
  otpLength?: number;
  verifyEmailOtp: (otp: string) => void;
  resendOtp: () => void;
  resendTimer: number;
  isVerifying: boolean;
  authLoading: boolean;
}

const OtpInput: React.FC<OtpInputProps> = ({
  otpLength = 6,
  verifyEmailOtp,
  resendOtp,
  resendTimer,
  isVerifying,
  authLoading,
}) => {
  const [otp, setOtp] = useState<string[]>(Array(otpLength).fill(""));
  const [lastSubmittedOtp, setLastSubmittedOtp] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
    };
  }, []);

  const submitOtp = useCallback(
    (otpString: string) => {
      if (isSubmitting || isVerifying) {
        return;
      }

      if (otpString === lastSubmittedOtp) {
        return;
      }

      if (otpString.length !== otpLength || !/^\d+$/.test(otpString)) {
        return;
      }

      setIsSubmitting(true);
      setLastSubmittedOtp(otpString);

      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }

      // Debounce submission to prevent rapid-fire submits
      submitTimeoutRef.current = setTimeout(() => {
        verifyEmailOtp(otpString);
        setTimeout(() => setIsSubmitting(false), 1000);
      }, 300);
    },
    [isSubmitting, isVerifying, lastSubmittedOtp, otpLength, verifyEmailOtp],
  );

  useEffect(() => {
    if (otp.every((digit) => digit !== "")) {
      const otpString = otp.join("");
      submitOtp(otpString);
    }
  }, [otp, submitOtp]);

  useEffect(() => {
    const currentOtp = otp.join("");
    if (currentOtp.length < otpLength && lastSubmittedOtp) {
      setLastSubmittedOtp("");
      setIsSubmitting(false);
    }
  }, [otp, otpLength, lastSubmittedOtp]);

  const handleChange = (val: string, idx: number) => {
    if (val && !/^\d$/.test(val)) return;

    const newOtp = [...otp];

    if (val.length === 1) {
      newOtp[idx] = val;
      setOtp(newOtp);

      // Auto-focus next input
      if (idx < otpLength - 1) {
        inputRefs.current[idx + 1]?.focus();
      }
    } else if (val.length === 0) {
      newOtp[idx] = "";
      setOtp(newOtp);
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number,
  ) => {
    if (e.key === "Backspace") {
      if (!otp[idx]) {
        // If current box is empty, move to previous and clear it
        if (idx > 0) {
          const newOtp = [...otp];
          newOtp[idx - 1] = "";
          setOtp(newOtp);
          inputRefs.current[idx - 1]?.focus();
        }
      } else {
        const newOtp = [...otp];
        newOtp[idx] = "";
        setOtp(newOtp);
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
      e.preventDefault();
    } else if (e.key === "ArrowRight" && idx < otpLength - 1) {
      inputRefs.current[idx + 1]?.focus();
      e.preventDefault();
    } else if (e.key === "Enter") {
      // Manual submit on Enter
      const otpString = otp.join("");
      if (otpString.length === otpLength) {
        submitOtp(otpString);
      }
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("Text")
      .replace(/\s/g, "")
      .slice(0, otpLength);

    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = pastedData
      .split("")
      .concat(Array(otpLength).fill(""))
      .slice(0, otpLength);

    setOtp(newOtp);

    const nextEmptyIndex = newOtp.findIndex((digit) => digit === "");
    const focusIndex = nextEmptyIndex === -1 ? otpLength - 1 : nextEmptyIndex;
    inputRefs.current[focusIndex]?.focus();
  };

  const handleFocus = (idx: number) => {
    inputRefs.current[idx]?.select();
  };

  const handleResendClick = () => {
    if (resendTimer > 0 || authLoading) return;

    setOtp(Array(otpLength).fill(""));
    setLastSubmittedOtp("");
    setIsSubmitting(false);

    inputRefs.current[0]?.focus();

    resendOtp();
  };

  const clearOtp = () => {
    setOtp(Array(otpLength).fill(""));
    setLastSubmittedOtp("");
    setIsSubmitting(false);
    inputRefs.current[0]?.focus();
  };

  const isDisabled = isSubmitting || isVerifying;

  return (
    <div className="space-y-2 w-full">
      <div className="flex justify-between items-center">
        <div className="text-base">Enter OTP sent on your Email</div>
        {otp.some((digit) => digit !== "") && !isDisabled && (
          <button
            onClick={clearOtp}
            className="text-xs text-zinc-500 hover:text-zinc-700 underline"
            type="button"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex justify-center md:gap-3 gap-2 w-full">
        {otp.map((digit, idx) => (
          <input
            key={idx}
            type="text"
            inputMode="numeric"
            pattern="\d*"
            value={digit}
            maxLength={1}
            ref={(el) => (inputRefs.current[idx] = el)}
            onChange={(e) => handleChange(e.target.value, idx)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            onPaste={handlePaste}
            onFocus={() => handleFocus(idx)}
            disabled={isDisabled}
            className={`md:h-16 h-[12.3076vw] w-full text-center text-base border md:rounded-2xl rounded-[4.102vw] border-[#E5E5E5] focus:outline-none transition-colors ${
              isDisabled ? "bg-gray-100 cursor-not-allowed" : "bg-white"
            } ${digit ? "border-black" : ""}`}
            aria-label={`OTP digit ${idx + 1}`}
          />
        ))}
      </div>

      <button
        onClick={handleResendClick}
        disabled={resendTimer > 0 || authLoading}
        className={`w-full px-3 py-2 rounded-lg text-sm text-white transition-colors ${
          resendTimer > 0 || authLoading
            ? "bg-zinc-400 cursor-not-allowed"
            : "bg-zinc-600 hover:bg-zinc-700 cursor-pointer"
        }`}
        type="button"
      >
        {resendTimer > 0
          ? `Resend in ${resendTimer}s`
          : authLoading
            ? "Sending..."
            : "Resend OTP"}
      </button>

      {(isVerifying || isSubmitting) && (
        <p className="text-center text-sm text-zinc-600">Verifying OTP...</p>
      )}
    </div>
  );
};

export default OtpInput;
