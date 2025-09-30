import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { StepBreadcrumb } from "./StepBreadcrumb";

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
  verifyEmailOtp: () => void;
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
}) => {
  if (!modalOpen) return null;

  const backdropClick = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    if (modalStep === 3) {
      // while processing, ignore backdrop clicks
      return;
    }
    closeModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-white/60 backdrop-blur-xl">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}
      />

      {/* Modal */}
      <motion.div
        role="dialog"
        aria-modal="true"
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
              <div className="text-sm">Choose ticket type</div>
              <div className="space-y-3 md:max-h-[300px] overflow-y-auto">
                {ev.TicketType.map((t: any) => {
                  const active = t.ticketTypeId === selectedTicketId;
                  return (
                    <div
                      key={t.ticketTypeId}
                      className={`flex items-center justify-between gap-4 p-3 rounded-2xl ${
                        active ? "bg-[#FFF2AB]" : "bg-[#FFF2AB]"
                      }`}
                    >
                      <div>
                        <div className="font-medium">{t.name}</div>
                        <div className="text-xs">₹{t.price}</div>
                      </div>
                      <div className="flex items-center gap-2 bg-black text-white rounded-xl py-1">
                        {active ? (
                          <div className="flex items-center">
                            <button
                              onClick={decQty}
                              className="px-3 cursor-pointer"
                            >
                              −
                            </button>
                            <h6 className="text-center bg-white text-black rounded-lg w-[43px] h-[40px] font-semibold flex items-center justify-center">
                              {selectedQuantity}
                            </h6>
                            <button
                              onClick={incQty}
                              className="px-3 cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => selectTicketType(t.ticketTypeId)}
                            className="px-4 py-2 rounded-xl bg-black text-white cursor-pointer"
                          >
                            ADD
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {localAuthMsg && (
                <div className="text-xs text-zinc-300">{localAuthMsg}</div>
              )}

              <button
                onClick={proceedFromTypes}
                className="px-4 sm:py-7 py-6 rounded-full text-2xl bg-[#FFE348] w-full border-b-3 border-[#FFDA0A] cursor-pointer flex gap-3 justify-center"
                style={{ boxShadow: "inset 0 0 15px 2px #FFF" }}
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
              className="space-y-4 h-full w-full md:w-[796px] md:py-14 py-7 md:px-4 sm:px-0 mx-auto"
              layout
            >
              <div className="space-y-4 w-full max-w-[523px] mx-auto h-[56vh] overflow-y-auto scrollable-with-scrollbar">
                <h1>Ticket Details</h1>

                <p className="text-[#8B8B8B]">
                  You will recieve your tickets and any update about the event
                  through these credentials, please double check them once
                </p>

                {isAuthenticated ? (
                  <div className="space-y-2">
                    <div className="text-base">Your Name</div>
                    <input
                      value={authForm.name}
                      onChange={onAuthChange("name")}
                      className="w-full p-6 text-base border border-[#E5E5E5] text-[#8B8B8B] rounded-2xl bg-[#F5F5F5]"
                      placeholder="Full name"
                    />
                    <div className="text-base">Email address</div>
                    <input
                      value={authForm.identifier}
                      onChange={onAuthChange("identifier")}
                      className="w-full p-6 text-base border border-[#E5E5E5] text-[#8B8B8B] rounded-2xl bg-[#F5F5F5]"
                      placeholder="Email"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <div className="text-base">Name</div>
                      <input
                        value={authForm.name}
                        onChange={onAuthChange("name")}
                        className="w-full p-6 text-base border border-[#E5E5E5] text-[#8B8B8B] rounded-2xl bg-[#F5F5F5]"
                        placeholder="Full name"
                      />
                    </div>
                    <div>
                      <div className="text-base">Email</div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          value={authForm.identifier}
                          onChange={onAuthChange("identifier")}
                          className="w-full p-6 text-base border border-[#E5E5E5] text-[#8B8B8B] rounded-2xl bg-[#F5F5F5]"
                          placeholder="you@example.com"
                          type="email"
                        />
                        {!otpSent ? (
                          <button
                            onClick={sendOtp}
                            disabled={authLoading}
                            className="w-full sm:w-auto p-6 text-base border border-[#E5E5E5] text-[#8B8B8B] rounded-2xl bg-[#F5F5F5] shrink-0 text-nowrap"
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
                      <div className="space-y-2">
                        <div className="text-xs">Enter OTP</div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            value={authForm.otp}
                            onChange={onAuthChange("otp")}
                            className="w-full p-6 text-base border border-[#E5E5E5] text-[#8B8B8B] rounded-2xl bg-[#F5F5F5]"
                            placeholder="123456"
                          />
                          <button
                            onClick={verifyEmailOtp}
                            disabled={isVerifying}
                            className="p-6 text-base border border-[#E5E5E5] text-[#8B8B8B] rounded-2xl bg-[#F5F5F5]"
                          >
                            {isVerifying ? "Verifying..." : "Verify"}
                          </button>
                        </div>
                        <button
                          onClick={resendOtp}
                          disabled={resendTimer > 0 || authLoading}
                          className={`w-full px-3 py-2 rounded text-sm text-white ${
                            resendTimer > 0 ? "bg-zinc-400" : "bg-zinc-600"
                          }`}
                        >
                          {resendTimer > 0
                            ? `Resend in ${resendTimer}s`
                            : "Resend OTP"}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {ev.CustomField?.length > 0 && (
                  <div className="mt-3 space-y-3">
                    <div className="text-base">Attendee info</div>
                    {ev.CustomField.map((cf: any, idx: number) => (
                      <div key={cf.label + idx} className="space-y-3">
                        <div className="text-base">
                          {cf.label}{" "}
                          {cf.required && (
                            <span className="text-red-600 text-2xl">*</span>
                          )}
                        </div>
                        <input
                          value={attendee[cf.label] ?? ""}
                          onChange={(e) =>
                            handleAttendeeChange(cf.label, e.target.value)
                          }
                          placeholder={cf.fieldType}
                          className="w-full p-6 text-base border border-[#E5E5E5] text-[#8B8B8B] rounded-2xl bg-[#F5F5F5]"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-full flex flex-col gap-2 justify-center items-center">
                {localAuthMsg && (
                  <div className="text-xs text-red-500">{localAuthMsg}</div>
                )}

                {buyError && (
                  <div className="text-xs text-red-500">{buyError}</div>
                )}

                <button
                  onClick={() => {
                    if (!isAuthenticated && !token) {
                      setLocalAuthMsg(
                        "Please verify email (OTP) before proceeding.",
                      );
                      return;
                    }
                    setModalStep(2);
                  }}
                  className="px-6 sm:py-7 py-6 rounded-full md:text-xl text-base bg-[#FFE348] w-full border-b-3 border-[#FFDA0A] cursor-pointer max-w-[300px]"
                  style={{ boxShadow: "inset 0 0 15px 2px #FFF" }}
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
              className="space-y-4 min-h-[80vh] md:w-[796px] md:pt-14 pt-7"
              layout
            >
              <div className="space-y-4 md:w-[574px] mx-auto h-[55vh] overflow-y-auto scrollable-with-scrollbar">
                <div className="flex flex-col md:flex-row gap-6 md:items-center bg-[#F7F7F7] p-2 rounded-[28px]">
                  <div className="md:w-[221px] w-full h-[221px] bg-zinc-800 rounded-2xl overflow-hidden flex-shrink-0">
                    {ev.banner_square || ev.banner_horizontal ? (
                      <img
                        src={ev.banner_square || ev.banner_horizontal}
                        alt={ev.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-[#8B8B8B]">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-between h-full gap-5">
                    <h1 className="font-medium">{ev.title}</h1>

                    <div>
                      <div className="flex items-center gap-2 pb-5">
                        <img src="/svgs/calendar.svg" alt="" />
                        <h6 className="">
                          {ev.date &&
                            new Date(ev.date).toLocaleDateString(undefined, {
                              month: "long",
                              day: "numeric",
                            })}{" "}
                        </h6>
                      </div>

                      <div className="flex items-center gap-2 pb-5">
                        <img src="/svgs/clock.svg" alt="" />
                        <h6 className="">
                          {ev.time &&
                            `${new Date(ev.time).toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}`}
                        </h6>
                      </div>

                      <div className="flex items-center gap-2">
                        <img src="/svgs/location.svg" alt="" width={16} />
                        <h6 className="">{ev.location}</h6>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col px-2">
                  <div className="pt-6 flex flex-col md:flex-row md:justify-between md:items-end gap-8">
                    {/* Left: User Details */}
                    <div className="flex flex-col gap-5 w-full md:max-w-[50%] px-3">
                      <div className="space-y-1">
                        <p className="text-[#8B8B8B]">Name</p>{" "}
                        <p className="text-zinc-900 break-words">
                          {authForm.name || me?.name || "N/A"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[#8B8B8B]">Email:</p>{" "}
                        <p className="text-zinc-900 break-words">
                          {authForm.identifier || me?.email || "N/A"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[#8B8B8B]">Ticket Details:</p>{" "}
                        <p className="text-zinc-900">
                          {selectedTicket?.name || "N/A"} – ₹
                          {selectedTicket?.price || 0} × {selectedQuantity}
                        </p>
                      </div>
                    </div>

                    {/* Right: Pricing Summary */}
                    <div className="flex flex-col gap-3 text-right md:w-[246px]">
                      <div className="flex justify-between px-2">
                        <p className="text-[#8B8B8B]">SUB TOTAL</p>{" "}
                        <p className="text-zinc-900">
                          ₹{(selectedTicket?.price ?? 0) * selectedQuantity}
                        </p>
                      </div>
                      <div className="flex justify-between px-2">
                        <p className="text-[#8B8B8B]">GST</p>{" "}
                        <p className="text-zinc-900">
                          ₹0
                          {/* {(
                            (selectedTicket?.price ?? 0) *
                            selectedQuantity *
                            0.18
                          ).toFixed(2)} */}
                        </p>
                      </div>
                      <div className="flex justify-between bg-[#F5F5F5] py-3 px-2 rounded-md m-0">
                        <h5 className="text-[#8B8B8B]">TOTAL</h5>{" "}
                        <h5>
                          ₹
                          {(
                            (selectedTicket?.price ?? 0) * selectedQuantity
                          ).toFixed(2)}
                        </h5>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {buyError && (
                <div className="text-sm text-red-500 mt-2 flex w-full justify-center">
                  {buyError}
                </div>
              )}
              <div className="w-full flex justify-center">
                <button
                  onClick={onBuy}
                  disabled={buying}
                  className="px-4 sm:py-7 py-6 rounded-full text-xl bg-[#FFE348] w-[300px] border-b-3 border-[#FFDA0A] cursor-pointer mx-auto"
                  style={{ boxShadow: "inset 0 0 15px 2px #FFF" }}
                >
                  {buying ? "Processing..." : "Proceed to Payment"}
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
                {/* Animated Loader Ring */}
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

                {/* Title */}
                <h3 className="text-xl font-semibold text-gray-900">
                  Processing your payment…
                </h3>
                <p className="text-sm text-gray-600 max-w-[400px] leading-relaxed">
                  We’re verifying your payment and generating your ticket. This
                  may take a few seconds — please don’t close or refresh.
                </p>

                {/* Progress Bar with shimmer */}
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

                {/* Helper text */}
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
