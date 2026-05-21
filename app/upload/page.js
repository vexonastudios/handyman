'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [photo, setPhoto] = useState(null);
  const [description, setDescription] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [step, setStep] = useState('upload');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [alert, setAlert] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null); // { scheduledDate, queueCount }

  const CHAR_LIMIT = 1500;

  function handleFileSelect(file) {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setPhoto({ file, previewUrl, imagePath: null });
    setDescription('');
    setAlert(null);
    setStep('describe');
  }

  function handleInputChange(e) { handleFileSelect(e.target.files[0]); }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files[0]);
  }

  async function uploadAndDescribe() {
    if (!photo?.file) return;
    setLoading(true);
    setLoadingMsg('Uploading photo...');
    setAlert(null);

    try {
      const formData = new FormData();
      formData.append('photo', photo.file);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadData.success) throw new Error(uploadData.error);

      const { imagePath, base64, mimeType } = uploadData;
      setPhoto(prev => ({ ...prev, imagePath, base64, mimeType }));

      setLoadingMsg('Asking Gemini to describe your photo...');
      const descRes = await fetch('/api/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, mimeType, imagePath }),
      });
      const descData = await descRes.json();
      if (!descData.success) throw new Error(descData.error);

      setDescription(descData.description);
      setStep('queue');
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  }

  async function addToQueue() {
    if (!photo?.imagePath || !description.trim()) return;
    setLoading(true);
    setLoadingMsg('Adding to queue...');
    setAlert(null);

    try {
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_path: photo.imagePath, description: description.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSuccessInfo({ scheduledDate: data.post.scheduled_date });
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  }

  function reset() {
    setPhoto(null);
    setDescription('');
    setStep('upload');
    setAlert(null);
    setSuccessInfo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00Z');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  // Character count color
  const charCount = description.length;
  const charColor = charCount >= 1450 ? 'var(--danger)' : charCount >= 1200 ? 'var(--warning)' : 'var(--text-muted)';

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <h1>Upload a Photo</h1>
          <p>Snap or select a job photo — Gemini will write the post for you</p>
        </div>

        <div className="page-body" style={{ maxWidth: 640 }}>
          {alert && (
            <div className={`alert alert-${alert.type}`}>
              <span>{alert.message}</span>
              {alert.type === 'error' && step === 'describe' && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={uploadAndDescribe}
                  style={{ marginLeft: 'auto', flexShrink: 0 }}
                >
                  🔄 Try Again
                </button>
              )}
            </div>
          )}

          {/* Step: Upload */}
          {step === 'upload' && (
            <div
              className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                accept="image/*,video/*"
                ref={fileInputRef}
                onChange={handleInputChange}
                id="photo-input"
                style={{ display: 'none' }}
              />
              <div className="upload-icon">📷</div>
              <h3>Drop a photo/video or tap to select</h3>
              <p>JPG, PNG, MP4, or MOV · Max 15 MB · Use your phone camera for best results</p>
            </div>
          )}

          {/* Step: Photo selected */}
          {(step === 'describe' || step === 'queue') && photo && (
            <>
              <div className="photo-preview" style={{ marginBottom: '20px', position: 'relative' }}>
                {photo.file?.type?.startsWith('video/') || (photo.imagePath && ['mp4', 'mov', 'webm', 'ogg', 'm4v'].includes(photo.imagePath.split('.').pop().toLowerCase())) ? (
                  <video
                    src={photo.previewUrl}
                    controls
                    playsInline
                    style={{ width: '100%', maxHeight: '360px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-base)' }}
                  />
                ) : (
                  <img src={photo.previewUrl} alt="Selected job asset" />
                )}
                <button className="preview-remove" onClick={reset} title="Remove">✕</button>
              </div>

              {step === 'describe' && (
                <div style={{ textAlign: 'center' }}>
                  {loading ? (
                    <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>
                      <div className="spinner" style={{ width: 28, height: 28, marginBottom: 12 }} />
                      <p>{loadingMsg}</p>
                    </div>
                  ) : (
                    <button className="btn btn-primary btn-lg" onClick={uploadAndDescribe} style={{ width: '100%' }}>
                      ✨ Generate Description with Gemini
                    </button>
                  )}
                </div>
              )}

              {step === 'queue' && (
                <>
                  <div className="form-group">
                    <label className="form-label" htmlFor="description">Post Description</label>
                    <textarea
                      id="description"
                      className="form-control"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={8}
                      placeholder="Gemini-generated description will appear here..."
                      maxLength={CHAR_LIMIT}
                      style={{ minHeight: 120, maxHeight: '45vh', overflowY: 'auto' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11.5px', color: charColor, fontWeight: charCount >= 1200 ? 700 : 400, transition: 'color 0.2s' }}>
                        {charCount} / {CHAR_LIMIT} characters
                        {charCount >= 1450 && ' — Almost at limit!'}
                        {charCount >= 1200 && charCount < 1450 && ' — Getting close'}
                      </span>
                    </div>
                  </div>

                  <div className="cta-container" style={{ display: 'flex', gap: '10px' }}>
                    <button
                      className="btn btn-primary btn-lg"
                      onClick={addToQueue}
                      disabled={loading || !description.trim()}
                    >
                      {loading ? <><span className="spinner" /> Adding...</> : '📅 Add to Queue'}
                    </button>
                    <button className="btn btn-secondary btn-lg" onClick={reset}>
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Success Overlay ── */}
      {successInfo && (
        <div className="success-overlay">
          <div className="success-card">
            <span className="success-icon">🎉</span>
            <h2>Post Scheduled!</h2>
            <p className="success-date">{formatDate(successInfo.scheduledDate)}</p>
            <p className="success-sub">
              Your photo has been added to the queue and will be published automatically on that date.
            </p>
            <div className="success-card-actions">
              <Link href="/queue" className="btn btn-primary">📅 View Queue</Link>
              <button className="btn btn-secondary" onClick={reset}>📷 Upload Another</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
