"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Building2,
  Upload,
  Save,
  X,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  Image as ImageIcon,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  fetchMyLister,
  updateLister,
  clearError,
} from "@/lib/features/listerSlice";
import { useRouter } from "next/navigation";

interface FormData {
  companyName: string;
  companyLogo: string;
  bio: string;
}

interface FormErrors {
  companyName?: string;
  companyLogo?: string;
  bio?: string;
}

const ListerEditProfile: React.FC = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { currentLister, updateLoading, loading, error } = useAppSelector(
    (state) => state.lister,
  );

  const [formData, setFormData] = useState<FormData>({
    companyName: "",
    companyLogo: "",
    bio: "",
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>("");

  // Load current lister data
  useEffect(() => {
    dispatch(fetchMyLister());
  }, [dispatch]);

  // Populate form when lister data is loaded
  useEffect(() => {
    if (currentLister) {
      setFormData({
        companyName: currentLister.companyName || "",
        companyLogo: currentLister.companyLogo || "",
        bio: currentLister.bio || "",
      });
      setLogoPreview(currentLister.companyLogo || "");
    }
  }, [currentLister]);

  // Clear error on unmount
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  // Validation
  const validateForm = useCallback((): boolean => {
    const errors: FormErrors = {};

    if (!formData.companyName.trim()) {
      errors.companyName = "Company name is required";
    } else if (formData.companyName.length < 2) {
      errors.companyName = "Company name must be at least 2 characters";
    } else if (formData.companyName.length > 100) {
      errors.companyName = "Company name must not exceed 100 characters";
    }

    if (formData.companyLogo && !isValidUrl(formData.companyLogo)) {
      errors.companyLogo = "Please enter a valid URL";
    }

    if (!formData.bio.trim()) {
      errors.bio = "Bio is required";
    } else if (formData.bio.length < 10) {
      errors.bio = "Bio must be at least 10 characters";
    } else if (formData.bio.length > 1000) {
      errors.bio = "Bio must not exceed 1000 characters";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Handle input changes
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));

      // Clear error for this field
      if (formErrors[name as keyof FormErrors]) {
        setFormErrors((prev) => ({ ...prev, [name]: undefined }));
      }

      // Update logo preview
      if (name === "companyLogo" && value && isValidUrl(value)) {
        setLogoPreview(value);
      }
    },
    [formErrors],
  );

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const updateData: Partial<FormData> = {};

      // Only send changed fields
      if (formData.companyName !== currentLister?.companyName) {
        updateData.companyName = formData.companyName;
      }
      if (formData.companyLogo !== currentLister?.companyLogo) {
        updateData.companyLogo = formData.companyLogo;
      }
      if (formData.bio !== currentLister?.bio) {
        updateData.bio = formData.bio;
      }

      // If nothing changed, don't make API call
      if (Object.keys(updateData).length === 0) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        setIsSubmitting(false);
        return;
      }

      await dispatch(updateLister(updateData)).unwrap();

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        router.push("/lister");
      }, 2000);
    } catch (err) {
      console.error("Failed to update profile:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = useCallback(() => {
    router.push("/lister");
  }, [router]);

  // Handle logo removal
  const handleRemoveLogo = useCallback(() => {
    setFormData((prev) => ({ ...prev, companyLogo: "" }));
    setLogoPreview("");
    setFormErrors((prev) => ({ ...prev, companyLogo: undefined }));
  }, []);

  // Loading state
  if (loading && !currentLister) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-[#FFE348] animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  // No lister found
  if (!currentLister) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            No Lister Profile Found
          </h2>
          <p className="text-gray-600 mb-6">
            You need to apply as a lister first.
          </p>
          <button
            onClick={() => router.push("/lister/apply")}
            className="px-6 py-3 bg-[#FFE348] hover:bg-yellow-600 font-medium rounded-lg transition-colors shadow-md"
          >
            Become a lister
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-40">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleCancel}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center space-x-3">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Edit Profile
                  </h1>
                  <p className="text-sm text-gray-500">
                    Update your company information
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Success Message */}
      {showSuccess && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-800 font-medium">
              Profile updated successfully! Redirecting...
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-800">{error}</p>
            </div>
            <button
              onClick={() => dispatch(clearError())}
              className="text-red-600 hover:text-red-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 sm:p-8">
              {/* Company Logo Section */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Company Logo
                </label>
                <div className="flex items-start space-x-6">
                  {/* Logo Preview */}
                  <div className="flex-shrink-0">
                    {logoPreview ? (
                      <div className="relative group">
                        <img
                          src={logoPreview}
                          alt="Company Logo"
                          className="w-32 h-32 rounded-2xl object-cover shadow-md border-2 border-yellow-200"
                          onError={() => setLogoPreview("")}
                        />
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-md border-2 border-yellow-200">
                        <ImageIcon className="w-12 h-12 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Logo URL Input */}
                  <div className="flex-1">
                    <input
                      type="url"
                      name="companyLogo"
                      value={formData.companyLogo}
                      onChange={handleChange}
                      placeholder="https://example.com/logo.png"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FFE348] focus:border-transparent transition-all ${
                        formErrors.companyLogo
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300"
                      }`}
                    />
                    {formErrors.companyLogo && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {formErrors.companyLogo}
                      </p>
                    )}
                    <p className="mt-2 text-sm text-gray-500">
                      Enter a direct URL to your company logo image
                    </p>
                  </div>
                </div>
              </div>

              {/* Company Name */}
              <div className="mb-6">
                <label
                  htmlFor="companyName"
                  className="block text-sm font-semibold text-gray-900 mb-2"
                >
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  maxLength={100}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FFE348] focus:border-transparent transition-all ${
                    formErrors.companyName
                      ? "border-red-300 bg-red-50"
                      : "border-gray-300"
                  }`}
                  placeholder="Enter your company name"
                />
                <div className="flex items-center justify-between mt-2">
                  {formErrors.companyName ? (
                    <p className="text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {formErrors.companyName}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">
                      The official name of your company or organization
                    </p>
                  )}
                  <span className="text-sm text-gray-400">
                    {formData.companyName.length}/100
                  </span>
                </div>
              </div>

              {/* Bio */}
              <div className="mb-6">
                <label
                  htmlFor="bio"
                  className="block text-sm font-semibold text-gray-900 mb-2"
                >
                  Company Bio <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={6}
                  maxLength={1000}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FFE348] focus:border-transparent transition-all resize-none ${
                    formErrors.bio
                      ? "border-red-300 bg-red-50"
                      : "border-gray-300"
                  }`}
                  placeholder="Tell people about your company and what you do..."
                />
                <div className="flex items-center justify-between mt-2">
                  {formErrors.bio ? (
                    <p className="text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {formErrors.bio}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Describe your company, mission, and what makes you unique
                    </p>
                  )}
                  <span className="text-sm text-gray-400">
                    {formData.bio.length}/1000
                  </span>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="bg-gray-50 px-6 sm:px-8 py-4 border-t border-gray-200 flex items-center justify-between">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting || updateLoading}
                className="px-6 py-3 border border-gray-300 cursor-pointer text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || updateLoading}
                className="px-6 py-3 bg-[#FFE348] hover:bg-yellow-300 cursor-pointer font-medium rounded-lg transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSubmitting || updateLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ListerEditProfile;
