"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import api from "@/lib/api";

type TicketTypeForm = {
  name: string;
  description: string;
  price: number | "";
  quantity: number | "";
  salesCutoff?: string;
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
    { name: "", description: "", price: "", quantity: "", salesCutoff: "" },
  ]);
  const [customFields, setCustomFields] = useState<CustomFieldForm[]>([]);

  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {},
  );
  const [uploadError, setUploadError] = useState<Record<string, string>>({});

  const updateForm = (k: string, v: any) => setForm((s) => ({ ...s, [k]: v }));

  type UploadKey =
    | "banner_horizontal"
    | "banner_vertical"
    | "banner_square"
    | "samplePoster"
    | "socialMediaGraphic";

  const uploadToCloudinary = (file: File, key: UploadKey) =>
    new Promise<string>(async (resolve, reject) => {
      const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD;
      const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET;

      if (!CLOUD_NAME || !UPLOAD_PRESET) {
        const msg =
          "Cloudinary not configured. Set NEXT_PUBLIC_CLOUDINARY_* envs.";
        setUploadError((e) => ({ ...e, [key]: msg }));
        return reject(new Error(msg));
      }

      const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", UPLOAD_PRESET);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", url, true);

      xhr.upload.onprogress = (ev) => {
        if (!ev.lengthComputable) return;
        const pct = Math.round((ev.loaded / ev.total) * 100);
        setUploadProgress((p) => ({ ...p, [key]: pct }));
      };

      xhr.onreadystatechange = () => {
        if (xhr.readyState !== 4) return;
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            if (!res?.secure_url) {
              setUploadError((e) => ({
                ...e,
                [key]: "No secure_url returned",
              }));
              setUploadProgress((p) => ({ ...p, [key]: 0 }));
              return reject(new Error("No secure_url"));
            }
            setUploadProgress((p) => ({ ...p, [key]: 100 }));
            setTimeout(
              () => setUploadProgress((p) => ({ ...p, [key]: 0 })),
              600,
            );
            return resolve(res.secure_url as string);
          } catch (e: any) {
            setUploadError((x) => ({
              ...x,
              [key]: e?.message || "Upload parse error",
            }));
            setUploadProgress((p) => ({ ...p, [key]: 0 }));
            return reject(e);
          }
        } else {
          const message = xhr.responseText || `Upload failed (${xhr.status})`;
          setUploadError((x) => ({ ...x, [key]: message }));
          setUploadProgress((p) => ({ ...p, [key]: 0 }));
          return reject(new Error(message));
        }
      };

      xhr.onerror = () => {
        setUploadError((x) => ({ ...x, [key]: "Network error during upload" }));
        setUploadProgress((p) => ({ ...p, [key]: 0 }));
        reject(new Error("Network error"));
      };

      xhr.send(fd);
    });

  const handleFileChange =
    (key: UploadKey) => async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const url = await uploadToCloudinary(file, key);
        updateForm(key, url);
      } catch (uploadErr: any) {
        console.error("Upload error", uploadErr);
      }
    };

  const removeImage = (key: keyof typeof form) => updateForm(key, "");

  const addTicket = () =>
    setTickets((t) => [
      ...t,
      { name: "", description: "", price: "", quantity: "", salesCutoff: "" },
    ]);
  const removeTicket = (i: number) =>
    setTickets((t) => t.filter((_, idx) => idx !== i));
  const updateTicket = (i: number, k: keyof TicketTypeForm, v: any) =>
    setTickets((t) =>
      t.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)),
    );

  const addCustom = () =>
    setCustomFields((c) => [
      ...c,
      { label: "", fieldType: "text", required: false, options: "" },
    ]);
  const removeCustom = (i: number) =>
    setCustomFields((c) => c.filter((_, idx) => idx !== i));
  const updateCustom = (i: number, k: keyof CustomFieldForm, v: any) =>
    setCustomFields((c) =>
      c.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)),
    );

  const anyUploadInProgress = () =>
    Object.values(uploadProgress).some((p) => p && p > 0 && p < 100);

  const validateBeforeSubmit = () => {
    if (!form.title.trim()) return "Title is required";
    if (!form.description.trim()) return "Description is required";
    if (!form.banner_horizontal) return "Banner (horizontal) is required";
    if (!form.banner_vertical) return "Banner (vertical) is required";
    if (!form.banner_square) return "Banner (square) is required";
    if (!form.date) return "Event date is required";
    if (!form.time) return "Event time is required";
    if (!form.location.trim()) return "Location is required";

    if (!tickets || tickets.length === 0)
      return "At least one ticket type is required";
    for (let i = 0; i < tickets.length; i++) {
      const t = tickets[i];
      if (!t.name || !t.name.trim()) return `Ticket ${i + 1}: name is required`;
      const price = Number(t.price);
      if (Number.isNaN(price) || price < 0)
        return `Ticket ${i + 1}: price must be >= 0`;
      const qty = Number(t.quantity);
      if (Number.isNaN(qty) || qty <= 0)
        return `Ticket ${i + 1}: quantity must be > 0`;
      if (t.salesCutoff) {
        const sc = new Date(t.salesCutoff);
        if (Number.isNaN(sc.getTime()))
          return `Ticket ${i + 1}: sales cutoff is invalid`;
      }
    }

    const combined = new Date(`${form.date}T${form.time || "00:00"}`);
    if (Number.isNaN(combined.getTime())) return "Invalid date/time";
    if (combined <= new Date()) return "Event datetime must be in the future";

    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (anyUploadInProgress()) {
      setErr("Please wait until all uploads finish");
      return;
    }

    const clientValidation = validateBeforeSubmit();
    if (clientValidation) {
      setErr(clientValidation);
      return;
    }

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
          description: t.description || undefined,
          price: Number(t.price || 0),
          quantity: Number(t.quantity || 0),
          salesCutoff: t.salesCutoff
            ? new Date(t.salesCutoff).toISOString()
            : undefined,
        })),
        customFields: customFields.length
          ? customFields.map((c) => ({
              label: c.label,
              fieldType: c.fieldType,
              required: !!c.required,
              options: c.options || undefined,
            }))
          : undefined,
      };

      const res = await api.post("/event", payload);
      const created = res.data?.data;
      if (created?.eventId) {
        router.push("/lister/events");
      } else {
        router.push("/lister/events");
      }
    } catch (e: any) {
      console.error("Create event error", e);
      setErr(
        e?.response?.data?.message || e?.message || "Failed to create event",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tickets.length === 0) addTicket();
  }, [tickets.length]);

  return (
    <div className="mx-auto p-8 rounded-xl shadow-lg text-zinc-100 h-screen overflow-y-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-zinc-100 mb-1">Create Event</h1>
      </header>

      {err && (
        <div className="mb-6 p-4 bg-zinc-900 text-red-400 rounded border border-red-600/20">
          {err}
        </div>
      )}

      <form onSubmit={submit} className="space-y-8">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-100 border-b border-zinc-700 pb-2">
            Event basics
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100"
              placeholder="Event title *"
              value={form.title}
              onChange={(e) => updateForm("title", e.target.value)}
              required
            />
            <input
              className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100"
              placeholder="Location *"
              value={form.location}
              onChange={(e) => updateForm("location", e.target.value)}
              required
            />
          </div>

          <textarea
            rows={4}
            placeholder="Description *"
            value={form.description}
            onChange={(e) => updateForm("description", e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 resize-none"
            required
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-100 border-b border-zinc-700 pb-2">
            Banners & images (required)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(
              [
                { key: "banner_horizontal", label: "Horizontal" },
                { key: "banner_vertical", label: "Vertical" },
                { key: "banner_square", label: "Square" },
              ] as const
            ).map(({ key, label }) => {
              const url = (form as any)[key] as string;
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-zinc-400">{label}</div>
                    <div className="text-xs text-zinc-300">
                      {url ? "Uploaded" : "Required"}
                    </div>
                  </div>

                  <div className="relative w-full h-36 bg-zinc-800 border border-zinc-700 rounded overflow-hidden flex items-center justify-center">
                    {url ? (
                      <>
                        <img
                          src={url}
                          alt={label}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(key)}
                          className="absolute top-2 right-2 text-xs bg-zinc-900 border border-zinc-700 px-2 py-1 rounded"
                        >
                          remove
                        </button>
                      </>
                    ) : (
                      <div className="text-zinc-500 text-sm">No image</div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange(key as any)}
                      className="text-xs text-zinc-400"
                    />
                    <div className="flex-1 text-xs text-zinc-400">
                      {uploadProgress[key] && uploadProgress[key] > 0 ? (
                        <div className="w-full bg-zinc-800 rounded h-2 overflow-hidden">
                          <div
                            style={{ width: `${uploadProgress[key]}%` }}
                            className="h-2 bg-zinc-600"
                          />
                        </div>
                      ) : uploadError[key] ? (
                        <div className="text-red-400">{uploadError[key]}</div>
                      ) : (
                        ""
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="space-y-2">
              <div className="text-xs text-zinc-400">
                Sample Poster (optional)
              </div>
              <div className="relative h-28 bg-zinc-800 border border-zinc-700 rounded overflow-hidden flex items-center justify-center">
                {form.samplePoster ? (
                  <>
                    <img
                      src={form.samplePoster}
                      alt="sample"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage("samplePoster")}
                      className="absolute top-2 right-2 text-xs bg-zinc-900 border border-zinc-700 px-2 py-1 rounded"
                    >
                      remove
                    </button>
                  </>
                ) : (
                  <div className="text-zinc-500 text-sm">No image</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange("samplePoster")}
                  className="text-xs text-zinc-400 cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-zinc-400">
                Social Media Graphic (optional)
              </div>
              <div className="relative h-28 bg-zinc-800 border border-zinc-700 rounded overflow-hidden flex items-center justify-center">
                {form.socialMediaGraphic ? (
                  <>
                    <img
                      src={form.socialMediaGraphic}
                      alt="social"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage("socialMediaGraphic")}
                      className="absolute top-2 right-2 text-xs bg-zinc-900 border border-zinc-700 px-2 py-1 rounded"
                    >
                      remove
                    </button>
                  </>
                ) : (
                  <div className="text-zinc-500 text-sm">No image</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange("socialMediaGraphic")}
                  className="text-xs text-zinc-400 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-zinc-400">Date *</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => updateForm("date", e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 w-full"
              required
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400">Time *</label>
            <input
              type="time"
              value={form.time}
              onChange={(e) => updateForm("time", e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 w-full"
              required
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400">Capacity</label>
            <input
              type="number"
              min={1}
              value={form.capacity || ""}
              onChange={(e) =>
                updateForm(
                  "capacity",
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 w-full"
              placeholder="leave blank if unlimited"
            />
          </div>
        </section>

        <section className="rounded p-4 bg-zinc-900 border border-zinc-700 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-100">
              Ticket types (at least one)
            </h3>
            <button
              type="button"
              onClick={addTicket}
              className="px-3 py-1 border border-zinc-700 rounded text-xs text-zinc-300"
            >
              + Add
            </button>
          </div>

          {tickets.map((t, i) => (
            <div
              key={i}
              className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center border-b border-zinc-800 pb-3"
            >
              <input
                className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 md:col-span-3"
                placeholder="Name *"
                value={t.name}
                onChange={(e) => updateTicket(i, "name", e.target.value)}
              />
              <input
                className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 md:col-span-3"
                placeholder="Short description"
                value={t.description}
                onChange={(e) => updateTicket(i, "description", e.target.value)}
              />
              <input
                className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 md:col-span-1"
                placeholder="Price"
                type="number"
                min={0}
                value={t.price}
                onChange={(e) =>
                  updateTicket(
                    i,
                    "price",
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
              />
              <input
                className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 md:col-span-1"
                placeholder="Qty"
                type="number"
                min={1}
                value={t.quantity}
                onChange={(e) =>
                  updateTicket(
                    i,
                    "quantity",
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
              />
              <div className="md:col-span-3">
                <label className="text-xs text-zinc-400">
                  Sales cutoff (optional)
                </label>
                <input
                  type="datetime-local"
                  className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 w-full"
                  value={t.salesCutoff || ""}
                  onChange={(e) =>
                    updateTicket(i, "salesCutoff", e.target.value)
                  }
                />
              </div>
              <div className="flex items-center gap-2 md:col-span-1">
                <button
                  type="button"
                  onClick={() => removeTicket(i)}
                  className="text-red-400 hover:text-red-500 text-xs"
                >
                  remove
                </button>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded p-4 bg-zinc-900 border border-zinc-700 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-100">
              Custom fields (optional)
            </h3>
            <button
              type="button"
              onClick={addCustom}
              className="px-3 py-1 border border-zinc-700 rounded text-xs text-zinc-300"
            >
              + Add
            </button>
          </div>

          {customFields.map((c, i) => (
            <div
              key={i}
              className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center"
            >
              <input
                className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 md:col-span-4"
                placeholder="Label"
                value={c.label}
                onChange={(e) => updateCustom(i, "label", e.target.value)}
              />
              <select
                className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 md:col-span-3"
                value={c.fieldType}
                onChange={(e) => updateCustom(i, "fieldType", e.target.value)}
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="email">Email</option>
                <option value="dropdown">Dropdown</option>
              </select>
              <input
                className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 md:col-span-3"
                placeholder="Options (comma or JSON)"
                value={c.options || ""}
                onChange={(e) => updateCustom(i, "options", e.target.value)}
              />
              <label className="flex items-center gap-2 text-xs md:col-span-1">
                <input
                  type="checkbox"
                  checked={c.required}
                  onChange={(e) =>
                    updateCustom(i, "required", e.target.checked)
                  }
                />
                required
              </label>
              <button
                type="button"
                onClick={() => removeCustom(i)}
                className="text-red-400 hover:text-red-500 text-xs md:col-span-1"
              >
                delete
              </button>
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-100">Admin details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100"
              placeholder="Requested Venue"
              value={form.requestedVenue}
              onChange={(e) => updateForm("requestedVenue", e.target.value)}
            />
            <input
              className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100"
              placeholder="Event Format"
              value={form.eventFormat}
              onChange={(e) => updateForm("eventFormat", e.target.value)}
            />
            <textarea
              rows={2}
              placeholder="Terms & Conditions"
              value={form.termsConditions}
              onChange={(e) => updateForm("termsConditions", e.target.value)}
              className="input-dark bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100"
            />
            <textarea
              rows={2}
              placeholder="Rules & Regulations"
              value={form.rulesRegulations}
              onChange={(e) => updateForm("rulesRegulations", e.target.value)}
              className="input-dark bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100"
            />
            <textarea
              rows={2}
              placeholder="Policies"
              value={form.policies}
              onChange={(e) => updateForm("policies", e.target.value)}
              className="input-dark bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100"
            />
            <textarea
              rows={2}
              placeholder="Duty leaves details"
              value={form.dutyLeavesDetails}
              onChange={(e) => updateForm("dutyLeavesDetails", e.target.value)}
              className="input-dark bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100"
            />
          </div>
        </section>

        <div className="flex gap-3 justify-end items-center pt-4 border-t border-zinc-700">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded border border-zinc-700 text-zinc-300"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={
              loading || anyUploadInProgress() || !!validateBeforeSubmit()
            }
            className={`px-4 py-2 rounded text-zinc-100 ${loading || anyUploadInProgress() || !!validateBeforeSubmit() ? "bg-zinc-700 opacity-70 cursor-not-allowed" : "bg-zinc-700 hover:bg-zinc-600"}`}
          >
            {loading ? "Creating..." : "Create event"}
          </button>
        </div>
      </form>
    </div>
  );
}
