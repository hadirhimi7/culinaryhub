import { Link } from 'react-router-dom'
import { usePageTitle } from '../hooks/usePageTitle'

export function Error404Page() {
  usePageTitle('Page Not Found')
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        textAlign: 'center',
      }}
    >
      <div>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '20px',
            background: 'rgba(201, 148, 61, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
            margin: '0 auto 1.5rem',
          }}
        >
          🍳
        </div>
        <h1
          style={{
            fontFamily: "'Crimson Pro', Georgia, serif",
            fontSize: '2rem',
            margin: '0 0 0.5rem',
          }}
        >
          Recipe Not Found
        </h1>
        <p className="muted" style={{ margin: '0 0 1.5rem', maxWidth: '380px' }}>
          This page seems to have wandered off. Perhaps it's still in the oven?
        </p>
        <Link to="/" className="btn btn-primary">
          Back to Kitchen
        </Link>
      </div>
    </div>
  )
}
