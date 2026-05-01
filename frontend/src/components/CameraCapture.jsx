import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RotateCcw, CheckCircle, X } from 'lucide-react';

// Camera API requires a secure context (localhost or https).
// On plain HTTP from a phone we fall back to a file input with capture attribute.
const canUseCamera = () =>
  window.isSecureContext && !!navigator.mediaDevices?.getUserMedia;

const CameraCapture = ({ label, onCapture, value, facingMode = 'environment' }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const useFileInput = !canUseCamera();

  // ── File-input fallback (HTTP on phone) ──────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onCapture(ev.target.result);
    reader.readAsDataURL(file);
    // Reset so the same file can be re-selected for "retake"
    e.target.value = '';
  };

  // ── getUserMedia flow ────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
    setVideoReady(false);
  }, []);

  const startCamera = async () => {
    setIsLoading(true);
    setVideoReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setIsStreaming(true);
      // Attach stream after state update so the video element is rendered
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      alert('Camera access denied. Please allow camera permissions and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const capture = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !videoReady) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    stopCamera();
    onCapture(dataUrl);
  };

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), [stopCamera]);

  return (
    <div className="camera-capture">
      <span className="camera-label">{label}</span>

      {/* ── File-input fallback for HTTP / non-secure contexts (phones) ── */}
      {useFileInput && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture={facingMode === 'user' ? 'user' : 'environment'}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          {!value && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera size={15} /> Take Photo
            </button>
          )}
          {value && (
            <div>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={value} alt="Captured" className="camera-captured-img" />
                <div style={{ position: 'absolute', bottom: -4, right: -4, background: '#16a34a', borderRadius: '50%', padding: '2px', color: 'white', lineHeight: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                  <CheckCircle size={16} />
                </div>
              </div>
              <div className="camera-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>
                  <RotateCcw size={13} /> Retake
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── getUserMedia flow for localhost / HTTPS ── */}
      {!useFileInput && !isStreaming && !value && (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={startCamera}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="spinner spinner-green" style={{ width: 14, height: 14 }} />
          ) : (
            <Camera size={15} />
          )}
          {isLoading ? 'Starting…' : 'Open Camera'}
        </button>
      )}

      {!useFileInput && isStreaming && (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="camera-preview"
            onLoadedData={() => setVideoReady(true)}
            onCanPlay={() => setVideoReady(true)}
          />
          {!videoReady && (
            <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.5rem 0' }}>
              <span className="spinner spinner-green" style={{ width: 12, height: 12, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }} />
              Initialising camera…
            </p>
          )}
          <div className="camera-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={capture}
              disabled={!videoReady}
            >
              <Camera size={14} /> Capture Photo
            </button>
            <button
              type="button"
              className="btn btn-sm"
              style={{ background: '#fee2e2', color: '#b91c1c', border: 'none' }}
              onClick={stopCamera}
            >
              <X size={14} /> Cancel
            </button>
          </div>
        </>
      )}

      {!useFileInput && value && !isStreaming && (
        <div>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img src={value} alt="Captured" className="camera-captured-img" />
            <div
              style={{
                position: 'absolute',
                bottom: -4,
                right: -4,
                background: '#16a34a',
                borderRadius: '50%',
                padding: '2px',
                color: 'white',
                lineHeight: 0,
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
            >
              <CheckCircle size={16} />
            </div>
          </div>
          <div className="camera-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={startCamera}>
              <RotateCcw size={13} /> Retake
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default CameraCapture;
