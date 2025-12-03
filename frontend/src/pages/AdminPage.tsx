import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { usePageTitle } from '../hooks/usePageTitle'
import axios from 'axios'
import { API_URL, getImageUrl } from '../config'

interface Post {
  id: number
  title: string
  content: string
  imageUrl: string | null
  nationality: string | null
  authorId: number
  authorName: string
  status: string
  createdAt: string
}

interface User {
  id: number
  name: string
  email: string
  role: string
  created_at: string
}

interface LogEntry {
  timestamp: string
  level: string
  message: string
  description: string
  type: string
}

export function AdminPage() {
  usePageTitle('Admin Panel')
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState<'overview' | 'pending' | 'users' | 'logs'>('overview')
  const [pendingPosts, setPendingPosts] = useState<Post[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (activeSection === 'pending') {
      fetchPendingPosts()
    } else if (activeSection === 'users') {
      fetchUsers()
    } else if (activeSection === 'logs') {
      fetchLogs()
    }
  }, [activeSection])

  async function fetchPendingPosts() {
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/posts/pending`, { withCredentials: true })
      setPendingPosts(res.data.posts || [])
    } catch {
      setError('Failed to fetch pending posts')
    } finally {
      setLoading(false)
    }
  }

  async function fetchUsers() {
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/admin/users`, { withCredentials: true })
      setUsers(res.data.users || [])
    } catch {
      // If endpoint doesn't exist, show sample data
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchLogs() {
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/admin/logs`, { withCredentials: true })
      setLogs(res.data.logs || [])
    } catch {
      // If endpoint doesn't exist, show empty
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(postId: number) {
    try {
      const csrfRes = await axios.get(`${API_URL}/csrf-token`, { withCredentials: true })
      await axios.put(`${API_URL}/posts/${postId}/approve`, {}, {
        withCredentials: true,
        headers: { 'X-CSRF-Token': csrfRes.data.csrfToken },
      })
      setSuccess('Post approved!')
      fetchPendingPosts()
    } catch {
      setError('Failed to approve post')
    }
  }

  async function handleReject(postId: number) {
    try {
      const csrfRes = await axios.get(`${API_URL}/csrf-token`, { withCredentials: true })
      await axios.put(`${API_URL}/posts/${postId}/reject`, {}, {
        withCredentials: true,
        headers: { 'X-CSRF-Token': csrfRes.data.csrfToken },
      })
      setSuccess('Post rejected')
      fetchPendingPosts()
    } catch {
      setError('Failed to reject post')
    }
  }

  async function handleDeleteUser(userId: number, userName: string) {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This will also delete all their posts and files.`)) {
      return
    }
    try {
      const csrfRes = await axios.get(`${API_URL}/csrf-token`, { withCredentials: true })
      await axios.delete(`${API_URL}/admin/users/${userId}`, {
        withCredentials: true,
        headers: { 'X-CSRF-Token': csrfRes.data.csrfToken },
      })
      setSuccess(`User "${userName}" has been deleted`)
      fetchUsers()
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      setError(axiosError.response?.data?.error || 'Failed to delete user')
    }
  }

  function getLogTypeColor(type: string): string {
    switch (type) {
      case 'auth': return 'var(--color-accent)'
      case 'security': return '#d9534f'
      case 'content': return 'var(--color-warm)'
      case 'moderation': return 'var(--color-gold)'
      case 'admin': return '#9b59b6'
      case 'error': return '#b84b4b'
      default: return 'var(--color-text-secondary)'
    }
  }

  function getLogTypeIcon(type: string): string {
    switch (type) {
      case 'auth': return '🔐'
      case 'security': return '🛡️'
      case 'content': return '📝'
      case 'moderation': return '✅'
      case 'admin': return '👑'
      case 'error': return '❌'
      default: return '📌'
    }
  }

  // Auto-clear messages
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess('')
        setError('')
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [success, error])

  return (
    <div className="page-grid">
      <section style={{ marginBottom: '0.5rem' }}>
        <h1 className="section-title">Admin Panel</h1>
        <p className="section-subtitle">
          System administration and content moderation
        </p>
      </section>

      {/* Messages */}
      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          background: 'rgba(184, 75, 75, 0.1)',
          border: '1px solid rgba(184, 75, 75, 0.3)',
          borderRadius: 'var(--border-radius-md)',
          color: '#b84b4b',
          marginBottom: '1rem',
        }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{
          padding: '0.75rem 1rem',
          background: 'rgba(107, 140, 90, 0.1)',
          border: '1px solid rgba(107, 140, 90, 0.3)',
          borderRadius: 'var(--border-radius-md)',
          color: 'var(--color-accent-strong)',
          marginBottom: '1rem',
        }}>
          {success}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeSection === 'overview' ? 'tab--active' : ''}`}
          onClick={() => setActiveSection('overview')}
        >
          📊 Overview
        </button>
        <button
          className={`tab ${activeSection === 'pending' ? 'tab--active' : ''}`}
          onClick={() => setActiveSection('pending')}
        >
          ⏳ Pending Posts ({pendingPosts.length})
        </button>
        <button
          className={`tab ${activeSection === 'users' ? 'tab--active' : ''}`}
          onClick={() => setActiveSection('users')}
        >
          👥 Users
        </button>
        <button
          className={`tab ${activeSection === 'logs' ? 'tab--active' : ''}`}
          onClick={() => setActiveSection('logs')}
        >
          📋 Activity Logs
        </button>
      </div>

      {/* Overview Section */}
      {activeSection === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {/* Admin Info */}
          <div className="card-surface card-surface--elevated">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '14px',
                background: 'linear-gradient(135deg, var(--color-warm), var(--color-gold))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
              }}>
                👑
              </div>
              <div>
                <h3 className="card-title" style={{ margin: 0 }}>{user?.name}</h3>
                <div className="muted">{user?.email}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span className="pill pill--admin">
                <span className="pill-dot" />
                ADMIN
              </span>
              <span className="status-badge">
                <span className="status-dot" />
                Active
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card-surface card-surface--elevated">
            <h3 className="card-title" style={{ marginBottom: '1rem' }}>Quick Actions</h3>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <button
                onClick={() => setActiveSection('pending')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  background: 'var(--color-bg)',
                  borderRadius: 'var(--border-radius-md)',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <span style={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  background: 'rgba(201, 148, 61, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  📝
                </span>
                <div>
                  <div style={{ fontWeight: 500 }}>Review Pending Posts</div>
                  <div className="muted" style={{ fontSize: '0.8rem' }}>Approve or reject submissions</div>
                </div>
              </button>

              <button
                onClick={() => setActiveSection('users')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  background: 'var(--color-bg)',
                  borderRadius: 'var(--border-radius-md)',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <span style={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  background: 'rgba(107, 140, 90, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  👥
                </span>
                <div>
                  <div style={{ fontWeight: 500 }}>User Management</div>
                  <div className="muted" style={{ fontSize: '0.8rem' }}>View registered users</div>
                </div>
              </button>

              <button
                onClick={() => setActiveSection('logs')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  background: 'var(--color-bg)',
                  borderRadius: 'var(--border-radius-md)',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <span style={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  background: 'rgba(184, 106, 75, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  📊
                </span>
                <div>
                  <div style={{ fontWeight: 500 }}>Activity Logs</div>
                  <div className="muted" style={{ fontSize: '0.8rem' }}>Review security events</div>
                </div>
              </button>
            </div>
          </div>

          {/* Go to Content */}
          <div className="card-surface card-surface--elevated">
            <h3 className="card-title" style={{ marginBottom: '1rem' }}>Content Management</h3>
            <p className="muted" style={{ marginBottom: '1rem' }}>
              Create and manage recipes, upload files, and more.
            </p>
            <Link to="/content" className="btn btn-primary">
              Go to Content Manager →
            </Link>
          </div>
        </div>
      )}

      {/* Pending Posts Section */}
      {activeSection === 'pending' && (
        <div className="card-surface">
          <div className="card-header">
            <h3 className="card-title">Pending Approval</h3>
            <span className="pill pill--pending">
              <span className="pill-dot" />
              {pendingPosts.length} PENDING
            </span>
          </div>

          {loading ? (
            <div className="muted" style={{ textAlign: 'center', padding: '2rem' }}>
              Loading...
            </div>
          ) : pendingPosts.length === 0 ? (
            <div className="muted" style={{ textAlign: 'center', padding: '2rem' }}>
              No posts pending approval 🎉
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {pendingPosts.map((post) => (
                <article
                  key={post.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: post.imageUrl ? '120px 1fr' : '1fr',
                    gap: '1rem',
                    padding: '1rem',
                    background: 'var(--color-bg)',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {post.imageUrl && (
                    <img
                      src={getImageUrl(post.imageUrl) || ''}
                      alt={post.title}
                      style={{
                        width: '120px',
                        height: '90px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                      }}
                    />
                  )}
                  <div>
                    <h4 style={{ fontFamily: "'Crimson Pro', serif", margin: '0 0 0.25rem' }}>
                      {post.title}
                    </h4>
                    <div className="muted" style={{ fontSize: '0.82rem', marginBottom: '0.5rem' }}>
                      by {post.authorName} • {post.nationality || 'International'} • {new Date(post.createdAt).toLocaleDateString()}
                    </div>
                    <p className="muted" style={{ margin: '0 0 0.75rem', fontSize: '0.9rem' }}>
                      {post.content.length > 150 ? post.content.substring(0, 150) + '...' : post.content}
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleApprove(post.id)}
                        style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
                      >
                        ✓ Approve
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleReject(post.id)}
                        style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Users Section */}
      {activeSection === 'users' && (
        <div className="card-surface">
          <div className="card-header">
            <h3 className="card-title">Registered Users</h3>
            <button 
              onClick={fetchUsers} 
              className="btn btn-ghost"
              style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
            >
              🔄 Refresh
            </button>
          </div>

          {loading ? (
            <div className="muted" style={{ textAlign: 'center', padding: '2rem' }}>
              Loading...
            </div>
          ) : users.length === 0 ? (
            <div className="muted" style={{ textAlign: 'center', padding: '2rem' }}>
              <p>No users found.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {users.map((u) => (
                <div
                  key={u.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: 'var(--color-bg)',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: '10px',
                      background: u.role === 'admin' 
                        ? 'linear-gradient(135deg, var(--color-warm), var(--color-gold))'
                        : u.role === 'editor'
                        ? 'linear-gradient(135deg, var(--color-accent), var(--color-accent-strong))'
                        : 'var(--color-surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem',
                      border: '1px solid var(--color-border)',
                    }}>
                      {u.role === 'admin' ? '👑' : u.role === 'editor' ? '✏️' : '👤'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{u.name}</div>
                      <div className="muted" style={{ fontSize: '0.82rem' }}>{u.email}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className={`pill ${u.role === 'admin' ? 'pill--admin' : u.role === 'editor' ? 'pill--editor' : ''}`}>
                      <span className="pill-dot" />
                      {u.role.toUpperCase()}
                    </span>
                    {u.role !== 'admin' && u.id !== user?.id && (
                      <button
                        onClick={() => handleDeleteUser(u.id, u.name)}
                        className="btn btn-danger"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
                        title="Delete user"
                      >
                        🗑️ Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Logs Section */}
      {activeSection === 'logs' && (
        <div className="card-surface">
          <div className="card-header">
            <h3 className="card-title">Activity Logs</h3>
            <button 
              onClick={fetchLogs} 
              className="btn btn-ghost"
              style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
            >
              🔄 Refresh
            </button>
          </div>

          {loading ? (
            <div className="muted" style={{ textAlign: 'center', padding: '2rem' }}>
              Loading...
            </div>
          ) : logs.length === 0 ? (
            <div className="muted" style={{ textAlign: 'center', padding: '2rem' }}>
              <p>No activity logs yet.</p>
              <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                Events will appear here as users interact with the system.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {logs.map((log, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '32px 1fr auto',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.65rem 0.85rem',
                    background: 'var(--color-bg)',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid var(--color-border)',
                    borderLeft: `3px solid ${getLogTypeColor(log.type)}`,
                  }}
                >
                  <span style={{ fontSize: '1.1rem' }}>{getLogTypeIcon(log.type)}</span>
                  <div>
                    <div style={{ 
                      fontWeight: 500, 
                      fontSize: '0.9rem',
                      marginBottom: '0.15rem',
                    }}>
                      {log.description}
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      fontSize: '0.75rem',
                    }}>
                      <span 
                        className="pill"
                        style={{ 
                          fontSize: '0.65rem', 
                          padding: '0.1rem 0.4rem',
                          background: `${getLogTypeColor(log.type)}20`,
                          color: getLogTypeColor(log.type),
                          border: 'none',
                        }}
                      >
                        {log.type.toUpperCase()}
                      </span>
                      <span className="muted">{log.message}</span>
                    </div>
                  </div>
                  <div className="muted" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Admin Notice */}
      <div
        className="card-surface"
        style={{
          marginTop: '1rem',
          background: 'rgba(184, 106, 75, 0.08)',
          borderColor: 'rgba(184, 106, 75, 0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <span style={{ fontSize: '1.5rem' }}>⚠️</span>
          <div>
            <h4 style={{ fontFamily: "'Crimson Pro', Georgia, serif", margin: '0 0 0.25rem' }}>
              Administrator Notice
            </h4>
            <p className="muted" style={{ margin: 0 }}>
              All administrative actions are logged for security purposes. Session expires after 25 minutes of inactivity.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
