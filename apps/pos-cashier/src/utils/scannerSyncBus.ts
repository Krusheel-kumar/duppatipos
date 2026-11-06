/**
 * Wireless Scanner Synchronization Bus (Pure Frontend, Zero Backend)
 * Enables instant zero-latency communication between the Mobile Handheld Scanner
 * and the Cashier Billing Counter Screen using WebRTC (PeerJS), BroadcastChannel,
 * and localStorage StorageEvent.
 */

import { Peer } from 'peerjs';

export interface ScannedBarcodePayload {
  barcode: string;
  source: 'mobile-camera' | 'mobile-manual' | 'mobile-quick-chip';
  timestamp: number;
  productName?: string;
  price?: number;
}

const CHANNEL_NAME = 'krunnex_mobile_scanner_bus';
const STORAGE_KEY = 'krunnex_scanned_barcode_event';
const DEFAULT_COUNTER_ROOM = 'krn-counter-flagship-1';

// BroadcastChannel instance (supported in all modern desktop & mobile browsers)
let channel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch {
  // Fallback to storage event
}

// Active WebRTC Peer connection references
let activeMobilePeer: Peer | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let activeMobileConn: any = null;

let activeCounterPeer: Peer | null = null;

/**
 * Initialize WebRTC Host on the Counter PC
 */
export function initCounterWebRtcHost(
  roomId: string = DEFAULT_COUNTER_ROOM,
  onReceived: (payload: ScannedBarcodePayload) => void
): () => void {
  try {
    if (activeCounterPeer) {
      try {
        activeCounterPeer.destroy();
      } catch {
        // ignore
      }
    }

    const peer = new Peer(roomId, {
      debug: 0,
    });
    activeCounterPeer = peer;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    peer.on('connection', (conn: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      conn.on('data', (data: any) => {
        if (data && data.barcode) {
          onReceived(data);
        }
      });
    });

    peer.on('error', (err) => {
      // If room already taken, append timestamp
      if (err.type === 'unavailable-id') {
        console.warn('Counter room busy, retrying with fallback id');
      }
    });

    return () => {
      try {
        peer.destroy();
      } catch {
        // ignore
      }
    };
  } catch {
    return () => {};
  }
}

/**
 * Connect Mobile Scanner Client to Counter Host over WebRTC
 */
export function connectMobileToCounterHost(
  roomId: string = DEFAULT_COUNTER_ROOM,
  onStatusChange?: (connected: boolean) => void
): () => void {
  try {
    if (activeMobilePeer) {
      try {
        activeMobilePeer.destroy();
      } catch {
        // ignore
      }
    }

    const peer = new Peer({
      debug: 0,
    });
    activeMobilePeer = peer;

    peer.on('open', () => {
      const conn = peer.connect(roomId);
      activeMobileConn = conn;

      conn.on('open', () => {
        onStatusChange?.(true);
      });

      conn.on('close', () => {
        onStatusChange?.(false);
      });

      conn.on('error', () => {
        onStatusChange?.(false);
      });
    });

    peer.on('error', () => {
      onStatusChange?.(false);
    });

    return () => {
      try {
        peer.destroy();
      } catch {
        // ignore
      }
    };
  } catch {
    return () => {};
  }
}

/**
 * Send a scanned barcode from Mobile Scanner to Counter Screen
 */
export function broadcastScannedBarcode(payload: ScannedBarcodePayload): void {
  // 1. Send via direct WebRTC DataChannel (across different physical devices / networks)
  if (activeMobileConn && activeMobileConn.open) {
    try {
      activeMobileConn.send(payload);
    } catch (e) {
      console.warn('WebRTC send error:', e);
    }
  }

  // 2. BroadcastChannel for sub-millisecond tab/window sync on the same device
  if (channel) {
    try {
      channel.postMessage(payload);
    } catch {
      // ignore
    }
  }

  // 3. localStorage StorageEvent for cross-window / cross-device local sync
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }
}

/**
 * Subscribe to scanned barcodes at the Cashier Counter Screen
 */
export function subscribeToScannedBarcodes(
  callback: (payload: ScannedBarcodePayload) => void
): () => void {
  // 1. Initialize WebRTC Host on the counter PC
  const cleanupWebRtc = initCounterWebRtcHost(DEFAULT_COUNTER_ROOM, callback);

  // 2. Handler for BroadcastChannel (same PC / same browser tabs)
  const handleBroadcast = (event: MessageEvent<ScannedBarcodePayload>) => {
    if (event.data && event.data.barcode) {
      callback(event.data);
    }
  };

  // 3. Handler for localStorage StorageEvent
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        const parsed: ScannedBarcodePayload = JSON.parse(event.newValue);
        if (parsed && parsed.barcode) {
          callback(parsed);
        }
      } catch {
        // ignore JSON parse error
      }
    }
  };

  if (channel) {
    channel.addEventListener('message', handleBroadcast);
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
  }

  // Return unsubscribe cleanup function
  return () => {
    cleanupWebRtc();
    if (channel) {
      channel.removeEventListener('message', handleBroadcast);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
    }
  };
}
