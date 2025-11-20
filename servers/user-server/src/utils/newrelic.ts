/**
 * New Relic custom instrumentation helpers
 */

let newrelic: any = null;

// Only load New Relic if license key is present
if (process.env.NEW_RELIC_LICENSE_KEY) {
  try {
    newrelic = require("newrelic");
  } catch (error) {
    console.warn("New Relic not available:", error);
  }
}

/**
 * Record a custom event in New Relic
 */
export const recordCustomEvent = (
  eventType: string,
  attributes: Record<string, any>,
) => {
  if (!newrelic) return;

  try {
    newrelic.recordCustomEvent(eventType, attributes);
  } catch (error) {
    console.error("Failed to record custom event:", error);
  }
};

/**
 * Record a custom metric in New Relic
 */
export const recordMetric = (name: string, value: number) => {
  if (!newrelic) return;

  try {
    newrelic.recordMetric(name, value);
  } catch (error) {
    console.error("Failed to record metric:", error);
  }
};

/**
 * Add custom attributes to the current transaction
 */
export const addCustomAttributes = (attributes: Record<string, any>) => {
  if (!newrelic) return;

  try {
    for (const [key, value] of Object.entries(attributes)) {
      newrelic.addCustomAttribute(key, value);
    }
  } catch (error) {
    console.error("Failed to add custom attributes:", error);
  }
};

/**
 * Notice an error in New Relic
 */
export const noticeError = (
  error: Error,
  customAttributes?: Record<string, any>,
) => {
  if (!newrelic) return;

  try {
    newrelic.noticeError(error, customAttributes);
  } catch (err) {
    console.error("Failed to notice error:", err);
  }
};

/**
 * Set the name of the current transaction
 */
export const setTransactionName = (name: string) => {
  if (!newrelic) return;

  try {
    newrelic.setTransactionName(name);
  } catch (error) {
    console.error("Failed to set transaction name:", error);
  }
};

/**
 * Start a custom segment (for timing specific operations)
 */
export const startSegment = (
  name: string,
  record: boolean,
  handler: () => any,
) => {
  if (!newrelic) {
    return handler();
  }

  try {
    return newrelic.startSegment(name, record, handler);
  } catch (error) {
    console.error("Failed to start segment:", error);
    return handler();
  }
};

/**
 * Get the current transaction
 */
export const getTransaction = () => {
  if (!newrelic) return null;

  try {
    return newrelic.getTransaction();
  } catch (error) {
    console.error("Failed to get transaction:", error);
    return null;
  }
};

/**
 * Ignore the current transaction (won't be reported to New Relic)
 */
export const ignoreTransaction = () => {
  if (!newrelic) return;

  try {
    const transaction = newrelic.getTransaction();
    if (transaction) {
      transaction.ignore();
    }
  } catch (error) {
    console.error("Failed to ignore transaction:", error);
  }
};

/**
 * Check if New Relic is available
 */
export const isNewRelicAvailable = (): boolean => {
  return newrelic !== null;
};

export default newrelic;
