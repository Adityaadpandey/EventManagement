// 'use client';

// import jsQR from 'jsqr';
// import { AlertCircle, Camera, CheckCircle, Loader2, LogOut, XCircle } from 'lucide-react';
// import { useEffect, useRef, useState } from 'react';

// const HOST = process.env.NEXT_PUBLIC_API_URL || 'https://api.example.com';

// export default function TicketCheckerPage() {
//   const [isLoggedIn, setIsLoggedIn] = useState(false);
//   const [checkerData, setCheckerData] = useState(null);
//   const [username, setUsername] = useState('');
//   const [password, setPassword] = useState('');
//   const [loginLoading, setLoginLoading] = useState(false);
//   const [loginError, setLoginError] = useState('');

//   const [scanning, setScanning] = useState(false);
//   const [scanResult, setScanResult] = useState(null);
//   const [scanLoading, setScanLoading] = useState(false);
//   const [scanError, setScanError] = useState('');
//   const [manualInput, setManualInput] = useState('');
//   const [debugInfo, setDebugInfo] = useState('');

//   const videoRef = useRef(null);
//   const canvasRef = useRef(null);
//   const streamRef = useRef(null);
//   const animationFrameRef = useRef(null);

//   useEffect(() => {
//     const token = sessionStorage.getItem('checker_auth_token');
//     const savedChecker = sessionStorage.getItem('checker_data');

//     if (token && savedChecker) {
//       setIsLoggedIn(true);
//       setCheckerData(JSON.parse(savedChecker));
//     }

//     return () => {
//       stopScanning();
//     };
//   }, []);

//   const handleLogin = async () => {
//     setLoginLoading(true);
//     setLoginError('');

//     try {
//       const response = await fetch(`${HOST}/ticket-validation/checker/login`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ username, password }),
//       });

//       const data = await response.json();

//       if (data.status === 'success') {
//         sessionStorage.setItem('checker_auth_token', data.data.token);
//         sessionStorage.setItem('checker_data', JSON.stringify(data.data.checker));
//         setCheckerData(data.data.checker);
//         setIsLoggedIn(true);
//         setUsername('');
//         setPassword('');
//       } else {
//         setLoginError(data.message || 'Login failed');
//       }
//     } catch (error) {
//       setLoginError('Network error. Please try again.');
//     } finally {
//       setLoginLoading(false);
//     }
//   };

//   const handleLogout = () => {
//     sessionStorage.removeItem('checker_auth_token');
//     sessionStorage.removeItem('checker_data');
//     setIsLoggedIn(false);
//     setCheckerData(null);
//     stopScanning();
//   };

//   const startScanning = async () => {
//     setScanError('');
//     setScanResult(null);
//     setDebugInfo('Requesting camera access...');

//     try {
//       if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
//         setScanError('Camera API not supported in this browser');
//         setDebugInfo('MediaDevices API not available');
//         return;
//       }

