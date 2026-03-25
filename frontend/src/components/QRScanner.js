import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

// Camera API only works in secure contexts (localhost / HTTPS).
// On plain HTTP (phone over LAN) we fall back to a file‑input picker.
const isSecure = window.isSecureContext;

// ── Global error handler for uncaught promise rejections ──────────────────────
// Suppress known benign errors from html5-qrcode that don't need user attention
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason?.message || String(event.reason);
    const benignPatterns = [
      'play() request was interrupted',
      'media was removed',
      'AbortError',
      'Cannot transition',
      'already under transition',
      'not running or paused',
      'Cannot stop',
      'No MultiFormat Readers',
    ];
    if (benignPatterns.some(p => msg.includes(p))) {
      event.preventDefault(); // suppress the error
    }
  });
}

// ── Suppress benign AbortError from HTMLVideoElement.play() ──────────────────
// html5-qrcode calls video.play() without catching AbortError, which leaks as
// an uncaught rejection when the video element is removed during StrictMode
// double-mount cleanup. Monkey-patching once at module load fixes this globally.
if (typeof window !== 'undefined' && !HTMLVideoElement.prototype._qrScannerPatched) {
  const _origPlay = HTMLVideoElement.prototype.play;
  HTMLVideoElement.prototype.play = function patchedPlay() {
    return _origPlay.call(this).catch((err) => {
      if (err?.name === 'AbortError' || err?.message?.includes('media was removed')) {
        return; // benign — suppress silently
      }
      throw err;
    });
  };
  HTMLVideoElement.prototype._qrScannerPatched = true;
}

// ── Filter known-benign html5-qrcode lifecycle messages ──────────────────────
const isBenignError = (err) => {
  const msg = typeof err === 'string' ? err : err?.message ?? String(err);
  return (
    msg.includes('Cannot stop') ||
    msg.includes('not running or paused') ||
    msg.includes('Cannot transition') ||
    msg.includes('already under transition') ||
    msg.includes('play()') ||
    msg.includes('AbortError') ||
    msg.includes('media was removed') ||
    msg.includes('interrupted') ||
    msg.includes('No MultiFormat Readers')  // no QR in frame — always expected
  );
};

/* ──────────────────────────────────────────────────────────────────────
   LIVE SCANNER  (secure context only)
   Uses html5-qrcode directly — no third-party React wrapper.
────────────────────────────────────────────────────────────────────── */
let _globalSeq = 0; // generation counter, prevents StrictMode double-mount races

