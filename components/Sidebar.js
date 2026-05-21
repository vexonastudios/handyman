'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

const NAV = [
  { href: '/', icon: '📊', label: 'Dashboard' },
  { href: '/upload', icon: '📷', label: 'Upload Photo' },
  { href: '/queue', icon: '📅', label: 'Post Queue' },
  { href: '/settings', icon: '⚙️', label: 'Settings' },
];

export default function Sidebar({ schedulerActive = true }) {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
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
  );
}
