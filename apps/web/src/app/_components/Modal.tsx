import React from "react";

// UI pieces: greyscale styles only
const StepBreadcrumb = ({ step }: { step: number }) => {
  const labels = ["Ticket Types", "Details", "Checkout"];
  return (
    <div className="flex items-center gap-3 mb-4 text-xs text-zinc-400">
      {labels.map((l, i) => (
        <div key={l} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] ${
              i === step
                ? "bg-zinc-300 text-zinc-900"
                : i < step
                  ? "bg-zinc-600 text-zinc-100"
                  : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {i + 1}
          </div>
          <div className={`${i === step ? "text-zinc-100" : "text-zinc-400"}`}>
            {l}
          </div>
          {i < labels.length - 1 && <div className="mx-2 text-zinc-700">/</div>}
        </div>
      ))}
    </div>
  );
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
  setLocalAuthMsg: (msg: string | null) => void; // Added this
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
  setLocalAuthMsg, // Added this parameter
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={closeModal} />

      <div
        role="dialog"
        aria-modal="true"
        className="relative max-w-2xl w-full bg-zinc-900 border border-zinc-700 rounded-lg p-6 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold text-zinc-100">Book tickets</h3>
          <button
            aria-label="Close"
            onClick={closeModal}
            className="text-zinc-400 hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        <StepBreadcrumb step={modalStep} />

        {/* Step 0: Ticket selection */}
        {modalStep === 0 && (
          <div className="space-y-4">
            <div className="text-sm text-zinc-300">Choose ticket type</div>
            <div className="space-y-3">
              {ev.TicketType.map((t: any) => {
                const active = t.ticketTypeId === selectedTicketId;
                return (
                  <div
                    key={t.ticketTypeId}
                    className={`flex items-center justify-between gap-4 p-3 rounded border ${
                      active ? "border-zinc-500 bg-zinc-800" : "border-zinc-700"
                    }`}
                  >
                    <div>
                      <div className="font-medium text-zinc-100">{t.name}</div>
                      <div className="text-xs text-zinc-400">
                        ₹{t.price} • {t.quantity} available
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {active ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={decQty}
                            className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-200"
                            aria-label="Decrease"
                          >
                            −
                          </button>
                          <div className="w-10 text-center text-zinc-100">
                            {selectedQuantity}
                          </div>
                          <button
                            onClick={incQty}
                            className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-200"
                            aria-label="Increase"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => selectTicketType(t.ticketTypeId)}
                          className="px-3 py-1 bg-zinc-700 border border-zinc-700 rounded text-zinc-100"
                        >
                          Add
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

            <div className="flex justify-between items-center pt-4">
              <div className="text-sm text-zinc-400">
                Total:{" "}
                <span className="text-zinc-100">
                  {fmtCurrency(
                    (selectedTicket?.price ?? 0) * selectedQuantity * 100,
                  )}
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 rounded text-sm bg-zinc-800 border border-zinc-700 text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  onClick={proceedFromTypes}
                  className="px-4 py-2 rounded text-sm bg-zinc-700 border border-zinc-700 text-zinc-100"
                >
                  Proceed
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Attendee details */}
        {modalStep === 1 && (
          <div className="space-y-4">
            <div className="text-sm text-zinc-300">Enter attendee details</div>

            {isAuthenticated ? (
              <div className="space-y-2">
                <div className="text-xs text-zinc-400">Name</div>
                <input
                  value={authForm.name}
                  onChange={onAuthChange("name")}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100"
                  placeholder="Full name"
                />
                <div className="text-xs text-zinc-400">Email</div>
                <input
                  value={authForm.identifier}
                  onChange={onAuthChange("identifier")}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100"
                  placeholder="Email"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-zinc-400">Name</div>
                  <input
                    value={authForm.name}
                    onChange={onAuthChange("name")}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <div className="text-xs text-zinc-400">Email</div>
                  <div className="flex gap-2">
                    <input
                      value={authForm.identifier}
                      onChange={onAuthChange("identifier")}
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100"
                      placeholder="you@example.com"
                      type="email"
                    />
                    {!otpSent ? (
                      <button
                        onClick={sendOtp}
                        disabled={authLoading}
                        className="px-3 py-2 bg-zinc-700 border border-zinc-700 rounded text-zinc-100"
                      >
                        {authLoading ? "Sending..." : "Send OTP"}
                      </button>
                    ) : (
                      <div className="px-3 py-2 text-xs text-zinc-300">
                        OTP sent
                      </div>
                    )}
                  </div>
                </div>

                {otpSent && (
                  <div className="space-y-2">
                    <div className="text-xs text-zinc-400">Enter OTP</div>
                    <div className="flex gap-2">
                      <input
                        value={authForm.otp}
                        onChange={onAuthChange("otp")}
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100"
                        placeholder="123456"
                      />
                      <button
                        onClick={verifyEmailOtp}
                        disabled={isVerifying}
                        className="px-3 py-2 bg-zinc-700 border border-zinc-700 rounded text-zinc-100"
                      >
                        {isVerifying ? "Verifying..." : "Verify"}
                      </button>
                    </div>
                    <button
                      onClick={resendOtp}
                      disabled={resendTimer > 0 || authLoading}
                      className={`w-full px-3 py-2 rounded text-sm ${
                        resendTimer > 0
                          ? "bg-zinc-800 text-zinc-400"
                          : "bg-zinc-700 text-zinc-100"
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
                <div className="text-xs text-zinc-400 font-medium">
                  Attendee info
                </div>
                {ev.CustomField.map((cf: any, idx: number) => (
                  <div key={cf.label + idx}>
                    <div className="text-xs text-zinc-400 mb-1">
                      {cf.label}{" "}
                      {cf.required && <span className="text-zinc-300">*</span>}
                    </div>
                    <input
                      value={attendee[cf.label] ?? ""}
                      onChange={(e) =>
                        handleAttendeeChange(cf.label, e.target.value)
                      }
                      placeholder={cf.fieldType}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100"
                    />
                  </div>
                ))}
              </div>
            )}

            {localAuthMsg && (
              <div className="text-xs text-zinc-300">{localAuthMsg}</div>
            )}
            {buyError && <div className="text-xs text-red-500">{buyError}</div>}

            <div className="flex justify-between items-center pt-4">
              <button
                onClick={() => setModalStep(0)}
                className="px-4 py-2 rounded text-sm bg-zinc-800 border border-zinc-700 text-zinc-200"
              >
                Back
              </button>
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
                className="px-4 py-2 rounded text-sm bg-zinc-700 border border-zinc-700 text-zinc-100"
              >
                Continue to Checkout
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Checkout */}
        {modalStep === 2 && (
          <div className="space-y-4">
            <div className="text-sm text-zinc-300">Review & Checkout</div>
            <div className="flex gap-4">
              <div className="w-28 h-28 bg-zinc-800 rounded overflow-hidden flex-shrink-0">
                {ev.banner_square || ev.banner_horizontal ? (
                  <img
                    src={ev.banner_square || ev.banner_horizontal}
                    alt={ev.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-zinc-500">
                    No image
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium text-zinc-100">{ev.title}</div>
                <div className="text-xs text-zinc-400">
                  {ev.date && new Date(ev.date).toLocaleDateString()}{" "}
                  {ev.time && `• ${new Date(ev.time).toLocaleTimeString()}`}
                </div>
                <div className="mt-3">
                  <div className="text-xs text-zinc-400">Ticket</div>
                  <div className="flex justify-between mt-1">
                    <div className="text-zinc-100">{selectedTicket?.name}</div>
                    <div className="text-zinc-100">
                      {fmtCurrency(
                        (selectedTicket?.price ?? 0) * selectedQuantity * 100,
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    Quantity: {selectedQuantity}
                  </div>
                  <div className="text-xs text-zinc-400 mt-2">
                    Attendee: {me?.name ?? authForm.name} —{" "}
                    {me?.email ?? authForm.identifier}
                  </div>
                </div>
              </div>
            </div>

            {buyError && (
              <div className="text-sm text-red-500 mt-2">{buyError}</div>
            )}

            <div className="flex justify-between items-center pt-4">
              <button
                onClick={() => setModalStep(1)}
                className="px-4 py-2 rounded text-sm bg-zinc-800 border border-zinc-700 text-zinc-200"
              >
                Back
              </button>
              <div className="flex items-center gap-3">
                <div className="text-sm text-zinc-400">Total</div>
                <div className="font-semibold text-zinc-100">
                  {fmtCurrency(
                    (selectedTicket?.price ?? 0) * selectedQuantity * 100,
                  )}
                </div>
                <button
                  onClick={onBuy}
                  disabled={buying}
                  className="px-4 py-2 rounded text-sm bg-zinc-700 border border-zinc-700 text-zinc-100"
                >
                  {buying ? "Processing..." : "Checkout"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
