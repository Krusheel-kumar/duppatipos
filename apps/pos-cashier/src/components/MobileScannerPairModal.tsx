import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { IconCamera, IconPhone, IconEnter } from './icons';

interface MobileScannerPairModalProps {
  isOpen: boolean;
  onClose: () => void;
  lastScannedItem?: { name: string; barcode: string; time: number } | null;
}

export const MobileScannerPairModal: React.FC<MobileScannerPairModalProps> = ({
  isOpen,
  onClose,
  lastScannedItem,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [scannerUrl, setScannerUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [connectionMode, setConnectionMode] = useState<'wifi' | 'custom'>('wifi');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [wifiIp, setWifiIp] = useState<string>('192.168.29.170'); // Local Wi-Fi IP

  // Calculate actual reachable scanner URL
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  const port = typeof window !== 'undefined' && window.location.port ? window.location.port : '5173';
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';

  const localHostUrl = `${origin}${path}?mode=mobile-scanner`;
  const localWifiUrl = `${protocol}//${wifiIp}:${port}${path}?mode=mobile-scanner`;

  const activeUrl = connectionMode === 'custom' && customUrl.trim()
    ? (customUrl.includes('?') ? customUrl : `${customUrl}?mode=mobile-scanner`)
    : localWifiUrl;

  useEffect(() => {
    setScannerUrl(activeUrl);
  }, [activeUrl]);

  useEffect(() => {
    if (!isOpen) return;

    QRCode.toDataURL(activeUrl, {
      width: 240,
      margin: 2,
      color: {
        dark: '#090d16',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate pairing QR:', err));
  }, [isOpen, activeUrl]);

  const handleCopyLink = () => {
    if (!scannerUrl) return;
    navigator.clipboard.writeText(scannerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenLocalTest = () => {
    window.open(localHostUrl, '_blank', 'width=420,height=820');
  };

  if (!isOpen) return null;

  return (
    <div className="pos-ref-modal-overlay" style={{ zIndex: 1150 }}>
      <div
        className="pos-ref-modal-content"
        style={{
          maxWidth: '520px',
          width: '92%',
          background: '#0f172a',
          color: '#f8fafc',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
          border: '1px solid #334155',
        }}
      >
        {/* Modal Header */}
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
            <span style={{ display: 'inline-flex', alignItems: 'center', color: '#10b981' }}>
              <IconPhone size={22} />
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                Wireless Mobile Scanner Pairing
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                Turn any smartphone into a wireless retail barcode gun
              </p>
            </div>
          </div>
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

        {/* Pairing Instructions & QR Code */}
        <div style={{ padding: '20px 20px', textAlign: 'center' }}>
          {/* Connection Mode Pill Selector */}
          <div
            style={{
              display: 'inline-flex',
              background: '#090d16',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid #334155',
              marginBottom: '16px',
            }}
          >
            <button
              type="button"
              onClick={() => setConnectionMode('wifi')}
              style={{
                background: connectionMode === 'wifi' ? '#2563eb' : 'transparent',
                color: connectionMode === 'wifi' ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              📶 Same Wi-Fi (Mobile)
            </button>
            <button
              type="button"
              onClick={() => setConnectionMode('custom')}
              style={{
                background: connectionMode === 'custom' ? '#2563eb' : 'transparent',
                color: connectionMode === 'custom' ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🌐 Custom Tunnel / Web URL
            </button>
          </div>

          {connectionMode === 'wifi' && (
            <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>PC Wi-Fi IP:</span>
              <input
                type="text"
                value={wifiIp}
                onChange={(e) => setWifiIp(e.target.value)}
                style={{
                  background: '#090d16',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  color: '#38bdf8',
                  fontSize: '0.78rem',
                  fontFamily: 'monospace',
                  width: '140px',
                  textAlign: 'center',
                }}
              />
            </div>
          )}

          {connectionMode === 'custom' && (
            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="Paste your live tunnel URL (e.g. https://...)"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                style={{
                  background: '#090d16',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  color: '#38bdf8',
                  fontSize: '0.78rem',
                  width: '90%',
                  textAlign: 'center',
                }}
              />
            </div>
          )}

          <p style={{ margin: '0 0 14px 0', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.4 }}>
            Scan with phone camera or tap <strong>Test on PC (Popup)</strong> below to scan tag barcodes!
          </p>

          {/* QR Code Container */}
          <div
            style={{
              display: 'inline-flex',
              padding: '12px',
              background: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
              marginBottom: '14px',
            }}
          >
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Scan to open Mobile Scanner"
                style={{ width: '220px', height: '220px', display: 'block', borderRadius: '8px' }}
              />
            ) : (
              <div
                style={{
                  width: '220px',
                  height: '220px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                }}
              >
                Generating QR...
              </div>
            )}
          </div>

          {/* Real-time Connection Status */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '9999px',
              background: '#064e3b',
              border: '1px solid #059669',
              color: '#6ee7b7',
              fontSize: '0.8rem',
              fontWeight: 600,
              marginBottom: '16px',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 8px #10b981',
                animation: 'pulse 1.5s infinite',
              }}
            />
            <span>Counter Ready: Listening for Wireless Scans</span>
          </div>

          {/* Last Scanned Feedback Toast inside Pairing Modal */}
          {lastScannedItem && Date.now() - lastScannedItem.time < 5000 && (
            <div
              style={{
                background: '#047857',
                border: '1px solid #10b981',
                borderRadius: '8px',
                padding: '8px 14px',
                marginBottom: '16px',
                fontSize: '0.82rem',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <span>✓ Received scan:</span>
              <strong>{lastScannedItem.name}</strong>
              <span style={{ opacity: 0.85, fontFamily: 'monospace' }}>({lastScannedItem.barcode})</span>
            </div>
          )}

          {/* Direct URL Box */}
          <div
            style={{
              background: '#090d16',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '8px 12px',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '0.75rem', color: '#38bdf8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
              {scannerUrl}
            </span>
            <a
              href={scannerUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: '0.75rem',
                color: '#60a5fa',
                textDecoration: 'underline',
                whiteSpace: 'nowrap',
                fontWeight: 600,
              }}
            >
              Open ↗
            </a>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={handleOpenLocalTest}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '10px 14px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              <IconCamera size={16} />
              <span>Test on PC (Popup)</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                background: copied ? '#059669' : '#334155',
                color: '#ffffff',
                border: 'none',
                padding: '10px 14px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'background 0.2s ease',
              }}
            >
              <IconEnter size={15} />
              <span>{copied ? '✓ Link Copied!' : 'Copy Mobile Link'}</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
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
            Instant zero-setup sync across phone and billing counter
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#475569',
              color: '#ffffff',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