const LiveScanner = ({ onScanSuccess, paused, onError }) => {
  const containerRef  = useRef(null);
  const onSuccessRef  = useRef(onScanSuccess);
  const onErrorRef    = useRef(onError);
  const processingRef = useRef(false);
  const scannerRef    = useRef(null);
  const [containerId] = useState(() => `qr-live-${Math.random().toString(36).slice(2)}`);

  useEffect(() => { onSuccessRef.current = onScanSuccess; });
  useEffect(() => { onErrorRef.current   = onError; });
  useEffect(() => { if (!paused) processingRef.current = false; }, [paused]);

  useEffect(() => {
    const mySeq = ++_globalSeq;
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';   // clean slate

    const scanner = new Html5Qrcode(containerId, { verbose: false, disableFlip: false });
    scannerRef.current = scanner;
    let started   = false;

    const startScanning = async () => {
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 230, height: 230 }, aspectRatio: 1 },
          (text) => {
            if (processingRef.current || _globalSeq !== mySeq) return;
            processingRef.current = true;
            if (navigator.vibrate) navigator.vibrate(200);
            onSuccessRef.current?.(text);
          },
          (err) => { if (!isBenignError(err)) onErrorRef.current?.(typeof err === 'string' ? err : err?.message ?? String(err)); },
        );
        started = true;
        if (_globalSeq !== mySeq) {
          scanner.stop().catch(() => {});
        }
      } catch (err) {
        if (isBenignError(err)) return;         // ← suppress StrictMode noise
        console.warn('[LiveScanner] start failed:', err);
        onErrorRef.current?.(err?.message ?? String(err));
      }
    };

    startScanning();

    return () => {
      _globalSeq++;
      if (scannerRef.current) {
        const s = scannerRef.current;
        scannerRef.current = null;
        if (started || !started) {  // attempt stop regardless of state
          s.stop()
            .catch(() => {})
            .finally(() => {
              s.clear().catch(() => {});
              try { if (container) container.innerHTML = ''; } catch { /* ignore */ }
            });
        }
      }
    };
  }, [containerId]);

  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
      <div id={containerId} ref={containerRef} style={{ width: '100%' }} />
      {/* Scan‑box overlay */}
      {!paused && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{
            position: 'absolute', left: '50%', top: '50%',
            transform: 'translate(-50%,-50%)',
            width: 230, height: 230,
            border: '2px solid rgba(22,163,74,0.4)', borderRadius: 12,
          }}>
            {[
              { top: -2, left: -2, borderTop: '4px solid #16a34a', borderLeft: '4px solid #16a34a', borderRadius: '12px 0 0 0' },
              { top: -2, right: -2, borderTop: '4px solid #16a34a', borderRight: '4px solid #16a34a', borderRadius: '0 12px 0 0' },
              { bottom: -2, left: -2, borderBottom: '4px solid #16a34a', borderLeft: '4px solid #16a34a', borderRadius: '0 0 0 12px' },
              { bottom: -2, right: -2, borderBottom: '4px solid #16a34a', borderRight: '4px solid #16a34a', borderRadius: '0 0 12px 0' },
            ].map((s, i) => <div key={i} style={{ position: 'absolute', width: 28, height: 28, ...s }} />)}
            <div style={{
              position: 'absolute', left: 4, right: 4, height: 2,
              background: 'linear-gradient(90deg,transparent,#16a34a,transparent)',
              animation: 'scanLine 2s ease-in-out infinite',
            }} />
          </div>
          <style>{`
            @keyframes scanLine {
              0%,100% { top: 8px; }
              50%      { top: calc(100% - 10px); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────
   PHOTO SCANNER  (HTTP / non-secure context)
   No getUserMedia — opens native camera via <input capture>.
   Decodes with BarcodeDetector → Html5Qrcode.scanFile fallback.
────────────────────────────────────────────────────────────────────── */
const PhotoScanner = ({ onScanSuccess }) => {
  const inputRef  = useRef(null);
  const busyRef   = useRef(false);
  const [status, setStatus] = useState('idle'); // idle | decoding | error

  const handleFile = async (e) => {
    const file = e.target?.files?.[0];
    e.target.value = '';
    if (!file || busyRef.current) return;
    busyRef.current = true;
    setStatus('decoding');

    try {
      const text = await decodeImageFile(file);
      if (!text?.trim()) {
        throw new Error('No QR code found in image');
      }
      busyRef.current = false;
      setStatus('idle');
      if (navigator.vibrate) navigator.vibrate(200);
      onScanSuccess(text);
    } catch (err) {
      console.warn('[PhotoScanner]', err?.message || err);
      busyRef.current = false;
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <div style={{
      width: '100%', borderRadius: 12,
      border: '2px dashed #86efac', background: '#f0fdf4',
      padding: '2.5rem 1.5rem', textAlign: 'center',
    }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFile}
      />

      {status === 'decoding' ? (
        <>
          <div style={{
            width: 52, height: 52, margin: '0 auto 1rem',
            border: '4px solid #16a34a', borderTopColor: 'transparent',
            borderRadius: '50%', animation: 'qrSpin 0.8s linear infinite',
          }} />
          <p style={{ fontWeight: 600, color: '#15803d' }}>Decoding QR code…</p>
          <style>{`@keyframes qrSpin { to { transform: rotate(360deg); } }`}</style>
        </>
      ) : (
        <>
          <div style={{ fontSize: '3rem', lineHeight: 1, marginBottom: '0.75rem' }}>📷</div>
          <p style={{ fontWeight: 700, fontSize: '1rem', color: '#111827', marginBottom: '0.35rem' }}>
            Tap to scan QR code
          </p>
          <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            Your camera will open — point it at the QR code and capture.
          </p>

          {status === 'error' && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 8, padding: '0.6rem 0.75rem',
              color: '#b91c1c', fontSize: '0.8rem', marginBottom: '1rem',
            }}>
              ⚠️ Could not read QR code. Please try a clearer, closer photo.
            </div>
          )}

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.5rem', width: '100%', maxWidth: 280,
              padding: '0.85rem 1.25rem', borderRadius: 10,
              background: '#16a34a', color: '#fff',
              fontWeight: 700, fontSize: '1rem',
              border: 'none', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(22,163,74,0.3)',
            }}
          >
            📸 Open Camera
          </button>
        </>
      )}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────
   DECODE HELPER — BarcodeDetector → Html5Qrcode fallback
────────────────────────────────────────────────────────────────────── */
async function decodeImageFile(file) {
  // Validate file
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('Invalid file type. Please select an image.');
  }

  // Strategy 1: Native BarcodeDetector (Android Chrome)
  if ('BarcodeDetector' in window) {
    try {
      const det  = new window.BarcodeDetector({ formats: ['qr_code'] });
      const url  = URL.createObjectURL(file);
      const img  = new Image();
      
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = url;
      });

      const hits = await det.detect(img);
      URL.revokeObjectURL(url);

      if (hits && hits.length > 0) {
        const result = hits[0].rawValue;
        if (result?.trim()) return result;
      }
    } catch (e) {
      console.debug('[decodeImageFile] BarcodeDetector fallback:', e?.message);
      /* fall through to Html5Qrcode */
    }
  }

  // Strategy 2: Html5Qrcode.scanFile (more reliable)
  const DECODER_ID = '__qr_file_decode_div_' + Math.random().toString(36).slice(2);
  let decoderDiv = document.getElementById(DECODER_ID);
  
  if (!decoderDiv) {
    decoderDiv = document.createElement('div');
    decoderDiv.id = DECODER_ID;
    decoderDiv.style.display = 'none';
    document.body.appendChild(decoderDiv);
  }

  const inst = new Html5Qrcode(DECODER_ID, { verbose: false });
  try {
    const text = await inst.scanFile(file, false);
    if (!text?.trim()) {
      throw new Error('No QR code detected in image');
    }
    return text;
  } catch (e) {
    throw new Error(e?.message || 'Could not decode QR code. Try a different image.');
  } finally {
    try { 
      inst.clear(); 
    } catch { /* ignore */ }
    try { 
      if (decoderDiv?.parentNode) {
        decoderDiv.parentNode.removeChild(decoderDiv);
      }
    } catch { /* ignore */ }
  }
}

/* ──────────────────────────────────────────────────────────────────────
   MAIN EXPORT
────────────────────────────────────────────────────────────────────── */
const QRScanner = ({ onScanSuccess, paused, onError }) =>
  isSecure
    ? <LiveScanner onScanSuccess={onScanSuccess} paused={paused} onError={onError} />
    : <PhotoScanner onScanSuccess={onScanSuccess} onError={onError} />;

export default QRScanner;
