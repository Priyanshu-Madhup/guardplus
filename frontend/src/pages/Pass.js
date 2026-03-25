import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Download, Maximize2, X, ArrowLeft, CheckCircle, Mail, Loader } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import PassCard from '../components/PassCard';
import { getVisitorById, mockVisitors } from '../mockData';
import API_BASE from '../api';

const Pass = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const passCardRef = useRef(null);
  const [visitor, setVisitor] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    const load = async () => {
      // Priority 1: state passed from the Register page (has full photos)
      if (location.state?.visitor) {
        setVisitor(location.state.visitor);
        return;
      }
      // Priority 2: try MongoDB (has full photos)
      try {
        const res = await fetch(`${API_BASE}/api/visitors/${id}`);
        if (res.ok) {
          setVisitor(await res.json());
          return;
        }
      } catch { /* backend unreachable */ }
      // Priority 3: localStorage cache (no photos, but usable)
      const stored = JSON.parse(localStorage.getItem('guardplus_visitors') || '[]');
      const found = stored.find((v) => v.id === id);
      if (found) { setVisitor(found); return; }
      // Priority 4: mock data
      setVisitor(getVisitorById(id) || mockVisitors[0]);
    };
    load();
  }, [id, location.state]);

  const generatePDF = async () => {
    const source = passCardRef.current;

    // 1. Grab QR canvas data URL BEFORE cloning (canvas pixels can't be cloned)
    const qrCanvas = source.querySelector('canvas');
    const qrDataUrl = qrCanvas ? qrCanvas.toDataURL('image/png') : null;

    // 2. Build an off-screen wrapper with fixed width so html2canvas
    //    sees the full card height regardless of scroll / viewport
    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, {
      position:   'fixed',
      top:        '-99999px',
      left:       '-99999px',
      width:      '480px',
      background: '#ffffff',
      boxSizing:  'border-box',
      zIndex:     '-1',
      overflow:   'visible',
    });

    const clone = source.cloneNode(true);
    clone.style.width      = '100%';
    clone.style.boxShadow  = 'none';
    clone.style.borderRadius = '16px';

    // 3. Replace every <canvas> in the clone with a plain <img>
    //    html2canvas cannot read canvas cross-origin pixel data
    if (qrDataUrl) {
      clone.querySelectorAll('canvas').forEach((c) => {
        const img = document.createElement('img');
        img.src    = qrDataUrl;
        // The QRCodeCanvas renders at devicePixelRatio; halve back to CSS px
        const dpr  = window.devicePixelRatio || 1;
        img.width  = c.width  / dpr;
        img.height = c.height / dpr;
        Object.assign(img.style, {
          display: 'block',
          margin:  'auto',
        });
        c.parentNode.replaceChild(img, c);
      });
    }

    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    try {
      // 4. Capture full height of the cloned card
      const fullH = wrapper.scrollHeight;
      const canvas = await html2canvas(wrapper, {
        scale:           2,
        useCORS:         true,
        allowTaint:      false,
        backgroundColor: '#ffffff',
        width:           480,
        height:          fullH,
        windowWidth:     480,
        windowHeight:    fullH,
      });

      const imgData = canvas.toDataURL('image/png');
      const imgPxW  = canvas.width;
      const imgPxH  = canvas.height;

      // 5. Create a custom-sized PDF that matches the card exactly —
      //    no margins needed, always exactly 1 page, nothing cut
      const mmFactor  = 25.4 / 96;          // px → mm at 96 dpi
      const cardMmW   = imgPxW * mmFactor;
      const cardMmH   = imgPxH * mmFactor;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit:        'mm',
        format:      [cardMmW, cardMmH],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, cardMmW, cardMmH);
      return pdf;
    } finally {
      document.body.removeChild(wrapper);
    }
  };

  const handleDownload = async () => {
    setPdfLoading(true);
    try {
      const pdf = await generatePDF();
      pdf.save(`GuardPlus_Pass_${visitor.id}.pdf`);
    } catch {
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!visitor.email) {
      setEmailError('No email address was registered for this visitor.');
      return;
    }
    setEmailLoading(true);
    setEmailError('');
    try {
      const pdf = await generatePDF();
      const pdfBase64 = pdf.output('datauristring').split(',')[1];
      const res = await fetch(`${API_BASE}/api/send-pass-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitor_email: visitor.email,
          visitor_name: visitor.name,
          pass_id: visitor.id,
          pdf_base64: pdfBase64,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Server error');
      }
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 4000);
    } catch (e) {
      setEmailError(e.message || 'Failed to send email. Make sure the backend is running.');
    } finally {
      setEmailLoading(false);
    }
  };

  if (!visitor) {
    return (
      <div className="page-wrapper" style={{ textAlign: 'center', paddingTop: '5rem' }}>
        <div
          className="spinner spinner-green"
          style={{ width: 40, height: 40, borderWidth: 3, margin: '0 auto 1rem' }}
        />
        <p style={{ color: '#6b7280' }}>Loading visitor pass…</p>
      </div>
    );
  }

  const qrData = JSON.stringify({ id: visitor.id, name: visitor.name, entryTime: visitor.entryTime });

  return (
    <div className="page-wrapper">
      <div className="pass-page">
        {/* Header row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
          }}
        >
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={15} /> Back
          </button>
          <div>
            <h1 className="page-title">Visitor Pass</h1>
            <p className="page-desc">ID: {visitor.id}</p>
          </div>
        </div>

        {/* Pass card — ref used by html2canvas */}
        <div ref={passCardRef}>
          <PassCard visitor={visitor} />
        </div>

        {/* Email success / error alerts */}
        {emailSent && (
          <div className="alert alert-success" style={{ marginTop: '1rem', marginBottom: 0 }}>
            <CheckCircle size={17} style={{ flexShrink: 0 }} />
            Pass emailed successfully to <strong>{visitor.email}</strong>!
          </div>
        )}
        {emailError && (
          <div className="alert alert-error" style={{ marginTop: '1rem', marginBottom: 0 }}>
            <span style={{ flexShrink: 0 }}>&#9888;</span> {emailError}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.625rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={handleDownload}
            disabled={pdfLoading || emailLoading}
          >
            {pdfLoading ? (
              <><Loader size={16} style={{ animation: 'spin 0.75s linear infinite' }} /> Generating…</>
            ) : (
              <><Download size={17} /> Download PDF</>
            )}
          </button>

          <button
            className="btn btn-secondary"
            style={{ flex: 1 }}
            onClick={handleSendEmail}
            disabled={pdfLoading || emailLoading || !visitor.email}
            title={!visitor.email ? 'No email registered for this visitor' : ''}
          >
            {emailLoading ? (
              <><Loader size={16} style={{ animation: 'spin 0.75s linear infinite' }} /> Sending…</>
            ) : (
              <><Mail size={17} /> Send to Email</>
            )}
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowQRModal(true)}
            disabled={pdfLoading || emailLoading}
            style={{ flexShrink: 0 }}
          >
            <Maximize2 size={17} />
          </button>
        </div>
      </div>

      {/* Fullscreen QR modal */}
      {showQRModal && (
        <div className="modal-overlay" onClick={() => setShowQRModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Show at Exit Gate</h3>
            <QRCodeCanvas value={qrData} size={240} fgColor="#111827" level="H" />
            <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.75rem 0 1.25rem' }}>
              {visitor.name}&nbsp;•&nbsp;{visitor.id}
            </p>
            <button className="btn btn-primary btn-block" onClick={() => setShowQRModal(false)}>
              <X size={15} /> Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pass;
