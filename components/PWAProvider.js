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
        <div className="pwa-update-banner">
          <span style={{ fontSize: 26, flexShrink: 0 }}>🚀</span>
          <div style={{ flex: 1 }}>
            <p className="pwa-banner-title">PostCraft Update Available</p>
            <p className="pwa-banner-desc">A new version is ready. Refresh to get the latest features.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flexShrink: 0 }}>
            <button className="pwa-btn-update" onClick={applyUpdate}>Update Now</button>
            <button className="pwa-btn-later" onClick={dismissUpdate}>Later</button>
          </div>
        </div>
      )}
    </>
  );
}
