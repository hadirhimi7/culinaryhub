import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

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

  const navItems = [
    { to: '/', label: 'Home', icon: '🏠', public: true },
    { to: '/dashboard', label: 'Dashboard', icon: '📊', requireAuth: true },
    { to: '/content', label: 'Content', icon: '📝', requireAuth: true },
    { to: '/admin', label: 'Admin', icon: '⚙️', requireRole: 'admin' },
  ]

  const filteredNavItems = navItems.filter((item) => {
    if (item.public) return true
    if (item.requireAuth && !user) return false
    if (item.requireRole && user?.role !== item.requireRole) return false
    return !!user
  })

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
            padding: '0.85rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          {/* Logo */}
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
                flexShrink: 0,
              }}
            >
              🍳
            </div>
            <div className="logo-text" style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  fontFamily: "'Crimson Pro', Georgia, serif",
                  color: 'var(--color-text)',
                  whiteSpace: 'nowrap',
                }}
              >
                Culinary Hub
              </div>
              <div
                className="logo-subtitle"
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

          {/* Desktop Navigation */}
          <nav
            className="desktop-nav"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.88rem',
            }}
          >
            {filteredNavItems.map((item) => (
              <NavLinkItem key={item.to} to={item.to} currentPath={location.pathname}>
                {item.label}
              </NavLinkItem>
            ))}
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

          {/* Desktop Actions */}
          <div className="desktop-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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

          {/* Mobile Menu Button */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={`mobile-menu-overlay ${mobileMenuOpen ? 'open' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile Menu */}
      <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>🍳</span>
            <span style={{ fontWeight: 600, fontFamily: "'Crimson Pro', Georgia, serif" }}>
              Culinary Hub
            </span>
          </div>
          <button
            className="mobile-menu-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>

        <nav className="mobile-menu-nav">
          {filteredNavItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`mobile-nav-link ${location.pathname === item.to ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
          {!user && (
            <>
              <Link
                to="/login"
                className={`mobile-nav-link ${location.pathname === '/login' ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>🔑</span>
                <span>Login</span>
              </Link>
              <Link
                to="/register"
                className={`mobile-nav-link ${location.pathname === '/register' ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>✨</span>
                <span>Register</span>
              </Link>
            </>
          )}
        </nav>

        {user && (
          <div className="mobile-menu-footer">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, var(--color-accent-soft), var(--color-gold-soft))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                }}
              >
                👤
              </div>
              <div>
                <div style={{ fontWeight: 500 }}>{user.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{user.email}</div>
              </div>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>{getRoleBadge()}</div>
            <button
              className="btn btn-outline"
              onClick={() => {
                logout()
                setMobileMenuOpen(false)
              }}
              style={{ width: '100%' }}
            >
              Logout
            </button>
          </div>
        )}
      </div>

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
