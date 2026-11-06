import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats, Html5QrcodeScannerState } from 'html5-qrcode';
import type { Product } from '../types/pos';
import { IconCamera, IconBarcode } from './icons';

interface CameraBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onBarcodeDetected: (barcode: string) => void;
}

export const CameraBarcodeScannerModal: React.FC<CameraBarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  products,
  onBarcodeDetected,
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [lastScanned, setLastScanned] = useState<{ code: string; name: string; time: number } | null>(null);
  const [scanCount, setScanCount] = useState<number>(0);
  const [manualCode, setManualCode] = useState<string>('');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastCodeRef = useRef<{ code: string; time: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Play crisp POS beep sound via Web Audio API synthesizer
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
      osc.frequency.setValueAtTime(880, ctx.currentTime); // 880 Hz crisp chime
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Audio fallback silent
    }
  };

  const handleImageScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // 1. Try native hardware BarcodeDetector if supported by the browser
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
            handleProcessBarcode(detected[0].rawValue);
            return;
          }
        } catch {
          // Fall through to Html5Qrcode scanFile
        }
      }

      // 2. Fallback to Html5Qrcode file scan engine
      let scanner = scannerRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode('krunnex-camera-barcode-viewfinder', {
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
        handleProcessBarcode(decodedText);
      }
    } catch {
      alert('Could not detect barcode in this image. Please ensure the barcode lines are clear and well-lit.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleProcessBarcode = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    // Prevent duplicate scans within 1.8 seconds for same code
    if (lastCodeRef.current && lastCodeRef.current.code === cleanCode && Date.now() - lastCodeRef.current.time < 1800) {
      return;
    }
    lastCodeRef.current = { code: cleanCode, time: Date.now() };

    // Match code to catalog
    let matchedName = cleanCode;
    for (const p of products) {
      if (p.barcode === cleanCode || p.sku === cleanCode) {
        matchedName = p.name;
        break;
      }
      for (const v of p.variants || []) {
        if (v.barcode === cleanCode || v.sku === cleanCode) {
          matchedName = `${p.name} (${v.name})`;
          break;
        }
      }
    }

    playBeep();
    if (navigator.vibrate) {
      try {
        navigator.vibrate(80);
      } catch {
        // Vibrate fallback silent
      }
    }

    setLastScanned({ code: cleanCode, name: matchedName, time: Date.now() });
    setScanCount((prev) => prev + 1);
    onBarcodeDetected(cleanCode);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleProcessBarcode(manualCode.trim());
      setManualCode('');
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
        fps: 12,
        qrbox: (w: number, h: number) => ({
          width: Math.min(Math.floor(w * 0.85), 320),
          height: Math.min(Math.floor(h * 0.7), 160),
        }),
      };
      await s.start(newCamId, qrConfig, handleProcessBarcode, () => {});
      setCameraActive(true);
    } catch (err: unknown) {
      setCameraError(err instanceof Error ? err.message : 'Failed to switch camera');
    }
  };

  // Initialize Html5Qrcode scanner engine
  useEffect(() => {
    if (!isOpen) {
      setCameraActive(false);
      setCameraError(null);
      return;
    }

    let isMounted = true;

    const startScanner = async () => {
      setCameraError(null);
      setCameraActive(false);

      // Brief delay to allow modal DOM container to paint
      await new Promise((resolve) => setTimeout(resolve, 80));
      if (!isMounted) return;

      const container = document.getElementById('krunnex-camera-barcode-viewfinder');
      if (!container) return;

      if (typeof window === 'undefined' || !navigator?.mediaDevices) {
        if (isMounted) {
          setCameraError('Camera access not supported in this test or browser environment. Use simulated scan below.');
        }
        return;
      }

      try {
        const scanner = new Html5Qrcode('krunnex-camera-barcode-viewfinder', {
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
          handleProcessBarcode(decodedText);
        };

        const onError = () => {
          // Frame scan miss, normal during video feed
        };

        // Enumerate cameras to find environment/back camera or default
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
          // Camera enumeration fallback to facingMode constraints
        }

        // Try launching camera
        try {
          await scanner.start(chosenCamera, qrConfig, onSuccess, onError);
          if (isMounted) {
            setCameraActive(true);
          }
        } catch {
          // If back camera failed (e.g. laptop webcam with OverconstrainedError), fallback to front camera
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
                  : `Webcam: ${errMsg}. You can still use the 1-click test buttons below!`
              );
            }
          }
        }
      } catch (initErr: unknown) {
        if (isMounted) {
          setCameraActive(false);
          const errMsg = initErr instanceof Error ? initErr.message : String(initErr);
          setCameraError(`Scanner initialization: ${errMsg}. Use 1-click test buttons below.`);
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
                } catch {
                  // Ignore cleanup errors
                }
              })
              .catch(() => {
                try {
                  s.clear();
                } catch {
                  // Ignore cleanup errors
                }
              });
          } else {
            try {
              s.clear();
            } catch {
              // Ignore cleanup errors
            }
          }
        } catch {
          // Silent cleanup catch
        }
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="pos-ref-modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="pos-ref-modal-content"
        style={{
          maxWidth: '560px',
          width: '92%',
          background: '#0f172a',
          color: '#f8fafc',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
          border: '1px solid #334155',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #1e293b',
            background: '#1e293b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', color: '#38bdf8' }}>
              <IconCamera size={22} />
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                Phone Camera Barcode Scanner
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                Point camera at tag or tap quick demo scan buttons
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Multi-camera selector if device has front and back cameras */}
            {availableCameras.length > 1 && (
              <select
                value={selectedCameraId}
                onChange={(e) => handleSwitchCamera(e.target.value)}
                style={{
                  background: '#0f172a',
                  color: '#94a3b8',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  padding: '4px 8px',
                  cursor: 'pointer',
                }}
              >
                {availableCameras.map((cam) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '1.4rem',
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Viewfinder Area */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '270px',
            background: '#020617',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Html5Qrcode mounting container - keep block display so geometry can be read */}
          <div
            id="krunnex-camera-barcode-viewfinder"
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
                  borderTopColor: '#38bdf8',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <span>Connecting camera feed...</span>
            </div>
          )}

          {/* Clean HUD Targeting Frame Overlay (No duplicate/clashing shadow) */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '300px',
              maxWidth: '88%',
              height: '150px',
              border: '1.5px dashed rgba(56, 189, 248, 0.65)',
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

            {/* Red Laser Scanning Line */}
            <div
              style={{
                width: '92%',
                height: '2px',
                background: '#ef4444',
                boxShadow: '0 0 8px #ef4444',
                animation: 'laserScan 2s infinite ease-in-out',
              }}
            />

            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ width: '18px', height: '18px', borderBottom: '3px solid #38bdf8', borderLeft: '3px solid #38bdf8' }} />
              <div style={{ width: '18px', height: '18px', borderBottom: '3px solid #38bdf8', borderRight: '3px solid #38bdf8' }} />
            </div>
          </div>

          {/* Camera Error or Standby Notice */}
          {cameraError && (
            <div
              style={{
                position: 'absolute',
                padding: '16px',
                textAlign: 'center',
                color: '#cbd5e1',
                fontSize: '0.85rem',
                maxWidth: '85%',
                zIndex: 15,
                background: 'rgba(15, 23, 42, 0.95)',
                borderRadius: '10px',
                border: '1px solid #475569',
              }}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px', color: '#f87171' }}>
                <IconCamera size={26} />
              </div>
              <div style={{ fontWeight: 600, color: '#f87171', marginBottom: '4px' }}>Camera Status</div>
              <div>{cameraError}</div>
            </div>
          )}
        </div>

        {/* Last Scanned Feedback Toast */}
        <div
          style={{
            padding: '12px 20px',
            background: lastScanned ? '#064e3b' : '#1e293b',
            borderTop: '1px solid #334155',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'background 0.3s ease',
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {lastScanned ? '✓ Item Scanned & Added to Cart' : 'Scanner Ready'}
            </span>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>
              {lastScanned ? lastScanned.name : 'Waiting for barcode in viewfinder...'}
            </div>
            {lastScanned && (
              <span style={{ fontSize: '0.75rem', color: '#6ee7b7', fontFamily: 'monospace' }}>
                Barcode: {lastScanned.code}
              </span>
            )}
          </div>
          <div
            style={{
              background: '#0f172a',
              borderRadius: '8px',
              padding: '4px 10px',
              border: '1px solid #334155',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#38bdf8',
            }}
          >
            {scanCount} Scanned
          </div>
        </div>

        {/* Fast Manual Type / Paste Barcode Row + Photo Tag Scan */}
        <form
          onSubmit={handleManualSubmit}
          style={{
            padding: '10px 20px',
            background: '#0b1120',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageScan}
            style={{ display: 'none' }}
          />

          <input
            type="text"
            placeholder="Type/paste barcode (e.g. KRN-BS-KNG-001) & Enter..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            style={{
              flex: 1,
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '6px 12px',
              color: '#f8fafc',
              fontSize: '0.8rem',
            }}
          />

          <button
            type="submit"
            style={{
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Enter
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: '#047857',
              color: '#ffffff',
              border: '1px solid #059669',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
            }}
            title="Scan tag from a photo or camera snapshot"
          >
            📸 Photo Tag
          </button>
        </form>

        {/* 1-Click Simulated Barcode Scan Buttons (For Client Presentations) */}
        <div style={{ padding: '14px 20px', background: '#0f172a' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <IconBarcode size={15} />
            <span>1-Click Quick Scan Buttons (Instant Demo Testing):</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleProcessBarcode('KRN-BS-KNG-001')}
              style={{
                background: '#1e293b',
                border: '1px solid #3b82f6',
                color: '#f8fafc',
                padding: '8px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.8rem',
              }}
            >
              <div style={{ fontWeight: 700, color: '#60a5fa' }}>King Bedsheet</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>KRN-BS-KNG-001 • ₹2,699</div>
            </button>

            <button
              type="button"
              onClick={() => handleProcessBarcode('KRN-KT-04Y-010')}
              style={{
                background: '#1e293b',
                border: '1px solid #ec4899',
                color: '#f8fafc',
                padding: '8px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.8rem',
              }}
            >
              <div style={{ fontWeight: 700, color: '#f472b6' }}>Kids Kurti (4Y)</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>KRN-KT-04Y-010 • ₹899</div>
            </button>

            <button
              type="button"
              onClick={() => handleProcessBarcode('KRN-BC-DBU-006')}
              style={{
                background: '#1e293b',
                border: '1px solid #10b981',
                color: '#f8fafc',
                padding: '8px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.8rem',
              }}
            >
              <div style={{ fontWeight: 700, color: '#34d399' }}>Dabu Bed Cover</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>KRN-BC-DBU-006 • ₹3,499</div>
            </button>

            <button
              type="button"
              onClick={() => handleProcessBarcode('KRN-CS-SET-017')}
              style={{
                background: '#1e293b',
                border: '1px solid #f59e0b',
                color: '#f8fafc',
                padding: '8px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.8rem',
              }}
            >
              <div style={{ fontWeight: 700, color: '#fbbf24' }}>Cushion Set (5 pcs)</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>KRN-CS-SET-017 • ₹999</div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #1e293b',
            background: '#1e293b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Supports laptop webcams, phone cameras & USB hardware scanners
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              padding: '8px 18px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Done Scanning
          </button>
        </div>
      </div>
    </div>
  );
};
