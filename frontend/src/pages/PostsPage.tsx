import { type FormEvent, useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
})

interface Post {
  id: number
  title: string
  content: string
  authorId: number
  authorName: string
  createdAt: string
  updatedAt: string
}

export function PostsPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state for creating/editing
  const [showForm, setShowForm] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const canEdit = user?.role === 'admin' || user?.role === 'editor'

  // Fetch CSRF token
  async function getCsrfToken() {
    const res = await api.get('/api/csrf-token')
    return res.data.csrfToken
  }

  // Load posts
  async function loadPosts() {
    setLoading(true)
    setError(null)
    try {
      const csrfToken = await getCsrfToken()
      api.defaults.headers.common['X-CSRF-Token'] = csrfToken
      const res = await api.get('/api/posts')
      setPosts(res.data.posts)
    } catch (err) {
      console.error('Failed to load posts:', err)
      setError('Failed to load posts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPosts()
  }, [])

  // Handle create/update
  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)

    try {
      const csrfToken = await getCsrfToken()
      api.defaults.headers.common['X-CSRF-Token'] = csrfToken

      if (editingPost) {
        // Update
        await api.put(`/api/posts/${editingPost.id}`, { title, content })
      } else {
        // Create
        await api.post('/api/posts', { title, content })
      }

      // Reset form and reload
      setShowForm(false)
      setEditingPost(null)
      setTitle('')
      setContent('')
      loadPosts()
    } catch (err: unknown) {
      console.error('Failed to save post:', err)
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setFormError(err.response.data.error)
      } else {
        setFormError('Failed to save post')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Handle delete
  async function handleDelete(postId: number) {
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      const csrfToken = await getCsrfToken()
      api.defaults.headers.common['X-CSRF-Token'] = csrfToken
      await api.delete(`/api/posts/${postId}`)
      loadPosts()
    } catch (err) {
      console.error('Failed to delete post:', err)
      setError('Failed to delete post')
    }
  }

  // Start editing
  function startEdit(post: Post) {
    setEditingPost(post)
    setTitle(post.title)
    setContent(post.content)
    setShowForm(true)
    setFormError(null)
  }

  // Start new post
  function startNew() {
    setEditingPost(null)
    setTitle('')
    setContent('')
    setShowForm(true)
    setFormError(null)
  }

  // Cancel form
  function cancelForm() {
    setShowForm(false)
    setEditingPost(null)
    setTitle('')
    setContent('')
    setFormError(null)
  }

  return (
    <div className="page-grid">
      <section className="card-surface card-surface--elevated">
        <div className="card-header">
          <div>
            <div className="card-subtitle">Content Management</div>
            <h2 className="card-title" style={{ marginTop: '0.4rem' }}>
              Posts & Announcements
            </h2>
          </div>
          <div className="pill">
            <span className="pill-dot" />
            {canEdit ? 'EDITOR' : 'VIEWER'}
          </div>
        </div>

        {canEdit && !showForm && (
          <div style={{ marginBottom: '1.5rem' }}>
            <button className="btn btn-primary" type="button" onClick={startNew}>
              + New Post
            </button>
          </div>
        )}

        {/* Create/Edit Form */}
        {showForm && canEdit && (
          <div
            style={{
              background: 'rgba(15, 24, 32, 0.8)',
              borderRadius: 'var(--border-radius-md)',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              border: '1px solid rgba(70, 160, 164, 0.3)',
            }}
          >
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>
              {editingPost ? 'Edit Post' : 'Create New Post'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label className="input-label" htmlFor="post-title">
                  Title
                </label>
                <input
                  id="post-title"
                  className="input-control"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter post title..."
                  required
                />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="post-content">
                  Content
                </label>
                <textarea
                  id="post-content"
                  className="input-control"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your content here..."
                  rows={5}
                  required
                  style={{ resize: 'vertical', minHeight: '100px' }}
                />
              </div>

              <div
                className="input-help"
                style={{ marginBottom: '1rem', color: '#c9a14a' }}
              >
                ⚠️ Note: The word "security" is not allowed in posts.
              </div>

              {formError && (
                <div
                  style={{
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    background: 'rgba(243, 107, 107, 0.15)',
                    borderRadius: 'var(--border-radius-md)',
                    color: '#f36b6b',
                    fontSize: '0.9rem',
                  }}
                >
                  {formError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting
                    ? 'Saving...'
                    : editingPost
                    ? 'Update Post'
                    : 'Create Post'}
                </button>
                <button
                  className="btn btn-outline"
                  type="button"
                  onClick={cancelForm}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div
            style={{
              marginBottom: '1rem',
              padding: '0.75rem',
              background: 'rgba(243, 107, 107, 0.15)',
              borderRadius: 'var(--border-radius-md)',
              color: '#f36b6b',
            }}
          >
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading && <div className="muted">Loading posts...</div>}

        {/* Posts list */}
        {!loading && posts.length === 0 && (
          <div className="muted" style={{ textAlign: 'center', padding: '2rem' }}>
            No posts yet.{' '}
            {canEdit && (
              <span>
                Click "New Post" to create one.
              </span>
            )}
          </div>
        )}

        {!loading && posts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {posts.map((post) => (
              <article
                key={post.id}
                style={{
                  background: 'rgba(10, 16, 20, 0.6)',
                  borderRadius: 'var(--border-radius-md)',
                  padding: '1.25rem',
                  border: '1px solid rgba(96, 131, 143, 0.25)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    marginBottom: '0.75rem',
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '1.15rem',
                      color: 'var(--color-text)',
                    }}
                  >
                    {post.title}
                  </h3>
                  {canEdit && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <button
                        className="btn btn-outline"
                        type="button"
                        onClick={() => startEdit(post)}
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-outline"
                        type="button"
                        onClick={() => handleDelete(post.id)}
                        style={{
                          padding: '0.3rem 0.6rem',
                          fontSize: '0.8rem',
                          borderColor: 'rgba(243, 107, 107, 0.5)',
                          color: '#f36b6b',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                <p
                  style={{
                    margin: '0 0 0.75rem',
                    color: 'var(--color-text-muted)',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {post.content}
                </p>
                <div
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--color-text-muted)',
                    opacity: 0.7,
                  }}
                >
                  By {post.authorName} •{' '}
                  {new Date(post.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                  {post.updatedAt !== post.createdAt && ' (edited)'}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