//       setDebugInfo('Getting camera stream...');
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: {
//           facingMode: { ideal: 'environment' },
//           width: { ideal: 1280 },
//           height: { ideal: 720 },
//         },
//       });

//       // store stream so stopScanning can use it
//       streamRef.current = stream;

//       // set scanning=true so the <video> element is rendered into the DOM
//       // before we try to access videoRef.current. Then wait for one animation frame
//       // to ensure React has mounted the element.
//       setScanning(true);
//       await new Promise((resolve) => requestAnimationFrame(resolve));

//       if (!videoRef.current) {
//         setScanError('Video element not mounted');
//         setDebugInfo('Video ref is null after mounting');
//         // stop camera - avoid leaving it on
//         stream.getTracks().forEach((t) => t.stop());
//         streamRef.current = null;
//         setScanning(false);
//         return;
//       }

//       videoRef.current.srcObject = stream;
//       try {
//         videoRef.current.setAttribute('playsinline', 'true');
//       } catch (e) {}
//       videoRef.current.muted = true;

//       setDebugInfo('Starting video playback...');

//       try {
//         await videoRef.current.play();
//       } catch (err) {
//         console.error('Play error:', err);
//         setScanError('Failed to start video playback: ' + (err?.message || err));
//         // leave scanning state so UI shows the video area (useful for debugging)
//         return;
//       }

//       setDebugInfo('Video playing, starting QR scan loop');
//       animationFrameRef.current = requestAnimationFrame(scanQRCode);
//     } catch (error) {
//       console.error('Camera access error:', error);
//       setDebugInfo(`Error: ${error.name || 'Error'} - ${error.message || error}`);

//       if (error.name === 'NotAllowedError') {
//         setScanError('Camera permission denied. Please allow camera access in your browser settings.');
//       } else if (error.name === 'NotFoundError') {
//         setScanError('No camera found on this device.');
//       } else if (error.name === 'NotReadableError') {
//         setScanError('Camera is already in use by another application.');
//       } else {
//         setScanError(`Camera error: ${error.message || error}`);
//       }

//       // make sure scanning state is false on error
//       setScanning(false);
//     }
//   };

//   const stopScanning = () => {
//     if (animationFrameRef.current) {
//       cancelAnimationFrame(animationFrameRef.current);
//       animationFrameRef.current = null;
//     }

//     if (streamRef.current) {
//       streamRef.current.getTracks().forEach((track) => track.stop());
//       streamRef.current = null;
//     }

//     if (videoRef.current) {
//       try {
//         videoRef.current.srcObject = null;
//       } catch (e) {}
//     }

//     setScanning(false);
//     setDebugInfo('');
//   };

//   // We downscale the canvas for speed/compatibility. jsQR works on the image data buffer.
//   const scanQRCode = () => {
//     const video = videoRef.current;
//     const canvas = canvasRef.current;

//     if (!video || !canvas || !scanning) return;

//     const context = canvas.getContext && canvas.getContext('2d', { willReadFrequently: true });
//     if (!context) {
//       console.warn('2D context not available');
//       animationFrameRef.current = requestAnimationFrame(scanQRCode);
//       return;
//     }

//     if (video.readyState !== video.HAVE_ENOUGH_DATA) {
//       animationFrameRef.current = requestAnimationFrame(scanQRCode);
//       return;
//     }

//     // downscale for speed
//     const maxScanWidth = 480;
//     const ratio = video.videoWidth ? Math.min(1, maxScanWidth / video.videoWidth) : 1;
//     const scanWidth = Math.max(240, Math.floor(video.videoWidth * ratio));
//     const scanHeight = Math.max(160, Math.floor(video.videoHeight * ratio));

//     canvas.width = scanWidth;
//     canvas.height = scanHeight;

//     // draw current frame
//     try {
//       context.drawImage(video, 0, 0, scanWidth, scanHeight);
//     } catch (err) {
//       console.error('drawImage failed', err);
//       animationFrameRef.current = requestAnimationFrame(scanQRCode);
//       return;
//     }

//     // Try native BarcodeDetector first (fast on supporting browsers)
//     if (window.BarcodeDetector) {
//       try {
//         const supported = BarcodeDetector.getSupportedFormats ? await BarcodeDetector.getSupportedFormats() : null;
//       } catch (e) {
//         // ignore
//       }
//     }

//     (async () => {
//       // Attempt 1: use BarcodeDetector if available
//       if (window.BarcodeDetector) {
//         try {
//           const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
//           const detections = await detector.detect(canvas);
//           if (detections && detections.length > 0) {
//             const code = detections[0].rawValue;
//             setDebugInfo(`BarcodeDetector found: ${code.substring(0, 80)}...`);
//             stopScanning();
//             handleTicketScan(code);
//             return;
//           }
//         } catch (err) {
//           // detector may throw on some browsers; fall through to jsQR
//           console.warn('BarcodeDetector error', err);
//         }
//       }

//       // Fallback: use jsQR with preprocessing (grayscale + sobel) and rotations
//       const imgData = context.getImageData(0, 0, scanWidth, scanHeight);
//       const w = imgData.width;
//       const h = imgData.height;

//       // convert to grayscale
//       const gray = new Uint8ClampedArray(w * h);
//       for (let i = 0, j = 0; i < imgData.data.length; i += 4, j++) {
//         const r = imgData.data[i];
//         const g = imgData.data[i + 1];
//         const b = imgData.data[i + 2];
//         // luminance
//         gray[j] = (0.299 * r + 0.587 * g + 0.114 * b) | 0;
//       }

//       // apply Sobel edge magnitude to boost QR patterns
//       const sobel = new Uint8ClampedArray(w * h);
//       for (let y = 1; y < h - 1; y++) {
//         for (let x = 1; x < w - 1; x++) {
//           const idx = y * w + x;
//           const gx = (
//             -1 * gray[idx - w - 1] + 1 * gray[idx - w + 1] +
//             -2 * gray[idx - 1]     + 2 * gray[idx + 1] +
//             -1 * gray[idx + w - 1] + 1 * gray[idx + w + 1]
//           );
//           const gy = (
//             -1 * gray[idx - w - 1] + -2 * gray[idx - w] + -1 * gray[idx - w + 1] +
//              1 * gray[idx + w - 1] +  2 * gray[idx + w] +  1 * gray[idx + w + 1]
//           );
//           const mag = Math.min(255, Math.hypot(gx, gy) | 0);
//           sobel[idx] = mag;
//         }
//       }

//       // create RGBA buffer from sobel result
//       const proc = new Uint8ClampedArray(w * h * 4);
//       for (let i = 0, j = 0; j < w * h; i += 4, j++) {
//         const v = sobel[j];
//         proc[i] = proc[i + 1] = proc[i + 2] = v;
//         proc[i + 3] = 255;
//       }

//       // main attempt with jsQR on preprocessed buffer
//       try {
//         let code = jsQR(proc, w, h, { inversionAttempts: 'attemptBoth' });
//         if (code && code.data) {
//           setDebugInfo(`jsQR found: ${code.data.substring(0, 80)}...`);
//           stopScanning();
//           handleTicketScan(code.data);
//           return;
//         }
//       } catch (e) {
//         console.error('jsQR primary attempt error', e);
//       }

//       // try rotated attempts (use offscreen canvas)
//       try {
//         const tmpCanvas = document.createElement('canvas');
//         const tmpCtx = tmpCanvas.getContext('2d');
//         tmpCanvas.width = w;
//         tmpCanvas.height = h;

//         const rotations = [90, 180, 270];
//         for (const rot of rotations) {
//           tmpCtx.save();
//           tmpCtx.clearRect(0, 0, tmpCanvas.width, tmpCanvas.height);
//           // rotate around center
//           tmpCtx.translate(tmpCanvas.width / 2, tmpCanvas.height / 2);
//           tmpCtx.rotate((rot * Math.PI) / 180);
//           tmpCtx.translate(-tmpCanvas.width / 2, -tmpCanvas.height / 2);
//           tmpCtx.drawImage(canvas, 0, 0, tmpCanvas.width, tmpCanvas.height);
//           tmpCtx.restore();

//           const rImg = tmpCtx.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);
//           // build grayscale and sobel again for rotated frame
//           const rw = rImg.width;
//           const rh = rImg.height;
//           const rgray = new Uint8ClampedArray(rw * rh);
//           for (let i = 0, j = 0; i < rImg.data.length; i += 4, j++) {
//             rgray[j] = (0.299 * rImg.data[i] + 0.587 * rImg.data[i + 1] + 0.114 * rImg.data[i + 2]) | 0;
//           }

//           const rsobel = new Uint8ClampedArray(rw * rh);
//           for (let y = 1; y < rh - 1; y++) {
//             for (let x = 1; x < rw - 1; x++) {
//               const idx = y * rw + x;
//               const gx = (
//                 -1 * rgray[idx - rw - 1] + 1 * rgray[idx - rw + 1] +
//                 -2 * rgray[idx - 1]       + 2 * rgray[idx + 1] +
//                 -1 * rgray[idx + rw - 1] + 1 * rgray[idx + rw + 1]
//               );
//               const gy = (
//                 -1 * rgray[idx - rw - 1] + -2 * rgray[idx - rw] + -1 * rgray[idx - rw + 1] +
//                  1 * rgray[idx + rw - 1] +  2 * rgray[idx + rw] +  1 * rgray[idx + rw + 1]
//               );
//               const mag = Math.min(255, Math.hypot(gx, gy) | 0);
//               rsobel[idx] = mag;
//             }
//           }

//           const rproc = new Uint8ClampedArray(rw * rh * 4);
//           for (let i = 0, j = 0; j < rw * rh; i += 4, j++) {
//             const v = rsobel[j];
//             rproc[i] = rproc[i + 1] = rproc[i + 2] = v;
//             rproc[i + 3] = 255;
//           }

//           const rcode = jsQR(rproc, rw, rh, { inversionAttempts: 'attemptBoth' });
//           if (rcode && rcode.data) {
//             setDebugInfo(`jsQR rotated found: ${rcode.data.substring(0, 80)}...`);
//             stopScanning();
//             handleTicketScan(rcode.data);
//             return;
//           }
//         }
//       } catch (e) {
//         console.error('rotated attempts error', e);
//       }

//       // final fallback: try a higher-resolution frame (heavy) once every few seconds
//       try {
//         const fullW = video.videoWidth || scanWidth;
//         const fullH = video.videoHeight || scanHeight;
//         if (fullW > scanWidth || fullH > scanHeight) {
//           const fullCanvas = document.createElement('canvas');
//           fullCanvas.width = fullW;
//           fullCanvas.height = fullH;
//           const fctx = fullCanvas.getContext('2d');
//           fctx.drawImage(video, 0, 0, fullW, fullH);
//           const fimg = fctx.getImageData(0, 0, fullW, fullH);

//           // light preprocessing (grayscale only)
//           const fproc = new Uint8ClampedArray(fullW * fullH * 4);
//           for (let i = 0, j = 0; i < fimg.data.length; i += 4, j++) {
//             const v = (0.299 * fimg.data[i] + 0.587 * fimg.data[i + 1] + 0.114 * fimg.data[i + 2]) | 0;
//             fproc[i] = fproc[i + 1] = fproc[i + 2] = v;
//             fproc[i + 3] = 255;
//           }

//           const fcode = jsQR(fproc, fullW, fullH, { inversionAttempts: 'attemptBoth' });
//           if (fcode && fcode.data) {
//             setDebugInfo(`jsQR full-res found: ${fcode.data.substring(0, 80)}...`);
//             stopScanning();
//             handleTicketScan(fcode.data);
//             return;
//           }
//         }
//       } catch (e) {
//         console.error('full-res fallback error', e);
//       }

//       // no code found this frame
//       setDebugInfo('Scanning — move QR inside frame, try better lighting or different angles');
//       animationFrameRef.current = requestAnimationFrame(scanQRCode);
//     })();
//   };

//     // ensure visible small debug canvas
//     try {
//       if (canvas.classList && canvas.classList.contains('hidden')) {
//         canvas.classList.remove('hidden');
//         canvas.style.position = 'absolute';
//         canvas.style.top = '12px';
//         canvas.style.right = '12px';
//         canvas.style.width = '160px';
//         canvas.style.height = 'auto';
//         canvas.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
//         canvas.style.borderRadius = '8px';
//         canvas.style.zIndex = '60';
//       }
//     } catch (e) {}

//     canvas.width = scanWidth;
//     canvas.height = scanHeight;

//     // Try multiple attempts: normal, rotated, and a higher-res fallback
//     const attempts = [];
//     attempts.push({ w: scanWidth, h: scanHeight, rotate: 0 });
//     attempts.push({ w: scanWidth, h: scanHeight, rotate: 90 });
//     attempts.push({ w: scanWidth, h: scanHeight, rotate: 180 });
//     attempts.push({ w: scanWidth, h: scanHeight, rotate: 270 });

//     // Also add a full-resolution try as a last resort (may be heavy)
//     const fullW = video.videoWidth || scanWidth;
//     const fullH = video.videoHeight || scanHeight;
//     attempts.push({ w: fullW, h: fullH, rotate: 0, enhance: true, full: true });

//     (async () => {
//       let found = null;

//       for (const att of attempts) {
//         try {
//           const w = att.w;
//           const h = att.h;

//           if (att.rotate === 0) {
//             // draw to main canvas for the first attempt so user can see debug
//             const img = drawAndGetImageData(context, w, h, att.enhance !== false);
//             if (!img) continue;

//             // run jsQR
//             const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
//             if (code && code.data) {
//               found = { code, img, w, h };
//               // draw bounding box
//               try {
//                 context.lineWidth = Math.max(2, Math.round(w / 200));
//                 context.strokeStyle = '#00FF00';
//                 context.beginPath();
//                 const tl = code.location.topLeftCorner;
//                 const tr = code.location.topRightCorner;
//                 const br = code.location.bottomRightCorner;
//                 const bl = code.location.bottomLeftCorner;
//                 context.moveTo(tl.x, tl.y);
//                 context.lineTo(tr.x, tr.y);
//                 context.lineTo(br.x, br.y);
//                 context.lineTo(bl.x, bl.y);
//                 context.closePath();
//                 context.stroke();
//               } catch (e) {}

//               break;
//             }
//           } else {
//             // rotated attempt -> use tmpCanvas
//             tmpCanvas.width = att.rotate === 90 || att.rotate === 270 ? h : w;
//             tmpCanvas.height = att.rotate === 90 || att.rotate === 270 ? w : h;
//             tmpCtx.save();
//             // clear
//             tmpCtx.clearRect(0, 0, tmpCanvas.width, tmpCanvas.height);
//             // translate/rotate
//             if (att.rotate === 90) {
//               tmpCtx.translate(tmpCanvas.width, 0);
//               tmpCtx.rotate((90 * Math.PI) / 180);
//             } else if (att.rotate === 180) {
//               tmpCtx.translate(tmpCanvas.width, tmpCanvas.height);
//               tmpCtx.rotate((180 * Math.PI) / 180);
//             } else if (att.rotate === 270) {
//               tmpCtx.translate(0, tmpCanvas.height);
//               tmpCtx.rotate((270 * Math.PI) / 180);
//             }
//             tmpCtx.drawImage(video, 0, 0, w, h);
//             tmpCtx.restore();

//             const img = drawAndGetImageData(tmpCtx, tmpCanvas.width, tmpCanvas.height, att.enhance !== false);
//             if (!img) continue;

//             const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
//             if (code && code.data) {
//               // copy rotated detection to main canvas for visibility
//               try {
//                 // draw rotated frame back to main canvas scaled
//                 context.clearRect(0, 0, canvas.width, canvas.height);
//                 context.drawImage(tmpCanvas, 0, 0, canvas.width, canvas.height);

//                 context.lineWidth = Math.max(2, Math.round(canvas.width / 200));
//                 context.strokeStyle = '#00FF00';
//                 context.beginPath();
//                 const tl = code.location.topLeftCorner;
//                 const tr = code.location.topRightCorner;
//                 const br = code.location.bottomRightCorner;
//                 const bl = code.location.bottomLeftCorner;
//                 const scaleX = canvas.width / img.width;
//                 const scaleY = canvas.height / img.height;
//                 context.moveTo(tl.x * scaleX, tl.y * scaleY);
//                 context.lineTo(tr.x * scaleX, tr.y * scaleY);
//                 context.lineTo(br.x * scaleX, br.y * scaleY);
//                 context.lineTo(bl.x * scaleX, bl.y * scaleY);
//                 context.closePath();
//                 context.stroke();
//               } catch (e) {}

//               found = { code, img, w: tmpCanvas.width, h: tmpCanvas.height };
//               break;
//             }
//           }
//         } catch (err) {
//           console.error('Attempt error', err);
//         }
//       }

//       if (found) {
//         setDebugInfo(`QR Code detected: ${found.code.data.substring(0, 80)}...`);
//         stopScanning();
//         handleTicketScan(found.code.data);
//         return;
//       } else {
//         setDebugInfo('Scanning — move QR inside the frame, try different angles or lighting');
//       }

//       animationFrameRef.current = requestAnimationFrame(scanQRCode);
//     })();
//   };

//   const handleManualInput = () => {
//     if (manualInput.trim()) {
//       handleTicketScan(manualInput.trim());
//       setManualInput('');
//     }
//   };

//   const handleTicketScan = async (qrCode) => {
//     setScanLoading(true);
//     setScanError('');
//     setScanResult(null);

//     try {
//       const token = sessionStorage.getItem('checker_auth_token');
//       const response = await fetch(`${HOST}/ticket-validation/scan`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${token}`,
//         },
//         body: JSON.stringify({ qrCode }),
//       });

//       const data = await response.json();

//       if (data.status === 'success') {
//         setScanResult({ success: true, data: data.data });
//         setTimeout(() => setScanResult(null), 5000);
//       } else {
//         setScanResult({ success: false, message: data.message });
//         setTimeout(() => setScanResult(null), 5000);
//       }
//     } catch (error) {
//       setScanError('Network error. Please try again.');
//     } finally {
//       setScanLoading(false);
//     }
//   };

//   if (!isLoggedIn) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
//         <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
//           <div className="text-center mb-8">
//             <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
//               <Camera className="w-8 h-8 text-indigo-600" />
//             </div>
//             <h1 className="text-2xl font-bold text-gray-800">Ticket Checker Login</h1>
//             <p className="text-gray-600 mt-2">Sign in to start scanning tickets</p>
//           </div>

//           <div className="space-y-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
//               <input
//                 type="text"
//                 value={username}
//                 onChange={(e) => setUsername(e.target.value)}
//                 onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
//                 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
//                 placeholder="Enter username"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
//               <input
//                 type="password"
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//                 onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
//                 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
//                 placeholder="Enter password"
//               />
//             </div>

//             {loginError && (
//               <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{loginError}</div>
//             )}

//             <button
//               onClick={handleLogin}
//               disabled={loginLoading || !username || !password}
//               className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
//             >
//               {loginLoading ? (
//                 <>
//                   <Loader2 className="w-5 h-5 mr-2 animate-spin" />
//                   Logging in...
//                 </>
//               ) : (
//                 'Sign In'
//               )}
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <div className="bg-white shadow-sm">
//         <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
//           <div>
//             <h1 className="text-xl font-bold text-gray-800">{checkerData?.event?.title || 'Event Scanner'}</h1>
//             <p className="text-sm text-gray-600">Checker: {checkerData?.username}</p>
//           </div>
//           <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
//             <LogOut className="w-4 h-4" />
//             Logout
//           </button>
//         </div>
//       </div>

//       <div className="max-w-4xl mx-auto p-4 space-y-4">
//         {checkerData?.event && (
//           <div className="bg-white rounded-lg shadow p-4">
//             <h2 className="font-semibold text-gray-800 mb-2">Event Details</h2>
//             <div className="text-sm text-gray-600 space-y-1">
//               <p><span className="font-medium">Location:</span> {checkerData.event.location}</p>
//               <p><span className="font-medium">Date:</span> {new Date(checkerData.event.date).toLocaleDateString()}</p>
//               <p><span className="font-medium">Time:</span> {new Date(checkerData.event.time).toLocaleTimeString()}</p>
//             </div>
//           </div>
//         )}

//         {debugInfo && (
//           <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
//             <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
//             <span className="text-sm text-blue-800">{debugInfo}</span>
//           </div>
//         )}

//         <div className="bg-white rounded-lg shadow p-6">
//           {!scanning ? (
//             <div className="text-center">
//               <button onClick={startScanning} className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 mx-auto">
//                 <Camera className="w-5 h-5" />
//                 Start Scanning
//               </button>

//               <div className="mt-6">
//                 <p className="text-sm text-gray-600 mb-3">Or enter ticket code manually:</p>
//                 <div className="flex gap-2">
//                   <input
//                     type="text"
//                     value={manualInput}
//                     onChange={(e) => setManualInput(e.target.value)}
//                     onKeyPress={(e) => e.key === 'Enter' && handleManualInput()}
//                     placeholder="TICKET_1758535123066_r0f19n8y0js"
//                     className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
//                   />
//                   <button
//                     onClick={handleManualInput}
//                     disabled={!manualInput.trim()}
//                     className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//                   >
//                     Check
//                   </button>
//                 </div>
//               </div>
//             </div>
//           ) : (
//             <div className="space-y-4">
//               <div className="relative bg-black rounded-lg overflow-hidden">
//                 <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-video object-cover" style={{ maxHeight: '500px' }} />
//                 <canvas ref={canvasRef} className="hidden" />

//                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
//                   <div className="relative border-4 border-white w-64 h-64 rounded-lg shadow-lg">
//                     <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-green-400"></div>
//                     <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-green-400"></div>
//                     <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-green-400"></div>
//                     <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-green-400"></div>
//                   </div>
//                 </div>

//                 <div className="absolute bottom-4 left-0 right-0 text-center">
//                   <p className="text-white text-sm bg-black bg-opacity-60 inline-block px-4 py-2 rounded-full">Position QR code within the frame</p>
//                 </div>
//               </div>

//               <button onClick={stopScanning} className="w-full bg-gray-600 text-white py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors">Stop Scanning</button>
//             </div>
//           )}
//         </div>

//         {scanLoading && (
//           <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
//             <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
//             <span className="text-blue-800">Validating ticket...</span>
//           </div>
//         )}

//         {scanResult && scanResult.success && (
//           <div className="bg-green-50 border border-green-200 rounded-lg p-4">
//             <div className="flex items-center gap-3 mb-3">
//               <CheckCircle className="w-6 h-6 text-green-600" />
//               <span className="font-semibold text-green-800">Ticket Valid!</span>
//             </div>
//             <div className="text-sm text-gray-700 space-y-1">
//               <p><span className="font-medium">Attendee:</span> {scanResult.data.attendeeName}</p>
//               <p><span className="font-medium">Email:</span> {scanResult.data.attendeeEmail}</p>
//               <p><span className="font-medium">Ticket Type:</span> {scanResult.data.ticketType}</p>
//               <p><span className="font-medium">Quantity:</span> {scanResult.data.quantity}</p>
//               <p><span className="font-medium">Total Price:</span> ${scanResult.data.totalPrice}</p>
//             </div>
//           </div>
//         )}

//         {scanResult && !scanResult.success && (
//           <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
//             <XCircle className="w-6 h-6 text-red-600" />
//             <span className="font-semibold text-red-800">{scanResult.message}</span>
//           </div>
//         )}

//         {scanError && (
//           <div className="bg-red-50 border border-red-200 rounded-lg p-4">
//             <span className="text-red-800">{scanError}</span>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

const page = () => {
  return <div>page</div>;
};

export default page;
