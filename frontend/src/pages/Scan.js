import React, { useState, useRef } from 'react';
import {
  CheckCircle, User, LogOut,
  AlertCircle, Loader, Search,
} from 'lucide-react';
import { formatTime } from '../mockData';
import API_BASE from '../api';

const Scan = () => {
  const [visitorId, setVisitorId]         = useState('');
  const [scannedVisitor, setScannedVisitor] = useState(null);
  const [checkedOut, setCheckedOut]         = useState(false);
  const [scanError, setScanError]           = useState('');
  const [lookupLoading, setLookupLoading]   = useState(false);
  const processingRef = useRef(false);

  /* ── Lookup visitor by ID ── */
  const handleLookupVisitor = async (e) => {
    e.preventDefault();
    if (processingRef.current) return;
    processingRef.current = true;
    setScanError('');
    setLookupLoading(true);

    const idToLookup = visitorId.trim();
    if (!idToLookup) {
      setScanError('Please enter a visitor ID.');
      setLookupLoading(false);
      processingRef.current = false;
      return;
    }

    // 1. Backend
    try {
      const res = await fetch(`${API_BASE}/api/visitors/${idToLookup}`);
      if (res.ok) {
        const visitor = await res.json();
        setLookupLoading(false);
        if (visitor.status === 'active') {
          setScannedVisitor(visitor);
          await performCheckout(visitor, idToLookup);
        } else {
          setScannedVisitor(visitor);
          setCheckedOut(false);
        }
        processingRef.current = false;
        return;
      }
    } catch { /* unreachable */ }

    // 2. localStorage fallback
    const stored = JSON.parse(localStorage.getItem('guardplus_visitors') || '[]');
    const found  = stored.find((v) => v.id === idToLookup);
    if (found) {
      if (found.status === 'active') {
        setScannedVisitor(found);
        await performCheckout(found, idToLookup);
      } else {
        setScannedVisitor(found);
        setCheckedOut(false);
      }
    } else {
      setScanError('Visitor not found. Please check the ID and try again.');
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
    setVisitorId('');
    setScannedVisitor(null);
    setCheckedOut(false);
    setScanError('');
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
            <LogOut size={24} color="#16a34a" /> Check Out Visitor
          </h1>
          <p className="page-desc">Enter a visitor's ID to check them out at the exit gate</p>
        </div>

        {/* ══════════════════════════════════════════
            IDLE — show input form
        ══════════════════════════════════════════ */}
        {!lookupLoading && !scannedVisitor && (
          <div className="card">
            <div className="card-body" style={{ padding: '2rem 1.5rem' }}>
              <div style={{
                width: 84, height: 84, borderRadius: '50%',
                background: '#dcfce7', color: '#16a34a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.25rem',
              }}>
                <Search size={42} />
              </div>

              <h2 style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.4rem', textAlign: 'center' }}>
                Enter Visitor ID
              </h2>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.75rem', textAlign: 'center' }}>
                Enter the visitor's ID to retrieve their details
              </p>

              {scanError && (
                <div className="alert alert-error" style={{ textAlign: 'left', marginBottom: '1.25rem' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} /> {scanError}
                </div>
              )}

              <form onSubmit={handleLookupVisitor} style={{ display: 'flex', gap: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Enter visitor ID"
                  value={visitorId}
                  onChange={(e) => setVisitorId(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    fontSize: '1rem',
                    fontWeight: 500,
                    outline: 'none',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#16a34a'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  <Search size={18} /> Search
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            LOADING (after lookup started)
        ══════════════════════════════════════════ */}
        {lookupLoading && (
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
            RESULT CARD (shown after lookup complete)
        ══════════════════════════════════════════ */}
        {scannedVisitor && (
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
                <LogOut size={16} /> Check Out Next Visitor
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
