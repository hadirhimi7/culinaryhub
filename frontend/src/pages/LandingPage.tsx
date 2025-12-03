import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import axios from 'axios'
import { API_URL, getImageUrl } from '../config'

interface Meal {
  idMeal: string
  strMeal: string
  strMealThumb: string
  strCategory: string
  strArea: string
}

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

const CUISINES = [
  'All Cuisines',
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
]

export function LandingPage() {
  const { user } = useAuth()
  const [meals, setMeals] = useState<Meal[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [cuisineFilter, setCuisineFilter] = useState('All Cuisines')

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch random meals from TheMealDB API
        const mealResponses = await Promise.all([
          fetch('https://www.themealdb.com/api/json/v1/1/random.php'),
          fetch('https://www.themealdb.com/api/json/v1/1/random.php'),
          fetch('https://www.themealdb.com/api/json/v1/1/random.php'),
        ])
        const mealData = await Promise.all(mealResponses.map((r) => r.json()))
        const allMeals = mealData.map((d) => d.meals?.[0]).filter(Boolean)
        setMeals(allMeals)

        // Fetch community posts (only if logged in, since API requires auth)
        if (user) {
          try {
            const postsRes = await axios.get(`${API_URL}/posts`, { withCredentials: true })
            setPosts(postsRes.data.posts?.filter((p: Post) => p.status === 'approved') || [])
          } catch {
            // Ignore if not authenticated
          }
        }
      } catch (err) {
        console.error('Failed to fetch data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user])

  // Filter posts by cuisine
  const filteredPosts = cuisineFilter === 'All Cuisines'
    ? posts
    : posts.filter((p) => p.nationality === cuisineFilter)

  return (
    <div className="page-grid">
      {/* Hero Section */}
      <section
        style={{
          textAlign: 'center',
          padding: '2.5rem 1rem 1.5rem',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 1rem',
            background: 'rgba(107, 140, 90, 0.1)',
            borderRadius: '999px',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            color: 'var(--color-accent-strong)',
            fontWeight: 500,
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>🍽️</span>
          Fresh Recipes & Community
        </div>

        <h1
          style={{
            fontFamily: "'Crimson Pro', Georgia, serif",
            fontSize: 'clamp(2.2rem, 5vw, 3rem)',
            fontWeight: 600,
            margin: '0 0 0.75rem',
            color: 'var(--color-text)',
            lineHeight: 1.2,
          }}
        >
          Discover Delicious{' '}
          <span style={{ color: 'var(--color-accent-strong)' }}>
            Culinary Creations
          </span>
        </h1>

        <p
          style={{
            fontSize: '1.05rem',
            color: 'var(--color-text-muted)',
            maxWidth: '550px',
            margin: '0 auto 1.5rem',
            lineHeight: 1.6,
          }}
        >
          Share recipes, discover new flavors, and connect with food lovers worldwide.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          {!user ? (
            <>
              <Link to="/register" className="btn btn-primary">
                Join the Kitchen
              </Link>
              <Link to="/login" className="btn btn-outline">
                Sign In
              </Link>
            </>
          ) : (
            <>
              <Link to="/content" className="btn btn-primary">
                Add Recipe
              </Link>
              <Link to="/dashboard" className="btn btn-outline">
                My Dashboard
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Cuisine Filter */}
      <section
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          padding: '0.5rem 0',
        }}
      >
        <span style={{ fontWeight: 500, color: 'var(--color-text-muted)' }}>
          🔍 Browse by Cuisine:
        </span>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {CUISINES.map((cuisine) => (
            <button
              key={cuisine}
              onClick={() => setCuisineFilter(cuisine)}
              className={`tab ${cuisineFilter === cuisine ? 'tab--active' : ''}`}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
            >
              {cuisine}
            </button>
          ))}
        </div>
      </section>

      {/* Community Recipes */}
      {user && posts.length > 0 && (
        <section className="card-surface">
          <div className="card-header">
            <div>
              <div className="card-subtitle">From Our Community</div>
              <h2 className="card-title" style={{ marginTop: '0.3rem' }}>
                {cuisineFilter === 'All Cuisines' ? 'All Recipes' : `${cuisineFilter} Recipes`}
              </h2>
            </div>
            <div className="pill pill--editor">
              <span className="pill-dot" />
              {filteredPosts.length} RECIPES
            </div>
          </div>

          {filteredPosts.length === 0 ? (
            <div className="muted" style={{ textAlign: 'center', padding: '2rem' }}>
              No {cuisineFilter} recipes found. Try another cuisine or{' '}
              <Link to="/content" style={{ color: 'var(--color-accent-strong)' }}>
                add your own!
              </Link>
            </div>
          ) : (
            <div className="food-grid">
              {filteredPosts.map((post) => (
                <article key={post.id} className="food-card">
                  {post.imageUrl ? (
                    <img
                      src={getImageUrl(post.imageUrl) || ''}
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
                        fontSize: '0.85rem',
                        color: 'var(--color-text-muted)',
                        margin: '0.25rem 0 0',
                        lineHeight: 1.4,
                      }}
                    >
                      {post.content.length > 80 ? post.content.substring(0, 80) + '...' : post.content}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Featured Recipes from API */}
      <section className="card-surface">
        <div className="card-header">
          <div>
            <div className="card-subtitle">Daily Inspiration</div>
            <h2 className="card-title" style={{ marginTop: '0.3rem' }}>
              Featured World Recipes
            </h2>
          </div>
          <div className="pill">
            <span className="pill-dot" />
            FRESH
          </div>
        </div>

        {loading ? (
          <div className="muted" style={{ textAlign: 'center', padding: '2rem' }}>
            Loading delicious recipes...
          </div>
        ) : (
          <div className="food-grid">
            {meals.map((meal) => (
              <article key={meal.idMeal} className="food-card">
                <img
                  src={meal.strMealThumb}
                  alt={meal.strMeal}
                  className="food-card-image"
                />
                <div className="food-card-body">
                  <div className="food-card-category">
                    {meal.strCategory} • {meal.strArea}
                  </div>
                  <h3 className="food-card-title">{meal.strMeal}</h3>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Features Section */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
        }}
      >
        <div className="card-surface card-surface--elevated">
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              background: 'rgba(107, 140, 90, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              marginBottom: '1rem',
            }}
          >
            📝
          </div>
          <h3
            style={{
              fontFamily: "'Crimson Pro', Georgia, serif",
              fontSize: '1.25rem',
              margin: '0 0 0.5rem',
            }}
          >
            Share Your Recipes
          </h3>
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
            Create and share your favorite recipes with the community.
          </p>
        </div>

        <div className="card-surface card-surface--elevated">
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              background: 'rgba(201, 148, 61, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              marginBottom: '1rem',
            }}
          >
            📸
          </div>
          <h3
            style={{
              fontFamily: "'Crimson Pro', Georgia, serif",
              fontSize: '1.25rem',
              margin: '0 0 0.5rem',
            }}
          >
            Upload Food Photos
          </h3>
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
            Share beautiful photos of your culinary creations.
          </p>
        </div>

        <div className="card-surface card-surface--elevated">
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              background: 'rgba(184, 106, 75, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              marginBottom: '1rem',
            }}
          >
            👥
          </div>
          <h3
            style={{
              fontFamily: "'Crimson Pro', Georgia, serif",
              fontSize: '1.25rem',
              margin: '0 0 0.5rem',
            }}
          >
            Join the Community
          </h3>
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
            Connect with fellow food lovers worldwide.
          </p>
        </div>
      </section>
    </div>
  )
}
