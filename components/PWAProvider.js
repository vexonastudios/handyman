'use client';
import { useEffect, useState } from 'react';

/**
 * PWAProvider — registers the service worker and handles update notifications.
 * Wrap this around the app in layout.js.
 *
 * When a new version is deployed:
 * 1. The browser detects a new SW waiting.
 * 2. An update banner appears asking the user to refresh.
 * 3. If the user clicks "Update Now", the SW takes control and reloads.
 */
export default function PWAProvider({ children }) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let swRegistration = null;

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none', // always check network for SW updates
        });
        swRegistration = reg;

        // Check for a waiting SW (page was already open when update landed)
        if (reg.waiting) {
          setWaitingWorker(reg.waiting);
          setUpdateAvailable(true);
        }

        // Detect when a new SW finishes installing and is waiting to activate
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version is ready — show the update banner
              setWaitingWorker(newWorker);
              setUpdateAvailable(true);
            }
          });
        });

        // Poll for updates every 60 seconds (catches long-lived sessions)
        const interval = setInterval(() => reg.update(), 60 * 1000);
        return () => clearInterval(interval);
      } catch (err) {
        console.error('[PWA] Service Worker registration failed:', err);
      }
    };

    registerSW();

    // When SW takes control (after skipWaiting), reload the page
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  function applyUpdate() {
    if (waitingWorker) {
      // Tell the waiting SW to activate immediately
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    setUpdateAvailable(false);
  }

  function dismissUpdate() {
    setUpdateAvailable(false);
  }

  return (
    <>
      {children}

      {/* ── Update Banner ─────────────────────────────────────────────────── */}
      {updateAvailable && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: 'linear-gradient(135deg, #1e2128, #252930)',
          border: '1px solid rgba(245,158,11,0.35)',
          borderRadius: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(245,158,11,0.1)',
          padding: '16px 22px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          minWidth: 320,
          maxWidth: 420,
          animation: 'slideUpBanner 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          <span style={{ fontSize: 26, flexShrink: 0 }}>🚀</span>
          <div style={{ flex: 1 }}>
            <p style={{
              fontSize: 13.5,
              fontWeight: 700,
              color: '#f1f3f7',
              marginBottom: 3,
            }}>
              PostCraft Update Available
            </p>
            <p style={{ fontSize: 12, color: '#9ca3b0', lineHeight: 1.4 }}>
              A new version is ready. Refresh to get the latest features.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flexShrink: 0 }}>
            <button
              onClick={applyUpdate}
              style={{
                background: '#f59e0b',
                color: '#0a0c10',
                border: 'none',
                borderRadius: 8,
                padding: '7px 14px',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.target.style.background = '#fbbf24'}
              onMouseLeave={e => e.target.style.background = '#f59e0b'}
            >
              Update Now
            </button>
            <button
              onClick={dismissUpdate}
              style={{
                background: 'transparent',
                color: '#5a6072',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                padding: '5px 14px',
                fontSize: 11.5,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.target.style.color = '#9ca3b0'}
              onMouseLeave={e => e.target.style.color = '#5a6072'}
            >
              Later
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUpBanner {
          from { opacity: 0; transform: translateX(-50%) translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0)     scale(1);    }
        }
      `}</style>
    </>
  );
}
