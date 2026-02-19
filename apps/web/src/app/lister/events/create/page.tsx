"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { createEvent } from "@/lib/features/eventsSlice";
import ImageUpload from "@/app/_components/ImageUpload";
import TicketTypeManager from "@/app/_components/TicketTypeManager";
import CustomFieldsManager from "@/app/_components/CustomFieldsManager";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

// Dynamically import MapPicker to avoid SSR issues
const MapPicker = dynamic(() => import("@/app/_components/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] bg-gray-100 rounded-xl flex items-center justify-center">
      <div className="text-center">
        <svg
          className="animate-spin w-8 h-8 text-gray-400 mx-auto mb-2"
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
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <p className="text-sm text-gray-600">Loading map...</p>
      </div>
    </div>
  ),
});

type TicketType = {
  name: string;
  description?: string;
  price: number;
  discountedPrice?: number;
  discountReason?: string;
  quantity: number;
  salesCutoff?: string;
};

type CustomField = {
  label: string;
  fieldType: string;
  required: boolean;
  options?: string;
};

interface FormData {
  title: string;
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  capacity: string;
  restrictions: string;
  date: string;
  time: string;
  tags: string[];
  chips: string[];
}

interface ValidationErrors {
  [key: string]: string;
}

// Constants
const STEPS = ["Basic Info", "Banners", "Tickets", "Review"] as const;
const MAX_TAGS = 10;
const MAX_CHIPS = 4;
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const MIN_DESCRIPTION_LENGTH = 50;
const DRAFT_KEY = "eventDraft";
const DRAFT_EXPIRY_HOURS = 24;

// Predefined tag options
const TAG_OPTIONS = [
  "Fest",
  "Tech",
  "Hackathon",
  "Cultural",
  "EDM",
  "Concert",
  "NGO",
];

// Quill modules configuration
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

const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const sanitizeInput = (input: string, maxLength?: number): string => {
  // Don't trim during typing - only remove dangerous characters
  let sanitized = input.replace(/[<>]/g, "");
  if (maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }
  return sanitized;
};

// Function to strip HTML tags and get plain text length
const getPlainTextLength = (html: string): number => {
  // Check if we're in a browser environment
  if (typeof window === "undefined") {
    // Server-side: use a simple regex to strip HTML tags
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim().length;
  }

  // Client-side: use DOM parsing for accurate results
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || "").length;
};

