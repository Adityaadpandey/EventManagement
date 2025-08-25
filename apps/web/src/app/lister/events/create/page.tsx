"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import api from "@/lib/api";

type TicketTypeForm = {
  name: string;
  price: number | "";
  quantity: number | "";
};
type CustomFieldForm = {
  label: string;
  fieldType: string;
  required: boolean;
  options?: string;
};

export default function CreateEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    banner_horizontal: "",
    banner_vertical: "",
    banner_square: "",
    date: "",
    time: "",
    location: "",
    capacity: "" as number | "",
    samplePoster: "",
    socialMediaGraphic: "",
    eventFormat: "",
    requestedVenue: "",
    termsConditions: "",
    rulesRegulations: "",
    policies: "",
    dutyLeavesDetails: "",
  });

  const [tickets, setTickets] = useState<TicketTypeForm[]>([
    { name: "", price: "", quantity: "" },
  ]);
  const [customFields, setCustomFields] = useState<CustomFieldForm[]>([]);

  const updateForm = (k: string, v: any) => setForm((s) => ({ ...s, [k]: v }));

  const addTicket = () =>
    setTickets((t) => [...t, { name: "", price: "", quantity: "" }]);
  const removeTicket = (i: number) =>
    setTickets((t) => t.filter((_, idx) => idx !== i));
  const updateTicket = (i: number, k: keyof TicketTypeForm, v: any) =>
    setTickets((t) =>
      t.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)),
    );

  const addCustom = () =>
    setCustomFields((c) => [
      ...c,
      { label: "", fieldType: "text", required: false },
    ]);
  const removeCustom = (i: number) =>
    setCustomFields((c) => c.filter((_, idx) => idx !== i));
  const updateCustom = (i: number, k: keyof CustomFieldForm, v: any) =>
    setCustomFields((c) =>
      c.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)),
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const dateISO = new Date(form.date).toISOString();
      const timeISO = new Date(
        `1970-01-01T${form.time || "00:00"}:00`,
      ).toISOString();

      const payload = {
        title: form.title,
        description: form.description,
        banner_horizontal: form.banner_horizontal,
        banner_vertical: form.banner_vertical,
        banner_square: form.banner_square,
        date: dateISO,
        time: timeISO,
        location: form.location,
        capacity: form.capacity === "" ? undefined : Number(form.capacity),
        samplePoster: form.samplePoster || undefined,
        socialMediaGraphic: form.socialMediaGraphic || undefined,
        eventFormat: form.eventFormat || undefined,
        requestedVenue: form.requestedVenue || undefined,
        termsConditions: form.termsConditions || undefined,
        rulesRegulations: form.rulesRegulations || undefined,
        policies: form.policies || undefined,
        dutyLeavesDetails: form.dutyLeavesDetails || undefined,
        ticketTypes: tickets.map((t) => ({
          name: t.name,
          price: Number(t.price || 0),
          quantity: Number(t.quantity || 0),
        })),
        customFields: customFields.length
          ? customFields.map((c) => ({
              label: c.label,
              fieldType: c.fieldType,
              required: c.required,
              options: c.options || undefined,
            }))
          : undefined,
      };

      const res = await api.post("/event", payload);
      if (res.data?.data?.eventId) {
        router.push("/lister/events");
      } else {
        router.push("/lister/events");
      }
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto p-8 rounded-xl shadow-lg text-white h-screen overflow-y-auto">
      <h1 className="text-4xl font-extrabold text-indigo-400 mb-8 tracking-tight">
        Create Your Event
      </h1>

      {err && (
        <div className="mb-6 p-4 bg-red-800/20 text-red-400 rounded border border-red-500/40 shadow-sm">
          {err}
        </div>
      )}

      <form onSubmit={submit} className="space-y-10">
        {/* Event Basics */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold border-b border-zinc-700 pb-2">
            Event Basics
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <input
              type="text"
              placeholder="Event Title"
              value={form.title}
              onChange={(e) => updateForm("title", e.target.value)}
              className="input-dark"
              required
            />
            <input
              type="text"
              placeholder="Location"
              value={form.location}
              onChange={(e) => updateForm("location", e.target.value)}
              className="input-dark"
              required
            />
          </div>

          <textarea
            rows={5}
            placeholder="Detailed Description"
            value={form.description}
            onChange={(e) => updateForm("description", e.target.value)}
            className="input-dark resize-none"
            required
          />
        </section>

        {/* Banners */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold border-b border-zinc-700 pb-2">
            Banners
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <input
              type="url"
              placeholder="Banner Horizontal URL"
              value={form.banner_horizontal}
              onChange={(e) => updateForm("banner_horizontal", e.target.value)}
              className="input-dark"
            />
            <input
              type="url"
              placeholder="Banner Vertical URL"
              value={form.banner_vertical}
              onChange={(e) => updateForm("banner_vertical", e.target.value)}
              className="input-dark"
            />
            <input
              type="url"
              placeholder="Banner Square URL"
              value={form.banner_square}
              onChange={(e) => updateForm("banner_square", e.target.value)}
              className="input-dark"
            />
          </div>
        </section>

        {/* Date, Time & Capacity */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold border-b border-zinc-700 pb-2">
            Schedule & Capacity
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="block mb-1 font-medium text-zinc-400">
                Date
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => updateForm("date", e.target.value)}
                className="input-dark w-full"
                required
              />
            </div>
            <div>
              <label className="block mb-1 font-medium text-zinc-400">
                Time
              </label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => updateForm("time", e.target.value)}
                className="input-dark w-full"
                required
              />
            </div>
            <div>
              <label className="block mb-1 font-medium text-zinc-400">
                Capacity
              </label>
              <input
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) =>
                  updateForm(
                    "capacity",
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                className="input-dark w-full"
                placeholder="Leave blank if unlimited"
              />
            </div>
          </div>
        </section>

        {/* Admin Details */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold border-b border-zinc-700 pb-2">
            Additional Info
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <input
              type="url"
              placeholder="Sample Poster URL"
              value={form.samplePoster}
              onChange={(e) => updateForm("samplePoster", e.target.value)}
              className="input-dark"
            />
            <input
              type="url"
              placeholder="Social Media Graphic URL"
              value={form.socialMediaGraphic}
              onChange={(e) => updateForm("socialMediaGraphic", e.target.value)}
              className="input-dark"
            />
            <input
              type="text"
              placeholder="Event Format"
              value={form.eventFormat}
              onChange={(e) => updateForm("eventFormat", e.target.value)}
              className="input-dark"
            />
            <input
              type="text"
              placeholder="Requested Venue"
              value={form.requestedVenue}
              onChange={(e) => updateForm("requestedVenue", e.target.value)}
              className="input-dark"
            />
          </div>
        </section>

        <section className="space-y-6">
          {[
            { label: "Terms & Conditions", key: "termsConditions" },
            { label: "Rules & Regulations", key: "rulesRegulations" },
            { label: "Policies", key: "policies" },
            { label: "Duty Leaves Details", key: "dutyLeavesDetails" },
          ].map(({ label, key }) => (
            <textarea
              key={key}
              rows={3}
              placeholder={label}
              value={(form as any)[key]}
              onChange={(e) => updateForm(key, e.target.value)}
              className="input-dark resize-none"
            />
          ))}
        </section>

        <section className="rounded-xl p-6 shadow-inner bg-zinc-800 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-indigo-400">
              🎟 Ticket Types
            </h2>
            <button
              type="button"
              onClick={addTicket}
              className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition"
            >
              + Add
            </button>
          </div>

          {tickets.map((t, i) => (
            <div
              key={i}
              className="grid grid-cols-1 sm:grid-cols-6 gap-4 items-center"
            >
              <input
                type="text"
                placeholder="Name"
                value={t.name}
                onChange={(e) => updateTicket(i, "name", e.target.value)}
                className="input-dark sm:col-span-3"
                required
              />
              <input
                type="number"
                min={0}
                placeholder="Price"
                value={t.price}
                onChange={(e) =>
                  updateTicket(
                    i,
                    "price",
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                className="input-dark sm:col-span-1"
                required
              />
              <input
                type="number"
                min={1}
                placeholder="Quantity"
                value={t.quantity}
                onChange={(e) =>
                  updateTicket(
                    i,
                    "quantity",
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                className="input-dark sm:col-span-1"
                required
              />
              <button
                type="button"
                onClick={() => removeTicket(i)}
                className="text-red-400 hover:text-red-600 font-semibold sm:col-span-1 transition"
                aria-label="Remove Ticket"
              >
                ✕
              </button>
            </div>
          ))}
        </section>

        {/* Custom Fields */}
        <section className="rounded-xl p-6 shadow-inner bg-zinc-800 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-indigo-400">
              🛠 Custom Fields (Optional)
            </h2>
            <button
              type="button"
              onClick={addCustom}
              className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition"
            >
              + Add
            </button>
          </div>

          {customFields.map((c, i) => (
            <div
              key={i}
              className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-center"
            >
              <input
                type="text"
                placeholder="Label"
                value={c.label}
                onChange={(e) => updateCustom(i, "label", e.target.value)}
                className="input-dark sm:col-span-2"
                required
              />
              <select
                value={c.fieldType}
                onChange={(e) => updateCustom(i, "fieldType", e.target.value)}
                className="input-dark sm:col-span-2"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="email">Email</option>
                <option value="dropdown">Dropdown</option>
              </select>
              <input
                type="text"
                placeholder="Options (comma or JSON)"
                value={c.options || ""}
                onChange={(e) => updateCustom(i, "options", e.target.value)}
                className="input-dark sm:col-span-2"
              />
              <label className="flex items-center gap-2 sm:col-span-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={c.required}
                  onChange={(e) =>
                    updateCustom(i, "required", e.target.checked)
                  }
                  className="w-5 h-5 text-indigo-500 focus:ring-indigo-400 border-zinc-600 rounded"
                />
                Required
              </label>
              <button
                type="button"
                onClick={() => removeCustom(i)}
                className="text-red-400 hover:text-red-600 font-semibold transition sm:col-span-1"
                aria-label="Remove Custom Field"
              >
                delete
              </button>
            </div>
          ))}
        </section>

        <div className="flex flex-wrap gap-4 justify-end pt-6 border-t border-zinc-700">
          <button
            type="submit"
            disabled={loading}
            className="btn-dark-primary flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  ></path>
                </svg>
                Creating...
              </>
            ) : (
              "Create Event"
            )}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="btn-dark-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
