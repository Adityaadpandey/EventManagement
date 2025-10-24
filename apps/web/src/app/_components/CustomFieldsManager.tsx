import React, { memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const FIELD_TYPES = [
  { value: "text", label: "Text", icon: "T" },
  { value: "email", label: "Email", icon: "@" },
  { value: "phone", label: "Phone", icon: "☎" },
  { value: "number", label: "Number", icon: "#" },
  { value: "url", label: "URL", icon: "🔗" },
  { value: "date", label: "Date", icon: "📅" },
  { value: "textarea", label: "Long Text", icon: "¶" },
  { value: "dropdown", label: "Dropdown", icon: "▼" },
  { value: "checkbox", label: "Checkbox", icon: "☑" },
];

const CustomFieldsManager = memo(({ customFields, onChange }) => {
  const addCustomField = useCallback(() => {
    if (customFields.length >= 20) {
      alert("Maximum 20 custom fields allowed");
      return;
    }

    onChange([
      ...customFields,
      {
        label: "",
        fieldType: "text",
        required: false,
      },
    ]);
  }, [customFields, onChange]);

  const removeCustomField = useCallback(
    (index) => {
      onChange(customFields.filter((_, i) => i !== index));
    },
    [customFields, onChange],
  );

  const updateCustomField = useCallback(
    (index, field, value) => {
      const updated = [...customFields];

      // ✅ Safe validation (only when value is a string)
      if (field === "label" && typeof value === "string" && value.length > 100)
        return;
      if (
        field === "options" &&
        typeof value === "string" &&
        value.length > 500
      )
        return;

      // ✅ When field type changes, clear incompatible fields
      if (field === "fieldType") {
        updated[index] = {
          ...updated[index],
          [field]: value,
        };

        // If new type isn't dropdown, remove options
        if (value !== "dropdown") {
          delete updated[index].options;
        }
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }

      onChange(updated);
    },
    [customFields, onChange],
  );

  const duplicateField = useCallback(
    (index) => {
      if (customFields.length >= 20) {
        alert("Maximum 20 custom fields allowed");
        return;
      }

      const fieldToDuplicate = customFields[index];
      onChange([
        ...customFields,
        {
          ...fieldToDuplicate,
          label: `${fieldToDuplicate.label} (Copy)`,
        },
      ]);
    },
    [customFields, onChange],
  );

  const moveField = useCallback(
    (index, direction) => {
      if (
        (direction === "up" && index === 0) ||
        (direction === "down" && index === customFields.length - 1)
      ) {
        return;
      }

      const updated = [...customFields];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      [updated[index], updated[targetIndex]] = [
        updated[targetIndex],
        updated[index],
      ];
      onChange(updated);
    },
    [customFields, onChange],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Custom Fields</h2>
          <p className="text-sm text-gray-600 mt-1">
            Collect additional information from attendees (max 20 fields)
          </p>
        </div>
        <button
          type="button"
          onClick={addCustomField}
          disabled={customFields.length >= 20}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Add Field ({customFields.length}/20)
        </button>
      </div>

      {customFields.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-2xl">
          <svg
            className="w-16 h-16 text-gray-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-gray-600 mb-4">No custom fields added yet</p>
          <p className="text-sm text-gray-500 mb-4">
            Add fields to collect specific information like dietary preferences,
            t-shirt sizes, etc.
          </p>
          <button
            type="button"
            onClick={addCustomField}
            className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
          >
            Add Your First Field
          </button>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {customFields.map((field, index) => (
          <motion.div
            key={index}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: -100, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="p-6 border-2 border-gray-200 rounded-2xl space-y-4 relative bg-white shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Action Buttons */}
            <div className="absolute top-4 right-4 flex gap-2">
              {/* Move Up */}
              <button
                type="button"
                onClick={() => moveField(index, "up")}
                disabled={index === 0}
                className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Move up"
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
                    d="M5 15l7-7 7 7"
                  />
                </svg>
              </button>

              {/* Move Down */}
              <button
                type="button"
                onClick={() => moveField(index, "down")}
                disabled={index === customFields.length - 1}
                className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Move down"
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
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Duplicate */}
              <button
                type="button"
                onClick={() => duplicateField(index)}
                disabled={customFields.length >= 20}
                className="p-1 text-blue-500 hover:text-blue-700 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Duplicate"
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
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>

              {/* Remove */}
              <button
                type="button"
                onClick={() => removeCustomField(index)}
                className="p-1 text-red-500 hover:text-red-700"
                title="Remove"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Field Number Badge */}
            <div className="absolute top-4 left-4">
              <span className="inline-flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                {index + 1}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8">
              {/* Field Label */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Field Label *
                </label>
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) =>
                    updateCustomField(index, "label", e.target.value)
                  }
                  maxLength={100}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., T-Shirt Size, Dietary Preference"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {field.label.length}/100 characters
                </p>
              </div>

              {/* Field Type */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Field Type *
                </label>
                <select
                  value={field.fieldType}
                  onChange={(e) =>
                    updateCustomField(index, "fieldType", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white cursor-pointer"
                >
                  {FIELD_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Required Toggle */}
              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) =>
                        updateCustomField(index, "required", e.target.checked)
                      }
                      className="sr-only"
                    />
                    <div
                      className={`w-14 h-7 rounded-full shadow-inner transition ${
                        field.required ? "bg-purple-500" : "bg-gray-300"
                      }`}
                    ></div>
                    <div
                      className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition transform ${
                        field.required ? "translate-x-7" : ""
                      }`}
                    ></div>
                  </div>
                  <span className="ml-3 text-sm font-medium">
                    Required Field
                  </span>
                </label>
              </div>

              {/* Options (only for dropdown) */}
              {field.fieldType === "dropdown" && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Dropdown Options *
                  </label>
                  <input
                    type="text"
                    value={field.options || ""}
                    onChange={(e) =>
                      updateCustomField(index, "options", e.target.value)
                    }
                    maxLength={500}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter options separated by commas (e.g., Small, Medium, Large, XL)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Separate options with commas • {field.options?.length || 0}
                    /500 characters
                  </p>
                  {field.options && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {field.options
                        .split(",")
                        .filter((opt) => opt.trim())
                        .map((opt, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-md"
                          >
                            {opt.trim()}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Field Preview */}
            <div className="mt-4 p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-200">
              <p className="text-xs font-semibold text-purple-700 mb-2 uppercase tracking-wide">
                Preview
              </p>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-800">
                  {field.label || "Field Label"}{" "}
                  {field.required && <span className="text-red-500">*</span>}
                </p>
                <div className="text-sm text-gray-600">
                  Type:{" "}
                  <span className="font-medium">
                    {
                      FIELD_TYPES.find((t) => t.value === field.fieldType)
                        ?.label
                    }
                  </span>
                  {field.fieldType === "dropdown" && field.options && (
                    <span className="ml-2 text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded">
                      {
                        field.options.split(",").filter((opt) => opt.trim())
                          .length
                      }{" "}
                      options
                    </span>
                  )}
                </div>
                {!field.label && (
                  <p className="text-xs text-orange-600 mt-2">
                    ⚠️ Please add a field label
                  </p>
                )}
                {field.fieldType === "dropdown" && !field.options && (
                  <p className="text-xs text-orange-600 mt-2">
                    ⚠️ Please add dropdown options
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {customFields.length > 0 && (
        <div className="text-center text-sm text-gray-500 pt-4">
          <p>💡 Tip: Drag fields to reorder them, or use the up/down arrows</p>
        </div>
      )}
    </div>
  );
});

CustomFieldsManager.displayName = "CustomFieldsManager";

export default CustomFieldsManager;
