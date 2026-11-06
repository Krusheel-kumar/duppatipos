import React, { useState, useEffect } from 'react';
import {
  getThermalPrinterConfig,
  saveThermalPrinterConfig,
  pairWebUsbPrinter,
  pairWebSerialPrinter,
  printTestReceipt,
  isWebUSBSupported,
  isWebSerialSupported,
  type ThermalPrinterConfig,
} from '../services/thermalPrinterService';

interface PrinterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrinterSettingsModal: React.FC<PrinterSettingsModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<ThermalPrinterConfig>(getThermalPrinterConfig());
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [connectedDeviceName, setConnectedDeviceName] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig(getThermalPrinterConfig());
      setStatusMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveThermalPrinterConfig(config);
    setStatusMsg({ type: 'success', text: 'Hardware printer settings saved successfully.' });
    setTimeout(() => {
      onClose();
    }, 800);
  };

  const handlePairUSB = async () => {
    setIsBusy(true);
    setStatusMsg(null);
    try {
      const name = await pairWebUsbPrinter();
      setConnectedDeviceName(name);
      setConfig((prev: ThermalPrinterConfig) => ({ ...prev, connection: 'WEB_USB' }));
      saveThermalPrinterConfig({ ...config, connection: 'WEB_USB' });
      setStatusMsg({ type: 'success', text: `Connected to ${name} via WebUSB!` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err?.message || 'Failed to pair USB printer.' });
    } finally {
      setIsBusy(false);
    }
  };

  const handlePairSerial = async () => {
    setIsBusy(true);
    setStatusMsg(null);
    try {
      const name = await pairWebSerialPrinter();
      setConnectedDeviceName(name);
      setConfig((prev: ThermalPrinterConfig) => ({ ...prev, connection: 'WEB_SERIAL' }));
      saveThermalPrinterConfig({ ...config, connection: 'WEB_SERIAL' });
      setStatusMsg({ type: 'success', text: `Connected to ${name}!` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err?.message || 'Failed to open Serial port.' });
    } finally {
      setIsBusy(false);
    }
  };

  const handleTestPrint = async () => {
    setIsBusy(true);
    setStatusMsg(null);
    try {
      const success = await printTestReceipt();
      if (success) {
        setStatusMsg({ type: 'success', text: 'Test slip printed directly on thermal printer!' });
      } else {
        setStatusMsg({
          type: 'error',
          text: 'No active device responded. Please click "Pair USB Printer" or select "Browser Print Dialog".',
        });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err?.message || 'Error executing test print.' });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="printer-modal-title">
      <div
        className="modal-container"
        style={{
          maxWidth: '560px',
          width: '90%',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 20px 45px rgba(15, 23, 42, 0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.6rem' }}>🖨️</span>
            <div>
              <h3 id="printer-modal-title" style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                Thermal Printer Settings
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                Configure ESC/POS receipt &amp; KOT printing
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {statusMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '16px',
              backgroundColor: statusMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
              color: statusMsg.type === 'success' ? '#15803d' : '#b91c1c',
              border: `1px solid ${statusMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            }}
          >
            {statusMsg.text}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Hardware Connection Mode */}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              Printing Connection Mode
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setConfig({ ...config, connection: 'WEB_USB' })}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: config.connection === 'WEB_USB' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  backgroundColor: config.connection === 'WEB_USB' ? '#eff6ff' : '#f8fafc',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  color: config.connection === 'WEB_USB' ? '#1d4ed8' : '#334155',
                }}
              >
                Direct WebUSB
              </button>
              <button
                type="button"
                onClick={() => setConfig({ ...config, connection: 'WEB_SERIAL' })}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: config.connection === 'WEB_SERIAL' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  backgroundColor: config.connection === 'WEB_SERIAL' ? '#eff6ff' : '#f8fafc',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  color: config.connection === 'WEB_SERIAL' ? '#1d4ed8' : '#334155',
                }}
              >
                Serial / COM Port
              </button>
              <button
                type="button"
                onClick={() => setConfig({ ...config, connection: 'BROWSER_POPUP' })}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: config.connection === 'BROWSER_POPUP' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  backgroundColor: config.connection === 'BROWSER_POPUP' ? '#eff6ff' : '#f8fafc',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  color: config.connection === 'BROWSER_POPUP' ? '#1d4ed8' : '#334155',
                }}
              >
                Browser Dialog
              </button>
            </div>
          </div>

          {/* Device Pairing Actions */}
          {config.connection !== 'BROWSER_POPUP' && (
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '8px' }}>
                {config.connection === 'WEB_USB'
                  ? 'Connect standard USB thermal printer (Caysn, Epson, Xprinter, etc.). Note: If Windows has already locked the device with "usbprint", use "Browser Dialog" for instant 100% compatible printing.'
                  : 'Connect thermal printer via RS-232 / USB-to-Serial virtual COM port.'}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {config.connection === 'WEB_USB' && (
                  <button
                    type="button"
                    disabled={isBusy || !isWebUSBSupported()}
                    onClick={handlePairUSB}
                    style={{
                      padding: '8px 14px',
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    {isBusy ? 'Pairing...' : '🔌 Pair USB Printer'}
                  </button>
                )}
                {config.connection === 'WEB_SERIAL' && (
                  <button
                    type="button"
                    disabled={isBusy || !isWebSerialSupported()}
                    onClick={handlePairSerial}
                    style={{
                      padding: '8px 14px',
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    {isBusy ? 'Pairing...' : '🔌 Select Serial Port'}
                  </button>
                )}
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleTestPrint}
                  style={{
                    padding: '8px 14px',
                    background: '#f1f5f9',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  📄 Test Print Slip
                </button>
              </div>
              {connectedDeviceName && (
                <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>
                  Active Device: {connectedDeviceName}
                </div>
              )}
            </div>
          )}

          {/* Paper Width */}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              Paper Roll Width
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="paperWidth"
                  checked={config.paperWidth === '80mm'}
                  onChange={() => setConfig({ ...config, paperWidth: '80mm' })}
                />
                80mm (Standard POS - 48 columns)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="paperWidth"
                  checked={config.paperWidth === '58mm'}
                  onChange={() => setConfig({ ...config, paperWidth: '58mm' })}
                />
                58mm (Compact Mobile - 32 columns)
              </label>
            </div>
          </div>

          {/* Hardware Toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={config.autoCut}
                onChange={(e) => setConfig({ ...config, autoCut: e.target.checked })}
              />
              Automatic Paper Cut at end of receipt
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={config.openCashDrawerOnCash}
                onChange={(e) => setConfig({ ...config, openCashDrawerOnCash: e.target.checked })}
              />
              Kick open cash drawer (RJ11 pulse) on Cash settlement
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={config.buzzerOnKOT}
                onChange={(e) => setConfig({ ...config, buzzerOnKOT: e.target.checked })}
              />
              Sound internal alarm buzzer when Kitchen Order Ticket prints
            </label>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              background: '#0f172a',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
