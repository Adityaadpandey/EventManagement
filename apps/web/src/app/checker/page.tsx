"use client";
import { Scanner } from "@yudiel/react-qr-scanner";
import api from "@/lib/api";
import {
  AlertCircle,
  Camera,
  CheckCircle,
  Loader2,
  Lock,
  LogOut,
  QrCode,
  User,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const InfoCard = ({ label, value }) => (
  <div className="bg-white p-3 rounded-md shadow-sm">
    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">
      {label}
    </p>
    <p className="text-sm font-medium text-gray-800 break-words">{value}</p>
  </div>
);

const CHECKER_TOKEN_KEY = "checker-token";
const CHECKER_DATA_KEY = "checker-data";

export default function QRScanner() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState("");
  const [checkerData, setCheckerData] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  // Load saved auth data on mount
  useEffect(() => {
    const loadSavedAuth = () => {
      try {
        const savedToken = localStorage.getItem(CHECKER_TOKEN_KEY);
        const savedCheckerData = localStorage.getItem(CHECKER_DATA_KEY);

        if (savedToken && savedCheckerData) {
          setToken(savedToken);
          setCheckerData(JSON.parse(savedCheckerData));
          setIsLoggedIn(true);
        }
      } catch (error) {
        console.error("Error loading saved auth:", error);
        // Clear corrupted data
        localStorage.removeItem(CHECKER_TOKEN_KEY);
        localStorage.removeItem(CHECKER_DATA_KEY);
      } finally {
        setIsInitializing(false);
      }
    };

    loadSavedAuth();
  }, []);

  // Save auth data to localStorage
  const saveAuthData = (authToken, checkerInfo) => {
    try {
      localStorage.setItem(CHECKER_TOKEN_KEY, authToken);
      localStorage.setItem(CHECKER_DATA_KEY, JSON.stringify(checkerInfo));
    } catch (error) {
      console.error("Error saving auth data:", error);
    }
  };

  // Clear auth data from localStorage
  const clearAuthData = () => {
    try {
      localStorage.removeItem(CHECKER_TOKEN_KEY);
      localStorage.removeItem(CHECKER_DATA_KEY);
    } catch (error) {
      console.error("Error clearing auth data:", error);
    }
  };

  // Login handler
  const handleLogin = async () => {
    if (!username || !password) {
      setLoginError("Please enter both username and password");
      return;
    }

    setLoginError("");
    setIsLoggingIn(true);

    try {
      const res = await api.post("/ticket-validation/checker/login", {
        username,
        password,
      });

      const data = res.data;

      if (data.status === "success") {
        console.log("Login successful:");
        const authToken = data.data.token;
        const checkerInfo = data.data.checker;

        setToken(authToken);
        setCheckerData(checkerInfo);
        setIsLoggedIn(true);
        setLoginError("");

        // Save to localStorage
        saveAuthData(authToken, checkerInfo);
      } else {
        setLoginError(data.message || "Login failed");
      }
    } catch (error) {
      setLoginError("Network error. Please check your connection.");
      console.error("Login error:", error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    setIsLoggedIn(false);
    setToken("");
    setCheckerData(null);
    setUsername("");
    setPassword("");
    setScanResult(null);
    setScanning(false);

    // Clear localStorage
    clearAuthData();
  };

  // Memoized QR Scan handler
  const handleScan = useCallback(
    async (result) => {
      if (result && result[0] && !isScanning) {
        const qrCode = result[0].rawValue;
        setIsScanning(true);
        setScanError("");

        try {
          console.log("Scanned QR Code:", qrCode);
          const res = await api.post(
            "/ticket-validation/scan",
            { qrCode },
            {
              headers: {
                "checker-auth": `Bearer ${token}`,
              },
            },
          );

          const data = res.data;

          if (data.status === "success") {
            setScanResult(data.data);
            setScanning(false);
            // Optional: Add haptic feedback for mobile success
            if (navigator.vibrate) navigator.vibrate(200);
          } else {
            // Handle token expiration
            if (
              data.message?.includes("token") ||
              data.message?.includes("auth")
            ) {
              setScanError("Session expired. Please login again.");
              setTimeout(() => {
                handleLogout();
              }, 2000);
            } else {
              setScanError(data.message || "Scan failed");
              setTimeout(() => {
                setScanError("");
                setIsScanning(false);
              }, 3000);
            }
          }
        } catch (error) {
          setScanError("Network error. Please try again.");
          console.error("Scan error:", error);
          setTimeout(() => {
            setScanError("");
            setIsScanning(false);
          }, 3000);
        } finally {
          setIsScanning(false);
        }
      }
    },
    [token, isScanning],
  ); // Dependencies for useCallback

  const handleError = (error) => {
    console.error("Scanner error:", error);
    setScanError(
      "Camera access denied. Please enable permissions and refresh.",
    );
  };

  const startScanning = () => {
    setScanResult(null);
    setScanError("");
    setScanning(true);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  // Show loading state while checking for saved auth
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <Loader2 className="w-12 h-12 text-[#FFE348] animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 text-center">Loading...</p>
        </div>
      </div>
    );
  }

  // Login Page
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-50 rounded-full mb-4">
              <QrCode className="w-10 h-10 text-[#FFE348]" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Ticket Checker
            </h1>
            <p className="text-gray-600">Sign in to start scanning tickets</p>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FFE348] focus:border-transparent outline-none"
                  placeholder="Enter username"
                  aria-describedby="username-error"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FFE348] focus:border-transparent outline-none"
                  placeholder="Enter password"
                  aria-describedby="password-error"
                />
              </div>
            </div>

            {loginError && (
              <div
                id="login-error"
                className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-700"
                role="alert"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{loginError}</span>
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full bg-[#FFE348] hover:bg-yellow-400 disabled:opacity-50 text-gray-800 font-semibold py-3 px-6 rounded-xl transition duration-200 flex items-center justify-center gap-2"
              aria-label="Sign in"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Scanner Page (after login)
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-3 sm:p-4">
      <div className="max-w-md mx-auto flex flex-col min-h-[90vh]">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md p-4 flex gap-2 items-center justify-between mb-4">
          <div className="space-y-0.5">
            <h2 className="text-base font-semibold text-gray-800 leading-tight">
              {checkerData?.event?.title}
            </h2>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-sm text-red-600 rounded-md transition-colors"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        {/* Scanner Card */}
        <div className="bg-white rounded-xl shadow-lg p-5 flex-1 flex flex-col justify-between">
          <div>
            <div className="text-center mb-4">
              <div className="flex items-center justify-center w-14 h-14 bg-yellow-100 rounded-full mb-3 mx-auto">
                <QrCode className="w-6 h-6 text-[#FFE348]" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">QR Scanner</h1>
              <p className="text-sm text-gray-500 mt-1">
                Scan tickets to check in attendees
              </p>
            </div>

            {/* Fixed Height Scanner Container */}
            <div className="relative w-full h-72 bg-black rounded-xl overflow-hidden mb-4">
              {scanning ? (
                <>
                  <Scanner
                    onScan={handleScan}
                    onError={handleError}
                    constraints={{ facingMode: "environment" }}
                    styles={{
                      container: { width: "100%", height: "100%" },
                    }}
                  />
                  {isScanning && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <Loader2 className="w-10 h-10 text-white animate-spin" />
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-sm opacity-30 flex-col">
                  <Camera className="w-8 h-8 mb-2" />
                  Scanner inactive
                </div>
              )}
            </div>

            {/* Scan Error */}
            {scanError && (
              <div
                className="bg-red-100 border border-red-200 text-red-700 rounded-md px-3 py-2 flex items-center gap-2 text-sm mb-4"
                role="alert"
              >
                <AlertCircle className="w-4 h-4" />
                {scanError}
              </div>
            )}

            {/* Scan Result */}
            {scanResult && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="text-green-800 text-center font-semibold">
                    Check-In Successful
                  </h3>
                </div>
                <InfoCard
                  label="Attendee Name"
                  value={scanResult.attendeeName}
                />
                <InfoCard
                  label="Email"
                  value={scanResult.attendeeEmail || "N/A"}
                />
                {scanResult.attendeePhone && (
                  <InfoCard label="Phone" value={scanResult.attendeePhone} />
                )}
                <div className="grid grid-cols-2 gap-2">
                  <InfoCard label="Ticket Type" value={scanResult.ticketType} />
                  <InfoCard label="Quantity" value={scanResult.quantity} />
                </div>
                <InfoCard label="Event" value={scanResult.eventTitle} />
              </div>
            )}
          </div>

          {/* Fixed Button at Bottom */}
          <div className="pt-4">
            <button
              onClick={scanning ? () => setScanning(false) : startScanning}
              className={`w-full font-semibold py-3 rounded-lg text-white transition duration-200 shadow-md ${
                scanning
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-[#FFE348] hover:bg-yellow-400"
              }`}
              aria-label={scanning ? "Stop scanning" : "Start scanning"}
            >
              {scanning ? "Stop Scanning" : "Start Scanning"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
