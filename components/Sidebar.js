'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

const NAV = [
  { href: '/', icon: '📊', label: 'Dashboard', mobileLabel: 'Dashboard' },
  { href: '/upload', icon: '📷', label: 'Upload Photo', mobileLabel: 'Upload' },
  { href: '/queue', icon: '📅', label: 'Post Queue', mobileLabel: 'Queue' },
  { href: '/settings', icon: '⚙️', label: 'Settings', mobileLabel: 'Settings' },
];

export default function Sidebar({ schedulerActive = true }) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="sidebar desktop-only">
        <div className="sidebar-logo">
          <div className="brand">
            <div className="brand-icon" style={{ padding: 0, background: 'transparent', borderRadius: 10, overflow: 'hidden', width: 36, height: 36, flexShrink: 0 }}>
              <Image src="/icon-192.png" alt="PostCraft Logo" width={36} height={36} style={{ borderRadius: 8 }} priority />
            </div>
            <div className="brand-text">
              <span className="brand-name">PostCraft</span>
              <span className="brand-sub">GBP Scheduler</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-label">Menu</span>
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${pathname === item.href ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-status">
            <div className={`status-dot ${schedulerActive ? '' : 'inactive'}`} />
            <span>Scheduler {schedulerActive ? 'active' : 'inactive'}</span>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="mobile-header mobile-only">
        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Image src="/icon-192.png" alt="PostCraft Logo" width={28} height={28} style={{ borderRadius: 6 }} priority />
          <span className="brand-name" style={{ fontSize: '15px', fontWeight: 700 }}>PostCraft</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div className={`status-dot ${schedulerActive ? '' : 'inactive'}`} style={{ width: 8, height: 8 }} />
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {schedulerActive ? 'Active' : 'Offline'}
          </span>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav mobile-only">
        {NAV.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-nav-item ${pathname === item.href ? 'active' : ''}`}
          >
            <span className="mobile-nav-icon">{item.icon}</span>
            <span className="mobile-nav-label">{item.mobileLabel}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
