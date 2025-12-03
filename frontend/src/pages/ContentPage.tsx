import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react'
import { useAuth } from '../hooks/useAuth'
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
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

interface FileUpload {
  id: number
  originalName: string
  mimeType: string
  size: number
  createdAt: string
}

const NATIONALITIES = [
  'Italian',
  'Mexican',
  'Chinese',
  'Japanese',
  'Indian',
  'French',
  'Thai',
  'American',
  'Mediterranean',
  'Middle Eastern',
  'Korean',
  'Vietnamese',
  'Greek',
  'Spanish',
  'Brazilian',
  'Other',
]

export function ContentPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'recipes' | 'files' | 'pending'>('recipes')
  const [posts, setPosts] = useState<Post[]>([])
  const [pendingPosts, setPendingPosts] = useState<Post[]>([])
  const [files, setFiles] = useState<FileUpload[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Post form
  const [postTitle, setPostTitle] = useState('')
  const [postContent, setPostContent] = useState('')
  const [postNationality, setPostNationality] = useState('')
  const [postImage, setPostImage] = useState<File | null>(null)
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null)
  const [postSubmitting, setPostSubmitting] = useState(false)

  // File form
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileSubmitting, setFileSubmitting] = useState(false)

  // Search/filter
  const [cuisineFilter, setCuisineFilter] = useState('')

  // All authenticated users can create posts
  const canCreatePosts = !!user
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const requests = [
        axios.get(`${API_URL}/posts`, { withCredentials: true }),
        axios.get(`${API_URL}/files/list`, { withCredentials: true }),
      ]
      
      // Only fetch pending posts if admin
      if (user?.role === 'admin') {
        requests.push(axios.get(`${API_URL}/posts/pending`, { withCredentials: true }))
      }

      const responses = await Promise.all(requests)
      setPosts(responses[0].data.posts || [])
      setFiles(responses[1].data.files || [])
      if (responses[2]) {
        setPendingPosts(responses[2].data.posts || [])
      }
    } catch (err) {
      console.error('Fetch error:', err)
      setError('Failed to load content')
    } finally {
      setLoading(false)
    }
  }

  function handlePostImageSelect(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setPostImage(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPostImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  function clearPostImage() {
    setPostImage(null)
    setPostImagePreview(null)
  }

  async function handleCreatePost(e: FormEvent) {
    e.preventDefault()
    if (!postTitle.trim() || !postContent.trim()) {
      setError('Title and description are required')
      return
    }

    setPostSubmitting(true)
    setError('')
    setSuccessMsg('')
    
    try {
      // Get CSRF token
      const csrfRes = await axios.get(`${API_URL}/csrf-token`, { withCredentials: true })
      const csrfToken = csrfRes.data.csrfToken

      // Create FormData for multipart upload
      const formData = new FormData()
      formData.append('title', postTitle)
      formData.append('content', postContent)
      if (postNationality) {
        formData.append('nationality', postNationality)
      }
      if (postImage) {
        formData.append('image', postImage)
      }

      await axios.post(`${API_URL}/posts`, formData, {
        withCredentials: true,
        headers: {
          'X-CSRF-Token': csrfToken,
          'Content-Type': 'multipart/form-data',
        },
      })
      
      // Clear form
      setPostTitle('')
      setPostContent('')
      setPostNationality('')
      setPostImage(null)
      setPostImagePreview(null)
      
      if (user?.role === 'admin') {
        setSuccessMsg('Recipe published successfully!')
      } else {
        setSuccessMsg('Recipe submitted for approval!')
      }
      
      fetchData()
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error)
      } else {
        setError('Failed to create recipe')
      }
    } finally {
      setPostSubmitting(false)
    }
  }

  async function handleApprovePost(postId: number) {
    try {
      const csrfRes = await axios.get(`${API_URL}/csrf-token`, { withCredentials: true })
      await axios.put(
        `${API_URL}/posts/${postId}/approve`,
        {},
        {
          withCredentials: true,
          headers: { 'X-CSRF-Token': csrfRes.data.csrfToken },
        }
      )
      setSuccessMsg('Recipe approved!')
      fetchData()
    } catch {
      setError('Failed to approve recipe')
    }
  }

  async function handleRejectPost(postId: number) {
    try {
      const csrfRes = await axios.get(`${API_URL}/csrf-token`, { withCredentials: true })
      await axios.put(
        `${API_URL}/posts/${postId}/reject`,
        {},
        {
          withCredentials: true,
          headers: { 'X-CSRF-Token': csrfRes.data.csrfToken },
        }
      )
      setSuccessMsg('Recipe rejected')
      fetchData()
    } catch {
      setError('Failed to reject recipe')
    }
  }

  async function handleDeletePost(postId: number) {
    if (!confirm('Are you sure you want to delete this recipe?')) return
    try {
      const csrfRes = await axios.get(`${API_URL}/csrf-token`, { withCredentials: true })
      await axios.delete(`${API_URL}/posts/${postId}`, {
        withCredentials: true,
        headers: { 'X-CSRF-Token': csrfRes.data.csrfToken },
      })
      setSuccessMsg('Recipe deleted')
      fetchData()
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error)
      } else {
        setError('Failed to delete recipe')
      }
    }
  }

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  async function handleUploadFile(e: FormEvent) {
    e.preventDefault()
    if (!selectedFile) return

    setFileSubmitting(true)
    setError('')
    try {
      const csrfRes = await axios.get(`${API_URL}/csrf-token`, { withCredentials: true })
      const formData = new FormData()
      formData.append('file', selectedFile)

      await axios.post(`${API_URL}/files/upload`, formData, {
        withCredentials: true,
        headers: {
          'X-CSRF-Token': csrfRes.data.csrfToken,
          'Content-Type': 'multipart/form-data',
        },
      })
      setSelectedFile(null)
      setSuccessMsg('File uploaded!')
      fetchData()
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error)
      } else {
        setError('Failed to upload file')
      }
    } finally {
      setFileSubmitting(false)
    }
  }

  async function handleDeleteFile(fileId: number) {
    if (!confirm('Are you sure you want to delete this file?')) return
    try {
      const csrfRes = await axios.get(`${API_URL}/csrf-token`, { withCredentials: true })
      await axios.delete(`${API_URL}/files/${fileId}`, {
        withCredentials: true,
        headers: { 'X-CSRF-Token': csrfRes.data.csrfToken },
      })
      setSuccessMsg('File deleted')
      fetchData()
    } catch {
      setError('Failed to delete file')
    }
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1048576).toFixed(1) + ' MB'
  }

  // Auto-clear messages
  useEffect(() => {
    if (successMsg || error) {
      const timer = setTimeout(() => {
        setSuccessMsg('')
        setError('')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [successMsg, error])

  if (loading) {
    return (
      <div className="card-surface" style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="muted">Loading content...</div>
      </div>
    )
  }

  return (
    <div className="page-grid">
      <section style={{ marginBottom: '1rem' }}>
        <h1 className="section-title">Recipe Manager</h1>
        <p className="section-subtitle">
          Create, manage, and share your delicious recipes
        </p>
      </section>

      {/* Messages */}
      {error && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: 'rgba(184, 75, 75, 0.1)',
            border: '1px solid rgba(184, 75, 75, 0.3)',
            borderRadius: 'var(--border-radius-md)',
            color: '#b84b4b',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      )}
      {successMsg && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: 'rgba(107, 140, 90, 0.1)',
            border: '1px solid rgba(107, 140, 90, 0.3)',
            borderRadius: 'var(--border-radius-md)',
            color: 'var(--color-accent-strong)',
            marginBottom: '1rem',
          }}
        >
          {successMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'recipes' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('recipes')}
          type="button"
        >
          🍳 Recipes ({posts.filter(p => p.status === 'approved').length})
        </button>
        {isAdmin && (
          <button
            className={`tab ${activeTab === 'pending' ? 'tab--active' : ''}`}
            onClick={() => setActiveTab('pending')}
            type="button"
          >
            ⏳ Pending Approval ({pendingPosts.length})
          </button>
        )}
        <button
          className={`tab ${activeTab === 'files' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('files')}
          type="button"
        >
          📁 Files ({files.length})
        </button>
      </div>

      {/* Recipes Tab */}
      {activeTab === 'recipes' && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Create Recipe Form */}
          {canCreatePosts && (
            <div className="card-surface">
              <h3 className="card-title" style={{ marginBottom: '1.25rem' }}>
                🍽️ Add New Recipe
              </h3>
              <form onSubmit={handleCreatePost}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label className="input-label">Recipe Title *</label>
                    <input
                      type="text"
                      className="input-control"
                      value={postTitle}
                      onChange={(e) => setPostTitle(e.target.value)}
                      placeholder="e.g., Homemade Pasta Carbonara"
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Cuisine / Nationality</label>
                    <select
                      className="input-control"
                      value={postNationality}
                      onChange={(e) => setPostNationality(e.target.value)}
                      style={{ cursor: 'pointer' }}
                    >
                      <option value="">Select cuisine...</option>
                      {NATIONALITIES.map((nat) => (
                        <option key={nat} value={nat}>
                          {nat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Description / Instructions *</label>
                  <textarea
                    className="input-control"
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder="Describe your recipe, ingredients, and cooking instructions..."
                    rows={5}
                    style={{ resize: 'vertical' }}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Recipe Photo</label>
                  {postImagePreview ? (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img
                        src={postImagePreview}
                        alt="Preview"
                        style={{
                          maxWidth: '300px',
                          maxHeight: '200px',
                          borderRadius: 'var(--border-radius-md)',
                          border: '1px solid var(--color-border)',
                        }}
                      />
                      <button
                        type="button"
                        onClick={clearPostImage}
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: '#b84b4b',
                          color: 'white',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <input
                      type="file"
                      className="input-control"
                      onChange={handlePostImageSelect}
                      accept="image/jpeg,image/png,image/gif,image/webp"
                    />
                  )}
                  <div className="input-help">
                    Accepted: JPEG, PNG, GIF, WebP (max 15MB)
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={postSubmitting}
                  >
                    {postSubmitting ? 'Publishing...' : user?.role === 'admin' ? 'Publish Recipe' : 'Submit for Approval'}
                  </button>
                  {user?.role !== 'admin' && (
                    <span className="muted" style={{ fontSize: '0.85rem' }}>
                      ℹ️ Recipes require admin approval before being visible
                    </span>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Recipes Grid */}
          <div className="card-surface">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 className="card-title" style={{ margin: 0 }}>
                Published Recipes
              </h3>
              {/* Cuisine Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="muted" style={{ fontSize: '0.88rem' }}>🔍 Filter by cuisine:</span>
                <select
                  className="input-control"
                  value={cuisineFilter}
                  onChange={(e) => setCuisineFilter(e.target.value)}
                  style={{ padding: '0.4rem 0.8rem', minWidth: '150px' }}
                >
                  <option value="">All Cuisines</option>
                  {NATIONALITIES.map((nat) => (
                    <option key={nat} value={nat}>
                      {nat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(() => {
              const filteredPosts = posts
                .filter((p) => p.status === 'approved')
                .filter((p) => !cuisineFilter || p.nationality === cuisineFilter)
              
              if (filteredPosts.length === 0) {
                return (
                  <div className="muted" style={{ textAlign: 'center', padding: '2rem' }}>
                    {cuisineFilter 
                      ? `No ${cuisineFilter} recipes found. Try another cuisine!` 
                      : `No recipes published yet. ${canCreatePosts ? 'Create your first recipe above!' : ''}`}
                  </div>
                )
              }

              return (
                <div className="food-grid">
                  {filteredPosts.map((post) => (
                    <RecipeCard
                      key={post.id}
                      post={post}
                      userId={user?.id}
                      isAdmin={isAdmin}
                      onDelete={handleDeletePost}
                    />
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Pending Approval Tab (Admin Only) */}
      {activeTab === 'pending' && isAdmin && (
        <div className="card-surface">
          <div className="card-header">
            <h3 className="card-title">Pending Approval</h3>
            <span className="pill pill--pending">
              <span className="pill-dot" />
              {pendingPosts.length} PENDING
            </span>
          </div>

          {pendingPosts.length === 0 ? (
            <div className="muted" style={{ textAlign: 'center', padding: '2rem' }}>
              No recipes pending approval
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ fontFamily: "'Crimson Pro', serif", margin: '0 0 0.25rem' }}>
                          {post.title}
                        </h4>
                        <div className="muted" style={{ fontSize: '0.82rem' }}>
                          by {post.authorName} • {post.nationality || 'International'}
                        </div>
                      </div>
                    </div>
                    <p className="muted" style={{ margin: '0.5rem 0', fontSize: '0.9rem', lineHeight: 1.5 }}>
                      {post.content.length > 150 ? post.content.substring(0, 150) + '...' : post.content}
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleApprovePost(post.id)}
                        style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
                      >
                        ✓ Approve
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleRejectPost(post.id)}
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

      {/* Files Tab */}
      {activeTab === 'files' && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Upload Form */}
          <div className="card-surface">
            <h3 className="card-title" style={{ marginBottom: '1rem' }}>
              Upload File
            </h3>
            <form onSubmit={handleUploadFile}>
              <div className="input-group">
                <label className="input-label">Select File</label>
                <input
                  type="file"
                  className="input-control"
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
                {selectedFile && (
                  <div className="muted" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </div>
                )}
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!selectedFile || fileSubmitting}
              >
                {fileSubmitting ? 'Uploading...' : 'Upload'}
              </button>
            </form>
          </div>

          {/* Files List */}
          <div className="card-surface">
            <h3 className="card-title" style={{ marginBottom: '1rem' }}>
              Your Files
            </h3>

            {files.length === 0 ? (
              <div className="muted" style={{ textAlign: 'center', padding: '2rem' }}>
                No files uploaded yet
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {files.map((file) => (
                  <div
                    key={file.id}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '8px',
                          background: 'rgba(107, 140, 90, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1rem',
                        }}
                      >
                        {file.mimeType.startsWith('image/') ? '🖼️' : '📄'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{file.originalName}</div>
                        <div className="muted" style={{ fontSize: '0.8rem' }}>
                          {formatFileSize(file.size)} •{' '}
                          {new Date(file.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <a
                        href={`${API_URL}/files/download/${file.id}`}
                        className="btn btn-outline"
                        style={{ fontSize: '0.82rem', padding: '0.3rem 0.65rem' }}
                      >
                        Download
                      </a>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDeleteFile(file.id)}
                        style={{ fontSize: '0.82rem', padding: '0.3rem 0.65rem' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function RecipeCard({
  post,
  userId,
  isAdmin,
  onDelete,
}: {
  post: Post
  userId?: number
  isAdmin?: boolean
  onDelete: (id: number) => void
}) {
  const canDelete = post.authorId === userId || isAdmin

  return (
    <article className="food-card">
      {post.imageUrl ? (
        <img
          src={`http://localhost:4000${post.imageUrl}`}
          alt={post.title}
          className="food-card-image"
        />
      ) : (
        <div
          className="food-card-image"
          style={{
            background: 'linear-gradient(135deg, var(--color-accent-soft), var(--color-gold-soft))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '3rem',
          }}
        >
          🍽️
        </div>
      )}
      <div className="food-card-body">
        <div className="food-card-category">
          {post.nationality || 'International'} • by {post.authorName}
        </div>
        <h3 className="food-card-title">{post.title}</h3>
        <p
          style={{
            fontSize: '0.88rem',
            color: 'var(--color-text-muted)',
            margin: '0.5rem 0',
            lineHeight: 1.5,
          }}
        >
          {post.content.length > 100 ? post.content.substring(0, 100) + '...' : post.content}
        </p>
        {canDelete && (
          <button
            className="btn btn-danger"
            onClick={() => onDelete(post.id)}
            style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem', marginTop: '0.5rem' }}
          >
            Delete
          </button>
        )}
      </div>
    </article>
  )
}
