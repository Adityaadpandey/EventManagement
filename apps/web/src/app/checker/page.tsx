"use client";
import { Scanner } from "@yudiel/react-qr-scanner";
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
import { useEffect, useState } from "react";

const HOST = process.env.NEXT_PUBLIC_API_URL;
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
      const response = await fetch(`${HOST}/ticket-validation/checker/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.status === "success") {
        console.log("Login successful:", data);
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

  // QR Scan handler
  const handleScan = async (result) => {
    if (result && result[0] && !isScanning) {
      const qrCode = result[0].rawValue;
      setIsScanning(true);
      setScanError("");

      try {
        console.log("Scanned QR Code:", qrCode);
        const response = await fetch(`${HOST}/ticket-validation/scan`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "checker-auth": `Bearer ${token}`,
          },
          body: JSON.stringify({ qrCode }),
        });

        const data = await response.json();

        if (data.status === "success") {
          setScanResult(data.data);
          setScanning(false);
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
  };

  const handleError = (error) => {
    console.error("Scanner error:", error);
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
      <div className="min-h-screen  flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 text-center">Loading...</p>
        </div>
      </div>
    );
  }

  // Login Page
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen  flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 rounded-full mb-4">
              <QrCode className="w-10 h-10 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Ticket Checker
            </h1>
            <p className="text-gray-600">Sign in to start scanning tickets</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="Enter username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="Enter password"
                />
              </div>
            </div>

            {loginError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{loginError}</span>
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 px-6 rounded-xl transition duration-200 flex items-center justify-center gap-2"
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-800">
                {checkerData?.event?.title}
              </h2>
              <p className="text-sm text-gray-600">
                {checkerData?.lister?.companyName}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition duration-200"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
              <QrCode className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              QR Scanner
            </h1>
            <p className="text-gray-600">Scan tickets to check in attendees</p>
          </div>

          {!scanning && !scanResult && (
            <button
              onClick={startScanning}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-6 rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-lg"
            >
              <Camera className="w-5 h-5" />
              Start Scanning
            </button>
          )}

          {scanning && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-xl overflow-hidden">
                <Scanner
                  onScan={handleScan}
                  onError={handleError}
                  constraints={{
                    facingMode: "environment",
                  }}
                  styles={{
                    container: {
                      width: "100%",
                      height: "320px",
                    },
                  }}
                />
                {isScanning && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <Loader2 className="w-12 h-12 text-white animate-spin" />
                  </div>
                )}
              </div>

              {scanError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{scanError}</span>
                </div>
              )}

              <div className="text-center text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                Position the QR code within the frame
              </div>

              <button
                onClick={() => setScanning(false)}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl transition duration-200"
              >
                Stop Scanning
              </button>
            </div>
          )}

          {scanResult && !scanning && (
            <div className="space-y-4">
              <div className="flex items-center justify-center text-green-600 mb-2">
                <CheckCircle className="w-12 h-12" />
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <h3 className="font-semibold text-green-800 mb-3 text-center">
                  ✓ Check-In Successful
                </h3>

                <div className="space-y-3">
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase">
                      Attendee Name
                    </p>
                    <p className="text-gray-800 font-semibold">
                      {scanResult.attendeeName}
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase">Email</p>
                    <p className="text-gray-800 font-medium text-sm">
                      {scanResult.attendeeEmail || "N/A"}
                    </p>
                  </div>

                  {scanResult.attendeePhone && (
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase">Phone</p>
                      <p className="text-gray-800 font-medium">
                        {scanResult.attendeePhone}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase">
                        Ticket Type
                      </p>
                      <p className="text-gray-800 font-semibold">
                        {scanResult.ticketType}
                      </p>
                    </div>

                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase">
                        Quantity
                      </p>
                      <p className="text-gray-800 font-semibold">
                        {scanResult.quantity}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase">Event</p>
                    <p className="text-gray-800 font-semibold">
                      {scanResult.eventTitle}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={startScanning}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition duration-200"
              >
                Scan Next Ticket
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
