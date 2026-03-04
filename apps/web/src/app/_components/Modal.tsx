import React, { useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { StepBreadcrumb } from "./StepBreadcrumb";
import CustomFieldInput from "@/app/_components/CustomFieldInput";
import OtpInput from "./OtpInput";
import Image from "next/image";
import { useParams } from "next/navigation";

const stepVariants = {
  initial: { opacity: 0, y: 40, x: 40 },
  animate: { opacity: 1, y: 0, x: 0 },
  exit: { opacity: 0, y: -40, x: -40 },
  transition: { duration: 0.4, ease: "easeOut" },
};

interface ModalProps {
  modalOpen: boolean;
  closeModal: () => void;
  modalStep: number;
  setModalStep: (step: number) => void;
  ev: any;
  selectedTicketId: string | null;
  selectedTicket: any;
  selectedQuantity: number;
  incQty: () => void;
  decQty: () => void;
  selectTicketType: (id: string) => void;
  fmtCurrency: (amount: number) => string;
  localAuthMsg: string | null;
  setLocalAuthMsg: (msg: string | null) => void;
  authForm: any;
  onAuthChange: (
    key: string,
  ) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  isAuthenticated: boolean;
  sendOtp: () => void;
  otpSent: boolean;
  isVerifying: boolean;
  verifyEmailOtp: (otp?: string) => void;
  resendOtp: () => void;
  resendTimer: number;
  authLoading: boolean;
  token: string | null;
  attendee: any;
  handleAttendeeChange: (label: string, value: string) => void;
  buyError: string | null;
  buying: boolean;
  onBuy: () => void;
  me: any;
  proceedFromTypes: () => void;
  discountCode: string;
  setDiscountCode: (code: string) => void;
  appliedDiscount: any;
  discountError: string | null;
  applyingDiscount: boolean;
  applyDiscountCode: () => void;
  countryCode: string;
  setCountryCode: (code: string) => void;
}

const Modal: React.FC<ModalProps> = ({
  modalOpen,
  closeModal,
  modalStep,
  setModalStep,
  ev,
  selectedTicketId,
  selectedTicket,
  selectedQuantity,
  incQty,
  decQty,
  selectTicketType,
  fmtCurrency,
  localAuthMsg,
  setLocalAuthMsg,
  authForm,
  onAuthChange,
  isAuthenticated,
  sendOtp,
  otpSent,
  isVerifying,
  verifyEmailOtp,
  resendOtp,
  resendTimer,
  authLoading,
  token,
  attendee,
  handleAttendeeChange,
  buyError,
  buying,
  onBuy,
  me,
  proceedFromTypes,
  discountCode,
  setDiscountCode,
  appliedDiscount,
  discountError,
  applyingDiscount,
  applyDiscountCode,
  countryCode,
  setCountryCode,
}) => {
  // Get event ID from URL params
  const params = useParams();
  const eventIdFromParams = params?.eventId as string;

  // Check if this is the restricted event
  const isRestrictedEvent =
    eventIdFromParams === "1edc63ac-30b1-42f3-8342-f008eb42439a";
  const maxAllowedQty = isRestrictedEvent ? 1 : 999;

  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [modalOpen]);

  // Handle escape key to close modal
  useEffect(() => {
    if (!modalOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modalStep !== 3) {
        closeModal();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [modalOpen, modalStep, closeModal]);

  const validateStep1 = useCallback((): {
    valid: boolean;
    message: string;
  } => {
    const trimmedName = authForm.name?.trim();
    if (!trimmedName || trimmedName.length === 0) {
      return { valid: false, message: "Please enter your name" };
    }

    if (trimmedName.length < 2) {
      return { valid: false, message: "Name must be at least 2 characters" };
    }

    const trimmedEmail = authForm.identifier?.trim();
    if (!trimmedEmail || trimmedEmail.length === 0) {
      return { valid: false, message: "Please enter your email" };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return { valid: false, message: "Please enter a valid email address" };
    }

    if (!isAuthenticated && !token) {
      return { valid: false, message: "Please verify your email with OTP" };
    }

    const trimmedPhone = authForm.phone?.trim();
    if (!trimmedPhone || trimmedPhone.length === 0) {
      return { valid: false, message: "Please enter your phone number" };
    }

    const phoneDigits = trimmedPhone.replace(/\D/g, "");
    if (phoneDigits.length !== 10) {
      return {
        valid: false,
        message: "Phone number must be exactly 10 digits",
      };
    }

    if (selectedTicket?.CustomField?.length > 0) {
      for (const cf of selectedTicket.CustomField) {
        if (cf.required) {
          const value = attendee[cf.label]?.trim();
          if (!value || value.length === 0) {
            return { valid: false, message: `Please fill in ${cf.label}` };
          }
        }
      }
    }

    if (ev?.CustomField?.length > 0) {
      for (const cf of ev.CustomField) {
        if (cf.required) {
          const value = attendee[cf.label]?.trim();
          if (!value || value.length === 0) {
            return { valid: false, message: `Please fill in ${cf.label}` };
          }
        }
      }
    }

    return { valid: true, message: "" };
  }, [authForm, isAuthenticated, token, ev, attendee, selectedTicket]);

  const getFullPhoneNumber = useCallback(() => {
    return `+${countryCode}${authForm.phone}`;
  }, [countryCode, authForm.phone]);

  const getDisplayPhone = useCallback(() => {
    if (me?.phone) {
      if (me.phone.startsWith("+")) return me.phone;
      return `+${countryCode}${me.phone}`;
    }
    if (authForm.phone) {
      return `+${countryCode}${authForm.phone}`;
    }
    return "N/A";
  }, [me, countryCode, authForm.phone]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && modalStep !== 3) {
        closeModal();
      }
    },
    [modalStep, closeModal],
  );

  const handleProceedToCheckout = useCallback(() => {
    const validation = validateStep1();
    if (!validation.valid) {
      setLocalAuthMsg(validation.message);
      return;
    }
    setLocalAuthMsg(null);
    setModalStep(2);
  }, [validateStep1, setLocalAuthMsg, setModalStep]);

  const handleCountryCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/[^0-9]/g, "");
      if (val.length <= 3) {
        setCountryCode(val);
      }
    },
    [setCountryCode],
  );

  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/\D/g, "");
      if (value.length <= 10) {
        onAuthChange("phone")({
          target: { value },
        } as React.ChangeEvent<HTMLInputElement>);
      }
    },
    [onAuthChange],
  );

  if (!modalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-white/60 backdrop-blur-xl"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative md:min-w-[524px] min-w-screen bg-white rounded-t-3xl md:rounded-4xl max-h-[90vh] sm:p-9 p-[5vw] sm:pt-9 pt-2 z-10 overflow-hidden"
        style={{
          boxShadow: "0 0 54px 10px rgba(0, 0, 0, 0.08)",
          touchAction: "none",
        }}
        onClick={(e) => e.stopPropagation()}
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
          if (modalStep === 3) return;
          if (info.offset.y > 100) {
            closeModal();
          }
        }}
      >
        <div className="w-full flex md:flex-row flex-col justify-center items-center md:pt-4 gap-6">
          <img src="/svgs/DraswerDash.svg" alt="" className="md:hidden" />
          <StepBreadcrumb step={modalStep} setStep={setModalStep} />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {modalStep === 0 && (
            <motion.div
              key="step-0"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={stepVariants}
              transition={stepVariants.transition}
              className="space-y-4 md:pt-0 pt-6"
              layout
            >
              <div className="text-sm" id="modal-title">
                Choose ticket type
              </div>
              <div className="space-y-3 md:max-h-[300px] overflow-y-auto">
                {ev?.TicketType && ev.TicketType.length > 0 ? (
                  [...ev.TicketType]
                    .sort((a: any, b: any) => b.price - a.price)
                    .map((t: any, index: number) => {
                      const active = t.ticketTypeId === selectedTicketId;

                      let isGradient = false;
                      let innerClass =
                        "flex items-center justify-between gap-4 p-3 rounded-2xl";
                      let wrapperClass = "rounded-[18px]";
                      let wrapperStyle: React.CSSProperties | undefined =
                        undefined;
                      let innerStyle: React.CSSProperties | undefined =
                        undefined;

                      if (ev.TicketType.length >= 3) {
                        if (index === 0) {
                          isGradient = true;
                          wrapperClass += " p-[2px]";
                          wrapperStyle = {
                            backgroundImage:
                              "linear-gradient(90deg, #FFC670 0%, #83F180 50%, #1BB3F3 100%)",
                          };
                          innerStyle = {
                            backgroundImage:
                              "linear-gradient(0deg, rgba(255,255,255,0.6), rgba(255,255,255,0.6)), linear-gradient(90deg, #FFC670, #83F180, #1BB3F3)",
                          };
                        } else if (index === 1) {
                          innerClass += " bg-[#FFF2AB]";
                        } else {
                          innerClass += " bg-[#F5F5F5]";
                        }
                      } else {
                        innerClass += " bg-[#F5F5F5]";
                      }

                      const TicketBox = (
                        <div className={innerClass} style={innerStyle}>
                          <div>
                            <div className="font-medium">{t.name}</div>
                            <div className="text-xs">
                              ₹
                              {t.discountedPrice && t.discountedPrice > 0
                                ? t.discountedPrice
                                : t.price}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 bg-black text-white rounded-xl py-1">
                            {active ? (
                              <div className="flex items-center">
                                <button
                                  onClick={decQty}
                                  className="px-3 cursor-pointer"
                                  aria-label="Decrease quantity"
                                  type="button"
                                >
                                  −
                                </button>
                                <h6 className="text-center bg-white text-black rounded-lg w-[43px] h-[40px] font-semibold flex items-center justify-center">
                                  {selectedQuantity}
                                </h6>
                                <button
                                  onClick={incQty}
                                  className="px-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                  aria-label="Increase quantity"
                                  type="button"
                                  disabled={selectedQuantity >= maxAllowedQty}
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => selectTicketType(t.ticketTypeId)}
                                className="px-4 py-2 rounded-xl bg-black text-white cursor-pointer"
                                type="button"
                              >
                                ADD
                              </button>
                            )}
                          </div>
                        </div>
                      );

                      return isGradient ? (
                        <div
                          key={t.ticketTypeId}
                          className={wrapperClass}
                          style={wrapperStyle}
                        >
                          {TicketBox}
                        </div>
                      ) : (
                        <div key={t.ticketTypeId}>{TicketBox}</div>
                      );
                    })
                ) : (
                  <div className="text-center text-zinc-400 py-4">
                    No tickets available
                  </div>
                )}
              </div>

              {localAuthMsg && (
                <div className="text-xs text-red-500" role="alert">
                  {localAuthMsg}
                </div>
              )}

              {isRestrictedEvent && selectedQuantity >= maxAllowedQty && (
                <div
                  className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg"
                  role="alert"
                >
                  Maximum 1 ticket allowed per person for this event
                </div>
              )}

              <button
                onClick={proceedFromTypes}
                className="px-4 md:py-7 py-6 rounded-full text-2xl bg-[#FFE348] w-full border-b-3 border-[#FFDA0A] cursor-pointer flex gap-3 justify-center"
                style={{ boxShadow: "inset 0 0 15px 2px #FFF" }}
                type="button"
                disabled={!selectedTicketId}
              >
                Proceed <img src="/svgs/arrowRight.svg" alt="" />
              </button>
            </motion.div>
          )}

          {modalStep === 1 && (
            <motion.div
              key="step-1"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={stepVariants}
              transition={stepVariants.transition}
              className="space-y-4 h-full w-full md:w-[796px] md:py-14 py-7 md:px-4 sm:px-0 mx-auto overflow-x-hidden"
              layout
            >
              <div className="space-y-4 w-full max-w-[523px] mx-auto h-[56vh] overflow-y-auto overflow-hidden scrollable-with-scrollbar">
                <h1>Ticket Details</h1>

                <p className="text-[#8B8B8B]">
                  You will receive your tickets and any update about the event
                  through these credentials, please double check them once
                </p>

                {isAuthenticated ? (
                  <div className="space-y-2">
                    <div className="text-base">Your Name</div>
                    <input
                      value={authForm.name}
                      onChange={onAuthChange("name")}
                      className="w-full p-6 text-base border border-[#E5E5E5] text-[#8B8B8B] rounded-2xl bg-[#F5F5F5] outline-none focus:border-[#FFDA0A]"
                      placeholder="Full name"
                      aria-label="Your name"
                    />
                    <div className="text-base">Phone number</div>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={`+${countryCode}`}
                        onChange={handleCountryCodeChange}
                        className="w-[72px] text-center text-black text-base border border-[#E5E5E5] rounded-2xl bg-[#F5F5F5] outline-none focus:border-[#FFDA0A]"
                        placeholder="+91"
                        maxLength={4}
                        aria-label="Country code"
                      />
                      <input
                        value={authForm.phone}
                        onChange={handlePhoneChange}
                        className="w-full p-6 text-base border border-[#E5E5E5] text-[#8B8B8B] rounded-2xl bg-[#F5F5F5] outline-none focus:border-[#FFDA0A]"
                        placeholder="Phone number"
                        type="tel"
                        maxLength={10}
                        aria-label="Phone number"
                      />
                    </div>
                    <div className="text-base">Email address</div>
                    <input
                      value={authForm.identifier}
                      onChange={onAuthChange("identifier")}
                      className="w-full p-6 text-base border border-[#E5E5E5] text-[#8B8B8B] rounded-2xl bg-[#F5F5F5] outline-none focus:border-[#FFDA0A]"
                      placeholder="Email"
                      type="email"
                      aria-label="Email address"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <div className="text-base">Name</div>
                      <input
                        value={authForm.name}
                        onChange={onAuthChange("name")}
                        className="w-full p-6 text-base border border-[#E5E5E5] text-[#8B8B8B] rounded-2xl bg-[#F5F5F5] outline-none focus:border-[#FFDA0A]"
                        placeholder="Full name"
                        aria-label="Name"
                      />
                    </div>

                    <div>
                      <div className="text-base">Phone number</div>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={`+${countryCode}`}
                          onChange={handleCountryCodeChange}
                          className="w-[72px] text-center text-black text-base border border-[#E5E5E5] rounded-2xl bg-[#F5F5F5] outline-none focus:border-[#FFDA0A]"
                          placeholder="+91"
                          maxLength={4}
                          aria-label="Country code"
                        />
                        <input
                          value={authForm.phone}
                          onChange={handlePhoneChange}
                          className="w-full p-6 text-base border border-[#E5E5E5] text-[#8B8B8B] rounded-2xl bg-[#F5F5F5] outline-none focus:border-[#FFDA0A]"
                          placeholder="Phone number"
                          type="tel"
                          maxLength={10}
                          aria-label="Phone number"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="text-base">Email</div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          value={authForm.identifier}
                          onChange={onAuthChange("identifier")}
                          className="w-full p-6 text-base border border-[#E5E5E5] text-[#8B8B8B] rounded-2xl bg-[#F5F5F5] outline-none focus:border-[#FFDA0A]"
                          placeholder="you@example.com"
                          type="email"
                          aria-label="Email"
                        />
                        {!otpSent ? (
                          <button
                            onClick={sendOtp}
                            disabled={authLoading}
                            className="w-full sm:w-auto p-6 text-base border border-[#E5E5E5] text-[#ffffff] rounded-2xl bg-black shrink-0 text-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            type="button"
                          >
                            {authLoading ? "Sending..." : "Send OTP"}
                          </button>
                        ) : (
                          <div className="px-3 py-2 text-xs text-zinc-300 shrink-0 text-nowrap text-center flex items-center">
                            OTP sent
                          </div>
                        )}
                      </div>
                    </div>

                    {otpSent && (
                      <OtpInput
                        otpLength={6}
                        verifyEmailOtp={verifyEmailOtp}
                        resendOtp={resendOtp}
                        resendTimer={resendTimer}
                        isVerifying={isVerifying}
                        authLoading={authLoading}
                      />
                    )}
                  </div>
                )}

                {(ev?.CustomField?.length > 0 ||
                  selectedTicket?.CustomField?.length > 0) && (
                  <div className="mt-6 space-y-4 pt-4 border-t border-[#E5E5E5]">
                    <div className="text-lg font-medium">
                      Additional Information
                    </div>
                    <p className="text-sm text-[#8B8B8B]">
                      Please provide the following details to complete your
                      booking
                    </p>

                    {ev?.CustomField?.map((cf: any, idx: number) => (
                      <div key={`ev-${cf.label}-${idx}`} className="space-y-2">
                        <div className="text-base flex items-center gap-1">
                          {cf.label}
                          {cf.required && (
                            <span className="text-red-600 text-xl">*</span>
                          )}
                        </div>

                        <CustomFieldInput
                          cf={cf}
                          value={attendee[cf.label] ?? ""}
                          onChange={(value) =>
                            handleAttendeeChange(cf.label, value)
                          }
                        />
                      </div>
                    ))}

                    {selectedTicket?.CustomField?.map(
                      (cf: any, idx: number) => (
                        <div
                          key={`ticket-${cf.label}-${idx}`}
                          className="space-y-2"
                        >
                          <div className="text-base flex items-center gap-1">
                            {cf.label}
                            {cf.required && (
                              <span className="text-red-600 text-xl">*</span>
                            )}
                          </div>

                          <CustomFieldInput
                            cf={cf}
                            value={attendee[cf.label] ?? ""}
                            onChange={(value) =>
                              handleAttendeeChange(cf.label, value)
                            }
                          />
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>

              <div className="w-full flex flex-col gap-2 justify-center items-center">
                {(localAuthMsg || buyError) && (
                  <div className="text-xs text-red-500" role="alert">
                    {localAuthMsg || buyError}
                  </div>
                )}

                <button
                  onClick={handleProceedToCheckout}
                  className="px-6 sm:py-7 py-6 rounded-full md:text-xl text-base bg-[#FFE348] w-full border-b-3 border-[#FFDA0A] cursor-pointer max-w-[300px]"
                  style={{ boxShadow: "inset 0 0 15px 2px #FFF" }}
                  type="button"
                >
                  Continue to Checkout
                </button>
              </div>
            </motion.div>
          )}

          {modalStep === 2 && (
            <motion.div
              key="step-2"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={stepVariants}
              transition={stepVariants.transition}
              className="space-y-4 md:w-[796px] md:pt-14 pt-7"
              layout
            >
              <div className="space-y-4 md:w-[574px] mx-auto h-[55vh] overflow-y-auto scrollable-with-scrollbar">
                <div className="flex flex-col md:flex-row gap-6 md:items-center bg-[#F7F7F7] p-2 rounded-[28px]">
                  <div className="md:w-[221px] w-full h-[221px] bg-zinc-800 rounded-2xl overflow-hidden flex-shrink-0">
                    {ev?.banner_square || ev?.banner_horizontal ? (
                      <Image
                        src={
                          ev.banner_square ||
                          ev.banner_horizontal ||
                          "/default-image.jpg"
                        }
                        alt={ev.title || "Event"}
                        width={200}
                        height={200}
                        objectFit="cover"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-[#8B8B8B]">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-between h-full gap-5">
                    <h1 className="font-medium">{ev?.title || "Event"}</h1>

                    <div>
                      {ev?.date && (
                        <div className="flex items-center gap-2 pb-5">
                          <img src="/svgs/calendar.svg" alt="" />
                          <h6 className="">
                            {new Date(ev.date).toLocaleDateString(undefined, {
                              month: "long",
                              day: "numeric",
                            })}
                          </h6>
                        </div>
                      )}

                      {ev?.time && (
                        <div className="flex items-center gap-2 pb-5">
                          <img src="/svgs/clock.svg" alt="" />
                          <h6 className="">
                            {new Date(ev.time).toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </h6>
                        </div>
                      )}

                      {ev?.location && (
                        <div className="flex items-center gap-2">
                          <img src="/svgs/location.svg" alt="" width={16} />
                          <h6 className="">{ev.location}</h6>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col px-2 md:h-[42%] pb-7 md:pb-0 mt-6">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-8">
                    <div className="flex flex-col gap-5 w-full md:max-w-[50%] px-3 h-full">
                      <div className="space-y-1">
                        <p className="text-[#8B8B8B]">Name</p>
                        <p className="text-zinc-900 break-words">
                          {authForm.name || me?.name || "N/A"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[#8B8B8B]">Email:</p>
                        <p className="text-zinc-900 break-words">
                          {authForm.identifier || me?.email || "N/A"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[#8B8B8B]">Phone:</p>
                        <p className="text-zinc-900 break-words">
                          {getDisplayPhone()}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[#8B8B8B]">Ticket Details:</p>
                        <p className="text-zinc-900">
                          {selectedTicket?.name || "N/A"} – ₹
                          {selectedTicket?.price || 0} × {selectedQuantity}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-8 justify-between h-full">
                      {ev?._count?.DiscountCode > 0 && (
                        <div className="space-y-2">
                          <div className="relative">
                            <input
                              value={discountCode}
                              onChange={(e) => {
                                setDiscountCode(e.target.value);
                                if (discountError) {
                                  // Clear error when user starts typing
                                }
                              }}
                              placeholder="Have a coupon code?"
                              className="w-full py-3 px-5 text-xs border border-[#E5E5E5] text-[#8B8B8B] rounded-full outline-0"
                              aria-label="Discount code"
                              disabled={applyingDiscount || !!appliedDiscount}
                            />

                            <button
                              onClick={applyDiscountCode}
                              disabled={
                                applyingDiscount ||
                                !discountCode.trim() ||
                                !!appliedDiscount
                              }
                              className="text-[10px] px-3 py-2 bg-[#E5E5E5] rounded-full absolute top-[5px] right-[5px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#d5d5d5] transition-colors"
                            >
                              {applyingDiscount
                                ? "..."
                                : appliedDiscount
                                  ? "Applied"
                                  : "Apply"}
                            </button>
                          </div>

                          {appliedDiscount && (
                            <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-3 py-2 rounded-full">
                              <svg
                                className="w-4 h-4"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <span className="font-medium">
                                Discount applied: {appliedDiscount.code}
                              </span>
                            </div>
                          )}

                          {discountError && (
                            <div className="text-xs text-red-500 px-3">
                              {discountError}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex flex-col gap-3 text-right md:w-[246px]">
                        <div className="flex justify-between px-2">
                          <p className="text-[#8B8B8B]">SUB TOTAL</p>
                          <p className="text-zinc-900">
                            ₹{(selectedTicket?.price ?? 0) * selectedQuantity}
                          </p>
                        </div>
                        <div className="flex justify-between px-2">
                          <p className="text-[#8B8B8B]">Platform Fee</p>
                          <p className="text-zinc-900">
                            ₹{selectedTicket.platformfee * selectedQuantity}
                          </p>
                        </div>
                        {appliedDiscount && (
                          <div className="flex justify-between px-2">
                            <p className="text-green-600">Discount</p>
                            <p className="text-green-600 font-medium">
                              -₹
                              {appliedDiscount.discountType === "PERCENTAGE"
                                ? (
                                    ((selectedTicket?.price ?? 0) *
                                      selectedQuantity *
                                      (appliedDiscount.discountPct ?? 0)) /
                                    100
                                  ).toFixed(2)
                                : (
                                    (appliedDiscount.discountAmt ?? 0) *
                                    selectedQuantity
                                  ).toFixed(2)}
                            </p>
                          </div>
                        )}
                        <div className="flex justify-between bg-[#F5F5F5] py-3 px-2 rounded-md m-0">
                          <h5 className="text-[#8B8B8B]">TOTAL</h5>
                          <h5>
                            {(() => {
                              const subtotal =
                                (selectedTicket?.price ?? 0) * selectedQuantity;
                              const platformFee =
                                selectedTicket.platformfee * selectedQuantity;
                              let discount = 0;

                              if (appliedDiscount) {
                                if (
                                  appliedDiscount.discountType === "PERCENTAGE"
                                ) {
                                  discount =
                                    (subtotal *
                                      (appliedDiscount.discountPct ?? 0)) /
                                    100;
                                  if (
                                    appliedDiscount.maxDiscount &&
                                    discount > appliedDiscount.maxDiscount
                                  ) {
                                    discount = appliedDiscount.maxDiscount;
                                  }
                                } else {
                                  discount =
                                    (appliedDiscount.discountAmt ?? 0) *
                                    selectedQuantity;
                                }
                              }

                              const total = subtotal + platformFee - discount;
                              const originalTotal = subtotal + platformFee;

                              return (
                                <div className="flex items-center gap-2">
                                  <span className="font-bold">
                                    ₹{total.toFixed(2)}
                                  </span>
                                  {appliedDiscount && (
                                    <span
                                      className="text-sm text-[#8B8B8B] line-through"
                                      style={{ textDecoration: "line-through" }}
                                    >
                                      ₹{originalTotal.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </h5>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {buyError && (
                <div
                  className="text-sm text-red-500 mt-2 flex w-full justify-center"
                  role="alert"
                >
                  {buyError}
                </div>
              )}
              <div className="w-full flex justify-center overflow-hidden">
                <button
                  onClick={onBuy}
                  disabled={buying}
                  className="px-4 sm:py-7 py-6 relative rounded-full overflow-hidden text-xl bg-[#FFE348] w-[300px] border-b-3 border-[#FFDA0A] cursor-pointer mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ boxShadow: "inset 0 0 15px 2px #FFF" }}
                  type="button"
                >
                  <motion.div
                    className="absolute top-0 h-full w-full pointer-events-none overflow-hidden rounded-full"
                    initial={{ x: "-100%", y: "-40" }}
                    animate={{ x: "120%", y: "0" }}
                    transition={{
                      delay: 0.5,
                      duration: 3.7,
                      ease: "backInOut",
                      repeat: Infinity,
                    }}
                  >
                    <img
                      src="/svgs/shine.svg"
                      alt="shine"
                      className="h-full object-cover opacity-60 rounded-full"
                    />
                  </motion.div>

                  <div className="z-10 relative">
                    {buying ? "Processing..." : "Proceed to Payment"}
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {modalStep === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              className="w-full flex flex-col items-center justify-center p-8"
            >
              <div className="flex flex-col items-center gap-6 text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    ease: "linear",
                  }}
                  className="w-24 h-24 rounded-full border-[6px] border-t-yellow-400 border-r-yellow-300 border-b-transparent border-l-transparent shadow-lg"
                >
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-yellow-300/20 backdrop-blur-sm flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-yellow-400" />
                    </div>
                  </div>
                </motion.div>

                <h3 className="text-xl font-semibold text-gray-900">
                  Processing your payment…
                </h3>
                <p className="text-sm text-gray-600 max-w-[400px] leading-relaxed">
                  We're verifying your payment and generating your ticket. This
                  may take a few seconds — please don't close or refresh.
                </p>

                <div className="mt-4 w-full max-w-[420px]">
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: "80%" }}
                      transition={{
                        duration: 2,
                        ease: "easeInOut",
                        repeat: Infinity,
                        repeatType: "reverse",
                      }}
                      className="h-2 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500"
                    />
                  </div>
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="text-xs text-gray-500 mt-3"
                >
                  If this takes more than{" "}
                  <span className="font-medium">30 seconds</span>, check your
                  email or My Bookings.
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Modal;
