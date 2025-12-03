import { type FormEvent, useState } from 'react'

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
}

export function FileUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [label, setLabel] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const safeName = file ? sanitizeName(file.name) : ''

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null
    setFile(selected)
    setStatus(null)
    setError(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus(null)
    setError(null)

    if (!file) {
      setError('Choose a file before uploading.')
      return
    }

    setUploading(true)

    // For now we just simulate a secure upload; backend wiring comes next.
    setTimeout(() => {
      setUploading(false)
      setStatus(`Simulated upload complete for ${safeName || file.name}.`)
    }, 700)
  }

  return (
    <div className="page-grid">
      <section className="card-surface card-surface--elevated">
        <div className="card-header">
          <div>
            <div className="card-subtitle">Secure transfer</div>
            <h2 className="card-title" style={{ marginTop: '0.4rem' }}>
              File upload
            </h2>
          </div>
          <div className="pill">
            <span className="pill-dot" />
            UPLOAD
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="file">
              File
            </label>
            <input
              id="file"
              className="input-control"
              type="file"
              onChange={handleFileChange}
            />
            {file && (
              <div className="input-help">
                Sanitized name: <strong>{safeName}</strong>
              </div>
            )}
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="label">
              Label / notes (optional)
            </label>
            <input
              id="label"
              className="input-control"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <div className="input-help">
              This will travel as metadata alongside the upload.
            </div>
          </div>

          {error && (
            <div
              style={{
                marginTop: '0.4rem',
                fontSize: '0.85rem',
                color: '#f36b6b',
              }}
            >
              {error}
            </div>
          )}
          {status && (
            <div
              style={{
                marginTop: '0.4rem',
                fontSize: '0.85rem',
                color: '#46a0a4',
              }}
            >
              {status}
            </div>
          )}

          <div className="form-footer">
            <button
              className="btn btn-primary"
              type="submit"
              disabled={uploading}
            >
              {uploading ? 'Uploading…' : 'Upload securely'}
            </button>
            <div className="input-help">
              Real upload, validation and malware scanning will be wired to the
              backend API.
            </div>
          </div>
        </form>
      </section>
    </div>
  )
}



