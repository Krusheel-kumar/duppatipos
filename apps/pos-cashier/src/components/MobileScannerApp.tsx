import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats, Html5QrcodeScannerState } from 'html5-qrcode';
import type { Product } from '../types/pos';
import { IconCamera, IconBarcode, IconCheckCircle, IconPhone } from './icons';
import { broadcastScannedBarcode, connectMobileToCounterHost } from '../utils/scannerSyncBus';

interface MobileScannerAppProps {
  products: Product[];
  onExit?: () => void;
}

export const MobileScannerApp: React.FC<MobileScannerAppProps> = ({
  products,
  onExit,
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [webRtcConnected, setWebRtcConnected] = useState<boolean>(false);

  // Auto-connect to PC Counter via WebRTC (zero backend, browser-to-browser)
  useEffect(() => {
    const disconnect = connectMobileToCounterHost('krn-counter-flagship-1', (connected) => {
      setWebRtcConnected(connected);
    });
    return () => {
      disconnect();
    };
  }, []);

  const [lastScanned, setLastScanned] = useState<{
    code: string;
    name: string;
    price: number;
    mrp?: number;
    fabric?: string;
    hsn?: string;
    variantName?: string;
    time: number;
  } | null>(null);

  const [scanHistory, setScanHistory] = useState<Array<{ code: string; name: string; price: number; time: number }>>([]);
  const [manualCode, setManualCode] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<'connected' | 'transmitting'>('connected');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastCodeRef = useRef<{ code: string; time: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // 1. Try native hardware BarcodeDetector if supported
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof window !== 'undefined' && (window as any).BarcodeDetector) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const detector = new (window as any).BarcodeDetector({
            formats: ['code_128', 'code_39', 'code_93', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code'],
          });
          const imgBitmap = await createImageBitmap(file);
          const detected = await detector.detect(imgBitmap);
          if (detected && detected.length > 0 && detected[0].rawValue) {
            handleProcessBarcode(detected[0].rawValue, 'mobile-camera');
            return;
          }
        } catch {
          // Fall through to Html5Qrcode
        }
      }

      // 2. Fallback to Html5Qrcode file scan
      let scanner = scannerRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode('krunnex-mobile-scanner-viewfinder', {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        });
      }

      const decodedText = await scanner.scanFile(file, false);
      if (decodedText) {
        handleProcessBarcode(decodedText, 'mobile-camera');
      }
    } catch {
      alert('Could not detect barcode in photo. Please ensure good lighting and clear focus on the barcode tag.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Audio synthesizer chime
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(920, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Audio silent fallback
    }
  };

  const handleProcessBarcode = (code: string, source: 'mobile-camera' | 'mobile-manual' | 'mobile-quick-chip' = 'mobile-camera') => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    // Prevent duplicate triggers within 1.8 seconds for same code
    if (lastCodeRef.current && lastCodeRef.current.code === cleanCode && Date.now() - lastCodeRef.current.time < 1800) {
      return;
    }
    lastCodeRef.current = { code: cleanCode, time: Date.now() };

    // Lookup product in textile catalog
    let matchedName = cleanCode;
    let matchedPrice = 0;
    let matchedMrp: number | undefined;
    let matchedFabric: string | undefined;
    let matchedHsn: string | undefined;
    let matchedVariantName: string | undefined;

    for (const p of products) {
      if (p.barcode === cleanCode || p.sku === cleanCode) {
        matchedName = p.name;
        matchedPrice = p.basePrice;
        matchedMrp = p.mrp;
        matchedFabric = p.fabric;
        matchedHsn = p.hsnCode;
        break;
      }
      for (const v of p.variants || []) {
        if (v.barcode === cleanCode || v.sku === cleanCode) {
          matchedName = p.name;
          matchedVariantName = v.name;
          matchedPrice = v.price;
          matchedMrp = v.mrp || p.mrp;
          matchedFabric = p.fabric;
          matchedHsn = p.hsnCode;
          break;
        }
      }
    }

    playBeep();
    if (navigator.vibrate) {
      try {
        navigator.vibrate(80);
      } catch {
        // Vibrate fallback
      }
    }

    setSyncStatus('transmitting');
    setTimeout(() => setSyncStatus('connected'), 600);

    // Broadcast to Counter Screen Cart
    broadcastScannedBarcode({
      barcode: cleanCode,
      source,
      timestamp: Date.now(),
      productName: matchedName,
      price: matchedPrice,
    });

    const scanRecord = {
      code: cleanCode,
      name: matchedName,
      price: matchedPrice,
      mrp: matchedMrp,
      fabric: matchedFabric,
      hsn: matchedHsn,
      variantName: matchedVariantName,
      time: Date.now(),
    };

    setLastScanned(scanRecord);
    setScanHistory((prev) => [scanRecord, ...prev.slice(0, 19)]);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleProcessBarcode(manualCode.trim(), 'mobile-manual');
      setManualCode('');
    }
  };

  // Toggle Camera Torch / Flashlight
  const toggleTorch = async () => {
    if (!scannerRef.current) return;
    try {
      const nextState = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        // @ts-expect-error Torch constraint
        advanced: [{ torch: nextState }],
      });
      setTorchOn(nextState);
    } catch {
      // Torch not supported
    }
  };

  // Switch camera when multiple devices exist
  const handleSwitchCamera = async (newCamId: string) => {
    if (!scannerRef.current || newCamId === selectedCameraId) return;
    setSelectedCameraId(newCamId);

    const s = scannerRef.current;
    try {
      if (s.getState() === Html5QrcodeScannerState.SCANNING) {
        await s.stop();
      }
      const qrConfig = {
        fps: 15,
        qrbox: (w: number, h: number) => ({
          width: Math.min(Math.floor(w * 0.88), 340),
          height: Math.min(Math.floor(h * 0.7), 180),
        }),
      };
      await s.start(newCamId, qrConfig, (txt) => handleProcessBarcode(txt, 'mobile-camera'), () => {});
      setCameraActive(true);
    } catch (err: unknown) {
      setCameraError(err instanceof Error ? err.message : 'Failed to switch camera');
    }
  };

  // Initialize Html5Qrcode Scanner Engine
  useEffect(() => {
    let isMounted = true;
    let scanner: Html5Qrcode | null = null;

    const startScanner = async () => {
      setCameraError(null);
      setCameraActive(false);

      // Brief delay to allow mobile DOM view to paint
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (!isMounted) return;

      const container = document.getElementById('krunnex-mobile-scanner-viewfinder');
      if (!container) return;

      if (typeof window === 'undefined' || !navigator?.mediaDevices) {
        if (isMounted) {
          setCameraError('Camera access requires HTTPS or localhost on mobile browsers. Use 1-click test buttons below.');
        }
        return;
      }

      try {
        scanner = new Html5Qrcode('krunnex-mobile-scanner-viewfinder', {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        });

        scannerRef.current = scanner;

        const qrConfig = {
          fps: 15,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const w = Math.min(Math.floor(viewfinderWidth * 0.92), 380);
            const h = Math.min(Math.floor(viewfinderHeight * 0.78), 220);
            return { width: Math.max(w, 240), height: Math.max(h, 140) };
          },
          aspectRatio: 1.777778,
          disableFlip: false,
        };

        const onSuccess = (decodedText: string) => {
          handleProcessBarcode(decodedText, 'mobile-camera');
        };

        const onError = () => {
          // Normal frame misses
        };

        // Query available cameras
        let chosenCamera: string | MediaTrackConstraints = { facingMode: 'environment' };
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            if (isMounted) {
              setAvailableCameras(
                devices.map((d, idx) => ({
                  id: d.id,
                  label: d.label || `Camera ${idx + 1}`,
                }))
              );
            }
            // Prefer back/rear camera for mobile barcode scanning
            const backCam = devices.find((d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('environment')
            );
            const targetId = backCam ? backCam.id : devices[0].id;
            chosenCamera = targetId;
            if (isMounted) {
              setSelectedCameraId(targetId);
            }
          }
        } catch {
          // Fallback to constraints
        }

        // Try environment camera first
        try {
          await scanner.start(chosenCamera, qrConfig, onSuccess, onError);
          if (isMounted) {
            setCameraActive(true);
            // Check torch capability
            try {
              const trackSettings = scanner.getRunningTrackCapabilities();
              // @ts-expect-error Torch capability check
              if (trackSettings && trackSettings.torch) {
                setHasTorch(true);
              }
            } catch {
              // Torch capability absent
            }
          }
        } catch {
          // Try user / front camera fallback
          try {
            await scanner.start({ facingMode: 'user' }, qrConfig, onSuccess, onError);
            if (isMounted) {
              setCameraActive(true);
            }
          } catch (secondErr: unknown) {
            if (isMounted) {
              setCameraActive(false);
              const errMsg = secondErr instanceof Error ? secondErr.message : String(secondErr);
              setCameraError(
                errMsg.includes('NotAllowedError') || errMsg.includes('Permission')
                  ? 'Camera permission denied. Please allow camera access in browser address bar.'
                  : `Camera: ${errMsg}. Note: On mobile, browsers require HTTPS for camera.`
              );
            }
          }
        }
      } catch (initErr: unknown) {
        if (isMounted) {
          setCameraActive(false);
          const errMsg = initErr instanceof Error ? initErr.message : String(initErr);
          setCameraError(`Scanner initialization: ${errMsg}.`);
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        const s = scannerRef.current;
        scannerRef.current = null;
        try {
          if (s.getState() === Html5QrcodeScannerState.SCANNING) {
            s.stop()
              .then(() => {
                try {
                  s.clear();
                } catch {}
              })
              .catch(() => {
                try {
                  s.clear();
                } catch {}
              });
          } else {
            try {
              s.clear();
            } catch {}
          }
        } catch {}
      }
    };
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        background: '#090d16',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        overflowX: 'hidden',
      }}
    >
      {/* Top Mobile App Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: '#0f172a',
          borderBottom: '1px solid #1e293b',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#10b981', display: 'flex', alignItems: 'center' }}>
            <IconPhone size={20} />
          </span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 800, fontSize: '0.92rem', letterSpacing: '0.5px', color: '#f8fafc' }}>
                KRUNNEX
              </span>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  background: '#2563eb',
                  color: '#ffffff',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                }}
              >
                Pocket Scanner
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: syncStatus === 'transmitting' ? '#38bdf8' : '#10b981',
                  boxShadow: syncStatus === 'transmitting' ? '0 0 8px #38bdf8' : '0 0 6px #10b981',
                }}
              />
              <span style={{ fontSize: '0.72rem', color: webRtcConnected ? '#34d399' : '#94a3b8' }}>
                {syncStatus === 'transmitting'
                  ? 'Transmitting Scan...'
                  : webRtcConnected
                  ? '✓ Wireless Paired to Counter'
                  : 'Live Scanner Ready'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Torch toggle button if supported */}
          {hasTorch && (
            <button
              type="button"
              onClick={toggleTorch}
              style={{
                background: torchOn ? '#f59e0b' : '#1e293b',
                color: torchOn ? '#000000' : '#f8fafc',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '6px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {torchOn ? '🔦 Torch On' : '🔦 Torch'}
            </button>
          )}

          {/* Camera switcher dropdown */}
          {availableCameras.length > 1 && (
            <select
              value={selectedCameraId}
              onChange={(e) => handleSwitchCamera(e.target.value)}
              style={{
                background: '#1e293b',
                color: '#cbd5e1',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '4px 6px',
                fontSize: '0.7rem',
              }}
            >
              {availableCameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          )}

          {onExit && (
            <button
              type="button"
              onClick={onExit}
              style={{
                background: '#334155',
                color: '#cbd5e1',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              Counter POS
            </button>
          )}
        </div>
      </header>

      {/* Main Viewfinder Section */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '290px',
          background: '#020617',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderBottom: '1px solid #1e293b',
        }}
      >
        {/* Html5Qrcode mounting container */}
        <div
          id="krunnex-mobile-scanner-viewfinder"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        />

        {/* Standby Loader when camera is warming up */}
        {!cameraActive && !cameraError && (
          <div
            style={{
              position: 'absolute',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              color: '#94a3b8',
              fontSize: '0.82rem',
              zIndex: 5,
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                border: '3px solid #334155',
                borderTopColor: '#10b981',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <span>Starting camera lens...</span>
          </div>
        )}

        {/* Targeting Frame Overlay with Corner Marks and Animated Red Laser (Clean, No clashing shadow) */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '290px',
            maxWidth: '88%',
            height: '150px',
            border: '1.5px dashed rgba(56, 189, 248, 0.7)',
            borderRadius: '12px',
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '6px',
            zIndex: 10,
          }}
        >
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ width: '18px', height: '18px', borderTop: '3px solid #38bdf8', borderLeft: '3px solid #38bdf8' }} />
            <div style={{ width: '18px', height: '18px', borderTop: '3px solid #38bdf8', borderRight: '3px solid #38bdf8' }} />
          </div>

          <div
            style={{
              width: '92%',
              height: '2px',
              background: '#ef4444',
              boxShadow: '0 0 10px #ef4444',
              animation: 'laserScan 2s infinite ease-in-out',
            }}
          />

          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ width: '18px', height: '18px', borderBottom: '3px solid #38bdf8', borderLeft: '3px solid #38bdf8' }} />
            <div style={{ width: '18px', height: '18px', borderBottom: '3px solid #38bdf8', borderRight: '3px solid #38bdf8' }} />
          </div>
        </div>

        {/* Camera Error or Mobile Notice */}
        {cameraError && (
          <div
            style={{
              position: 'absolute',
              padding: '16px',
              textAlign: 'center',
              color: '#cbd5e1',
              fontSize: '0.82rem',
              maxWidth: '85%',
              zIndex: 15,
              background: 'rgba(15, 23, 42, 0.94)',
              borderRadius: '10px',
              border: '1px solid #475569',
            }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px', color: '#f87171' }}>
              <IconCamera size={26} />
            </div>
            <div style={{ fontWeight: 600, color: '#f87171', marginBottom: '4px' }}>Camera Setup</div>
            <div>{cameraError}</div>
          </div>
        )}
      </div>

      {/* Live Scanned Product Info Card (Appears as soon as an item is scanned) */}
      <div style={{ padding: '12px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {lastScanned ? (
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #059669',
              borderRadius: '12px',
              padding: '14px 16px',
              boxShadow: '0 4px 20px rgba(5, 150, 105, 0.25)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, #10b981 0%, #3b82f6 100%)',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
              <div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: '#34d399',
                    background: '#064e3b',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    marginBottom: '4px',
                  }}
                >
                  <IconCheckCircle size={12} />
                  <span>SENT TO COUNTER CART (QTY +1)</span>
                </span>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f8fafc', lineHeight: 1.3 }}>
                  {lastScanned.name}
                </h4>
                {lastScanned.variantName && (
                  <div style={{ fontSize: '0.8rem', color: '#93c5fd', marginTop: '2px' }}>
                    Variant: {lastScanned.variantName}
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>
                  ₹{lastScanned.price.toLocaleString('en-IN')}
                </div>
                {lastScanned.mrp && lastScanned.mrp > lastScanned.price && (
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                    MRP ₹{lastScanned.mrp.toLocaleString('en-IN')}
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '12px',
                paddingTop: '8px',
                marginTop: '8px',
                borderTop: '1px solid #1e293b',
                fontSize: '0.75rem',
                color: '#94a3b8',
              }}
            >
              <span>Code: <strong style={{ color: '#f8fafc', fontFamily: 'monospace' }}>{lastScanned.code}</strong></span>
              {lastScanned.fabric && <span>• {lastScanned.fabric}</span>}
              {lastScanned.hsn && <span>• HSN {lastScanned.hsn}</span>}
            </div>
          </div>
        ) : (
          <div
            style={{
              background: '#0f172a',
              border: '1px dashed #334155',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
              color: '#94a3b8',
            }}
          >
            <div style={{ color: '#38bdf8', marginBottom: '6px' }}>
              <IconCamera size={24} />
            </div>
            <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem' }}>
              Point phone camera at any tag or barcode sticker
            </div>
            <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>
              Items scan instantly and are pushed directly to the counter bill!
            </div>
          </div>
        )}

        {/* Native Mobile Camera Photo Snapshot Scan Button (Works on plain HTTP & any browser) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handlePhotoCapture}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '12px 16px',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
            width: '100%',
          }}
        >
          <IconCamera size={18} />
          <span>📸 Tap to Snap Tag Barcode (Photo Scan)</span>
        </button>

        {/* Manual Barcode Input Row */}
        <form
          onSubmit={handleManualSubmit}
          style={{
            display: 'flex',
            gap: '8px',
            background: '#0f172a',
            padding: '8px',
            borderRadius: '10px',
            border: '1px solid #1e293b',
          }}
        >
          <input
            type="text"
            placeholder="Type barcode (e.g. KRN-BS-KNG-001)..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            style={{
              flex: 1,
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '8px 12px',
              color: '#f8fafc',
              fontSize: '0.82rem',
            }}
          />
          <button
            type="submit"
            style={{
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Send
          </button>
        </form>

        {/* 1-Click Quick Demo Barcode Buttons */}
        <div>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#94a3b8',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <IconBarcode size={14} />
            <span>1-Click Demo Barcode Triggers:</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleProcessBarcode('KRN-BS-KNG-001', 'mobile-quick-chip')}
              style={{
                background: '#1e293b',
                border: '1px solid #3b82f6',
                color: '#f8fafc',
                padding: '8px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.78rem',
              }}
            >
              <div style={{ fontWeight: 700, color: '#60a5fa' }}>King Bedsheet</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>₹2,699 • KRN-BS-KNG-001</div>
            </button>

            <button
              type="button"
              onClick={() => handleProcessBarcode('KRN-KT-04Y-010', 'mobile-quick-chip')}
              style={{
                background: '#1e293b',
                border: '1px solid #ec4899',
                color: '#f8fafc',
                padding: '8px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.78rem',
              }}
            >
              <div style={{ fontWeight: 700, color: '#f472b6' }}>Kids Kurti (4Y)</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>₹899 • KRN-KT-04Y-010</div>
            </button>

            <button
              type="button"
              onClick={() => handleProcessBarcode('KRN-BC-DBU-006', 'mobile-quick-chip')}
              style={{
                background: '#1e293b',
                border: '1px solid #10b981',
                color: '#f8fafc',
                padding: '8px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.78rem',
              }}
            >
              <div style={{ fontWeight: 700, color: '#34d399' }}>Dabu Bed Cover</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>₹3,499 • KRN-BC-DBU-006</div>
            </button>

            <button
              type="button"
              onClick={() => handleProcessBarcode('KRN-CS-SET-017', 'mobile-quick-chip')}
              style={{
                background: '#1e293b',
                border: '1px solid #f59e0b',
                color: '#f8fafc',
                padding: '8px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.78rem',
              }}
            >
              <div style={{ fontWeight: 700, color: '#fbbf24' }}>Cushion Set</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>₹999 • KRN-CS-SET-017</div>
            </button>
          </div>
        </div>

        {/* Scanned History Summary Pill */}
        {scanHistory.length > 0 && (
          <div
            style={{
              marginTop: 'auto',
              padding: '10px 14px',
              background: '#0f172a',
              borderRadius: '8px',
              border: '1px solid #1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.8rem',
            }}
          >
            <span style={{ color: '#94a3b8' }}>This Session Scanned:</span>
            <span style={{ fontWeight: 700, color: '#38bdf8' }}>
              {scanHistory.length} items (₹{scanHistory.reduce((sum, i) => sum + i.price, 0).toLocaleString('en-IN')})
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
