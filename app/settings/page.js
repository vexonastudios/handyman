'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Sidebar from '@/components/Sidebar';

function SettingsContent() {
  const searchParams = useSearchParams();
  const authStatus = searchParams.get('auth');

  const [settings, setSettings] = useState({
    gemini_api_key: '',
    post_time: '09:00',
    gbp_account_name: '',
    gbp_location_name: '',
    google_connected: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  useEffect(() => {
    fetchSettings();
    if (authStatus === 'success') {
      setAlert({ type: 'success', message: '✅ Google account connected successfully!' });
    } else if (authStatus === 'error') {
      setAlert({ type: 'error', message: '❌ Google authentication failed. Please try again.' });
    }
  }, [authStatus]);

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings');
      const { settings } = await res.json();
      setSettings(settings);
      if (settings.google_connected && settings.gbp_account_name) {
        fetchLocations(settings.gbp_account_name);
      }
    } catch (e) {
      setAlert({ type: 'error', message: 'Failed to load settings.' });
    } finally {
      setLoading(false);
    }
  }

  async function fetchAccounts() {
    try {
      const res = await fetch('/api/locations');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAccounts(data.accounts || []);
    } catch (e) {
      setAlert({ type: 'error', message: 'Could not load accounts: ' + e.message });
    }
  }

  async function fetchLocations(accountName) {
    setLoadingLocations(true);
    try {
      const res = await fetch('/api/locations?account=' + encodeURIComponent(accountName));
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setLocations(data.locations || []);
    } catch (e) {
      setAlert({ type: 'error', message: 'Could not load locations: ' + e.message });
    } finally {
      setLoadingLocations(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    setAlert(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gemini_api_key: settings.gemini_api_key,
          post_time: settings.post_time,
          gbp_account_name: settings.gbp_account_name,
          gbp_location_name: settings.gbp_location_name,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setAlert({ type: 'success', message: '✅ Settings saved!' });
      setTimeout(() => setAlert(null), 3000);
    } catch (e) {
      setAlert({ type: 'error', message: e.message });
    } finally {
      setSaving(false);
    }
  }

  function connectGoogle() {
    window.location.href = '/api/auth/google';
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div className="page-body" style={{ maxWidth: 700 }}>
      {alert && (
        <div className={`alert alert-${alert.type}`}>{alert.message}</div>
      )}

      {/* Google Account Section */}
      <div className="settings-section">
        <h2>🔗 Google Business Profile</h2>
        <p className="section-desc">Connect your Google account to enable automatic posting.</p>

        <div className="settings-row">
          <div className="settings-row-label">
            <div className="label-title">Google Account</div>
            <div className="label-desc">Required for posting to your Business Profile</div>
          </div>
          {settings.google_connected ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="connected-badge">Connected</span>
              <button className="btn btn-secondary btn-sm" onClick={connectGoogle}>Reconnect</button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={connectGoogle}>
              Connect Google Account
            </button>
          )}
        </div>

        {settings.google_connected && (
          <>
            <div className="settings-row">
              <div className="settings-row-label">
                <div className="label-title">Business Account</div>
                <div className="label-desc">Select your Google Business account</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {accounts.length === 0 ? (
                  <button className="btn btn-secondary btn-sm" onClick={fetchAccounts}>Load Accounts</button>
                ) : (
                  <select
                    className="form-control"
                    style={{ width: 260 }}
                    value={settings.gbp_account_name}
                    onChange={e => {
                      setSettings(s => ({ ...s, gbp_account_name: e.target.value, gbp_location_name: '' }));
                      if (e.target.value) fetchLocations(e.target.value);
                    }}
                  >
                    <option value="">Select account…</option>
                    {accounts.map(a => (
                      <option key={a.name} value={a.name}>{a.accountName || a.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {settings.gbp_account_name && (
              <div className="settings-row">
                <div className="settings-row-label">
                  <div className="label-title">Business Location</div>
                  <div className="label-desc">Posts will be published to this location</div>
                </div>
                <select
                  className="form-control"
                  style={{ width: 260 }}
                  value={settings.gbp_location_name}
                  onChange={e => setSettings(s => ({ ...s, gbp_location_name: e.target.value }))}
                  disabled={loadingLocations}
                >
                  <option value="">{loadingLocations ? 'Loading…' : 'Select location…'}</option>
                  {locations.map(l => (
                    <option key={l.name} value={l.name}>{l.title || l.name}</option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
      </div>

      {/* Gemini API Key */}
      <div className="settings-section">
        <h2>🤖 Gemini AI</h2>
        <p className="section-desc">
          Used to automatically generate post descriptions from your photos.{' '}
          <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
            Get a free API key →
          </a>
        </p>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="gemini-key">Gemini API Key</label>
          <input
            id="gemini-key"
            type="password"
            className="form-control"
            placeholder="AIza..."
            value={settings.gemini_api_key}
            onChange={e => setSettings(s => ({ ...s, gemini_api_key: e.target.value }))}
          />
        </div>
      </div>

      {/* Schedule */}
      <div className="settings-section">
        <h2>⏰ Posting Schedule</h2>
        <p className="section-desc">One photo will automatically post to your Google Business Profile each day at this time.</p>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="post-time">Daily Post Time (local time)</label>
          <input
            id="post-time"
            type="time"
            className="form-control"
            style={{ width: 160 }}
            value={settings.post_time}
            onChange={e => setSettings(s => ({ ...s, post_time: e.target.value }))}
          />
        </div>
      </div>

      <button className="btn btn-primary btn-lg" onClick={saveSettings} disabled={saving}>
        {saving ? <><span className="spinner" /> Saving...</> : '💾 Save Settings'}
      </button>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <h1>Settings</h1>
          <p>Configure your API keys, Google account, and posting schedule</p>
        </div>
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>}>
          <SettingsContent />
        </Suspense>
      </div>
    </div>
  );
}
