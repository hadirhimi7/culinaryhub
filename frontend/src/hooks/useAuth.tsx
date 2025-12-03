import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

type Role = 'admin' | 'editor' | 'user'

export interface AuthUser {
  id: number
  name: string
  email: string
  role: Role
}

interface OtpPending {
  userId: number
  demoOtp?: string // DEMO ONLY
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  otpPending: OtpPending | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  verifyOtp: (otp: string) => Promise<void>
  resendOtp: () => Promise<string | null>
  logout: () => Promise<void>
  cancelOtp: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
})

let csrfToken: string | null = null

async function ensureCsrfToken() {
  if (csrfToken) return csrfToken
  try {
    const res = await api.get('/api/csrf-token')
    csrfToken = res.data.csrfToken
    api.defaults.headers.common['X-CSRF-Token'] = csrfToken
    return csrfToken
  } catch (err) {
    console.debug('CSRF token fetch failed:', err)
    return null
  }
}

// Reset CSRF token (needed after logout)
function resetCsrfToken() {
  csrfToken = null
  delete api.defaults.headers.common['X-CSRF-Token']
}

const AFK_TIMEOUT_MS = 25 * 60 * 1000 // 25 minutes
const HEARTBEAT_INTERVAL_MS = 60 * 1000 // Send heartbeat every 1 minute
const ACTIVITY_CHECK_INTERVAL_MS = 30 * 1000 // Check activity every 30 seconds

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [otpPending, setOtpPending] = useState<OtpPending | null>(null)
  const navigate = useNavigate()
  const lastActivityRef = useRef<number>(Date.now())
  const heartbeatIntervalRef = useRef<number | null>(null)
  const activityCheckIntervalRef = useRef<number | null>(null)

  // Track user activity
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
  }, [])

  // Start AFK monitoring
  useEffect(() => {
    if (!user) return

    // Listen for user activity
    const activityEvents = ['mousedown', 'keydown', 'mousemove', 'scroll', 'touchstart']
    activityEvents.forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true })
    })

    // Heartbeat to keep session alive
    heartbeatIntervalRef.current = window.setInterval(async () => {
      const timeSinceActivity = Date.now() - lastActivityRef.current
      if (timeSinceActivity < HEARTBEAT_INTERVAL_MS * 2) {
        try {
          await ensureCsrfToken()
          await api.post('/api/auth/heartbeat')
        } catch (err) {
          console.debug('Heartbeat failed:', err)
        }
      }
    }, HEARTBEAT_INTERVAL_MS)

    // Check for AFK timeout
    activityCheckIntervalRef.current = window.setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityRef.current
      if (timeSinceActivity > AFK_TIMEOUT_MS) {
        // User is AFK - log them out
        console.log('AFK timeout - logging out')
        handleAfkLogout()
      }
    }, ACTIVITY_CHECK_INTERVAL_MS)

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, updateActivity)
      })
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }
      if (activityCheckIntervalRef.current) {
        clearInterval(activityCheckIntervalRef.current)
      }
    }
  }, [user, updateActivity])

  async function handleAfkLogout() {
    try {
      await ensureCsrfToken()
      await api.post('/api/auth/logout')
    } catch {
      // Ignore errors
    } finally {
      setUser(null)
      resetCsrfToken()
      alert('You have been logged out due to inactivity (25 minutes)')
      navigate('/login')
    }
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        await ensureCsrfToken()
        const res = await api.get('/api/auth/me')
        setUser(res.data.user ?? null)
        if (res.data.user) {
          lastActivityRef.current = Date.now()
        }
      } catch (err) {
        console.debug('Auth bootstrap failed:', err)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    bootstrap()
  }, [])

  async function login(email: string, password: string) {
    setLoading(true)
    try {
      resetCsrfToken() // Get fresh CSRF token
      await ensureCsrfToken()
      const res = await api.post('/api/auth/login', { email, password })
      
      // Check if OTP is required
      if (res.data.requiresOtp) {
        setOtpPending({
          userId: res.data.userId,
          demoOtp: res.data.demoOtp, // DEMO ONLY
        })
        setLoading(false)
        return
      }
      
      const me = await api.get('/api/auth/me')
      setUser(me.data.user)
      setLoading(false) // Important: set loading to false before navigate
      lastActivityRef.current = Date.now()
      navigate('/dashboard')
    } catch (err) {
      setLoading(false)
      throw err
    }
  }

  async function register(name: string, email: string, password: string) {
    setLoading(true)
    try {
      resetCsrfToken()
      await ensureCsrfToken()
      const res = await api.post('/api/auth/register', { name, email, password })
      
      // Check if OTP is required
      if (res.data.requiresOtp) {
        setOtpPending({
          userId: res.data.userId,
          demoOtp: res.data.demoOtp, // DEMO ONLY
        })
        setLoading(false)
        return
      }
      
      const me = await api.get('/api/auth/me')
      setUser(me.data.user)
      setLoading(false) // Important: set loading to false before navigate
      lastActivityRef.current = Date.now()
      navigate('/dashboard')
    } catch (err) {
      setLoading(false)
      throw err
    }
  }

  async function verifyOtp(otp: string) {
    if (!otpPending) throw new Error('No OTP pending')
    
    setLoading(true)
    try {
      await ensureCsrfToken()
      await api.post('/api/auth/verify-otp', {
        userId: otpPending.userId,
        otp,
      })
      
      const me = await api.get('/api/auth/me')
      setUser(me.data.user)
      setOtpPending(null)
      setLoading(false) // Important: set loading to false before navigate
      lastActivityRef.current = Date.now()
      navigate('/dashboard')
    } catch (err) {
      setLoading(false)
      throw err
    }
  }

  async function resendOtp(): Promise<string | null> {
    if (!otpPending) return null
    
    try {
      await ensureCsrfToken()
      const res = await api.post('/api/auth/resend-otp', {
        userId: otpPending.userId,
      })
      
      // Update demo OTP
      setOtpPending({
        ...otpPending,
        demoOtp: res.data.demoOtp,
      })
      
      return res.data.demoOtp || null
    } catch {
      return null
    }
  }

  function cancelOtp() {
    setOtpPending(null)
  }

  async function logout() {
    setLoading(true)
    try {
      await ensureCsrfToken()
      await api.post('/api/auth/logout')
    } finally {
      setUser(null)
      setOtpPending(null)
      resetCsrfToken()
      setLoading(false)
      navigate('/login')
    }
  }

  const value: AuthContextValue = {
    user,
    loading,
    otpPending,
    login,
    register,
    verifyOtp,
    resendOtp,
    logout,
    cancelOtp,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
