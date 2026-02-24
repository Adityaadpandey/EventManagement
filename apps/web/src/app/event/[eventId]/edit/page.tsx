"use client";

import CustomFieldsManager from "@/app/_components/CustomFieldsManager";
import ImageUpload from "@/app/_components/ImageUpload";
import TicketTypeManager from "@/app/_components/TicketTypeManager";
import {
  clearUpdateError,
  fetchListerEventDetails,
  updateEvent,
} from "@/lib/features/eventsSlice";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Info,
  Loader2,
  Save,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import "react-quill-new/dist/quill.snow.css";
import { useDispatch, useSelector } from "react-redux";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

const TABS = [
  "Basic Info",
  "Banners",
  "Tickets & Fields",
  // "Additional",
] as const;
const MAX_TAGS = 10;
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const MIN_DESCRIPTION_LENGTH = 50;

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ indent: "-1" }, { indent: "+1" }],
    ["link"],
    ["clean"],
  ],
};

const quillFormats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "list",
  "indent",
  "link",
];

const getPlainTextLength = (html: string): number => {
  if (typeof window === "undefined") {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim().length;
  }
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || "").length;
};

const EditEventPage = () => {
  const router = useRouter();
  const params = useParams();
  const eventId = params?.eventId as string;
  const dispatch = useDispatch();

  const {
    byId: eventsById,
    loadingId: eventLoadingId,
    error: eventError,
  } = useSelector((state: any) => state.events.details);
  const { loading: updating, error: updateError } = useSelector(
    (state: any) => state.events.update,
  );

  const event = eventId ? eventsById[eventId] : null;
  const isLoadingEvent = eventLoadingId === eventId;

  const [activeTab, setActiveTab] = useState(0);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    latitude: null as number | null,
    longitude: null as number | null,
    capacity: "",
    restrictions: "",
    eventFormat: "",
    requestedVenue: "",
    termsConditions: "",
    rulesRegulations: "",
    policies: "",
    tags: [] as string[],
    chips: [] as string[],
  });

  const [bannerHorizontal, setBannerHorizontal] = useState("");
  const [bannerVertical, setBannerVertical] = useState("");
  const [bannerSquare, setBannerSquare] = useState("");
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [chipInput, setChipInput] = useState("");

  // Track original values for change detection
  const originalData = useRef<any>(null);

  // Load event data once
  useEffect(() => {
    if (eventId && !event) {
      dispatch(fetchListerEventDetails({ eventId }) as any);
    }
  }, [eventId, event, dispatch]);

  // Populate form when event loads (only once)
  useEffect(() => {
    if (event && !originalData.current) {
      // Extract date and time from ISO strings
      const eventDate = event.date ? new Date(event.date) : null;
      const eventTime = event.time ? new Date(event.time) : null;

      const initialData = {
        title: event.title || "",
        description: event.description || "",
        date: eventDate ? eventDate.toISOString().split("T")[0] : "",
        time: eventTime ? eventTime.toTimeString().slice(0, 5) : "",
        location: event.location || "",
        latitude: event.latitude || null,
        longitude: event.longitude || null,
        capacity: event.capacity ? event.capacity.toString() : "",
        restrictions: event.restrictions || "",
        eventFormat: event.eventFormat || "",
        requestedVenue: event.requestedVenue || "",
        termsConditions: event.termsConditions || "",
        rulesRegulations: event.rulesRegulations || "",
        policies: event.policies || "",
        tags: Array.isArray(event.tags) ? event.tags : [],
        chips: Array.isArray(event.chips) ? event.chips : [],
      };

      setFormData(initialData);
      setBannerHorizontal(event.banner_horizontal || "");
      setBannerVertical(event.banner_vertical || "");
      setBannerSquare(event.banner_square || "");

      // Map TicketType array (from API) to ticketTypes (for component)
      const mappedTickets = (event.TicketType || []).map((tt: any) => ({
        name: tt.name || "",
        description: tt.description || "",
        price: tt.price || 0,
        discountedPrice: tt.discountedPrice || undefined,
        discountReason: tt.discountReason || "",
        quantity: tt.quantity || 0,
        salesCutoff: tt.salesCutoff || "",
      }));
      setTicketTypes(mappedTickets);

      // Map CustomField array (from API) to customFields (for component)
      const mappedFields = (event.CustomField || []).map((cf: any) => ({
        label: cf.label || "",
        fieldType: cf.fieldType || "text",
        required: cf.required || false,
        options: cf.options || "",
      }));
      setCustomFields(mappedFields);

      // Store original data for comparison
      originalData.current = {
        ...initialData,
        bannerHorizontal: event.banner_horizontal || "",
        bannerVertical: event.banner_vertical || "",
        bannerSquare: event.banner_square || "",
        ticketTypes: mappedTickets,
        customFields: mappedFields,
      };
    }
  }, [event]);

  // Cleanup
  useEffect(() => {
    return () => {
      dispatch(clearUpdateError() as any);
    };
  }, [dispatch]);

  // Detect changes
  useEffect(() => {
    if (!originalData.current) return;

    const currentState = {
      ...formData,
      bannerHorizontal,
      bannerVertical,
      bannerSquare,
      ticketTypes,
      customFields,
    };

    const changed =
      JSON.stringify(currentState) !== JSON.stringify(originalData.current);
    setHasChanges(changed);
  }, [
    formData,
    bannerHorizontal,
    bannerVertical,
    bannerSquare,
    ticketTypes,
    customFields,
  ]);

  const handleChange = useCallback((field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setValidationErrors((prev) => ({ ...prev, [field]: "" }));
  }, []);

  // Tag management
  const addTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    if (formData.tags.length >= MAX_TAGS) {
      setValidationErrors((prev) => ({
        ...prev,
        tags: `Maximum ${MAX_TAGS} tags allowed`,
      }));
      return;
    }
    if (formData.tags.includes(trimmed)) {
      setValidationErrors((prev) => ({ ...prev, tags: "Tag already exists" }));
      return;
    }
    setFormData((prev) => ({ ...prev, tags: [...prev.tags, trimmed] }));
    setTagInput("");
    setValidationErrors((prev) => ({ ...prev, tags: "" }));
  }, [tagInput, formData.tags]);

  const removeTag = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index),
    }));
  }, []);

  const addChip = useCallback(() => {
    const trimmed = chipInput.trim();
    if (!trimmed) return;
    if (formData.chips.includes(trimmed)) {
      setValidationErrors((prev) => ({
        ...prev,
        chips: "Chip already exists",
      }));
      return;
    }
    setFormData((prev) => ({ ...prev, chips: [...prev.chips, trimmed] }));
    setChipInput("");
    setValidationErrors((prev) => ({ ...prev, chips: "" }));
  }, [chipInput, formData.chips]);

  const removeChip = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      chips: prev.chips.filter((_, i) => i !== index),
    }));
  }, []);

  // Validation
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) {
      errors.title = "Title is required";
    } else if (formData.title.length > MAX_TITLE_LENGTH) {
      errors.title = `Title must be less than ${MAX_TITLE_LENGTH} characters`;
    }

    const plainTextLength = getPlainTextLength(formData.description);
    if (!formData.description.trim() || plainTextLength === 0) {
      errors.description = "Description is required";
    } else if (plainTextLength < MIN_DESCRIPTION_LENGTH) {
      errors.description = `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters`;
    } else if (plainTextLength > MAX_DESCRIPTION_LENGTH) {
      errors.description = `Description must be less than ${MAX_DESCRIPTION_LENGTH} characters`;
    }

    if (!formData.location.trim()) {
      errors.location = "Location is required";
    }

    if (!formData.date) {
      errors.date = "Date is required";
    } else if (!formData.time) {
      errors.time = "Time is required";
    }

    if (!bannerHorizontal)
      errors.bannerHorizontal = "Horizontal banner is required";
    if (!bannerVertical) errors.bannerVertical = "Vertical banner is required";
    if (!bannerSquare) errors.bannerSquare = "Square banner is required";

    if (ticketTypes.length === 0) {
      errors.ticketTypes = "At least one ticket type is required";
    } else {
      ticketTypes.forEach((tt, idx) => {
        if (!tt.name.trim())
          errors[`ticketType_${idx}_name`] = "Ticket name is required";
        if (tt.price < 0)
          errors[`ticketType_${idx}_price`] = "Price cannot be negative";
        if (tt.quantity <= 0)
          errors[`ticketType_${idx}_quantity`] =
            "Quantity must be greater than 0";
      });
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, bannerHorizontal, bannerVertical, bannerSquare, ticketTypes]);

  // Submit
  const handleSubmit = useCallback(async () => {
    if (!validateForm() || !eventId || !hasChanges) return;

    try {
      const updates: any = {};

      // Only include changed fields
      if (formData.title !== originalData.current.title) {
        updates.title = formData.title.trim();
      }
      if (formData.description !== originalData.current.description) {
        updates.description = formData.description;
      }
      if (formData.date !== originalData.current.date) {
        updates.date = new Date(formData.date).toISOString();
      }
      if (formData.time !== originalData.current.time) {
        updates.time = new Date(
          `${formData.date}T${formData.time}`,
        ).toISOString();
      }
      if (formData.location !== originalData.current.location) {
        updates.location = formData.location.trim();
      }
      if (formData.latitude !== originalData.current.latitude) {
        updates.latitude =
          formData.latitude !== null ? formData.latitude : undefined;
      }
      if (formData.longitude !== originalData.current.longitude) {
        updates.longitude =
          formData.longitude !== null ? formData.longitude : undefined;
      }
      if (formData.capacity !== originalData.current.capacity) {
        updates.capacity = formData.capacity
          ? parseInt(formData.capacity)
          : undefined;
      }
      if (formData.restrictions !== originalData.current.restrictions) {
        updates.restrictions = formData.restrictions.trim() || undefined;
      }
      if (formData.eventFormat !== originalData.current.eventFormat) {
        updates.eventFormat = formData.eventFormat.trim() || undefined;
      }
      if (formData.requestedVenue !== originalData.current.requestedVenue) {
        updates.requestedVenue = formData.requestedVenue.trim() || undefined;
      }
      if (formData.termsConditions !== originalData.current.termsConditions) {
        updates.termsConditions = formData.termsConditions.trim() || undefined;
      }
      if (formData.rulesRegulations !== originalData.current.rulesRegulations) {
        updates.rulesRegulations =
          formData.rulesRegulations.trim() || undefined;
      }
      if (formData.policies !== originalData.current.policies) {
        updates.policies = formData.policies.trim() || undefined;
      }
      if (
        JSON.stringify(formData.tags) !==
        JSON.stringify(originalData.current.tags)
      ) {
        updates.tags = formData.tags.length > 0 ? formData.tags : undefined;
      }
      if (
        JSON.stringify(formData.chips) !==
        JSON.stringify(originalData.current.chips)
      ) {
        updates.chips = formData.chips.length > 0 ? formData.chips : undefined;
      }

      if (bannerHorizontal !== originalData.current.bannerHorizontal) {
        updates.banner_horizontal = bannerHorizontal;
      }
      if (bannerVertical !== originalData.current.bannerVertical) {
        updates.banner_vertical = bannerVertical;
      }
      if (bannerSquare !== originalData.current.bannerSquare) {
        updates.banner_square = bannerSquare;
      }

      if (
        JSON.stringify(ticketTypes) !==
        JSON.stringify(originalData.current.ticketTypes)
      ) {
        updates.ticketTypes = ticketTypes.map((tt) => ({
          name: tt.name.trim(),
          description: tt.description?.trim() || undefined,
          price: Number(tt.price),
          discountedPrice: tt.discountedPrice
            ? Number(tt.discountedPrice)
            : undefined,
          discountReason: tt.discountReason?.trim() || undefined,
          quantity: Number(tt.quantity),
          salesCutoff: tt.salesCutoff || undefined,
        }));
      }

      if (
        JSON.stringify(customFields) !==
        JSON.stringify(originalData.current.customFields)
      ) {
        updates.customFields =
          customFields.length > 0
            ? customFields.map((cf) => ({
                label: cf.label.trim(),
                fieldType: cf.fieldType,
                required: cf.required,
                options: cf.options?.trim() || undefined,
              }))
            : undefined;
      }

      // If no changes detected
      if (Object.keys(updates).length === 0) {
        setValidationErrors({ submit: "No changes detected" });
        return;
      }

      // console.log("Submitting updates:", updates);

      const resultAction = await dispatch(
        updateEvent({ eventId, updates }) as any,
      );

      if (updateEvent.fulfilled.match(resultAction)) {
        // Update original data reference with new values
        originalData.current = {
          ...formData,
          bannerHorizontal,
          bannerVertical,
          bannerSquare,
          ticketTypes,
          customFields,
        };

        setShowSuccess(true);
        setHasChanges(false);
        setValidationErrors({});

        setTimeout(() => {
          setShowSuccess(false);
        }, 3000);
      } else if (updateEvent.rejected.match(resultAction)) {
        const errorMessage = resultAction.payload || "Failed to update event";
        setValidationErrors({ submit: errorMessage as string });
      }
    } catch (err: any) {
      console.error("Failed to update event:", err);
      setValidationErrors({ submit: err.message || "Failed to update event" });
    }
  }, [
    formData,
    bannerHorizontal,
    bannerVertical,
    bannerSquare,
    ticketTypes,
    customFields,
    eventId,
    hasChanges,
    dispatch,
    validateForm,
  ]);

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (hasChanges && !updating) handleSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasChanges, updating, handleSubmit]);

  // Unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges && !updating) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges, updating]);

  if (!eventId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Invalid event ID</p>
        </div>
      </div>
    );
  }

  if (isLoadingEvent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-yellow-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading event...</p>
        </div>
      </div>
    );
  }

  if (eventError || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Failed to Load Event
            </h2>
            <p className="text-gray-600 mb-4">
              {eventError || "Event not found"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const descriptionLength = getPlainTextLength(formData.description);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Event
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Edit Event
              </h1>
              <p className="text-gray-600">{event.title}</p>
            </div>

            {/* Floating Save Button */}
            <motion.button
              onClick={handleSubmit}
              disabled={!hasChanges || updating}
              className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg ${
                hasChanges && !updating
                  ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
              whileHover={hasChanges && !updating ? { scale: 1.05 } : {}}
              whileTap={hasChanges && !updating ? { scale: 0.95 } : {}}
            >
              {updating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {hasChanges ? "Save Changes" : "No Changes"}
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* Status Messages */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3"
            >
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-900">Changes Saved!</h3>
                <p className="text-sm text-green-700">
                  Your event has been updated successfully.
                </p>
              </div>
            </motion.div>
          )}

          {(updateError || validationErrors.submit) && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
            >
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-red-900 mb-1">
                  Error Updating Event
                </h4>
                <p className="text-sm text-red-700">
                  {updateError || validationErrors.submit}
                </p>
              </div>
              <button
                onClick={() => {
                  dispatch(clearUpdateError() as any);
                  setValidationErrors({});
                }}
                className="text-red-500 hover:text-red-700"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {hasChanges && !showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center gap-3"
            >
              <Info className="w-6 h-6 text-[var(--color-primary)]" />
              <p className="text-sm text-yellow-700">
                Press{" "}
                <kbd className="px-2 py-1 bg-yellow-100 rounded text-xs font-mono">
                  Ctrl+S
                </kbd>{" "}
                or click Save Changes to update.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab, idx) => (
              <button
                key={tab}
                onClick={() => setActiveTab(idx)}
                className={`px-6 py-3 font-medium whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === idx
                    ? "border-yellow-500 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm">
          <AnimatePresence mode="wait">
            {/* Tab 0: Basic Info */}
            {activeTab === 0 && (
              <motion.div
                key="tab0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-semibold mb-1">
                    Basic Information
                  </h2>
                  <p className="text-sm text-gray-600">
                    Update your event's core details
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    maxLength={MAX_TITLE_LENGTH}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-500">
                      {formData.title.length}/{MAX_TITLE_LENGTH}
                    </p>
                    {validationErrors.title && (
                      <p className="text-red-500 text-xs">
                        {validationErrors.title}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description *
                  </label>
                  <div className="border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-yellow-500">
                    <ReactQuill
                      theme="snow"
                      value={formData.description}
                      onChange={(value) => handleChange("description", value)}
                      modules={quillModules}
                      formats={quillFormats}
                      className="bg-white"
                    />
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-500">
                      {descriptionLength}/{MAX_DESCRIPTION_LENGTH}
                    </p>
                    {validationErrors.description && (
                      <p className="text-red-500 text-xs">
                        {validationErrors.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Event Date *
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleChange("date", e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                    {validationErrors.date && (
                      <p className="text-red-500 text-xs mt-1">
                        {validationErrors.date}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Event Time *
                    </label>
                    <input
                      type="time"
                      value={formData.time}
                      onChange={(e) => handleChange("time", e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                    {validationErrors.time && (
                      <p className="text-red-500 text-xs mt-1">
                        {validationErrors.time}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Location *
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleChange("location", e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                  {validationErrors.location && (
                    <p className="text-red-500 text-xs mt-1">
                      {validationErrors.location}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.latitude || ""}
                      onChange={(e) =>
                        handleChange(
                          "latitude",
                          e.target.value ? parseFloat(e.target.value) : null,
                        )
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.longitude || ""}
                      onChange={(e) =>
                        handleChange(
                          "longitude",
                          e.target.value ? parseFloat(e.target.value) : null,
                        )
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Capacity
                  </label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => handleChange("capacity", e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Tags</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" && (e.preventDefault(), addTag())
                      }
                      disabled={formData.tags.length >= MAX_TAGS}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:bg-gray-100"
                      placeholder="Add a tag"
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      disabled={formData.tags.length >= MAX_TAGS}
                      className="px-6 py-3 bg-gray-200 rounded-xl hover:bg-gray-300 disabled:opacity-50 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {validationErrors.tags && (
                    <p className="text-red-500 text-xs mb-2">
                      {validationErrors.tags}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-yellow-50 text-[var(--color-neutral-dark2)] rounded-full text-sm flex items-center gap-2"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(idx)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {formData.tags.length}/{MAX_TAGS} tags
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Chips
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={chipInput}
                      onChange={(e) => setChipInput(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" && (e.preventDefault(), addChip())
                      }
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      placeholder="Add a chip"
                    />
                    <button
                      type="button"
                      onClick={addChip}
                      className="px-6 py-3 bg-gray-200 rounded-xl hover:bg-gray-300 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {validationErrors.chips && (
                    <p className="text-red-500 text-xs mb-2">
                      {validationErrors.chips}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {formData.chips.map((chip, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm flex items-center gap-2"
                      >
                        {chip}
                        <button
                          type="button"
                          onClick={() => removeChip(idx)}
                          className="text-yellow-600 hover:text-yellow-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Restrictions
                  </label>
                  <textarea
                    value={formData.restrictions}
                    onChange={(e) =>
                      handleChange("restrictions", e.target.value)
                    }
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
                    placeholder="Any age limits, dress codes, or other restrictions..."
                  />
                </div>
              </motion.div>
            )}

            {/* Tab 1: Banners */}
            {activeTab === 1 && (
              <motion.div
                key="tab1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-semibold mb-1">Event Banners</h2>
                  <p className="text-sm text-gray-600">
                    Update your event images (all formats required)
                  </p>
                </div>

                <ImageUpload
                  label="Horizontal Banner (16:9)"
                  value={bannerHorizontal}
                  onChange={setBannerHorizontal}
                  aspectRatio="horizontal"
                  required
                />
                {validationErrors.bannerHorizontal && (
                  <p className="text-red-500 text-sm -mt-4">
                    {validationErrors.bannerHorizontal}
                  </p>
                )}

                <ImageUpload
                  label="Vertical Banner (2:3)"
                  value={bannerVertical}
                  onChange={setBannerVertical}
                  aspectRatio="vertical"
                  required
                />
                {validationErrors.bannerVertical && (
                  <p className="text-red-500 text-sm -mt-4">
                    {validationErrors.bannerVertical}
                  </p>
                )}

                <ImageUpload
                  label="Square Banner (1:1)"
                  value={bannerSquare}
                  onChange={setBannerSquare}
                  aspectRatio="square"
                  required
                />
                {validationErrors.bannerSquare && (
                  <p className="text-red-500 text-sm -mt-4">
                    {validationErrors.bannerSquare}
                  </p>
                )}
              </motion.div>
            )}

            {/* Tab 2: Tickets & Fields */}
            {activeTab === 2 && (
              <motion.div
                key="tab2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                <TicketTypeManager
                  ticketTypes={ticketTypes}
                  onChange={setTicketTypes}
                  errors={validationErrors}
                />

                <div className="border-t pt-8">
                  <CustomFieldsManager
                    customFields={customFields}
                    onChange={setCustomFields}
                  />
                </div>
              </motion.div>
            )}

            {/* Tab 3: Additional Info */}
            {/* {activeTab === 3 && (
              <motion.div
                key="tab3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-semibold mb-1">
                    Additional Information
                  </h2>
                  <p className="text-sm text-gray-600">
                    Optional event details and policies
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Event Format
                  </label>
                  <input
                    type="text"
                    value={formData.eventFormat}
                    onChange={(e) =>
                      handleChange("eventFormat", e.target.value)
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="e.g., Concert, Conference, Workshop"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Requested Venue
                  </label>
                  <input
                    type="text"
                    value={formData.requestedVenue}
                    onChange={(e) =>
                      handleChange("requestedVenue", e.target.value)
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="Preferred venue name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Terms & Conditions
                  </label>
                  <textarea
                    value={formData.termsConditions}
                    onChange={(e) =>
                      handleChange("termsConditions", e.target.value)
                    }
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
                    placeholder="Terms and conditions for attendees..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Rules & Regulations
                  </label>
                  <textarea
                    value={formData.rulesRegulations}
                    onChange={(e) =>
                      handleChange("rulesRegulations", e.target.value)
                    }
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
                    placeholder="Event rules and regulations..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Policies
                  </label>
                  <textarea
                    value={formData.policies}
                    onChange={(e) => handleChange("policies", e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
                    placeholder="Refund policy, cancellation policy, etc..."
                  />
                </div>
              </motion.div>
            )} */}
          </AnimatePresence>
        </div>

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-between items-center">
          {activeTab > 0 ? (
            <button
              onClick={() => setActiveTab((prev) => prev - 1)}
              disabled={updating}
              className="px-8 py-3 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Previous
            </button>
          ) : (
            <div></div>
          )}

          {activeTab < TABS.length - 1 ? (
            <button
              onClick={() => setActiveTab((prev) => prev + 1)}
              disabled={updating}
              className="px-8 py-3 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Next
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-600">
                All changes are auto-detected
              </p>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .ql-container {
          font-family: inherit;
          font-size: 14px;
        }
        .ql-editor {
          min-height: 150px;
          max-height: 300px;
          overflow-y: auto;
        }
        .ql-editor.ql-blank::before {
          font-style: normal;
          color: #9ca3af;
        }
        .ql-toolbar {
          border-top-left-radius: 0.75rem;
          border-top-right-radius: 0.75rem;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
        }
        .ql-container {
          border-bottom-left-radius: 0.75rem;
          border-bottom-right-radius: 0.75rem;
        }
      `}</style>
    </div>
  );
};

export default EditEventPage;
