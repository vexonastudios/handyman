'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [photo, setPhoto] = useState(null); // { file, previewUrl, imagePath, base64, mimeType }
  const [description, setDescription] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [step, setStep] = useState('upload'); // upload | describe | queue
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [alert, setAlert] = useState(null);

  function handleFileSelect(file) {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setPhoto({ file, previewUrl, imagePath: null });
    setDescription('');
    setAlert(null);
    setStep('describe');
  }

  function handleInputChange(e) {
    handleFileSelect(e.target.files[0]);
  }

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
      // Step 1: Upload — server saves to /tmp and returns base64 inline
      const formData = new FormData();
      formData.append('photo', photo.file);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadData.success) throw new Error(uploadData.error);

      const { imagePath, base64, mimeType } = uploadData;
      setPhoto(prev => ({ ...prev, imagePath, base64, mimeType }));

      // Step 2: Describe with Gemini — pass base64 directly (no filesystem re-read)
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

      setAlert({ type: 'success', message: `✅ Post scheduled for ${formatDate(data.post.scheduled_date)}!` });
      setTimeout(() => router.push('/queue'), 1800);
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00Z');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

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
              {alert.message}
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
                accept="image/*"
                ref={fileInputRef}
                onChange={handleInputChange}
                id="photo-input"
                style={{ display: 'none' }}
              />
              <div className="upload-icon">📷</div>
              <h3>Drop a photo or tap to select</h3>
              <p>JPG or PNG · Max 5 MB · Use your phone camera for best results</p>
            </div>
          )}

          {/* Step: Photo selected — describe */}
          {(step === 'describe' || step === 'queue') && photo && (
            <>
              <div className="photo-preview" style={{ marginBottom: '20px' }}>
                <img src={photo.previewUrl} alt="Selected job photo" />
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
                    <button className="btn btn-primary btn-lg" onClick={uploadAndDescribe}>
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
                      rows={5}
                      placeholder="Gemini-generated description will appear here..."
                    />
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      {description.length} / 1500 characters
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
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
    </div>
  );
}
