/**
 * Push Notification Utility for Tixin PWA
 * Handles service worker registration, push subscription, and notification management
 */

// Remove /api/v1 from the base URL if it exists, we'll add it in each function
const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "https://api.tixin.in"
).replace(/\/api\/v1\/?$/, "");

/**
 * Check if push notifications are supported
 */
export function isPushNotificationSupported(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Check current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    console.warn("Notifications not supported");
    return "denied";
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Convert base64 VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Get VAPID public key from server
 */
async function getVapidPublicKey(): Promise<string> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/notification/vapid-public-key`,
    );
    const data = await response.json();
    return data.data.publicKey;
  } catch (error) {
    console.error("Error fetching VAPID public key:", error);
    throw error;
  }
}

/**
 * Register service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service Worker not supported");
    return null;
  }

  try {
    // Use different service worker for development vs production
    const swPath =
      process.env.NODE_ENV === "development" ? "/sw-dev.js" : "/sw.js";

    const registration = await navigator.serviceWorker.register(swPath, {
      scope: "/",
    });

    console.log(`Service Worker registered successfully (${swPath})`);
    return registration;
  } catch (error) {
    console.error("Service Worker registration failed:", error);
    return null;
  }
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(
  token: string,
): Promise<PushSubscription | null> {
  try {
    // Check if notifications are supported
    if (!isPushNotificationSupported()) {
      throw new Error("Push notifications are not supported");
    }

    // Request permission
    const permission = await requestNotificationPermission();
    if (permission !== "granted") {
      throw new Error("Notification permission denied");
    }

    // Register service worker
    const registration = await registerServiceWorker();
    if (!registration) {
      throw new Error("Service Worker registration failed");
    }

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;

    // Get VAPID public key
    const vapidPublicKey = await getVapidPublicKey();
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey,
    });

    // Send subscription to server
    const response = await fetch(
      `${API_BASE_URL}/api/v1/notification/subscribe`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subscription }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to save subscription on server");
    }

    console.log("Successfully subscribed to push notifications");
    return subscription;
  } catch (error) {
    console.error("Error subscribing to push notifications:", error);
    throw error;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(
  token: string,
): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      console.log("No active subscription found");
      return true;
    }

    // Unsubscribe from push manager
    const successful = await subscription.unsubscribe();

    if (successful) {
      // Notify server
      await fetch(`${API_BASE_URL}/api/v1/notification/unsubscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });

      console.log("Successfully unsubscribed from push notifications");
    }

    return successful;
  } catch (error) {
    console.error("Error unsubscribing from push notifications:", error);
    return false;
  }
}

/**
 * Check if user is currently subscribed
 */
export async function isSubscribed(): Promise<boolean> {
  try {
    if (!isPushNotificationSupported()) {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    return subscription !== null;
  } catch (error) {
    console.error("Error checking subscription status:", error);
    return false;
  }
}

/**
 * Get current push subscription
 */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  try {
    if (!isPushNotificationSupported()) {
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error("Error getting current subscription:", error);
    return null;
  }
}

/**
 * Send test notification
 */
export async function sendTestNotification(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/notification/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error("Error sending test notification:", error);
    return false;
  }
}

/**
 * Show local notification (for testing)
 */
export async function showLocalNotification(
  title: string,
  options?: NotificationOptions,
): Promise<void> {
  if (!("Notification" in window)) {
    console.warn("Notifications not supported");
    return;
  }

  if (Notification.permission === "granted") {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: "/logos/pwa-icon-192.png",
      badge: "/logos/pwa-icon-192.png",
      ...options,
    });
  }
}
