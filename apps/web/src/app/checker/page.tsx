"use client";
import { Scanner } from "@yudiel/react-qr-scanner";
import axios from "axios";
import {
  AlertCircle,
  Camera,
  CheckCircle,
  ClipboardType,
  Loader2,
  Lock,
  LogOut,
  QrCode,
  RotateCcw,
  User,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ── Checker-specific axios instance (uses checker-auth header, not user JWT) ──
const makeCheckerApi = (token: string) =>
  axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    timeout: 15000,
    headers: {
      "Content-Type": "application/json",
      "checker-auth": `Bearer ${token}`,
    },
  });

// ── Types ──
type ScanResultData = {
  attendeeName: string;
  attendeeEmail?: string;
  attendeePhone?: string;
  ticketType: string;
  quantity: number;
  eventTitle: string;
  ticketId: string;
  alreadyCheckedIn?: boolean;
};

type HistoryItem = {
  scanId: string;
  scannedAt: string;
  success: boolean;
  action?: string;
  ticket?: {
    user?: { name?: string };
    ticketType?: { name?: string };
  };
};

const CHECKER_TOKEN_KEY = "checker-token";
const CHECKER_DATA_KEY = "checker-data";

const InfoCard = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <div className="bg-white/60 p-2.5 rounded-xl">
    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">
      {label}
    </p>
    <p className="text-sm font-medium text-gray-800 break-words">{value}</p>
  </div>
);

