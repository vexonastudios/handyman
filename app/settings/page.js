'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import Sidebar from '@/components/Sidebar';

// Keys stored in localStorage (per-device, per-user)
const LS = {
  GOOGLE_ACCESS_TOKEN: 'postcraft_google_access_token',
  GOOGLE_REFRESH_TOKEN: 'postcraft_google_refresh_token',
  GOOGLE_TOKEN_EXPIRY: 'postcraft_google_token_expiry',
  GBP_ACCOUNT: 'postcraft_gbp_account',
  GBP_LOCATION: 'postcraft_gbp_location',
  POST_TIME: 'postcraft_post_time',
};

function ls(key) {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(key) || '';
}

function SetupStep({ number, text }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
      <div style={{
        width: 24, height: 24, borderRadius: '50%',
        background: 'var(--accent-muted)', border: '1px solid rgba(245,158,11,0.35)',
        color: 'var(--accent)', fontSize: 11, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginTop: 1,
      }}>{number}</div>
      <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>{text}</p>
    </div>
  );
}

function StatusBadge({ connected, label }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 14px', borderRadius: 100, fontSize: 12.5, fontWeight: 600,
      background: connected ? 'var(--success-muted)' : 'rgba(255,255,255,0.06)',
      color: connected ? 'var(--success)' : 'var(--text-muted)',
      border: `1px solid ${connected ? 'rgba(16,185,129,0.25)' : 'var(--border-subtle)'}`,
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: connected ? 'var(--success)' : 'var(--text-muted)',
        boxShadow: connected ? '0 0 8px var(--success)' : 'none',
        animation: connected ? 'pulse-dot 2s infinite' : 'none',
      }} />
      {label}
    </span>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [postTime, setPostTime] = useState('09:00');
  const [googleConnected, setGoogleConnected] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [savedLocation, setSavedLocation] = useState('');
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [savingToken, setSavingToken] = useState(false);
  const [alert, setAlert] = useState(null);
  const [serverConfig, setServerConfig] = useState({ googleConfigured: false });

  // Load from localStorage on mount
  useEffect(() => {
    setPostTime(ls(LS.POST_TIME) || '09:00');
    setSelectedAccount(ls(LS.GBP_ACCOUNT));
    setSelectedLocation(ls(LS.GBP_LOCATION));
    setSavedLocation(ls(LS.GBP_LOCATION));
    setGoogleConnected(!!(ls(LS.GOOGLE_ACCESS_TOKEN) || ls(LS.GOOGLE_REFRESH_TOKEN)));
    fetch('/api/settings').then(r => r.json()).then(setServerConfig).catch(() => {});
  }, []);

  // Handle OAuth callback — tokens arrive as URL params, save to localStorage
  useEffect(() => {
    const auth = searchParams.get('auth');
    const accessToken = searchParams.get('google_access_token');
    const refreshToken = searchParams.get('google_refresh_token');
    const expiry = searchParams.get('google_token_expiry');

    if (auth === 'success' && accessToken) {
      localStorage.setItem(LS.GOOGLE_ACCESS_TOKEN, accessToken);
      if (refreshToken) localStorage.setItem(LS.GOOGLE_REFRESH_TOKEN, refreshToken);
      if (expiry) localStorage.setItem(LS.GOOGLE_TOKEN_EXPIRY, expiry);
      setGoogleConnected(true);

      // Mirror refresh token to Redis so server cron job can use it to publish
      setSavingToken(true);
      fetch('/api/auth/save-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: refreshToken || null,
          accessToken,
          expiryDate: expiry ? Number(expiry) : null,
        }),
      }).catch(console.error).finally(() => setSavingToken(false));

      setAlert({ type: 'success', message: '✅ Google Business account connected! Now select your business location below.' });
      router.replace('/settings');
    } else if (auth === 'error') {
      const reason = searchParams.get('reason') || 'Unknown error';
      setAlert({ type: 'error', message: `❌ Connection failed: ${reason}` });
      router.replace('/settings');
    }
  }, [searchParams, router]);

  function saveSchedule() {
    localStorage.setItem(LS.POST_TIME, postTime);
    setAlert({ type: 'success', message: '✅ Schedule saved!' });
    setTimeout(() => setAlert(null), 2500);
  }

  async function saveLocation() {
    if (!selectedLocation) return;
    localStorage.setItem(LS.GBP_ACCOUNT, selectedAccount);
    localStorage.setItem(LS.GBP_LOCATION, selectedLocation);
    setSavedLocation(selectedLocation);

    // Mirror location name to Redis so the cron job knows where to post
    await fetch('/api/auth/save-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refreshToken: ls(LS.GOOGLE_REFRESH_TOKEN) || null,
        locationName: selectedLocation,
      }),
    }).catch(console.error);

    setAlert({ type: 'success', message: '✅ Business location saved! You\'re all set.' });
    setTimeout(() => setAlert(null), 3000);
  }

  function connectGoogle() {
    window.location.href = '/api/auth/google';
  }

  function disconnectGoogle() {
    Object.values(LS).forEach(k => localStorage.removeItem(k));
    setGoogleConnected(false);
    setAccounts([]);
    setLocations([]);
    setSelectedAccount('');
    setSelectedLocation('');
    setSavedLocation('');
    setAlert({ type: 'info', message: 'Google account disconnected from this device.' });
  }

  async function enableDemoMode() {
    setSavingToken(true);
    try {
      localStorage.setItem(LS.GOOGLE_ACCESS_TOKEN, 'demo-access-token');
      localStorage.setItem(LS.GOOGLE_REFRESH_TOKEN, 'demo-refresh-token');
      localStorage.setItem(LS.GOOGLE_TOKEN_EXPIRY, String(Date.now() + 3600 * 1000));
      localStorage.setItem(LS.GBP_ACCOUNT, 'accounts/demo-account');
      localStorage.setItem(LS.GBP_LOCATION, 'locations/demo-location');
      
      setGoogleConnected(true);
      setSelectedAccount('accounts/demo-account');
      setSelectedLocation('locations/demo-location');
      setSavedLocation('locations/demo-location');

      await fetch('/api/auth/save-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: 'demo-refresh-token',
          accessToken: 'demo-access-token',
          expiryDate: Date.now() + 3600 * 1000,
          locationName: 'locations/demo-location',
        }),
      });

      setAlert({ type: 'success', message: '🧪 Demo Mode enabled! Simulated Google Business Profile is active. You can now test uploading and daily scheduling.' });
    } catch (e) {
      setAlert({ type: 'error', message: 'Failed to enable Demo Mode: ' + e.message });
    } finally {
      setSavingToken(false);
    }
  }

  async function fetchAccounts() {
    setLoadingAccounts(true);
    try {
      const token = ls(LS.GOOGLE_ACCESS_TOKEN);
      const res = await fetch('/api/locations', { headers: { 'x-google-token': token } });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAccounts(data.accounts || []);
      if ((data.accounts || []).length === 0) {
        setAlert({ type: 'warning', message: 'No business accounts found on this Google account. Make sure you\'re signed in to the right account.' });
      }
    } catch (e) {
      setAlert({ type: 'error', message: 'Could not load accounts: ' + e.message });
    } finally {
      setLoadingAccounts(false);
    }
  }

  async function fetchLocations(accountName) {
    setLoadingLocations(true);
    try {
      const token = ls(LS.GOOGLE_ACCESS_TOKEN);
      const res = await fetch('/api/locations?account=' + encodeURIComponent(accountName), {
        headers: { 'x-google-token': token },
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setLocations(data.locations || []);
    } catch (e) {
      setAlert({ type: 'error', message: 'Could not load locations: ' + e.message });
    } finally {
      setLoadingLocations(false);
    }
  }

  const card = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
    padding: '28px',
    marginBottom: 20,
  };

  const guideBox = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    padding: '18px 20px',
    marginTop: 16,
    marginBottom: 18,
  };

  return (
    <div className="page-body" style={{ maxWidth: 700 }}>
      {alert && (
        <div className={`alert alert-${alert.type}`} style={{ marginBottom: 20 }}>
          {alert.message}
        </div>
      )}

      {/* ── STEP 1: Connect Google ─────────────────────────────── */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 8, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>
              🔗 Connect Your Google Business Account
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Required to post photos automatically to your Google Business listing.
            </p>
          </div>
          <StatusBadge connected={googleConnected} label={googleConnected ? 'Connected' : 'Not Connected'} />
        </div>

        {!googleConnected ? (
          <>
            {!serverConfig.googleConfigured && (
              <div className="alert alert-warning" style={{ fontSize: 12.5, margin: '16px 0' }}>
                ⚠️ <strong>Admin setup required:</strong> The app owner hasn't configured Google OAuth yet.
                They need to add <code style={{ fontSize: 11 }}>GOOGLE_CLIENT_ID</code> and <code style={{ fontSize: 11 }}>GOOGLE_CLIENT_SECRET</code> in Vercel.{' '}
                <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
                  Google Cloud Console →
                </a>
              </div>
            )}

            <div style={guideBox}>
              <p style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
                How to Connect — 3 Easy Steps
              </p>
              <SetupStep
                number={1}
                text="Click the button below. You'll be taken to a Google sign-in page."
              />
              <SetupStep
                number={2}
                text="Sign in with the Google account that manages your Google Business Profile (the one you use to respond to reviews, add photos, etc)."
              />
              <SetupStep
                number={3}
                text='Click "Allow" — this lets PostCraft post photos on your behalf. You can revoke this any time from your Google account.'
              />
            </div>

            <button
              className="btn btn-primary btn-lg"
              onClick={connectGoogle}
              disabled={!serverConfig.googleConfigured}
              id="connect-google-btn"
            >
              🔗 Connect Google Account →
            </button>
            {!serverConfig.googleConfigured && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                Waiting for admin to complete OAuth setup.
              </p>
            )}

            <div style={{
              background: 'rgba(245,158,11,0.06)',
              border: '1px dashed rgba(245,158,11,0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '18px 20px',
              marginTop: 24,
            }}>
              <h4 style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--accent)', margin: '0 0 6px 0' }}>
                🧪 Test the App Instantly (Demo/Mock Mode)
              </h4>
              <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55, margin: '0 0 14px 0' }}>
                Waiting for Google API approval? Bypass the connection block and activate a mock Google Business Profile integration to test the scheduling flow.
              </p>
              <button
                className="btn btn-secondary btn-sm"
                onClick={enableDemoMode}
                id="enable-demo-btn"
                style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--accent)', borderColor: 'rgba(245,158,11,0.3)' }}
              >
                🚀 Enable Demo Mode
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, marginTop: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="btn btn-secondary btn-sm" onClick={connectGoogle}>Reconnect / Switch Account</button>
              <button className="btn btn-danger btn-sm" onClick={disconnectGoogle}>Disconnect</button>
              {savingToken && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Syncing…</span>}
            </div>

            {/* ── STEP 2: Select Location ── */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 22 }}>
              <h3 style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                📍 Select Your Business Location
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Choose which Google Business listing posts will appear on.
              </p>

              {accounts.length === 0 ? (
                <button
                  className="btn btn-secondary"
                  onClick={fetchAccounts}
                  disabled={loadingAccounts}
                  id="load-accounts-btn"
                >
                  {loadingAccounts
                    ? <><span className="spinner" /> Loading your business accounts…</>
                    : '📋 Load My Business Accounts'
                  }
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label className="form-label" htmlFor="account-select">Business Account</label>
                    <select
                      id="account-select"
                      className="form-control"
                      value={selectedAccount}
                      onChange={e => {
                        setSelectedAccount(e.target.value);
                        setSelectedLocation('');
                        setLocations([]);
                        if (e.target.value) fetchLocations(e.target.value);
                      }}
                    >
                      <option value="">Select an account…</option>
                      {accounts.map(a => (
                        <option key={a.name} value={a.name}>{a.accountName || a.name}</option>
                      ))}
                    </select>
                  </div>

                  {selectedAccount && (
                    <div>
                      <label className="form-label" htmlFor="location-select">Business Location</label>
                      <select
                        id="location-select"
                        className="form-control"
                        value={selectedLocation}
                        onChange={e => setSelectedLocation(e.target.value)}
                        disabled={loadingLocations}
                      >
                        <option value="">{loadingLocations ? 'Loading locations…' : 'Select your business…'}</option>
                        {locations.map(l => (
                          <option key={l.name} value={l.name}>{l.title || l.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedLocation && (
                    <button
                      className="btn btn-primary"
                      onClick={saveLocation}
                      id="save-location-btn"
                      style={{ alignSelf: 'flex-start' }}
                    >
                      💾 Save This Location
                    </button>
                  )}
                </div>
              )}

              {savedLocation && (
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <StatusBadge connected={true} label={savedLocation === 'locations/demo-location' ? 'Demo Mode Active' : 'Location Saved'} />
                  <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                    Posting to: <strong style={{ color: 'var(--text-secondary)' }}>
                      {savedLocation === 'locations/demo-location' ? 'Demo Handyman Business (gccsatx.com)' : savedLocation.split('/').pop()}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── POSTING SCHEDULE ────────────────────────────────────── */}
      <div style={card}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          ⏰ Daily Posting Schedule
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
          One photo from your queue is posted to your Google Business listing automatically each day.
        </p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label className="form-label" htmlFor="post-time">Daily Post Time (your local time)</label>
            <input
              id="post-time"
              type="time"
              className="form-control"
              style={{ width: 165 }}
              value={postTime}
              onChange={e => setPostTime(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={saveSchedule} id="save-schedule-btn">
            Save Schedule
          </button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
          ℹ️ The actual post time is controlled by the Vercel Cron job (currently set to 9:00 AM CST). Contact your admin to change the server schedule.
        </p>
      </div>

      {/* ── HOW IT WORKS ────────────────────────────────────────── */}
      <div style={{
        ...card,
        background: 'transparent',
        border: '1px solid var(--border-subtle)',
      }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
          ✨ How PostCraft Works
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { icon: '📷', title: 'You take a job photo', desc: 'Snap a pic after finishing any job — before you leave the site.' },
            { icon: '🤖', title: 'AI writes the caption', desc: 'Gemini AI reads your photo and writes a professional, local-sounding post description for you automatically.' },
            { icon: '📅', title: 'It joins your queue', desc: 'The post is scheduled for the next available day — one per day, automatically spaced out.' },
            { icon: '🚀', title: 'It posts itself', desc: 'Every morning, PostCraft publishes the next photo to your Google Business Profile — no action needed from you.' },
          ].map(step => (
            <div key={step.title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>{step.icon}</span>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{step.title}</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
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
          <p>Connect your Google Business account to enable automatic daily posting</p>
        </div>
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>}>
          <SettingsContent />
        </Suspense>
      </div>
    </div>
  );
}
