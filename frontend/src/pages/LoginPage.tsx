import { type FormEvent, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const { login, verifyOtp, resendOtp, cancelOtp, loading, otpPending } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const location = useLocation()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    e.stopPropagation()
    setError(null)
    if (!email || !password) {
      setError('Email and password are required.')
      return
    }

    try {
      await login(email, password)
    } catch (err) {
      console.error('Login error:', err)
      setError('Login failed. Check your credentials.')
    }
  }

  async function handleOtpSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP.')
      return
    }

    try {
      await verifyOtp(otp)
    } catch (err) {
      console.error('OTP error:', err)
      setError('Invalid or expired OTP. Please try again.')
    }
  }

  async function handleResendOtp() {
    if (resendCooldown > 0) return
    
    const newOtp = await resendOtp()
    if (newOtp) {
      setResendCooldown(60)
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
  }

  const from = (location.state as { from?: Location })?.from

  // OTP Verification Screen
  if (otpPending) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <section
          className="card-surface card-surface--elevated"
          style={{ maxWidth: '420px', width: '100%' }}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '14px',
                background: 'linear-gradient(135deg, var(--color-gold), var(--color-warm))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                margin: '0 auto 1rem',
              }}
            >
              🔐
            </div>
            <h2
              className="card-title"
              style={{ margin: '0 0 0.25rem', fontSize: '1.5rem' }}
            >
              Verify Your Identity
            </h2>
            <p className="muted" style={{ margin: 0 }}>
              Enter the 6-digit code to continue
            </p>
          </div>

          {/* DEMO: Show OTP */}
          {otpPending.demoOtp && (
            <div
              style={{
                padding: '1rem',
                background: 'rgba(107, 140, 90, 0.1)',
                border: '1px solid rgba(107, 140, 90, 0.3)',
                borderRadius: 'var(--border-radius-md)',
                marginBottom: '1rem',
                textAlign: 'center',
              }}
            >
              <div className="muted" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                DEMO: Your OTP Code
              </div>
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  letterSpacing: '0.3em',
                  color: 'var(--color-accent-strong)',
                }}
              >
                {otpPending.demoOtp}
              </div>
            </div>
          )}

          <form onSubmit={handleOtpSubmit}>
            <div className="input-group">
              <label className="input-label" htmlFor="otp">
                One-Time Password
              </label>
              <input
                id="otp"
                className="input-control"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={{
                  textAlign: 'center',
                  letterSpacing: '0.5em',
                  fontSize: '1.25rem',
                  fontFamily: 'monospace',
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(184, 75, 75, 0.1)',
                  border: '1px solid rgba(184, 75, 75, 0.3)',
                  borderRadius: 'var(--border-radius-md)',
                  marginTop: '0.5rem',
                  fontSize: '0.88rem',
                  color: '#b84b4b',
                }}
              >
                {error}
              </div>
            )}

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading || otp.length !== 6}
              style={{ width: '100%', marginTop: '1.25rem' }}
            >
              {loading ? 'Verifying…' : 'Verify OTP'}
            </button>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '1rem',
              }}
            >
              <button
                type="button"
                className="btn btn-ghost"
                onClick={cancelOtp}
                style={{ fontSize: '0.88rem' }}
              >
                ← Back to Login
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0}
                style={{ fontSize: '0.88rem' }}
              >
                {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend OTP'}
              </button>
            </div>
          </form>
        </section>
      </div>
    )
  }

  // Normal Login Screen
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
      }}
    >
      <section
        className="card-surface card-surface--elevated"
        style={{ maxWidth: '420px', width: '100%' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '14px',
              background: 'linear-gradient(135deg, var(--color-accent), var(--color-gold))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              margin: '0 auto 1rem',
            }}
          >
            🍳
          </div>
          <h2
            className="card-title"
            style={{ margin: '0 0 0.25rem', fontSize: '1.5rem' }}
          >
            Welcome Back
          </h2>
          <p className="muted" style={{ margin: 0 }}>
            Sign in to access the kitchen
          </p>
        </div>

        {from && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(201, 148, 61, 0.1)',
              border: '1px solid rgba(201, 148, 61, 0.3)',
              borderRadius: 'var(--border-radius-md)',
              marginBottom: '1rem',
              fontSize: '0.88rem',
              color: 'var(--color-gold)',
            }}
          >
            You need to be signed in to view that page.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              className="input-control"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="input-control"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div
              style={{
                padding: '0.75rem 1rem',
                background: 'rgba(184, 75, 75, 0.1)',
                border: '1px solid rgba(184, 75, 75, 0.3)',
                borderRadius: 'var(--border-radius-md)',
                marginTop: '0.5rem',
                fontSize: '0.88rem',
                color: '#b84b4b',
              }}
            >
              {error}
            </div>
          )}

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', marginTop: '1.25rem' }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          <div
            style={{
              textAlign: 'center',
              marginTop: '1.25rem',
              fontSize: '0.9rem',
            }}
          >
            <span className="muted">Don't have an account? </span>
            <Link
              to="/register"
              style={{ color: 'var(--color-accent-strong)', fontWeight: 500 }}
            >
              Create one
            </Link>
          </div>
        </form>

        {/* Info about OTP for regular users */}
        <div
          style={{
            marginTop: '1.5rem',
            padding: '0.75rem 1rem',
            background: 'rgba(107, 140, 90, 0.08)',
            borderRadius: 'var(--border-radius-md)',
            fontSize: '0.82rem',
            color: 'var(--color-text-muted)',
          }}
        >
          <strong>Note:</strong> Regular users will receive an OTP verification code for additional security.
        </div>
      </section>
    </div>
  )
}
