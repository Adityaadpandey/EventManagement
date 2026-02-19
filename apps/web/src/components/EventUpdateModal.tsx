"use client";

import { Mail, X } from "lucide-react";
import { useId, useState } from "react";
import api from "@/lib/api";

type Props = {
  eventId: string;
  eventTitle: string;
  availableMailUpdates: number;
  onClose: () => void;
  onSuccess: (eventId: string) => void;
};

export default function EventUpdateModal({
  eventId,
  eventTitle,
  availableMailUpdates,
  onClose,
  onSuccess,
}: Props) {
  const messageId = useId();
  const imageId = useId();

  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exhausted = availableMailUpdates <= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (exhausted || !message.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await api.post(`/event/info-update/${eventId}`, {
        update: message.trim(),
        ...(imageUrl.trim() ? { imageUrl: imageUrl.trim() } : {}),
      });
      onSuccess(eventId);
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to send update. Try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop click-to-close is standard modal UX
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click-to-close is standard modal UX
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Send Update to Attendees
            </h2>
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
              {eventTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Updates remaining badge */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Updates remaining:</span>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              exhausted
                ? "bg-gray-100 text-gray-500"
                : "bg-[#FFE348] text-gray-900"
            }`}
          >
            {availableMailUpdates}
          </span>
        </div>

        {exhausted ? (
          <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-4 py-3">
            You&apos;ve used all available updates for this event.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Message textarea */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={messageId}
                className="text-sm font-medium text-gray-700"
              >
                Message to attendees
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <textarea
                id={messageId}
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Venue has changed to XYZ Hall. Gates open at 5 PM."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFE348] focus:border-transparent resize-none"
                required
              />
              <p className="text-xs text-gray-400 text-right">
                {message.length} chars
              </p>
            </div>

            {/* Image URL (optional) */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={imageId}
                className="text-sm font-medium text-gray-700"
              >
                Image URL{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id={imageId}
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFE348] focus:border-transparent"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Footer buttons */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="text-sm font-medium text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !message.trim()}
                className="text-sm font-semibold bg-[#FFE348] hover:bg-yellow-300 text-gray-900 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-gray-700 border-t-transparent rounded-full animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Mail size={15} />
                    Send Update
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
