import './globals.css';
import PWAProvider from '@/components/PWAProvider';

export const metadata = {
  title: 'PostCraft — Handyman GBP Scheduler',
  description: 'Automatically schedule and publish daily job photos to your Google Business Profile with AI-generated descriptions.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PostCraft',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport = {
  themeColor: '#f59e0b',
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="PostCraft" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#f59e0b" />
        <script dangerouslySetInnerHTML={{__html: `
          (function() {
            try {
              const theme = localStorage.getItem('postcraft_theme') || 'light';
              document.documentElement.setAttribute('data-theme', theme);
            } catch (e) {}
          })();
        `}} />
      </head>
      <body>
        <PWAProvider>
          {children}
        </PWAProvider>
      </body>
    </html>
  );
}
