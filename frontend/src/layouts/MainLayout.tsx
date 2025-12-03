import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const location = useLocation()

  const getRoleBadge = () => {
    if (!user) return null
    const roleConfig = {
      admin: { label: 'ADMIN', className: 'pill pill--admin' },
      editor: { label: 'EDITOR', className: 'pill pill--editor' },
      user: { label: 'USER', className: 'pill' },
    }
    const config = roleConfig[user.role] || roleConfig.user
    return (
      <span className={config.className}>
        <span className="pill-dot" />
        {config.label}
      </span>
    )
  }

  return (
    <div className="app-shell">
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          backdropFilter: 'blur(12px)',
          background: 'rgba(250, 246, 239, 0.92)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div
          style={{
            maxWidth: '1140px',
            margin: '0 auto',
            padding: '0.85rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem',
          }}
        >
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--color-accent), var(--color-gold))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
              }}
            >
              🍳
            </div>
            <div>
              <div
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  fontFamily: "'Crimson Pro', Georgia, serif",
                  color: 'var(--color-text)',
                }}
              >
                Culinary Hub
              </div>
              <div
                style={{
                  fontSize: '0.72rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-muted)',
                }}
              >
                Recipe Community
              </div>
            </div>
          </Link>

          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.88rem',
            }}
          >
            <NavLinkItem to="/" currentPath={location.pathname}>
              Home
            </NavLinkItem>
            {user && (
              <NavLinkItem to="/dashboard" currentPath={location.pathname}>
                Dashboard
              </NavLinkItem>
            )}
            {user && (
              <NavLinkItem to="/content" currentPath={location.pathname}>
                Content
              </NavLinkItem>
            )}
            {user?.role === 'admin' && (
              <NavLinkItem to="/admin" currentPath={location.pathname}>
                Admin
              </NavLinkItem>
            )}
            {!user && (
              <>
                <NavLinkItem to="/login" currentPath={location.pathname}>
                  Login
                </NavLinkItem>
                <NavLinkItem to="/register" currentPath={location.pathname}>
                  Register
                </NavLinkItem>
              </>
            )}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {user && getRoleBadge()}
            {user && (
              <button
                className="btn btn-outline"
                type="button"
                onClick={logout}
                style={{ fontSize: '0.82rem', padding: '0.35rem 0.8rem' }}
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="app-inner">{children}</div>
      </main>
    </div>
  )
}

function NavLinkItem({
  to,
  currentPath,
  children,
}: {
  to: string
  currentPath: string
  children: React.ReactNode
}) {
  const isActive = currentPath === to
  return (
    <Link
      to={to}
      style={{
        padding: '0.4rem 0.9rem',
        borderRadius: 'var(--border-radius-md)',
        color: isActive ? 'var(--color-accent-strong)' : 'var(--color-text-muted)',
        background: isActive ? 'rgba(107, 140, 90, 0.12)' : 'transparent',
        fontWeight: isActive ? 500 : 400,
        transition: 'all 150ms ease-out',
      }}
    >
      {children}
    </Link>
  )
}
