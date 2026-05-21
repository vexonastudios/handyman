'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';

export default function DashboardPage() {
  const [stats, setStats] = useState({ pending: 0, published: 0, failed: 0, total: 0 });
  const [nextDate, setNextDate] = useState('');
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const res = await fetch('/api/queue');
      const { posts } = await res.json();
      const pending = posts.filter(p => p.status === 'pending').length;
      const published = posts.filter(p => p.status === 'published').length;
      const failed = posts.filter(p => p.status === 'failed').length;
      setStats({ pending, published, failed, total: posts.length });

      const futurePosts = posts
        .filter(p => p.status === 'pending')
        .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
      if (futurePosts.length) setNextDate(futurePosts[0].scheduled_date);

      const sorted = [...posts].sort((a, b) => b.created_at.localeCompare(a.created_at));
      setRecentPosts(sorted.slice(0, 6));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T12:00:00Z');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr + 'T00:00:00');
    const diff = Math.round((target - today) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return `In ${diff} days`;
  }

  const isEmpty = !loading && stats.total === 0;

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <h1>Dashboard</h1>
          <p>Your Google Business Profile posting overview</p>
        </div>

        <div className="page-body">

          {/* ── Onboarding Card (first-time users) ── */}
          {isEmpty && (
            <div className="onboarding-card">
              <span className="onboarding-icon">📷</span>
              <h2>Welcome to PostCraft!</h2>
              <p>
                Snap a photo at your next job site and PostCraft will write the post,
                schedule it, and publish it to your Google Business Profile — every single day, automatically.
              </p>
              <div className="onboarding-steps">
                {[
                  { icon: '📷', label: 'Snap a job photo' },
                  { icon: '🤖', label: 'AI writes the caption' },
                  { icon: '📅', label: 'It auto-posts daily' },
                ].map(s => (
                  <div className="onboarding-step" key={s.label}>
                    <span className="step-icon">{s.icon}</span>
                    <span className="step-label">{s.label}</span>
                  </div>
                ))}
              </div>
              <Link href="/upload" className="btn btn-primary btn-lg">
                📷 Upload Your First Photo
              </Link>
            </div>
          )}

          {/* ── Stats + Activity (returning users) ── */}
          {!isEmpty && (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-label">Queued Posts</span>
                  <span className="stat-value accent">{loading ? '—' : stats.pending}</span>
                  <span className="stat-sub">Ready to publish</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Published</span>
                  <span className="stat-value success">{loading ? '—' : stats.published}</span>
                  <span className="stat-sub">All time</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Next Post</span>
                  <span className="stat-value" style={{ fontSize: '20px', paddingTop: '6px' }}>
                    {loading ? '—' : (nextDate ? formatDate(nextDate) : 'None')}
                  </span>
                  <span className="stat-sub">{nextDate ? daysUntil(nextDate) : 'Add photos to queue'}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Failed</span>
                  <span className={`stat-value ${stats.failed > 0 ? 'danger' : ''}`}>
                    {loading ? '—' : stats.failed}
                  </span>
                  <span className="stat-sub">{stats.failed > 0 ? 'Needs attention' : 'All clear'}</span>
                </div>
              </div>

              <div className="cta-container" style={{ marginBottom: '28px', display: 'flex', gap: '12px' }}>
                <Link href="/upload" className="btn btn-primary btn-lg">📷 Upload a Photo</Link>
                <Link href="/queue" className="btn btn-secondary btn-lg">📅 View Queue</Link>
              </div>

              <div className="card">
                <div className="section-title">📋 Recent Activity</div>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <div className="spinner" />
                  </div>
                ) : recentPosts.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📷</div>
                    <h3>No posts yet</h3>
                    <p>Upload your first photo to get started!</p>
                    <Link href="/upload" className="btn btn-primary">Upload Photo</Link>
                  </div>
                ) : (
                  <div className="activity-log">
                    {recentPosts.map(post => (
                      <div key={post.id} className="activity-item">
                        <div className={`activity-dot ${post.status}`} />
                        <div className="activity-content">
                          <div className="act-title">
                            Scheduled for {formatDate(post.scheduled_date)} &nbsp;
                            <span className={`badge badge-${post.status}`}>{post.status}</span>
                          </div>
                          <div className="act-time" style={{ marginTop: '4px', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                            {post.description.slice(0, 90)}{post.description.length > 90 ? '...' : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
