import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, AlertCircle, CheckCircle, Camera, Calendar, ShieldCheck, ShieldX, Loader } from 'lucide-react';
import CameraCapture from '../components/CameraCapture';
import API_BASE from '../api';

const DEPARTMENTS = [
  'Computer Science', 'Electronics', 'Mechanical', 'Civil',
  'Administration', 'Library', 'Management', 'Other',
];

const PURPOSES = [
  'Meeting', 'Delivery', 'Interview', 'Official Work',
  'Maintenance', 'Academics', 'Personal', 'Other',
];

const INITIAL_FORM = {
  name: '', phone: '', email: '',
  purpose: '', personToMeet: '', department: '',
};

const getNow = () => {
  const d = new Date();
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const display = d.toLocaleString([], {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
  return { dateStr, display, iso: d.toISOString() };
};

// ── Guard Verification Status Badge ─────────────────────────────────────────
const GuardVerificationBadge = ({ status, guardName }) => {
  if (status === 'idle') return null;

  if (status === 'verifying') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.6rem 1rem', borderRadius: 8,
        background: '#f0f9ff', border: '1px solid #bae6fd',
        color: '#0369a1', fontSize: '0.85rem', fontWeight: 500,
        marginTop: '0.75rem',
      }}>
        <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
        Verifying guard identity…
      </div>
    );
  }

  if (status === 'verified') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.6rem 1rem', borderRadius: 8,
        background: '#dcfce7', border: '1px solid #86efac',
        color: '#15803d', fontSize: '0.85rem', fontWeight: 600,
        marginTop: '0.75rem',
      }}>
        <ShieldCheck size={18} />
        Guard Verified: <span style={{ fontWeight: 700 }}>{guardName}</span>
      </div>
    );
  }

  if (status === 'no_face') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.6rem 1rem', borderRadius: 8,
        background: '#fff7ed', border: '1px solid #fed7aa',
        color: '#c2410c', fontSize: '0.85rem', fontWeight: 500,
        marginTop: '0.75rem',
      }}>
        <ShieldX size={18} />
        No face detected. Please take a clear, front-facing photo.
      </div>
    );
  }

  if (status === 'network_error') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.6rem 1rem', borderRadius: 8,
        background: '#fef3c7', border: '1px solid #fcd34d',
        color: '#92400e', fontSize: '0.85rem', fontWeight: 500,
        marginTop: '0.75rem',
      }}>
        <ShieldX size={18} />
        Cannot reach server. Make sure the backend is running with <code style={{ fontFamily: 'monospace', background: '#fde68a', padding: '0 3px', borderRadius: 3 }}>--host 0.0.0.0</code>.
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.6rem 1rem', borderRadius: 8,
        background: '#fee2e2', border: '1px solid #fca5a5',
        color: '#b91c1c', fontSize: '0.85rem', fontWeight: 500,
        marginTop: '0.75rem',
      }}>
        <ShieldX size={18} />
        Guard not recognized. Pass cannot be issued.
      </div>
    );
  }

  return null;
};

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [visitorPhoto, setVisitorPhoto] = useState(null);
  const [guardPhoto, setGuardPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [visitDateTime, setVisitDateTime] = useState(getNow);

  // Guard verification state
  const [guardVerifyStatus, setGuardVerifyStatus] = useState('idle'); // idle | verifying | verified | failed | no_face | network_error
  const [verifiedGuardName, setVerifiedGuardName] = useState('');

  useEffect(() => {
    const id = setInterval(() => setVisitDateTime(getNow()), 60000);
    return () => clearInterval(id);
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  // ── Reliable dataURL → Blob (works on Android Chrome; fetch(dataUrl) can fail) ──
  const dataURLtoBlob = (dataUrl) => {
    const [header, b64] = dataUrl.split(',');
    const mime = header.match(/:(.*?);/)[1];
    const bytes = atob(b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mime });
  };

  // ── Called whenever a guard photo is captured ────────────────────────────
  const handleGuardPhotoCapture = async (dataUrl) => {
    setGuardPhoto(dataUrl);
    setGuardVerifyStatus('verifying');
    setVerifiedGuardName('');

    try {
      // Convert base64 dataURL → Blob without fetch() (safe on all browsers/phones)
      const blob = dataURLtoBlob(dataUrl);
      const formData = new FormData();
      formData.append('image', blob, 'guard.jpg');

      const verifyRes = await fetch(`${API_BASE}/api/guards/verify`, {
        method: 'POST',
        body: formData,
      });

      if (!verifyRes.ok) {
        const errData = await verifyRes.json().catch(() => ({}));
        console.warn('Verify error:', errData.detail);
        const isNoFace = verifyRes.status === 400;
        setGuardVerifyStatus(isNoFace ? 'no_face' : 'failed');
        return;
      }

      const result = await verifyRes.json();

      if (result.verified) {
        setGuardVerifyStatus('verified');
        setVerifiedGuardName(result.guard);
      } else {
        setGuardVerifyStatus('failed');
      }
    } catch (err) {
      console.error('Guard verification failed:', err);
      // TypeError / Failed to fetch = backend unreachable
      const isNetwork = err instanceof TypeError || err.name === 'TypeError';
      setGuardVerifyStatus(isNetwork ? 'network_error' : 'failed');
    }
  };

  const validate = () => {
    if (!form.name.trim())                         return 'Visitor name is required.';
    if (!/^\d{10}$/.test(form.phone.trim()))       return 'Enter a valid 10-digit phone number.';
    if (!form.purpose)                             return 'Please select a purpose of visit.';
    if (!form.personToMeet.trim())                 return 'Person to meet is required.';
    if (!form.department)                          return 'Please select a department.';
    if (!guardPhoto)                               return 'Guard authorization photo is required.';
    if (guardVerifyStatus === 'verifying')         return 'Please wait — verifying guard identity…';
    if (guardVerifyStatus === 'no_face')           return 'No face detected in guard photo. Please retake.';
    if (guardVerifyStatus === 'network_error')     return 'Cannot connect to backend server. Start it with: uvicorn main:app --reload --port 8000 --host 0.0.0.0';
    if (guardVerifyStatus !== 'verified')          return 'Guard face not recognized. Cannot generate pass.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true);
    const id = `V-${Date.now().toString().slice(-6)}`;
    const snapshot = getNow();
    const visitor = {
      ...form,
      id,
      visitorPhoto,
      guardPhoto,
      entryTime: snapshot.iso,
      entryDate: snapshot.dateStr,
      exitTime: null,
      status: 'active',
      guard: verifiedGuardName,   // ← real guard name from DeepFace
    };

    try {
      const res = await fetch(`${API_BASE}/api/visitors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(visitor),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const saved = await res.json();
      const { visitorPhoto: _vp, guardPhoto: _gp, ...lightRecord } = saved;
      const existing = JSON.parse(localStorage.getItem('guardplus_visitors') || '[]');
      try {
        localStorage.setItem('guardplus_visitors', JSON.stringify([lightRecord, ...existing]));
      } catch { /* quota */ }
      navigate(`/pass/${saved.id}`, { state: { visitor: saved } });
    } catch {
      const { visitorPhoto: _vp, guardPhoto: _gp, ...lightRecord } = visitor;
      const existing = JSON.parse(localStorage.getItem('guardplus_visitors') || '[]');
      try {
        localStorage.setItem('guardplus_visitors', JSON.stringify([lightRecord, ...existing]));
      } catch { /* quota */ }
      navigate(`/pass/${id}`, { state: { visitor } });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setVisitorPhoto(null);
    setGuardPhoto(null);
    setError('');
    setGuardVerifyStatus('idle');
    setVerifiedGuardName('');
  };

  return (
    <div className="page-wrapper">
      <div className="register-page">
        <div className="page-header">
          <h1 className="page-title">Register Visitor</h1>
          <p className="page-desc">Fill in the details below to generate a digital visitor pass.</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* ── Visitor Info Card ── */}
          <div className="card">
            <div className="card-header">
              <div className="card-header-icon"><UserPlus size={20} /></div>
              <div>
                <p className="card-title">Visitor Information</p>
                <p className="card-subtitle">Basic contact and visit details</p>
              </div>
            </div>
            <div className="card-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Visitor Name *</label>
                  <input
                    type="text" name="name" value={form.name}
                    onChange={handleChange} className="form-input"
                    placeholder="Full name" autoComplete="off"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="tel" name="phone" value={form.phone}
                    onChange={handleChange} className="form-input"
                    placeholder="10-digit mobile number" maxLength={10}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email" name="email" value={form.email}
                  onChange={handleChange} className="form-input"
                  placeholder="visitor@example.com"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Purpose of Visit *</label>
                  <select name="purpose" value={form.purpose} onChange={handleChange} className="form-select">
                    <option value="">Select purpose</option>
                    {PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <select name="department" value={form.department} onChange={handleChange} className="form-select">
                    <option value="">Select department</option>
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Person to Meet *</label>
                <input
                  type="text" name="personToMeet" value={form.personToMeet}
                  onChange={handleChange} className="form-input"
                  placeholder="Name of the person you are visiting"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Calendar size={14} /> Visit Date &amp; Time
                </label>
                <div
                  className="form-input"
                  style={{
                    background: '#f9fafb', color: 'var(--text)',
                    cursor: 'default', display: 'flex',
                    alignItems: 'center', gap: '0.5rem', fontWeight: 500,
                  }}
                >
                  <span style={{
                    background: '#dcfce7', color: '#15803d',
                    borderRadius: 4, padding: '2px 8px',
                    fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap',
                  }}>
                    AUTO
                  </span>
                  {visitDateTime.display}
                </div>
              </div>
            </div>
          </div>

          {/* ── Photo Capture Card ── */}
          <div className="card" style={{ marginTop: '1rem' }}>
            <div className="card-header">
              <div className="card-header-icon"><Camera size={20} /></div>
              <div>
                <p className="card-title">Photo Capture</p>
                <p className="card-subtitle">Capture visitor photo and verify guard identity</p>
              </div>
            </div>
            <div className="card-body">
              <div className="form-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <CameraCapture
                    label="Visitor Photo"
                    value={visitorPhoto}
                    onCapture={setVisitorPhoto}
                    facingMode="environment"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <CameraCapture
                    label="Guard Authorization Photo *"
                    value={guardPhoto}
                    onCapture={handleGuardPhotoCapture}
                    facingMode="user"
                  />
                  {/* Verification status badge */}
                  <GuardVerificationBadge
                    status={guardVerifyStatus}
                    guardName={verifiedGuardName}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Actions ── */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1, justifyContent: 'center' }}
              disabled={loading || guardVerifyStatus === 'verifying' || guardVerifyStatus === 'failed' || guardVerifyStatus === 'no_face'}
            >
              {loading ? (
                <><span className="spinner" style={{ width: 16, height: 16 }} /> Processing…</>
              ) : (
                <><CheckCircle size={17} /> Submit &amp; Get Pass</>
              )}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleReset} disabled={loading}>
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