export default function QRScanner() {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState("");
  const [checkerData, setCheckerData] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Scanner state
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResultData | null>(null);
  const [scanError, setScanError] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  // New: input mode
  const [inputMode, setInputMode] = useState<"camera" | "manual">("camera");
  const [manualInput, setManualInput] = useState("");

  // New: reset flow
  const [resetting, setResetting] = useState(false);

  // New: scan history
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Checker axios instance ref (set after login)
  const checkerApiRef = useRef<ReturnType<typeof makeCheckerApi> | null>(null);

  // ── Persistence ──
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem(CHECKER_TOKEN_KEY);
      const savedData = localStorage.getItem(CHECKER_DATA_KEY);
      if (savedToken && savedData) {
        setToken(savedToken);
        setCheckerData(JSON.parse(savedData));
        checkerApiRef.current = makeCheckerApi(savedToken);
        setIsLoggedIn(true);
      }
    } catch {
      localStorage.removeItem(CHECKER_TOKEN_KEY);
      localStorage.removeItem(CHECKER_DATA_KEY);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  // ── History fetch ──
  const fetchHistory = useCallback(async () => {
    if (!checkerApiRef.current) return;
    setLoadingHistory(true);
    try {
      const res = await checkerApiRef.current.get(
        "/ticket-validation/history?limit=10&page=1",
      );
      setHistory(res.data?.data?.items ?? res.data?.data ?? []);
    } catch {
      // fail silently
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) fetchHistory();
  }, [isLoggedIn, fetchHistory]);

  // ── Login ──
  const handleLogin = async () => {
    if (!username || !password) {
      setLoginError("Please enter both username and password");
      return;
    }
    setLoginError("");
    setIsLoggingIn(true);
    try {
      // Login endpoint requires no special auth header
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/ticket-validation/checker/login`,
        { username, password },
        { headers: { "Content-Type": "application/json" } },
      );
      const data = res.data;
      if (data.status === "success") {
        const authToken = data.data.token;
        const checkerInfo = data.data.checker;
        checkerApiRef.current = makeCheckerApi(authToken);
        setToken(authToken);
        setCheckerData(checkerInfo);
        setIsLoggedIn(true);
        setLoginError("");
        localStorage.setItem(CHECKER_TOKEN_KEY, authToken);
        localStorage.setItem(CHECKER_DATA_KEY, JSON.stringify(checkerInfo));
      } else {
        setLoginError(data.message || "Login failed");
      }
    } catch {
      setLoginError("Network error. Please check your connection.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // ── Logout ──
  const handleLogout = () => {
    checkerApiRef.current = null;
    setIsLoggedIn(false);
    setToken("");
    setCheckerData(null);
    setUsername("");
    setPassword("");
    setScanResult(null);
    setScanError("");
    setScanning(false);
    setHistory([]);
    localStorage.removeItem(CHECKER_TOKEN_KEY);
    localStorage.removeItem(CHECKER_DATA_KEY);
  };

  // ── Core scan logic ──
  const performScan = useCallback(
    async (qrCode: string) => {
      if (!checkerApiRef.current || isScanning) return;
      setIsScanning(true);
      setScanError("");
      setScanResult(null);
      try {
        const res = await checkerApiRef.current.post(
          "/ticket-validation/scan",
          {
            qrCode,
          },
        );
        const data = res.data;
        if (data.status === "success") {
          setScanResult({ ...data.data, alreadyCheckedIn: false });
          setScanning(false);
          if (navigator.vibrate) navigator.vibrate(200);
          fetchHistory();
        } else {
          if (
            data.message?.toLowerCase().includes("token") ||
            data.message?.toLowerCase().includes("auth")
          ) {
            setScanError("Session expired. Logging out…");
            setTimeout(handleLogout, 2000);
          } else {
            setScanError(data.message || "Scan failed");
          }
        }
      } catch (e: any) {
        const status = e?.response?.status;
        const msg = e?.response?.data?.message || "";
        if (status === 401 || msg.toLowerCase().includes("token")) {
          setScanError("Session expired. Logging out…");
          setTimeout(handleLogout, 2000);
        } else if (status === 409 || msg.toLowerCase().includes("already")) {
          // Already checked in — try to surface ticket info from error response
          const d = e?.response?.data?.data;
          setScanResult({ ...(d ?? {}), alreadyCheckedIn: true });
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        } else {
          setScanError(
            e?.response?.data?.message || "Network error. Please try again.",
          );
        }
      } finally {
        setIsScanning(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isScanning, fetchHistory],
  );

  // ── Camera scan handler ──
  const handleCameraScan = useCallback(
    (result: any) => {
      if (result && result[0] && !isScanning) {
        performScan(result[0].rawValue);
      }
    },
    [isScanning, performScan],
  );

  // ── Manual scan handler ──
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    performScan(manualInput.trim());
    setManualInput("");
  };

  // ── Reset handler ──
  const handleReset = async (ticketId: string) => {
    if (!checkerApiRef.current) return;
    setResetting(true);
    try {
      await checkerApiRef.current.post(`/ticket-validation/reset/${ticketId}`);
      setScanResult(null);
      setScanError("");
      fetchHistory();
    } catch (e: any) {
      setScanError(e?.response?.data?.message || "Reset failed");
    } finally {
      setResetting(false);
    }
  };

  const handleError = () => {
    setScanError(
      "Camera access denied. Please enable permissions and refresh.",
    );
  };

  // ── Initializing ──
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#eff0fb] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <Loader2 className="w-10 h-10 text-[#FFE348] animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  // ── Login screen ──
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#eff0fb] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-50 rounded-full mb-4">
              <QrCode className="w-8 h-8 text-[#FFE348]" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Ticket Checker
            </h1>
            <p className="text-sm text-gray-500">
              Sign in to start scanning tickets
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-yellow-300 transition-all"
                  placeholder="Enter username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-yellow-300 transition-all"
                  placeholder="Enter password"
                />
              </div>
            </div>

            {loginError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {loginError}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full bg-[#FFE348] hover:bg-yellow-400 disabled:opacity-60 text-gray-900 font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {isLoggingIn ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              {isLoggingIn ? "Signing in…" : "Sign In"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Scanner screen ──
  return (
    <div className="min-h-screen bg-[#eff0fb] p-3 pb-8">
      <div className="max-w-md mx-auto space-y-3">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Event</p>
            <h2 className="font-semibold text-gray-900 text-sm leading-tight">
              {checkerData?.event?.title ?? "–"}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Checker:{" "}
              <span className="font-medium text-gray-600">
                {checkerData?.username}
              </span>
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-xl transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5">
          <button
            onClick={() => {
              setInputMode("camera");
              setScanResult(null);
              setScanError("");
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-colors ${
              inputMode === "camera"
                ? "bg-[#FFE348] text-gray-900"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <Camera className="w-4 h-4" />
            Camera
          </button>
          <button
            onClick={() => {
              setInputMode("manual");
              setScanning(false);
              setScanResult(null);
              setScanError("");
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-colors ${
              inputMode === "manual"
                ? "bg-[#FFE348] text-gray-900"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <ClipboardType className="w-4 h-4" />
            Manual
          </button>
        </div>

        {/* Camera scanner */}
        {inputMode === "camera" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="relative w-full h-64 bg-gray-900 rounded-xl overflow-hidden mb-4">
              {scanning ? (
                <>
                  <Scanner
                    onScan={handleCameraScan}
                    onError={handleError}
                    constraints={{ facingMode: "environment" }}
                    styles={{ container: { width: "100%", height: "100%" } }}
                  />
                  {isScanning && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 className="w-10 h-10 text-white animate-spin" />
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                  <Camera className="w-10 h-10 opacity-30" />
                  <p className="text-xs opacity-40">
                    Tap below to start camera
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={() =>
                scanning
                  ? setScanning(false)
                  : (() => {
                      setScanResult(null);
                      setScanError("");
                      setScanning(true);
                    })()
              }
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${
                scanning
                  ? "bg-red-100 hover:bg-red-200 text-red-600"
                  : "bg-[#FFE348] hover:bg-yellow-400 text-gray-900"
              }`}
            >
              {scanning ? "Stop Scanning" : "Start Scanning"}
            </button>
          </div>
        )}

        {/* Manual input */}
        {inputMode === "manual" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm font-medium text-gray-700 mb-3">
              Enter Ticket ID
            </p>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Paste or type ticket QR value…"
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition-all"
                autoFocus
              />
              <button
                type="submit"
                disabled={isScanning || !manualInput.trim()}
                className="px-4 py-3 bg-[#FFE348] hover:bg-yellow-400 disabled:opacity-60 text-gray-900 font-semibold rounded-xl text-sm transition-colors flex items-center gap-1.5 shrink-0"
              >
                {isScanning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Check In"
                )}
              </button>
            </form>
          </div>
        )}

        {/* Scan result */}
        {scanResult && (
          <div
            className={`rounded-2xl border p-4 space-y-2 ${
              scanResult.alreadyCheckedIn
                ? "bg-red-50 border-red-200"
                : "bg-emerald-50 border-emerald-200"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {scanResult.alreadyCheckedIn ? (
                <XCircle className="w-5 h-5 text-red-500 shrink-0" />
              ) : (
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              )}
              <span
                className={`font-semibold text-sm ${scanResult.alreadyCheckedIn ? "text-red-700" : "text-emerald-700"}`}
              >
                {scanResult.alreadyCheckedIn
                  ? "Already Checked In"
                  : "Check-In Successful"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {scanResult.attendeeName && (
                <InfoCard label="Attendee" value={scanResult.attendeeName} />
              )}
              {scanResult.ticketType && (
                <InfoCard label="Ticket Type" value={scanResult.ticketType} />
              )}
              {scanResult.quantity != null && (
                <InfoCard label="Quantity" value={scanResult.quantity} />
              )}
              {scanResult.eventTitle && (
                <InfoCard label="Event" value={scanResult.eventTitle} />
              )}
            </div>
            {scanResult.attendeeEmail && (
              <InfoCard label="Email" value={scanResult.attendeeEmail} />
            )}

            {scanResult.alreadyCheckedIn && scanResult.ticketId && (
              <button
                onClick={() => handleReset(scanResult.ticketId)}
                disabled={resetting}
                className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-red-200 hover:bg-red-50 text-red-600 text-sm font-medium rounded-xl transition-colors"
              >
                {resetting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                {resetting ? "Undoing…" : "Undo Check-In"}
              </button>
            )}
          </div>
        )}

        {/* Error banner */}
        {scanError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {scanError}
          </div>
        )}

        {/* Recent scans */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Recent Scans
          </h3>
          {loadingHistory ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">
              No scans yet
            </p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {history.map((item, i) => (
                <li
                  key={item.scanId ?? i}
                  className="flex items-center justify-between py-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${item.success ? "bg-emerald-400" : "bg-red-400"}`}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800 leading-tight">
                        {item.ticket?.user?.name ?? "Unknown"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {item.ticket?.ticketType?.name ?? "–"}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 ml-2">
                    {new Date(item.scannedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
