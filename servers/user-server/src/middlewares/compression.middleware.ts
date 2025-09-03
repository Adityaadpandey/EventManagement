// middlewares/compression.middleware.ts
import compression from "compression";
import type { Request, Response } from "express";
import { constants as zlibConstants } from "zlib";
import logger from "../config/logger";

// Enhanced compression middleware with performance optimizations
export const compressionMiddleware = compression({
  // Custom filter function
  filter: (req: Request, res: Response) => {
    // Don't compress if client explicitly says no
    if (req.headers["x-no-compression"]) {
      return false;
    }

    // Don't compress responses with Cache-Control: no-transform
    if (res.get("Cache-Control")?.includes("no-transform")) {
      return false;
    }

    // Don't compress already compressed content
    const contentEncoding = res.get("Content-Encoding");
    if (contentEncoding && contentEncoding !== "identity") {
      return false;
    }

    // Use default compression filter for other cases
    return compression.filter(req, res);
  },

  // Compression level (1-9, where 6 is good balance of speed vs compression)
  level: 6,

  // Only compress responses larger than 1KB
  threshold: 1024,

  // Memory level (1-9, affects memory usage during compression)
  // 8 is a good balance for your 4GB server
  memLevel: 8,
  // Compression strategy
  strategy: zlibConstants.Z_DEFAULT_STRATEGY,

  // Chunk size for streaming compression
  chunkSize: 16 * 1024, // 16KB chunks

  // Window size (affects compression ratio vs memory usage)
  windowBits: 15,
});

// Specialized compression for different content types
export const createCompressionMiddleware = (options: {
  level?: number;
  threshold?: number;
  contentTypes?: string[];
}) => {
  const { level = 6, threshold = 1024, contentTypes } = options;

  return compression({
    filter: (req: Request, res: Response) => {
      // Skip compression based on custom logic
      if (req.headers["x-no-compression"]) {
        return false;
      }

      // If specific content types are specified, only compress those
      if (contentTypes) {
        const contentType = res.get("Content-Type");
        if (
          !contentType ||
          !contentTypes.some((type) => contentType.includes(type))
        ) {
          return false;
        }
      }

      return compression.filter(req, res);
    },
    level,
    threshold,
    memLevel: 8,
  });
};

// High compression for static/cached content
export const highCompressionMiddleware = createCompressionMiddleware({
  level: 9, // Maximum compression
  threshold: 512, // Compress smaller files too
  contentTypes: [
    "application/json",
    "text/html",
    "text/css",
    "application/javascript",
  ],
});

// Fast compression for real-time content
export const fastCompressionMiddleware = createCompressionMiddleware({
  level: 1, // Fastest compression
  threshold: 2048, // Only compress larger responses
});

// Compression with performance monitoring
export const monitoredCompressionMiddleware = (
  req: Request,
  res: Response,
  next: any,
) => {
  const startTime = process.hrtime.bigint();
  let originalSize = 0;
  let compressedSize = 0;

  // Intercept the end event to measure compression
  const originalEnd = res.end;
  res.end = function (chunk?: any, encoding?: any) {
    if (chunk) {
      originalSize += Buffer.isBuffer(chunk)
        ? chunk.length
        : Buffer.byteLength(chunk, encoding);
    }

    const endTime = process.hrtime.bigint();
    const compressionTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

    // Log compression stats for slow compressions or large files
    if (compressionTime > 100 || originalSize > 100000) {
      // 100ms or 100KB
      const compressionRatio =
        compressedSize > 0
          ? (((originalSize - compressedSize) / originalSize) * 100).toFixed(1)
          : "N/A";

      logger.debug("Compression stats:", {
        url: req.url,
        method: req.method,
        originalSize: `${(originalSize / 1024).toFixed(1)}KB`,
        compressedSize:
          compressedSize > 0
            ? `${(compressedSize / 1024).toFixed(1)}KB`
            : "N/A",
        compressionRatio: `${compressionRatio}%`,
        compressionTime: `${compressionTime.toFixed(1)}ms`,
        contentType: res.get("Content-Type"),
      });
    }

    return originalEnd.call(this, chunk, encoding);
  };

  // Track compressed size
  const originalWrite = res.write;
  res.write = function (chunk: any, encoding?: any) {
    if (chunk && res.get("Content-Encoding")) {
      compressedSize += Buffer.isBuffer(chunk)
        ? chunk.length
        : Buffer.byteLength(chunk, encoding);
    }
    return originalWrite.call(this, chunk, encoding);
  };

  // Apply compression
  compressionMiddleware(req, res, next);
};
