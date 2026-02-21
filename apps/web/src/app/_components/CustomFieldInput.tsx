import React, { memo, useMemo, useState, useRef, useEffect } from "react";

const parseDropdownOptions = (options: string | null | undefined): string[] => {
  if (!options) return [];

  try {
    const parsed = JSON.parse(options);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (opt) => typeof opt === "string" && opt.trim().length > 0,
      );
    }
  } catch (e) {
    //catch
  }

  if (typeof options === "string") {
    return options
      .split(",")
      .map((opt) => opt.trim())
      .filter((opt) => opt.length > 0);
  }

  return [];
};

interface CustomFieldInputProps {
  cf: {
    label: string;
    fieldType: string;
    required: boolean;
    options?: string | null;
  };
  value: string;
  onChange: (value: string) => void;
}

const CustomDropdown: React.FC<{
  options: string[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  required: boolean;
}> = memo(({ options, value, onChange, label, required }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const search = searchTerm.toLowerCase();
    return options.filter((opt) => opt.toLowerCase().includes(search));
  }, [options, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm("");
  };

  // native select
  const useNativeSelect =
    options.length > 50 ||
    (typeof window !== "undefined" && window.innerWidth < 768);

  if (useNativeSelect) {
    return (
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full p-6 text-base border border-[#E5E5E5] rounded-2xl bg-[#F5F5F5] outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all duration-200 cursor-pointer appearance-none pr-12 ${
            value ? "text-black" : "text-[#8B8B8B]"
          }`}
          aria-label={label}
          aria-required={required}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%238B8B8B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 1.5rem center",
            backgroundSize: "20px",
          }}
        >
          <option value="" disabled>
            Select {label}
          </option>
          {options.map((option, idx) => (
            <option
              key={`${option}-${idx}`}
              value={option}
              className="text-black"
            >
              {option}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-6 text-base border border-[#E5E5E5] rounded-2xl bg-[#F5F5F5] outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all duration-200 text-left flex items-center justify-between ${
          value ? "text-black" : "text-[#8B8B8B]"
        }`}
        aria-label={label}
        aria-required={required}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="truncate">{value || `Select ${label}`}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`ml-2 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-[#E5E5E5] rounded-2xl shadow-lg max-h-[280px] overflow-hidden">
          {options.length > 5 && (
            <div className="p-3 border-b border-[#E5E5E5] sticky top-0 bg-white">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full px-4 py-2 text-sm border border-[#E5E5E5] rounded-lg outline-none focus:border-black/20"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          <div className="overflow-y-auto max-h-[220px] custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, idx) => (
                <button
                  key={`${option}-${idx}`}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`w-full px-6 py-3 text-left text-base hover:bg-[#F5F5F5] transition-colors duration-150 ${
                    value === option
                      ? "bg-[#F5F5F5] font-medium text-black"
                      : "text-[#8B8B8B]"
                  }`}
                >
                  {option}
                </button>
              ))
            ) : (
              <div className="px-6 py-4 text-center text-sm text-[#8B8B8B]">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

CustomDropdown.displayName = "CustomDropdown";

const CustomFieldInput: React.FC<CustomFieldInputProps> = memo(
  ({ cf, value, onChange }) => {
    const fieldType = useMemo(
      () => cf.fieldType?.toLowerCase() || "text",
      [cf.fieldType],
    );
    const parsedOptions = useMemo(
      () => parseDropdownOptions(cf.options),
      [cf.options],
    );

    // Common input classes
    const inputBaseClasses =
      "w-full p-6 text-base border border-[#E5E5E5] rounded-2xl bg-[#F5F5F5] outline-none focus:border-[#FFDA0A] transition-all duration-200";
    const textColorClass = value ? "text-black" : "text-[#8B8B8B]";

    // Dropdown/Select field
    if (fieldType === "dropdown" || fieldType === "select") {
      if (parsedOptions.length === 0) {
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${cf.label.toLowerCase()}`}
            className={`${inputBaseClasses} ${textColorClass}`}
            aria-label={cf.label}
            aria-required={cf.required}
          />
        );
      }

      return (
        <CustomDropdown
          options={parsedOptions}
          value={value}
          onChange={onChange}
          label={cf.label}
          required={cf.required}
        />
      );
    }

    // Textarea field
    if (fieldType === "textarea" || fieldType === "longtext") {
      return (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${cf.label.toLowerCase()}`}
          rows={4}
          className={`${inputBaseClasses} ${textColorClass} resize-none`}
          aria-label={cf.label}
          aria-required={cf.required}
        />
      );
    }

    // Email field
    if (fieldType === "email") {
      return (
        <input
          type="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${cf.label.toLowerCase()}`}
          className={`${inputBaseClasses} ${textColorClass}`}
          aria-label={cf.label}
          aria-required={cf.required}
          autoComplete="email"
        />
      );
    }

    // Phone/Tel field
    if (fieldType === "phone" || fieldType === "tel") {
      return (
        <input
          type="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${cf.label.toLowerCase()}`}
          className={`${inputBaseClasses} ${textColorClass}`}
          aria-label={cf.label}
          aria-required={cf.required}
          autoComplete="tel"
          inputMode="numeric"
        />
      );
    }

    // Number field
    if (fieldType === "number") {
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${cf.label.toLowerCase()}`}
          className={`${inputBaseClasses} ${textColorClass}`}
          aria-label={cf.label}
          aria-required={cf.required}
          inputMode="numeric"
        />
      );
    }

    // Date field
    if (fieldType === "date") {
      return (
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputBaseClasses} text-black`}
          aria-label={cf.label}
          aria-required={cf.required}
        />
      );
    }

    // Checkbox field
    if (fieldType === "checkbox") {
      const isChecked = value === "true" || value === "yes" || value === "1";

      return (
        <label className="flex items-center gap-3 cursor-pointer p-6 border border-[#E5E5E5] rounded-2xl bg-[#F5F5F5] hover:border-black transition-all duration-200">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => onChange(e.target.checked ? "true" : "false")}
            className="w-5 h-5 accent-black cursor-pointer rounded"
            aria-label={cf.label}
            aria-required={cf.required}
          />
          <span className="text-base text-[#8B8B8B] select-none">
            {cf.label}
          </span>
        </label>
      );
    }

    // URL field
    if (fieldType === "url") {
      return (
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${cf.label.toLowerCase()}`}
          className={`${inputBaseClasses} ${textColorClass}`}
          aria-label={cf.label}
          aria-required={cf.required}
          autoComplete="url"
        />
      );
    }

    // Default: Text field
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Enter ${cf.label.toLowerCase()}`}
        className={`${inputBaseClasses} ${textColorClass} oultline-none`}
        aria-label={cf.label}
        aria-required={cf.required}
        autoComplete="off"
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.value === nextProps.value &&
      prevProps.cf.label === nextProps.cf.label &&
      prevProps.cf.fieldType === nextProps.cf.fieldType &&
      prevProps.cf.options === nextProps.cf.options
    );
  },
);

CustomFieldInput.displayName = "CustomFieldInput";

export default CustomFieldInput;