const CreateEventPage = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((s) => s.events.create);
  const { user } = useAppSelector((s) => s.auth);

  // Refs for performance optimization
  const formRef = useRef<HTMLDivElement>(null);
  const hasLoadedDraft = useRef(false);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    location: "",
    latitude: null,
    longitude: null,
    capacity: "",
    restrictions: "",
    date: "",
    time: "",
    tags: [],
    chips: [],
  });

  const [tagInput, setTagInput] = useState("");
  const [chipInput, setChipInput] = useState("");

  // Image states
  const [bannerHorizontal, setBannerHorizontal] = useState<string>("");
  const [bannerVertical, setBannerVertical] = useState<string>("");
  const [bannerSquare, setBannerSquare] = useState<string>("");

  // Ticket types and custom fields
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([
    {
      name: "General Admission",
      description: "",
      price: 0,
      quantity: 100,
    },
  ]);

  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  const [currentStep, setCurrentStep] = useState(1);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {},
  );
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [isDraftLoading, setIsDraftLoading] = useState(false);

  // Load draft on mount
  useEffect(() => {
    if (hasLoadedDraft.current) return;
    hasLoadedDraft.current = true;

    try {
      const draftStr = localStorage.getItem(DRAFT_KEY);
      if (!draftStr) return;

      const draft = JSON.parse(draftStr);
      const draftAge = Date.now() - draft.timestamp;
      const maxAge = DRAFT_EXPIRY_HOURS * 60 * 60 * 1000;

      if (draftAge < maxAge) {
        setShowDraftPrompt(true);
      } else {
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch (err) {
      console.error("Failed to load draft:", err);
      localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  // Load draft handler
  const loadDraft = useCallback(() => {
    setIsDraftLoading(true);
    try {
      const draftStr = localStorage.getItem(DRAFT_KEY);
      if (!draftStr) return;

      const draft = JSON.parse(draftStr);
      setFormData(draft.formData || formData);
      setBannerHorizontal(draft.bannerHorizontal || "");
      setBannerVertical(draft.bannerVertical || "");
      setBannerSquare(draft.bannerSquare || "");
      setTicketTypes(draft.ticketTypes || ticketTypes);
      setCustomFields(draft.customFields || []);
      setCurrentStep(draft.currentStep || 1);

      setShowDraftPrompt(false);
    } catch (err) {
      console.error("Failed to restore draft:", err);
    } finally {
      setIsDraftLoading(false);
    }
  }, [formData, ticketTypes]);

  const dismissDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    setShowDraftPrompt(false);
  }, []);

  // Auto-save draft (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const draft = {
          formData,
          bannerHorizontal,
          bannerVertical,
          bannerSquare,
          ticketTypes,
          customFields,
          currentStep,
          timestamp: Date.now(),
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch (err) {
        console.error("Failed to save draft:", err);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [
    formData,
    bannerHorizontal,
    bannerVertical,
    bannerSquare,
    ticketTypes,
    customFields,
    currentStep,
  ]);

  // Optimized input handler
  const handleChange = useCallback((field: keyof FormData, value: any) => {
    setFormData((prev) => {
      // Sanitize string inputs (except description which is HTML)
      if (typeof value === "string" && field !== "description") {
        if (field === "title") value = sanitizeInput(value, MAX_TITLE_LENGTH);
        if (field === "location" || field === "restrictions")
          value = sanitizeInput(value);
      }

      return { ...prev, [field]: value };
    });

    setValidationErrors((prev) => ({ ...prev, [field]: "" }));
  }, []);

  // Tag management
  const addTag = useCallback(
    (tagToAdd?: string) => {
      const tag = tagToAdd || tagInput;
      const trimmed = sanitizeInput(tag);
      if (!trimmed) return;

      if (formData.tags.length >= MAX_TAGS) {
        setValidationErrors((prev) => ({
          ...prev,
          tags: `Maximum ${MAX_TAGS} tags allowed`,
        }));
        return;
      }

      if (formData.tags.includes(trimmed)) {
        setValidationErrors((prev) => ({
          ...prev,
          tags: "Tag already exists",
        }));
        return;
      }

      setFormData((prev) => ({ ...prev, tags: [...prev.tags, trimmed] }));
      setTagInput("");
      setValidationErrors((prev) => ({ ...prev, tags: "" }));
    },
    [tagInput, formData.tags],
  );

  const removeTag = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index),
    }));
  }, []);

  // Chip management
  const addChip = useCallback(() => {
    const trimmed = sanitizeInput(chipInput);
    if (!trimmed) return;

    if (formData.chips.length >= MAX_CHIPS) {
      setValidationErrors((prev) => ({
        ...prev,
        chips: `Maximum ${MAX_CHIPS} chips allowed`,
      }));
      return;
    }

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

  // Comprehensive validation
  const validateStep = useCallback(
    (step: number): boolean => {
      const errors: ValidationErrors = {};

      if (step === 1) {
        // Title validation
        if (!formData.title.trim()) {
          errors.title = "Title is required";
        } else if (formData.title.length > MAX_TITLE_LENGTH) {
          errors.title = `Title must be less than ${MAX_TITLE_LENGTH} characters`;
        }

        // Description validation (check plain text length)
        const plainTextLength = getPlainTextLength(formData.description);
        if (!formData.description.trim() || plainTextLength === 0) {
          errors.description = "Description is required";
        } else if (plainTextLength < MIN_DESCRIPTION_LENGTH) {
          errors.description = `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters`;
        } else if (plainTextLength > MAX_DESCRIPTION_LENGTH) {
          errors.description = `Description must be less than ${MAX_DESCRIPTION_LENGTH} characters`;
        }

        // Location validation
        if (!formData.location.trim()) {
          errors.location = "Location is required";
        }

        // Date validation
        if (!formData.date) {
          errors.date = "Date is required";
        } else if (!formData.time) {
          errors.time = "Time is required";
        } else {
          const eventDateTime = new Date(`${formData.date}T${formData.time}`);
          const now = new Date();

          if (isNaN(eventDateTime.getTime())) {
            errors.date = "Invalid date or time";
          } else if (eventDateTime <= now) {
            errors.date = "Event must be scheduled for the future";
          }
        }

        // Coordinate validation
        if (formData.latitude !== null) {
          if (formData.latitude < -90 || formData.latitude > 90) {
            errors.latitude = "Latitude must be between -90 and 90";
          }
        }
        if (formData.longitude !== null) {
          if (formData.longitude < -180 || formData.longitude > 180) {
            errors.longitude = "Longitude must be between -180 and 180";
          }
        }

        // Capacity validation
        if (formData.capacity) {
          const capacity = parseInt(formData.capacity);
          if (isNaN(capacity) || capacity < 1 || capacity > 1000000) {
            errors.capacity = "Capacity must be between 1 and 1,000,000";
          }
        }
      }

      if (step === 2) {
        if (!bannerHorizontal)
          errors.bannerHorizontal = "Horizontal banner is required";
        if (!bannerVertical)
          errors.bannerVertical = "Vertical banner is required";
        if (!bannerSquare) errors.bannerSquare = "Square banner is required";
      }

      if (step === 3) {
        if (ticketTypes.length === 0) {
          errors.ticketTypes = "At least one ticket type is required";
        } else {
          ticketTypes.forEach((tt, idx) => {
            if (!tt.name.trim()) {
              errors[`ticketType_${idx}_name`] = "Ticket name is required";
            }
            if (tt.price < 0) {
              errors[`ticketType_${idx}_price`] = "Price cannot be negative";
            }
            if (
              tt.discountedPrice !== undefined &&
              tt.discountedPrice >= tt.price
            ) {
              errors[`ticketType_${idx}_discountedPrice`] =
                "Discounted price must be less than original price";
            }
            if (tt.quantity <= 0 || tt.quantity > 100000) {
              errors[`ticketType_${idx}_quantity`] =
                "Quantity must be between 1 and 100,000";
            }
            if (tt.salesCutoff) {
              const cutoffDate = new Date(tt.salesCutoff);
              const eventDate = new Date(`${formData.date}T${formData.time}`);
              if (cutoffDate >= eventDate) {
                errors[`ticketType_${idx}_salesCutoff`] =
                  "Sales cutoff must be before event date";
              }
            }
          });
        }

        // Validate custom fields
        customFields.forEach((field, idx) => {
          if (!field.label.trim()) {
            errors[`customField_${idx}_label`] = "Field label is required";
          }
          if (field.fieldType === "dropdown" && !field.options?.trim()) {
            errors[`customField_${idx}_options`] =
              "Dropdown options are required";
          }
        });
      }

      setValidationErrors(errors);
      return Object.keys(errors).length === 0;
    },
    [
      formData,
      bannerHorizontal,
      bannerVertical,
      bannerSquare,
      ticketTypes,
      customFields,
    ],
  );

  // Navigation handlers
  const nextStep = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [currentStep, validateStep]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const goToStep = useCallback(
    (step: number) => {
      if (step < currentStep || validateStep(currentStep)) {
        setCurrentStep(step);
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [currentStep, validateStep],
  );

  // Submit handler with error handling
  const handleSubmit = useCallback(async () => {
    if (!validateStep(4)) return;

    try {
      // Clean and prepare payload
      const payload = {
        title: formData.title.trim(),
        description: formData.description,
        banner_horizontal: bannerHorizontal,
        banner_vertical: bannerVertical,
        banner_square: bannerSquare,
        date: new Date(formData.date).toISOString(),
        time: new Date(`${formData.date}T${formData.time}`).toISOString(),
        location: formData.location.trim(),
        latitude: formData.latitude ?? undefined,
        longitude: formData.longitude ?? undefined,
        capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
        restrictions: formData.restrictions.trim() || undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        chips: formData.chips.length > 0 ? formData.chips : undefined,
        ticketTypes: ticketTypes.map((tt) => ({
          name: tt.name.trim(),
          description: tt.description?.trim() || undefined,
          price: Number(tt.price),
          discountedPrice: tt.discountedPrice
            ? Number(tt.discountedPrice)
            : undefined,
          discountReason: tt.discountReason?.trim() || undefined,
          quantity: Number(tt.quantity),
          salesCutoff: tt.salesCutoff
            ? new Date(tt.salesCutoff).toISOString()
            : undefined,
        })),
        customFields:
          customFields.length > 0
            ? customFields.map((cf) => ({
                label: cf.label.trim(),
                fieldType: cf.fieldType,
                required: cf.required,
                options: cf.options?.trim() || undefined,
              }))
            : undefined,
      };

      // console.log("Submitting payload:", JSON.stringify(payload, null, 2));

      const result = await dispatch(createEvent(payload)).unwrap();

      // Clear draft on success
      localStorage.removeItem(DRAFT_KEY);

      // Success - redirect to event page
      router.push(`/event/${result.eventId}`);
    } catch (err: any) {
      console.error("Failed to create event:", err);

      // Extract error message properly
      const errorMessage =
        typeof err === "string"
          ? err
          : err?.message ||
            err?.error ||
            "Failed to create event. Please try again.";

      // Update validation errors to show the error
      setValidationErrors({ submit: errorMessage });

      // Scroll to top to show error
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [
    formData,
    bannerHorizontal,
    bannerVertical,
    bannerSquare,
    ticketTypes,
    customFields,
    dispatch,
    router,
    validateStep,
  ]);

  // Access control
  if (user && user.role !== "LISTER") {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You need to be a lister to create events. Please contact support to
            upgrade your account.
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-[#FFE348] rounded-full hover:bg-[#FFD700] font-medium transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Calculate description character count
  const descriptionLength = getPlainTextLength(formData.description);

  return (
    <div className="py-4 sm:py-8 px-3 sm:px-4 pb-32 sm:pb-40">
      <div className="max-w-6xl mx-auto" ref={formRef}>
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold mb-2">
            Create New Event
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Fill in the details to create your event. Your progress is
            automatically saved.
          </p>
        </div>

        {/* Draft Prompt */}
        <AnimatePresence>
          {showDraftPrompt && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3"
            >
              <svg
                className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">
                  Draft Found
                </h3>
                <p className="text-sm text-blue-700 mb-3">
                  We found an unsaved draft from your previous session. Would
                  you like to continue where you left off?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={loadDraft}
                    disabled={isDraftLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                  >
                    {isDraftLoading ? "Loading..." : "Continue Draft"}
                  </button>
                  <button
                    onClick={dismissDraft}
                    disabled={isDraftLoading}
                    className="px-4 py-2 bg-white text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 text-sm font-medium disabled:opacity-50"
                  >
                    Start Fresh
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Bar */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((step, idx) => (
              <button
                key={step}
                onClick={() => goToStep(idx + 1)}
                disabled={idx + 1 > currentStep}
                className={`flex-1 text-center text-xs sm:text-sm font-medium transition-colors ${
                  currentStep > idx + 1
                    ? "text-green-600 cursor-pointer hover:text-green-700"
                    : currentStep === idx + 1
                      ? "text-black"
                      : "text-gray-400 cursor-not-allowed"
                }`}
              >
                <div className="flex flex-col items-center gap-1 sm:gap-2">
                  <div
                    className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      currentStep > idx + 1
                        ? "bg-green-100 text-green-700"
                        : currentStep === idx + 1
                          ? "bg-[#FFE348] text-black"
                          : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {currentStep > idx + 1 ? "✓" : idx + 1}
                  </div>
                  <span className="hidden sm:inline">{step}</span>
                  <span className="sm:hidden text-[10px]">
                    {step.split(" ")[0]}
                  </span>
                </div>
              </button>
            ))}
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#FFE348]"
              initial={{ width: "0%" }}
              animate={{ width: `${(currentStep / 4) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center hidden sm:block">
            Step {currentStep} of {STEPS.length}
          </p>
          <p className="text-xs text-gray-500 mt-2 text-center sm:hidden">
            Step {currentStep} of {STEPS.length}
          </p>
        </div>

        {/* Error Display */}
        <AnimatePresence mode="wait">
          {(error || validationErrors.submit) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
            >
              <svg
                className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h4 className="font-semibold text-red-900 mb-1">
                  Error Creating Event
                </h4>
                <p className="text-sm text-red-700">
                  {error || validationErrors.submit}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Steps */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-sm">
          <AnimatePresence mode="wait">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
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
                    Tell us about your event
                  </p>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    maxLength={MAX_TITLE_LENGTH}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="Enter event title"
                    autoFocus
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-500">
                      {formData.title.length}/{MAX_TITLE_LENGTH} characters
                    </p>
                    {validationErrors.title && (
                      <p className="text-red-500 text-xs">
                        {validationErrors.title}
                      </p>
                    )}
                  </div>
                </div>

                {/* Description with React Quill */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description *
                  </label>
                  <div className="border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-black">
                    <ReactQuill
                      theme="snow"
                      value={formData.description}
                      onChange={(value) => handleChange("description", value)}
                      modules={quillModules}
                      formats={quillFormats}
                      placeholder={`Describe your event (minimum ${MIN_DESCRIPTION_LENGTH} characters)...`}
                      className="bg-white"
                    />
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-500">
                      {descriptionLength}/{MAX_DESCRIPTION_LENGTH} characters
                      {descriptionLength < MIN_DESCRIPTION_LENGTH &&
                        ` (${MIN_DESCRIPTION_LENGTH - descriptionLength} more needed)`}
                    </p>
                    {validationErrors.description && (
                      <p className="text-red-500 text-xs">
                        {validationErrors.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Event Date *
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleChange("date", e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                    />
                    {validationErrors.time && (
                      <p className="text-red-500 text-xs mt-1">
                        {validationErrors.time}
                      </p>
                    )}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Location *
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleChange("location", e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="Enter event location"
                  />
                  {validationErrors.location && (
                    <p className="text-red-500 text-xs mt-1">
                      {validationErrors.location}
                    </p>
                  )}
                </div>

                {/* Coordinates (Optional) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Latitude (Optional)
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="e.g., 31.2554"
                    />
                    {validationErrors.latitude && (
                      <p className="text-red-500 text-xs mt-1">
                        {validationErrors.latitude}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Longitude (Optional)
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="e.g., 75.7050"
                    />
                    {validationErrors.longitude && (
                      <p className="text-red-500 text-xs mt-1">
                        {validationErrors.longitude}
                      </p>
                    )}
                  </div>
                </div>

                {/* Map Picker */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select Location on Map (Optional)
                  </label>
                  <p className="text-xs text-gray-600 mb-3">
                    Click on the map to set the event location, or enter
                    coordinates manually above
                  </p>
                  <MapPicker
                    latitude={formData.latitude}
                    longitude={formData.longitude}
                    onLocationChange={(lat, lng) => {
                      handleChange("latitude", lat);
                      handleChange("longitude", lng);
                    }}
                  />
                </div>

                {/* Capacity */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Capacity (Optional)
                  </label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => handleChange("capacity", e.target.value)}
                    min="1"
                    max="1000000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="Maximum attendees"
                  />
                  {validationErrors.capacity && (
                    <p className="text-red-500 text-xs mt-1">
                      {validationErrors.capacity}
                    </p>
                  )}
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tags (Optional)
                  </label>
                  <div className="mb-3">
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          addTag(e.target.value);
                        }
                      }}
                      disabled={formData.tags.length >= MAX_TAGS}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Select a tag to add...</option>
                      {TAG_OPTIONS.filter(
                        (tag) => !formData.tags.includes(tag),
                      ).map((tag) => (
                        <option key={tag} value={tag}>
                          {tag}
                        </option>
                      ))}
                    </select>
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
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(idx)}
                          className="text-blue-600 hover:text-blue-800"
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

                {/* Chips */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Chips (Optional)
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={chipInput}
                      onChange={(e) => setChipInput(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" && (e.preventDefault(), addChip())
                      }
                      disabled={formData.chips.length >= MAX_CHIPS}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="Add a chip and press Enter"
                    />
                    <button
                      type="button"
                      onClick={addChip}
                      disabled={formData.chips.length >= MAX_CHIPS}
                      className="px-6 py-3 bg-gray-200 rounded-xl hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                  <p className="text-xs text-gray-500 mt-2">
                    {formData.chips.length}/{MAX_CHIPS} chips
                  </p>
                </div>

                {/* Restrictions */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Restrictions (Optional)
                  </label>
                  <textarea
                    value={formData.restrictions}
                    onChange={(e) =>
                      handleChange("restrictions", e.target.value)
                    }
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black resize-none"
                    placeholder="Any restrictions or requirements (e.g., age limit, dress code)..."
                  />
                </div>
              </motion.div>
            )}

            {/* Step 2: Banners */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-semibold mb-1">Event Banners</h2>
                  <p className="text-sm text-gray-600">
                    Upload images for different display formats
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

            {/* Step 3: Tickets & Custom Fields */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
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

            {/* Step 4: Review & Submit */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-semibold mb-1">
                    Review Your Event
                  </h2>
                  <p className="text-sm text-gray-600">
                    Double-check all details before publishing
                  </p>
                </div>

                {/* Basic Info Summary */}
                <div className="p-6 bg-gray-50 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Basic Information</h3>
                    <button
                      onClick={() => goToStep(1)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Edit
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 mb-1">Title</p>
                      <p className="font-medium">{formData.title}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Location</p>
                      <p className="font-medium">{formData.location}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Date</p>
                      <p className="font-medium">
                        {new Date(formData.date).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Time</p>
                      <p className="font-medium">
                        {new Date(
                          `2000-01-01T${formData.time}`,
                        ).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </p>
                    </div>
                    {formData.capacity && (
                      <div>
                        <p className="text-gray-600 mb-1">Capacity</p>
                        <p className="font-medium">
                          {parseInt(formData.capacity).toLocaleString()}{" "}
                          attendees
                        </p>
                      </div>
                    )}
                    {(formData.latitude !== null ||
                      formData.longitude !== null) && (
                      <div>
                        <p className="text-gray-600 mb-1">Coordinates</p>
                        <p className="font-medium text-xs">
                          {formData.latitude?.toFixed(4)},{" "}
                          {formData.longitude?.toFixed(4)}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-gray-600 mb-1">Description</p>
                    <div
                      className="text-sm prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: formData.description }}
                    />
                  </div>

                  {formData.tags.length > 0 && (
                    <div>
                      <p className="text-gray-600 mb-2">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {formData.chips.length > 0 && (
                    <div>
                      <p className="text-gray-600 mb-2">Chips</p>
                      <div className="flex flex-wrap gap-2">
                        {formData.chips.map((chip, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {formData.restrictions && (
                    <div>
                      <p className="text-gray-600 mb-1">Restrictions</p>
                      <p className="text-sm">{formData.restrictions}</p>
                    </div>
                  )}
                </div>

                {/* Banners Summary */}
                <div className="p-6 bg-gray-50 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Banners</h3>
                    <button
                      onClick={() => goToStep(2)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 mb-2">
                        Horizontal (16:9)
                      </p>
                      <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
                        {bannerHorizontal && (
                          <img
                            src={bannerHorizontal}
                            alt="Horizontal"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-2">
                        Vertical (2:3)
                      </p>
                      <div className="aspect-[2/3] bg-gray-200 rounded-lg overflow-hidden">
                        {bannerVertical && (
                          <img
                            src={bannerVertical}
                            alt="Vertical"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-2">Square (1:1)</p>
                      <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                        {bannerSquare && (
                          <img
                            src={bannerSquare}
                            alt="Square"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tickets Summary */}
                <div className="p-6 bg-gray-50 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Ticket Types</h3>
                    <button
                      onClick={() => goToStep(3)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="space-y-3">
                    {ticketTypes.map((ticket, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-white rounded-xl border border-gray-200"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{ticket.name}</p>
                            {ticket.description && (
                              <p className="text-sm text-gray-600 mt-1">
                                {ticket.description}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            {ticket.discountedPrice ? (
                              <>
                                <p className="text-sm line-through text-gray-500">
                                  ₹{ticket.price}
                                </p>
                                <p className="text-lg font-bold text-green-600">
                                  ₹{ticket.discountedPrice}
                                </p>
                                {ticket.discountReason && (
                                  <p className="text-xs text-green-600">
                                    {ticket.discountReason}
                                  </p>
                                )}
                              </>
                            ) : (
                              <p className="text-lg font-bold">
                                ₹{ticket.price}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                          <span>Qty: {ticket.quantity}</span>
                          {ticket.salesCutoff && (
                            <span>
                              Cutoff:{" "}
                              {new Date(
                                ticket.salesCutoff,
                              ).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-3 border-t">
                    <p className="text-sm text-gray-600">
                      Total tickets available:{" "}
                      <span className="font-semibold">
                        {ticketTypes
                          .reduce((sum, t) => sum + t.quantity, 0)
                          .toLocaleString()}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Custom Fields Summary */}
                {customFields.length > 0 && (
                  <div className="p-6 bg-gray-50 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">Custom Fields</h3>
                      <button
                        onClick={() => goToStep(3)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="space-y-2">
                      {customFields.map((field, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="font-medium">
                            {field.label}
                            {field.required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </span>
                          <span className="text-gray-600 text-xs">
                            {field.fieldType}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation Buttons */}
        <div className="mt-6 sm:mt-8 flex justify-between items-center gap-3">
          {currentStep > 1 ? (
            <button
              onClick={prevStep}
              disabled={loading}
              className="px-4 sm:px-8 py-3 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm sm:text-base"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5"
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
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Back</span>
            </button>
          ) : (
            <div></div>
          )}

          <div className="flex items-center gap-2 sm:gap-3">
            {currentStep === 4 && (
              <p className="text-xs sm:text-sm text-gray-600 hidden md:block">
                Press Ctrl/Cmd + Enter to submit
              </p>
            )}
            {currentStep < 4 ? (
              <button
                onClick={nextStep}
                disabled={loading}
                className="px-4 sm:px-8 py-3 bg-[#FFE348] rounded-full hover:bg-[#FFD700] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium text-sm sm:text-base"
              >
                Next
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
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
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 sm:px-8 py-3 bg-[#FFE348] rounded-full hover:bg-[#FFD700] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium text-sm sm:text-base whitespace-nowrap"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin w-4 h-4 sm:w-5 sm:h-5"
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span className="hidden sm:inline">Creating Event...</span>
                    <span className="sm:hidden">Creating...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="hidden sm:inline">Create Event</span>
                    <span className="sm:hidden">Create</span>
                  </>
                )}
              </button>
            )}
          </div>
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
          font-size: 14px !important;
          line-height: 1.4 !important;
          color: #8b8b8b !important;
        }
        .ql-editor * {
          font-size: 14px !important;
          line-height: 1.4 !important;
          color: #8b8b8b !important;
        }
        .ql-editor p,
        .ql-editor li,
        .ql-editor span,
        .ql-editor strong,
        .ql-editor em,
        .ql-editor u {
          font-size: 14px !important;
          line-height: 1.4 !important;
          color: #8b8b8b !important;
        }
        .ql-editor h1,
        .ql-editor h2,
        .ql-editor h3 {
          color: #8b8b8b !important;
          line-height: 1.4 !important;
        }
        .ql-editor a {
          color: #2563eb !important;
          text-decoration: underline;
        }
        .ql-editor.ql-blank::before {
          font-style: normal;
          color: #9ca3af;
          font-size: 14px !important;
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
        .prose {
          color: #8b8b8b;
          font-size: 14px;
          line-height: 1.4;
        }
        .prose * {
          color: #8b8b8b !important;
          font-size: 14px !important;
          line-height: 1.4 !important;
        }
        .prose p {
          margin-bottom: 0.5em;
        }
        .prose ul,
        .prose ol {
          margin-left: 1.5em;
        }
        .prose a {
          color: #2563eb !important;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default CreateEventPage;
