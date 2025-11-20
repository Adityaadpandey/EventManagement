/**
 * Timeout utilities for long-running operations
 */

import { ServiceUnavailableError } from "./errors";

/**
 * Wraps a promise with a timeout
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param errorMessage - Custom error message
 * @returns Promise that rejects if timeout is reached
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = "Operation timed out",
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new ServiceUnavailableError(errorMessage)),
        timeoutMs,
      ),
    ),
  ]);
};

/**
 * Retry a function with exponential backoff
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries
 * @param delayMs - Initial delay in milliseconds
 * @param backoffMultiplier - Multiplier for exponential backoff
 * @returns Promise with the result
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
  backoffMultiplier: number = 2,
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        const delay = delayMs * Math.pow(backoffMultiplier, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
};

/**
 * Combines timeout and retry logic
 * @param fn - Function to execute
 * @param timeoutMs - Timeout per attempt in milliseconds
 * @param maxRetries - Maximum number of retries
 * @returns Promise with the result
 */
export const withTimeoutAndRetry = async <T>(
  fn: () => Promise<T>,
  timeoutMs: number = 30000,
  maxRetries: number = 3,
): Promise<T> => {
  return withRetry(
    () => withTimeout(fn(), timeoutMs, "Operation timed out"),
    maxRetries,
  );
};
