import { useAuth } from '../hooks/useAuth'
import { Link } from 'react-router-dom'

export function DashboardPage() {
  const { user } = useAuth()

  const getRoleBadgeClass = () => {
    if (user?.role === 'admin') return 'pill pill--admin'
    if (user?.role === 'editor') return 'pill pill--editor'
    return 'pill'
  }

  return (
    <div className="page-grid">
      <section style={{ marginBottom: '0.5rem' }}>
        <h1 className="section-title">
          Welcome back, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p className="section-subtitle">
          Here's an overview of your account and recent activity
        </p>
      </section>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Profile Card */}
        <div className="card-surface card-surface--elevated">
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '16px',
              background: 'linear-gradient(135deg, var(--color-accent), var(--color-gold))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem',
              marginBottom: '1rem',
            }}
          >
            👤
          </div>
          <h3 className="card-title" style={{ marginBottom: '0.25rem' }}>
            {user?.name}
          </h3>
          <p className="muted" style={{ marginTop: 0 }}>{user?.email}</p>
          <div style={{ marginTop: '0.75rem' }}>
            <span className={getRoleBadgeClass()}>
              <span className="pill-dot" />
              {user?.role.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="card-surface card-surface--elevated">
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>
            Quick Actions
          </h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <Link
              to="/content"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                background: 'var(--color-bg)',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--color-border)',
                transition: 'all var(--transition-fast)',
              }}
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  background: 'rgba(107, 140, 90, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                📝
              </span>
              <div>
                <div style={{ fontWeight: 500 }}>Manage Content</div>
                <div className="muted" style={{ fontSize: '0.82rem' }}>
                  Posts & files
                </div>
              </div>
            </Link>
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  background: 'var(--color-bg)',
                  borderRadius: 'var(--border-radius-md)',
                  border: '1px solid var(--color-border)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '10px',
                    background: 'rgba(184, 106, 75, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ⚙️
                </span>
                <div>
                  <div style={{ fontWeight: 500 }}>Admin Panel</div>
                  <div className="muted" style={{ fontSize: '0.82rem' }}>
                    System settings
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Role Permissions Card */}
        <div className="card-surface card-surface--elevated">
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>
            Your Permissions
          </h3>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <PermissionItem
              icon="✓"
              text="View approved posts"
              active={true}
            />
            <PermissionItem
              icon="✓"
              text="Upload files"
              active={true}
            />
            <PermissionItem
              icon={user?.role === 'editor' || user?.role === 'admin' ? '✓' : '×'}
              text="Create posts"
              active={user?.role === 'editor' || user?.role === 'admin'}
            />
            <PermissionItem
              icon={user?.role === 'admin' ? '✓' : '×'}
              text="Approve/reject posts"
              active={user?.role === 'admin'}
            />
            <PermissionItem
              icon={user?.role === 'admin' ? '✓' : '×'}
              text="Access admin panel"
              active={user?.role === 'admin'}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function PermissionItem({
  icon,
  text,
  active,
}: {
  icon: string
  text: string
  active: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        padding: '0.5rem 0',
        opacity: active ? 1 : 0.5,
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: '6px',
          background: active
            ? 'rgba(107, 140, 90, 0.2)'
            : 'rgba(120, 120, 120, 0.15)',
          color: active ? 'var(--color-accent-strong)' : 'var(--color-text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.75rem',
          fontWeight: 600,
        }}
      >
        {icon}
      </span>
      <span style={{ fontSize: '0.9rem' }}>{text}</span>
    </div>
  )
}
