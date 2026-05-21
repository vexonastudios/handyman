'use client';
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';

function isVideo(pathStr) {
  if (!pathStr) return false;
  const ext = pathStr.split('.').pop().toLowerCase();
  return ['mp4', 'mov', 'webm', 'ogg', 'mkv', 'm4v'].includes(ext);
}

export default function QueuePage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editFields, setEditFields] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchQueue();
  }, []);

  async function fetchQueue() {
    try {
      const res = await fetch('/api/queue');
      const { posts } = await res.json();
      setPosts(posts);
    } catch (e) {
      setAlert({ type: 'error', message: 'Failed to load queue.' });
    } finally {
      setLoading(false);
    }
  }

  function startEdit(post) {
    setEditingId(post.id);
    setEditFields({ description: post.description, scheduled_date: post.scheduled_date });
  }

  async function saveEdit(id) {
    try {
      const res = await fetch('/api/queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editFields }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setPosts(prev => prev.map(p => p.id === id ? data.post : p));
      setEditingId(null);
      setAlert({ type: 'success', message: 'Post updated.' });
      setTimeout(() => setAlert(null), 3000);
    } catch (e) {
      setAlert({ type: 'error', message: e.message });
    }
  }

  async function deletePost(id) {
    try {
      const res = await fetch('/api/queue', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setPosts(prev => prev.filter(p => p.id !== id));
      setDeleteConfirm(null);
      setAlert({ type: 'success', message: 'Post removed from queue.' });
      setTimeout(() => setAlert(null), 3000);
    } catch (e) {
      setAlert({ type: 'error', message: e.message });
    }
  }

  function formatDate(str) {
    if (!str) return '—';
    const d = new Date(str + 'T12:00:00Z');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const today = new Date().toISOString().split('T')[0];
  const pending = posts.filter(p => p.status === 'pending');
  const published = posts.filter(p => p.status === 'published');
  const failed = posts.filter(p => p.status === 'failed');

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <h1>Post Queue</h1>
          <p>Manage your scheduled Google Business Profile posts</p>
        </div>

        <div className="page-body">
          {alert && (
            <div className={`alert alert-${alert.type}`}>{alert.message}</div>
          )}

          {!loading && pending.length > 0 && (
            <div className="next-date-banner">
              📅 &nbsp;Next post: <strong>{formatDate(pending.sort((a,b)=>a.scheduled_date.localeCompare(b.scheduled_date))[0]?.scheduled_date)}</strong>
              &nbsp;·&nbsp; {pending.length} post{pending.length !== 1 ? 's' : ''} in queue
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              <div className="spinner" style={{ width: 32, height: 32 }} />
            </div>
          ) : posts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📷</div>
              <h3>Queue is empty</h3>
              <p>Upload photos to start building your posting schedule.</p>
              <a href="/upload" className="btn btn-primary">Upload a Photo</a>
            </div>
          ) : (
            <>
              {/* Pending */}
              {pending.length > 0 && (
                <>
                  <div className="section-title">⏳ Scheduled</div>

                  {/* Desktop table */}
                  <div className="queue-table-wrap" style={{ marginBottom: 28 }}>
                    <table className="queue-table">
                      <thead>
                        <tr>
                          <th>Photo</th>
                          <th>Scheduled Date</th>
                          <th>Description</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pending
                          .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
                          .map(post => (
                          <tr key={post.id}>
                            <td>
                              {isVideo(post.image_path) ? (
                                <video
                                  src={`/api/photo?path=${encodeURIComponent(post.image_path)}`}
                                  className="queue-thumb"
                                  style={{ objectFit: 'cover', background: 'var(--bg-base)' }}
                                  muted
                                  playsInline
                                />
                              ) : (
                                <img
                                  src={`/api/photo?path=${encodeURIComponent(post.image_path)}`}
                                  alt=""
                                  className="queue-thumb"
                                />
                              )}
                            </td>
                            <td>
                              {editingId === post.id ? (
                                <input
                                  type="date"
                                  className="form-control"
                                  style={{ width: 160 }}
                                  value={editFields.scheduled_date}
                                  onChange={e => setEditFields(f => ({ ...f, scheduled_date: e.target.value }))}
                                />
                              ) : (
                                <span style={{ fontWeight: 600 }}>
                                  {post.scheduled_date === today
                                    ? <span style={{ color: 'var(--accent)' }}>Today</span>
                                    : formatDate(post.scheduled_date)
                                  }
                                </span>
                              )}
                            </td>
                            <td>
                              {editingId === post.id ? (
                                <textarea
                                  className="form-control"
                                  style={{ minHeight: 80, fontSize: 12 }}
                                  value={editFields.description}
                                  onChange={e => setEditFields(f => ({ ...f, description: e.target.value }))}
                                />
                              ) : (
                                <span className="queue-desc">{post.description}</span>
                              )}
                            </td>
                            <td>
                              {editingId === post.id ? (
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button className="btn btn-success btn-sm" onClick={() => saveEdit(post.id)}>Save</button>
                                  <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button className="btn btn-secondary btn-sm" onClick={() => startEdit(post)}>✏️ Edit</button>
                                  <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(post.id)}>🗑</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="queue-cards">
                    {pending
                      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
                      .map(post => (
                      <div key={post.id} className="queue-card">
                        {isVideo(post.image_path) ? (
                          <video
                            src={`/api/photo?path=${encodeURIComponent(post.image_path)}`}
                            className="queue-card-thumb"
                            muted playsInline
                          />
                        ) : (
                          <img
                            src={`/api/photo?path=${encodeURIComponent(post.image_path)}`}
                            alt=""
                            className="queue-card-thumb"
                          />
                        )}
                        <div className="queue-card-body">
                          <div className="queue-card-date">
                            {post.scheduled_date === today ? '🟡 Today' : formatDate(post.scheduled_date)}
                          </div>
                          {editingId === post.id ? (
                            <>
                              <input
                                type="date"
                                className="form-control"
                                style={{ marginBottom: 8 }}
                                value={editFields.scheduled_date}
                                onChange={e => setEditFields(f => ({ ...f, scheduled_date: e.target.value }))}
                              />
                              <textarea
                                className="form-control"
                                style={{ minHeight: 80, fontSize: 13, marginBottom: 8 }}
                                value={editFields.description}
                                onChange={e => setEditFields(f => ({ ...f, description: e.target.value }))}
                              />
                              <div className="queue-card-actions">
                                <button className="btn btn-success btn-sm" onClick={() => saveEdit(post.id)}>✓ Save</button>
                                <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="queue-card-desc">{post.description}</div>
                              <div className="queue-card-actions">
                                <button className="btn btn-secondary btn-sm" onClick={() => startEdit(post)}>✏️ Edit</button>
                                <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(post.id)}>🗑 Remove</button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Failed */}
              {failed.length > 0 && (
                <>
                  <div className="section-title">❌ Failed</div>
                  <div className="queue-table-wrap" style={{ marginBottom: 28 }}>
                    <table className="queue-table">
                      <thead>
                        <tr>
                          <th>Photo</th>
                          <th>Date</th>
                          <th>Error</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {failed.map(post => (
                          <tr key={post.id}>
                            <td>
                              {isVideo(post.image_path) ? (
                                <video
                                  src={`/api/photo?path=${encodeURIComponent(post.image_path)}`}
                                  className="queue-thumb"
                                  style={{ objectFit: 'cover', background: 'var(--bg-base)' }}
                                  muted
                                  playsInline
                                />
                              ) : (
                                <img
                                  src={`/api/photo?path=${encodeURIComponent(post.image_path)}`}
                                  alt=""
                                  className="queue-thumb"
                                />
                              )}
                            </td>
                            <td>{formatDate(post.scheduled_date)}</td>
                            <td style={{ color: 'var(--danger)', fontSize: 12 }}>{post.error || 'Unknown error'}</td>
                            <td>
                              <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(post.id)}>🗑 Remove</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Published */}
              {published.length > 0 && (
                <>
                  <div className="section-title">✅ Published</div>
                  <div className="queue-table-wrap">
                    <table className="queue-table">
                      <thead>
                        <tr>
                          <th>Photo</th>
                          <th>Published</th>
                          <th>Description</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {published
                          .sort((a, b) => b.published_at?.localeCompare(a.published_at))
                          .map(post => (
                          <tr key={post.id}>
                            <td>
                              {isVideo(post.image_path) ? (
                                <video
                                  src={`/api/photo?path=${encodeURIComponent(post.image_path)}`}
                                  className="queue-thumb"
                                  style={{ objectFit: 'cover', background: 'var(--bg-base)' }}
                                  muted
                                  playsInline
                                />
                              ) : (
                                <img
                                  src={`/api/photo?path=${encodeURIComponent(post.image_path)}`}
                                  alt=""
                                  className="queue-thumb"
                                />
                              )}
                            </td>
                            <td style={{ color: 'var(--text-secondary)' }}>
                              {post.published_at ? new Date(post.published_at).toLocaleDateString() : formatDate(post.scheduled_date)}
                            </td>
                            <td><span className="queue-desc">{post.description}</span></td>
                            <td><span className="badge badge-published">Published</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="modal-backdrop" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Remove this post?</div>
            <div className="modal-desc">This will permanently remove the post from your queue. The photo file will be kept on disk.</div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => deletePost(deleteConfirm)}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
