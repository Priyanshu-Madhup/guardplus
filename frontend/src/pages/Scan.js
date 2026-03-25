import React, { useState, useRef } from 'react';
import {
  QrCode, CheckCircle, User, ScanLine,
  AlertCircle, Loader,
} from 'lucide-react';
import QRScanner from '../components/QRScanner';
import { formatTime } from '../mockData';
import API_BASE from '../api';

const Scan = () => {
  const [scanning, setScanning]           = useState(false);
  const [scannedVisitor, setScannedVisitor] = useState(null);
  const [checkedOut, setCheckedOut]         = useState(false);
  const [scanError, setScanError]           = useState('');
  const [cameraError, setCameraError]       = useState('');
  const [lookupLoading, setLookupLoading]   = useState(false);
  const processingRef = useRef(false);

  /* ── Lookup visitor by ID ── */
  const handleScan = async (raw) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setScanError('');
    setLookupLoading(true);

    if (!raw?.trim()) {
      setScanError('Empty QR code. Please try again.');
      setLookupLoading(false);
      processingRef.current = false;
      return;
    }

    // Support both plain-ID and JSON payloads
    let visitorId = raw.trim();
    try { const p = JSON.parse(raw); if (p.id) visitorId = p.id; } catch { /* plain */ }

    // 1. Backend
    try {
      const res = await fetch(`${API_BASE}/api/visitors/${visitorId}`);
      if (res.ok) {
        const visitor = await res.json();
        setLookupLoading(false);
        if (visitor.status === 'active') {
          setScannedVisitor(visitor);
          await performCheckout(visitor, visitorId);
        } else {
          setScannedVisitor(visitor);
          setCheckedOut(false);
        }
        return;
      }
    } catch { /* unreachable */ }

    // 2. localStorage fallback
    const stored = JSON.parse(localStorage.getItem('guardplus_visitors') || '[]');
    const found  = stored.find((v) => v.id === visitorId);
    if (found) {
      if (found.status === 'active') {
        setScannedVisitor(found);
        await performCheckout(found, visitorId);
      } else {
        setScannedVisitor(found);
        setCheckedOut(false);
      }
    } else {
      setScanError('Visitor not found. This QR code is not registered.');
      processingRef.current = false;
    }
    setLookupLoading(false);
  };

  /* ── Checkout visitor ── */
  const performCheckout = async (visitor, visitorId) => {
    const exitTime = new Date().toISOString();
    try {
      const res = await fetch(`${API_BASE}/api/visitors/${visitorId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exitTime }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      const stored  = JSON.parse(localStorage.getItem('guardplus_visitors') || '[]');
      localStorage.setItem('guardplus_visitors',
        JSON.stringify(stored.map((v) => v.id === updated.id ? { ...v, status: 'exited', exitTime } : v))
      );
      setScannedVisitor(updated);
      setCheckedOut(true);
    } catch {
      const stored = JSON.parse(localStorage.getItem('guardplus_visitors') || '[]');
      localStorage.setItem('guardplus_visitors',
        JSON.stringify(stored.map((v) => v.id === visitorId ? { ...v, status: 'exited', exitTime } : v))
      );
      setScannedVisitor((p) => ({ ...p, status: 'exited', exitTime }));
      setCheckedOut(true);
    }
  };

  const reset = () => {
    setScannedVisitor(null);
    setCheckedOut(false);
    setScanError('');
    setCameraError('');
    setLookupLoading(false);
    processingRef.current = false;
  };

  /* ── STATUS COLOUR HELPERS ── */
  const statusColor = () =>
    checkedOut ? '#15803d' : scannedVisitor?.status === 'exited' ? '#92400e' : '#1e40af';
  const statusBg = () =>
    checkedOut ? '#dcfce7' : scannedVisitor?.status === 'exited' ? '#fef3c7' : '#dbeafe';
  const statusLabel = () =>
    checkedOut ? 'Checked Out!' : scannedVisitor?.status === 'exited' ? 'Already Exited' : 'Visitor Found';

  return (
    <div className="page-wrapper">
      <div className="scan-page">

        {/* Header */}
        <div className="page-header">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ScanLine size={24} color="#16a34a" /> QR Scanner
          </h1>
          <p className="page-desc">Scan a visitor's QR code at the exit gate to check them out</p>
        </div>

        {/* ══════════════════════════════════════════
            IDLE — show start button
        ══════════════════════════════════════════ */}
        {!scanning && !lookupLoading && !scannedVisitor && (
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <div style={{
                width: 84, height: 84, borderRadius: '50%',
                background: '#dcfce7', color: '#16a34a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.25rem',
              }}>
                <QrCode size={42} />
              </div>

              <h2 style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.4rem' }}>
                Ready to Scan
              </h2>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
                Press the button below — your camera will open automatically
              </p>

              {scanError && (
                <div className="alert alert-error" style={{ textAlign: 'left', marginBottom: '1.25rem' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} /> {scanError}
                </div>
              )}

              <button
                className="btn btn-primary btn-lg"
                onClick={() => { setScanError(''); setCameraError(''); setScanning(true); }}
              >
                <QrCode size={20} /> Open Scanner
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            LOADING (after scan, before lookup done)
        ══════════════════════════════════════════ */}
        {!scanning && lookupLoading && (
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <Loader
                size={40} color="#16a34a"
                style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }}
              />
              <p style={{ fontWeight: 600 }}>Looking up visitor…</p>
              <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>Just a moment</p>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            RESULT CARD (shown after successful scan
            when scanner is already closed)
        ══════════════════════════════════════════ */}
        {!scanning && scannedVisitor && (
          <div className="card" style={{ animation: 'slideUp 0.3s ease-out' }}>
            <div className="card-body" style={{ padding: '1.5rem' }}>

              {/* Status banner */}
              <div style={{
                background: statusBg(), color: statusColor(),
                borderRadius: 10, padding: '0.6rem 1rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                fontWeight: 700, fontSize: '0.9rem', marginBottom: '1.25rem',
              }}>
                <CheckCircle size={18} /> {statusLabel()}
              </div>

              {/* Visitor row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: '1rem' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%', overflow: 'hidden',
                  background: '#f3f4f6', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0,
                }}>
                  {scannedVisitor.visitorPhoto
                    ? <img src={scannedVisitor.visitorPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <User size={24} color="#9ca3af" />}
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '1.05rem', margin: 0 }}>{scannedVisitor.name}</p>
                  <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: 0 }}>ID: {scannedVisitor.id}</p>
                </div>
              </div>

              {/* Detail grid */}
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', marginBottom: '1rem' }}>
                {[
                  ['Purpose', scannedVisitor.purpose || '—', 'Entry', formatTime(scannedVisitor.entryTime)],
                  ['Dept',    scannedVisitor.department || '—', 'Exit', scannedVisitor.exitTime ? formatTime(scannedVisitor.exitTime) : '–'],
                ].map((row, ri) => (
                  <div key={ri} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: ri === 0 ? '1px solid #e5e7eb' : 'none' }}>
                    {[0, 2].map((ci) => (
                      <div key={ci} style={{
                        padding: '0.65rem 0.9rem',
                        borderRight: ci === 0 ? '1px solid #e5e7eb' : 'none',
                      }}>
                        <p style={{ fontSize: '0.68rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.15rem' }}>{row[ci]}</p>
                        <p style={{ fontWeight: 600, fontSize: '0.88rem', margin: 0 }}>{row[ci + 1]}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <button className="btn btn-primary btn-block" onClick={reset}>
                <QrCode size={16} /> Scan Next Visitor
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            ACTIVE SCANNER VIEW
        ══════════════════════════════════════════ */}
        {scanning && (
          <div className="card" style={{ overflow: 'hidden' }}>

            {/* Card header */}
            <div className="card-header">
              <div className="card-header-icon"><QrCode size={20} /></div>
              <div>
                <p className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  QR Scanner
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                    background: '#dcfce7', color: '#16a34a',
                    fontSize: '0.68rem', fontWeight: 700,
                    padding: '0.15rem 0.5rem', borderRadius: 20,
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: '#16a34a',
                      animation: 'pulse 1.5s ease-in-out infinite',
                    }} />
                    ACTIVE
                  </span>
                </p>
                <p className="card-subtitle">
                  {lookupLoading ? 'Processing scan…' : window.isSecureContext ? 'Point camera at QR code' : 'Tap the button below to capture QR'}
                </p>
              </div>
            </div>

            {/* Scanner area */}
            <div className="card-body" style={{ padding: 0, position: 'relative' }}>
              <QRScanner
                onScanSuccess={handleScan}
                paused={!!scannedVisitor || lookupLoading}
                onError={(msg) => setCameraError(msg)}
              />

              {/* Camera error */}
              {cameraError && !lookupLoading && !scannedVisitor && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(0,0,0,0.78)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: '1.5rem', zIndex: 10,
                }}>
                  <AlertCircle size={36} color="#fbbf24" style={{ marginBottom: '0.75rem' }} />
                  <p style={{ color: '#fff', fontWeight: 600, textAlign: 'center', fontSize: '0.95rem', marginBottom: '0.4rem' }}>
                    Camera access failed
                  </p>
                  <p style={{ color: '#d1d5db', fontSize: '0.8rem', textAlign: 'center', lineHeight: 1.5 }}>
                    {cameraError}
                  </p>
                </div>
              )}

              {/* Loading overlay */}
              {lookupLoading && !scannedVisitor && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(0,0,0,0.6)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', zIndex: 10,
                }}>
                  <Loader size={36} color="#fff" style={{ animation: 'spin 1s linear infinite', marginBottom: '0.75rem' }} />
                  <p style={{ color: '#fff', fontWeight: 600 }}>Looking up visitor…</p>
                </div>
              )}

              {/* Scan error overlay */}
              {scanError && !lookupLoading && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(0,0,0,0.65)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: '1.5rem', zIndex: 10,
                }}>
                  <AlertCircle size={36} color="#f87171" style={{ marginBottom: '0.75rem' }} />
                  <p style={{ color: '#fff', fontWeight: 600, textAlign: 'center', marginBottom: '1rem' }}>{scanError}</p>
                  <button className="btn btn-secondary" onClick={reset}>Try Again</button>
                </div>
              )}

              {/* Result overlay */}
              {scannedVisitor && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(0,0,0,0.72)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '1.25rem', zIndex: 10,
                }}>
                  <div style={{
                    background: '#fff', borderRadius: 16, padding: '1.25rem',
                    width: '100%', maxWidth: 340,
                    animation: 'slideUp 0.3s ease-out',
                  }}>
                    {/* Status */}
                    <div style={{
                      background: statusBg(), color: statusColor(),
                      padding: '0.5rem 0.75rem', borderRadius: 8,
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.85rem',
                    }}>
                      <CheckCircle size={16} /> {statusLabel()}
                    </div>

                    {/* Visitor */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%', overflow: 'hidden',
                        background: '#f3f4f6', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', flexShrink: 0,
                      }}>
                        {scannedVisitor.visitorPhoto
                          ? <img src={scannedVisitor.visitorPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <User size={20} color="#9ca3af" />}
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>{scannedVisitor.name}</p>
                        <p style={{ color: '#6b7280', fontSize: '0.78rem', margin: 0 }}>ID: {scannedVisitor.id}</p>
                      </div>
                    </div>

                    {/* Mini details */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem', fontSize: '0.78rem', marginBottom: '0.9rem', color: '#374151' }}>
                      <div><span style={{ color: '#6b7280' }}>Purpose: </span>{scannedVisitor.purpose || '—'}</div>
                      <div><span style={{ color: '#6b7280' }}>Dept: </span>{scannedVisitor.department || '—'}</div>
                      <div><span style={{ color: '#6b7280' }}>Entry: </span>{formatTime(scannedVisitor.entryTime)}</div>
                      {scannedVisitor.exitTime && (
                        <div><span style={{ color: '#6b7280' }}>Exit: </span>{formatTime(scannedVisitor.exitTime)}</div>
                      )}
                    </div>

                    <button className="btn btn-primary btn-block" onClick={() => { reset(); }}>
                      <QrCode size={16} /> Scan Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '0.75rem 1rem' }}>
              <button
                className="btn btn-secondary btn-block"
                onClick={() => { setScanning(false); reset(); }}
              >
                Stop Scanner
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Scan;
