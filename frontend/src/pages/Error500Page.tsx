import { Link } from 'react-router-dom'

export function Error500Page() {
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
            background: 'rgba(184, 75, 75, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
            margin: '0 auto 1.5rem',
          }}
        >
          🔥
        </div>
        <h1
          style={{
            fontFamily: "'Crimson Pro', Georgia, serif",
            fontSize: '2rem',
            margin: '0 0 0.5rem',
          }}
        >
          Something Burned!
        </h1>
        <p className="muted" style={{ margin: '0 0 1.5rem', maxWidth: '380px' }}>
          Our server encountered an error. We're working on getting things back
          to simmer. Please try again in a moment.
        </p>
        <Link to="/" className="btn btn-primary">
          Return Home
        </Link>
      </div>
    </div>
  )
}
