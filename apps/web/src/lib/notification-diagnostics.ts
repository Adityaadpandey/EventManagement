/**
 * Notification Diagnostics Utility
 * Comprehensive diagnostics for debugging push notification setup issues
 */

export interface DiagnosticResults {
  https: boolean;
  serviceWorkerSupport: boolean;
  pushManagerSupport: boolean;
  notificationSupport: boolean;
  permission: NotificationPermission | "unsupported";
  serviceWorkerRegistration: {
    active: boolean;
    installing: boolean;
    waiting: boolean;
    scope?: string;
  } | null;
  pushSubscription: {
    endpoint: string;
    hasKeys: boolean;
  } | null;
  vapidKey: {
    received: boolean;
    length: number;
    startsWithB: boolean;
  } | null;
  errors: string[];
}

export async function diagnoseNotificationSetup(): Promise<DiagnosticResults> {
  const results: DiagnosticResults = {
    https: window.location.protocol === "https:",
    serviceWorkerSupport: "serviceWorker" in navigator,
    pushManagerSupport: "PushManager" in window,
    notificationSupport: "Notification" in window,
    permission:
      "Notification" in window ? Notification.permission : "unsupported",
    serviceWorkerRegistration: null,
    pushSubscription: null,
    vapidKey: null,
    errors: [],
  };

  try {
    // Check service worker
    if (results.serviceWorkerSupport) {
      const reg = await navigator.serviceWorker.getRegistration();
      results.serviceWorkerRegistration = {
        active: !!reg?.active,
        installing: !!reg?.installing,
        waiting: !!reg?.waiting,
        scope: reg?.scope,
      };

      // Check existing subscription
      if (reg && results.pushManagerSupport) {
        try {
          const sub = await reg.pushManager.getSubscription();
          results.pushSubscription = sub
            ? {
                endpoint: sub.endpoint,
                hasKeys: !!sub.options?.applicationServerKey,
              }
            : null;
        } catch (err: any) {
          results.errors.push(`Push subscription check failed: ${err.message}`);
        }
      }
    }

    // Try to fetch VAPID key
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/notification/vapid-public-key`,
      );
      if (response.ok) {
        const data = await response.json();
        results.vapidKey = {
          received: true,
          length: data.data?.publicKey?.length || 0,
          startsWithB: data.data?.publicKey?.startsWith("B") || false,
        };
      } else {
        results.errors.push(`VAPID key fetch failed: ${response.status}`);
      }
    } catch (err: any) {
      results.errors.push(`VAPID key fetch error: ${err.message}`);
    }
  } catch (err: any) {
    results.errors.push(`Diagnostic error: ${err.message}`);
  }

  return results;
}

export function formatDiagnostics(results: DiagnosticResults): string {
  return `
🔍 Notification Setup Diagnostics
================================

Environment:
- HTTPS: ${results.https ? "✅" : "❌ REQUIRED"}
- Service Worker Support: ${results.serviceWorkerSupport ? "✅" : "❌"}
- Push Manager Support: ${results.pushManagerSupport ? "✅" : "❌"}
- Notification API Support: ${results.notificationSupport ? "✅" : "❌"}

Permission:
- Status: ${results.permission}
- Granted: ${results.permission === "granted" ? "✅" : results.permission === "denied" ? "❌ BLOCKED" : "⚠️ NOT REQUESTED"}

Service Worker:
- Active: ${results.serviceWorkerRegistration?.active ? "✅" : "❌"}
- Installing: ${results.serviceWorkerRegistration?.installing ? "Yes" : "No"}
- Waiting: ${results.serviceWorkerRegistration?.waiting ? "Yes" : "No"}
- Scope: ${results.serviceWorkerRegistration?.scope || "N/A"}

Current Subscription:
- Subscribed: ${results.pushSubscription ? "✅" : "❌"}
- Endpoint: ${results.pushSubscription?.endpoint ? "Present" : "None"}
- Has Keys: ${results.pushSubscription?.hasKeys ? "✅" : "N/A"}

VAPID Key:
- Received: ${results.vapidKey?.received ? "✅" : "❌"}
- Length: ${results.vapidKey?.length || 0} chars
- Valid Format: ${results.vapidKey?.length === 87 && results.vapidKey?.startsWithB ? "✅" : "❌"}

Errors:
${results.errors.length > 0 ? results.errors.map((e: string) => `- ${e}`).join("\n") : "- None"}

Next Steps:
${!results.https ? "❌ Enable HTTPS (required for push notifications)\n" : ""}${results.permission === "denied" ? "❌ Reset notification permission in browser settings\n" : ""}${!results.serviceWorkerRegistration?.active ? "❌ Service worker not active - check console for errors\n" : ""}${results.vapidKey?.length !== 87 ? "❌ VAPID key invalid - regenerate keys\n" : ""}${results.errors.length > 0 ? "❌ Fix errors listed above\n" : ""}${results.https && results.serviceWorkerRegistration?.active && results.permission === "granted" && results.vapidKey?.length === 87 ? "✅ Setup looks good - check browser console for specific errors\n" : ""}
`.trim();
}
