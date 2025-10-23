import React, { useState, useCallback, useRef, useEffect } from "react";
import { Upload, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface ImageUploadProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  aspectRatio?: "horizontal" | "vertical" | "square";
  required?: boolean;
  maxSizeMB?: number;
  disabled?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  label,
  value,
  onChange,
  aspectRatio = "horizontal",
  required = false,
  maxSizeMB = 5,
  disabled = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string>(value);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Cloudinary config
  const CLOUD_NAME =
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dbcbvxuyk";
  const UPLOAD_PRESET =
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ml_default";

  // Sync preview with value prop
  useEffect(() => {
    setPreview(value);
  }, [value]);

  // Aspect ratio configurations
  const aspectRatios = {
    horizontal: {
      padding: "56.25%",
      recommended: "1920×1080",
      ratio: "16:9",
    },
    vertical: {
      padding: "150%",
      recommended: "1080×1920",
      ratio: "2:3",
    },
    square: {
      padding: "100%",
      recommended: "1080×1080",
      ratio: "1:1",
    },
  };

  const currentRatio = aspectRatios[aspectRatio];

  // Optimized image compression with quality tiers
  const compressImage = useCallback(
    (file: File, quality = 0.85): Promise<Blob> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
          const img = new Image();
          img.src = e.target?.result as string;

          img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d", { alpha: false });

            if (!ctx) {
              reject(new Error("Failed to get canvas context"));
              return;
            }

            // Smart resizing based on aspect ratio
            let { width, height } = img;
            const maxDimension = aspectRatio === "vertical" ? 1920 : 2560;

            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = (height * maxDimension) / width;
                width = maxDimension;
              } else {
                width = (width * maxDimension) / height;
                height = maxDimension;
              }
            }

            canvas.width = width;
            canvas.height = height;

            // Enable image smoothing for better quality
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";

            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
              (blob) => {
                if (blob) {
                  resolve(blob);
                } else {
                  reject(new Error("Compression failed"));
                }
              },
              "image/jpeg",
              quality,
            );
          };

          img.onerror = () => reject(new Error("Invalid image file"));
        };

        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
    },
    [aspectRatio],
  );

  // Upload with retry logic
  const uploadToCloudinary = useCallback(
    async (file: File, retries = 2): Promise<string> => {
      if (!CLOUD_NAME || !UPLOAD_PRESET) {
        throw new Error("Cloudinary not configured");
      }

      const maxSize = maxSizeMB * 1024 * 1024;

      // Validate file type first
      const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
      if (!validTypes.includes(file.type)) {
        throw new Error("Invalid file type. Use JPG, PNG, or WebP");
      }

      // Compress image
      setUploadProgress(20);
      let compressedBlob = await compressImage(file);

      // If still too large, compress more aggressively
      if (compressedBlob.size > maxSize) {
        setUploadProgress(35);
        compressedBlob = await compressImage(file, 0.7);

        if (compressedBlob.size > maxSize) {
          throw new Error(
            `File too large. Max ${maxSizeMB}MB after compression`,
          );
        }
      }

      setUploadProgress(50);

      // Prepare upload
      const formData = new FormData();
      formData.append("file", compressedBlob, file.name);
      formData.append("upload_preset", UPLOAD_PRESET);
      formData.append("folder", "uploads");
      // formData.append("transformation", "q_auto,f_auto");

      // Upload with retry
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          setUploadProgress(50 + attempt * 15);

          const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
            {
              method: "POST",
              body: formData,
            },
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || "Upload failed");
          }

          setUploadProgress(90);
          const data = await response.json();
          setUploadProgress(100);

          return data.secure_url;
        } catch (err) {
          if (attempt === retries) throw err;
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * (attempt + 1)),
          );
        }
      }

      throw new Error("Upload failed after retries");
    },
    [CLOUD_NAME, UPLOAD_PRESET, maxSizeMB, compressImage],
  );

  // Handle file processing
  const processFile = useCallback(
    async (file: File) => {
      if (disabled) return;

      setError(null);
      setUploading(true);
      setUploadProgress(0);
      setShowSuccess(false);

      try {
        const url = await uploadToCloudinary(file);
        setPreview(url);
        onChange(url);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } catch (err: any) {
        setError(err.message || "Upload failed. Please try again");
        console.error("Upload error:", err);
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [disabled, uploadToCloudinary, onChange],
  );

  // File input handler
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  // Drag and drop handlers with counter for nested elements
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounterRef.current = 0;

      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  // Remove image
  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setPreview("");
      onChange("");
      setError(null);
      setShowSuccess(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [onChange],
  );

  // Click to upload
  const handleClick = useCallback(() => {
    if (!disabled && !uploading && !preview) {
      fileInputRef.current?.click();
    }
  }, [disabled, uploading, preview]);

  return (
    <div className="w-full">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="2"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx="8.5"
            cy="8.5"
            r="1.5"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M21 15l-5-5L5 21"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>

      <div
        className={`
          relative border-2 border-dashed rounded-xl overflow-hidden transition-all duration-200
          ${isDragging && !disabled ? "border-blue-500 bg-blue-50 scale-[1.02]" : "border-gray-300"}
          ${!preview && !disabled ? "hover:border-gray-400 hover:bg-gray-50" : ""}
          ${disabled ? "opacity-60 cursor-not-allowed" : ""}
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div
          style={{ paddingBottom: currentRatio.padding, position: "relative" }}
        >
          {preview ? (
            // Preview state
            <div className="absolute inset-0 group">
              <img
                src={preview.replace("/upload/", "/upload/q_auto,f_auto/")}
                alt={label}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || uploading}
                    className="px-4 py-2 bg-white/90 hover:bg-white text-gray-900 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={handleRemove}
                    disabled={disabled || uploading}
                    className="px-4 py-2 bg-red-500/90 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              </div>

              {showSuccess && (
                <div className="absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Uploaded!</span>
                </div>
              )}
            </div>
          ) : (
            // Upload state
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center p-6 ${
                !disabled && !uploading ? "cursor-pointer" : ""
              }`}
              onClick={handleClick}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-600">
                        {uploadProgress}%
                      </span>
                    </div>
                  </div>
                  <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 font-medium">
                    {uploadProgress < 50 ? "Compressing..." : "Uploading..."}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Upload className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-base font-medium text-gray-700 mb-1">
                    {isDragging ? "Drop image here" : "Click or drag to upload"}
                  </p>
                  <p className="text-sm text-gray-500 mb-3">
                    Max {maxSizeMB}MB • JPG, PNG, WebP
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <div className="px-2 py-1 bg-gray-100 rounded">
                      {currentRatio.ratio}
                    </div>
                    <span>•</span>
                    <span>Recommended: {currentRatio.recommended}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          disabled={disabled || uploading}
          className="hidden"
          aria-label={label}
        />
      </div>

      {error && (
        <div className="mt-2 flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
