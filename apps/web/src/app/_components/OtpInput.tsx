import React, { useState, useRef, useEffect } from "react";

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
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // ✅ Auto-submit when all boxes filled
  useEffect(() => {
    if (otp.every((digit) => digit !== "")) {
      verifyEmailOtp(otp.join(""));
    }
  }, [otp, verifyEmailOtp]);

  const handleChange = (val: string, idx: number) => {
    if (/[^0-9]/.test(val)) return;

    const newOtp = [...otp];
    newOtp[idx] = val.slice(-1);
    setOtp(newOtp);

    if (val && idx < otpLength - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number,
  ) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("Text").slice(0, otpLength);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = pastedData
      .split("")
      .concat(Array(otpLength).fill(""))
      .slice(0, otpLength);
    setOtp(newOtp);
  };

  return (
    <div className="space-y-2 w-full">
      <div className="text-base">Enter OTP sent on your Email</div>
      <div className="flex justify-center md:gap-3 gap-2 w-full">
        {otp.map((digit, idx) => (
          <input
            key={idx}
            type="text"
            value={digit}
            maxLength={1}
            ref={(el) => (inputRefs.current[idx] = el)}
            onChange={(e) => handleChange(e.target.value, idx)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            onPaste={handlePaste}
            className="md:h-16 h-[12.3076vw] w-full text-center text-base border md:rounded-2xl rounded-[4.102vw] border-[#E5E5E5] focus:outline-none"
          />
        ))}
      </div>

      <button
        onClick={resendOtp}
        disabled={resendTimer > 0 || authLoading}
        className={`w-full px-3 py-2 rounded-lg text-sm text-white ${
          resendTimer > 0 ? "bg-zinc-400" : "bg-zinc-600"
        }`}
      >
        {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
      </button>

      {isVerifying && <p className="text-center text-sm">Verifying...</p>}
    </div>
  );
};

export default OtpInput;
