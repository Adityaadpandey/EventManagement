"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const PWA_DISMISS_KEY = "tixin:pwa:dismissedAt_v2";
const DISMISS_MS_DEFAULT = 7 * 24 * 60 * 60 * 1000;
const UNINSTALL_COOLDOWN_MS = 24 * 60 * 60 * 1000;

interface Props {
  dismissTimeout?: number;
  showHintOnIOS?: boolean;
}

export default function PwaPrompt({
  dismissTimeout = DISMISS_MS_DEFAULT,
  showHintOnIOS = false,
}: Props) {
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const mountedRef = useRef(true);
  const [visible, setVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  const isAppInstalled = useCallback(async (): Promise<boolean> => {
    try {
      // Basic checks
      if (
        window.matchMedia &&
        window.matchMedia("(display-mode: standalone)").matches
      )
        return true;
      // @ts-ignore
      if ((navigator as any).standalone) return true;

      // @ts-ignore
      if ("getInstalledRelatedApps" in navigator) {
        // @ts-ignore
        const related = await navigator.getInstalledRelatedApps();
        if (Array.isArray(related) && related.length > 0) return true;
      }
    } catch {
      // ignore failures
    }
    return false;
  }, []);

  const wasRecentlyDismissed = useCallback(() => {
    try {
      const raw = localStorage.getItem(PWA_DISMISS_KEY);
      if (!raw) return false;
      const ts = parseInt(raw, 10);
      if (Number.isNaN(ts)) return false;
      return Date.now() - ts < dismissTimeout;
    } catch {
      return false;
    }
  }, [dismissTimeout]);

  const clearDismissIfUninstalled = useCallback(async (installed: boolean) => {
    try {
      const raw = localStorage.getItem(PWA_DISMISS_KEY);
      if (!raw) return;
      const ts = parseInt(raw, 10);
      if (Number.isNaN(ts)) {
        localStorage.removeItem(PWA_DISMISS_KEY);
        return;
      }
      if (!installed && Date.now() - ts > UNINSTALL_COOLDOWN_MS) {
        localStorage.removeItem(PWA_DISMISS_KEY);
      }
    } catch {
      // ignore
    }
  }, []);

  const evaluateShow = useCallback(async () => {
    if (!mountedRef.current) return;
    const installed = await isAppInstalled();
    setIsInstalled(installed);

    await clearDismissIfUninstalled(installed);

    if (installed) {
      setVisible(false);
      return;
    }

    if (wasRecentlyDismissed()) {
      setVisible(false);
      return;
    }

    if (deferredRef.current) {
      setVisible(true);
      return;
    }

    if (showHintOnIOS && isIOS) {
      setVisible(false);
      return;
    }

    setVisible(false);
  }, [
    isAppInstalled,
    wasRecentlyDismissed,
    clearDismissIfUninstalled,
    isIOS,
    showHintOnIOS,
  ]);

  // Mount/unmount
  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      // detect iOS quickly
      const ua =
        typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
      setIsIOS(/\b(iPad|iPhone|iPod)\b/.test(ua) && !window.MSStream);
      // initial evaluation
      await evaluateShow();
    })();

    return () => {
      mountedRef.current = false;
    };
  }, [evaluateShow]);

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      try {
        e.preventDefault();
      } catch {
        // some browsers don't allow preventDefault
      }
      deferredRef.current = e as BeforeInstallPromptEvent;
      evaluateShow();
    };

    const onAppInstalled = async () => {
      deferredRef.current = null;
      localStorage.removeItem(PWA_DISMISS_KEY);
      setIsInstalled(true);
      setVisible(false);
    };

    const onVisibilityChange = () => {
      evaluateShow();
    };

    const onFocus = () => {
      evaluateShow();
    };

    window.addEventListener(
      "beforeinstallprompt",
      onBeforeInstallPrompt as EventListener,
    );
    window.addEventListener("appinstalled", onAppInstalled as EventListener);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);

    const pollId = window.setTimeout(() => {
      evaluateShow();
    }, 1200);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        onBeforeInstallPrompt as EventListener,
      );
      window.removeEventListener(
        "appinstalled",
        onAppInstalled as EventListener,
      );
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
      window.clearTimeout(pollId);
    };
  }, [evaluateShow]);

  const handleInstall = useCallback(async () => {
    const promptEvent = deferredRef.current;
    if (!promptEvent) {
      localStorage.setItem(PWA_DISMISS_KEY, String(Date.now()));
      setVisible(false);
      return;
    }
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice && choice.outcome === "accepted") {
        deferredRef.current = null;
        localStorage.removeItem(PWA_DISMISS_KEY);
        setVisible(false);
        setIsInstalled(true);
      } else {
        localStorage.setItem(PWA_DISMISS_KEY, String(Date.now()));
        setVisible(false);
      }
    } catch (err) {
      localStorage.setItem(PWA_DISMISS_KEY, String(Date.now()));
      setVisible(false);
      deferredRef.current = null;
      console.error("PWA prompt error", err);
    }
  }, []);

  const handleNotNow = useCallback(() => {
    localStorage.setItem(PWA_DISMISS_KEY, String(Date.now()));
    setVisible(false);
  }, []);

  const handleClose = useCallback(() => {
    handleNotNow();
  }, [handleNotNow]);

  return (
    <AnimatePresence>
      {visible && !isInstalled && (
        <motion.div
          initial={{ y: -120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 360, damping: 25, delay: 1 }}
          className="fixed left-0 right-0 top-4 z-50 px-4 pointer-events-auto md:hidden"
          role="dialog"
          aria-label="Install Tixin"
        >
          <div className="relative rounded-2xl overflow-hidden border max-w-2xl w-fit mx-auto bg-[linear-gradient(145deg,rgba(0,0,0,0.9)_0%,rgba(34,34,34,0.85)_40%,rgba(255,227,72,0.15)_100%)] backdrop-blur-xl shadow-[0_4px_24px_rgba(255,227,72,0.15),0_0_12px_rgba(255,227,72,0.1)] transition-all duration-300">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,227,72,0.25),transparent_70%)] pointer-events-none" />
            <div className="relative flex flex-col gap-2 px-4 py-3 z-10">
              <div className="flex items-start gap-3">
                <img
                  src="/logos/roundedLogo.svg"
                  alt="Tixin"
                  className="w-12 h-12 rounded-md flex-shrink-0"
                />

                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Install{" "}
                      <span className="text-yellow-300 !text-lg">Tixin</span> on
                      your device
                    </p>
                    <p className="mt-1 text-xs text-gray-200">
                      Enjoy quicker access, and a seamless app-like experience.
                    </p>
                  </div>

                  <button
                    onClick={handleClose}
                    aria-label="Close install prompt"
                    className="ml-2 p-2 rounded-md hover:bg-white/10 text-gray-400 hover:text-yellow-300 transition"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="mt-3 flex gap-3">
                <button
                  onClick={handleNotNow}
                  className="px-4 py-2 rounded-lg text-sm bg-white/5 text-gray-200 hover:bg-white/10 border border-white/10 transition-all duration-200 cursor-pointer"
                >
                  Not now
                </button>

                <button
                  onClick={handleInstall}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg cursor-pointer bg-gradient-to-r from-white to-yellow-50 text-black text-sm font-semibold shadow-[0_2px_12px_rgba(255,227,72,0.4)] hover:shadow-[0_4px_16px_rgba(255,227,72,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                  aria-label="Install Tixin"
                >
                  <Download className="w-4 h-4" />
                  Install
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
