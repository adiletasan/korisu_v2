import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'
import styles from './Auth.module.css'

type Tab = 'login' | 'register'

export default function Auth() {
  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()
  const [params] = useSearchParams()
  const fetchMe = useAuthStore(s => s.fetchMe)
  const setUser = useAuthStore(s => s.setUser)

  // Handle email verification redirect
  useEffect(() => {
    const token = params.get('token')
    if (token) {
      api.get(`/auth/verify?token=${token}`)
        .then(() => { fetchMe().then(() => nav('/dashboard', { replace: true })) })
        .catch(() => setError('Verification link is invalid or expired.'))
    }

    const tabParam = params.get('tab')
    if (tabParam === 'login' || tabParam === 'register') setTab(tabParam)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (tab === 'register') {
        await api.post('/auth/register', { email, password, name })
        setSuccess('Check your email to verify your account.')
        setPassword('')
      } else {
        const { data } = await api.post('/auth/login', { email, password })
        setUser(data.user)
        nav('/dashboard', { replace: true })
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Something went wrong'
      const msgs: Record<string, string> = {
        INVALID_CREDENTIALS: 'Invalid email or password.',
        EMAIL_NOT_VERIFIED: 'Please verify your email first.',
        TOO_MANY_ATTEMPTS: 'Too many attempts. Try again in 15 minutes.',
        'Email already registered': 'This email is already registered.',
      }
      setError(msgs[msg] || msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.bg} />

      <a href="/" className={styles.logo}>
        KO<span>RISU</span>
      </a>

      <div className={styles.card}>
        <div className={styles.tabs}>
          <button className={tab === 'login' ? styles.tabActive : styles.tab} onClick={() => { setTab('login'); setError('') }}>
            Sign in
          </button>
          <button className={tab === 'register' ? styles.tabActive : styles.tab} onClick={() => { setTab('register'); setError('') }}>
            Sign up
          </button>
        </div>

        <h1 className={styles.title}>
          {tab === 'login' ? 'Welcome back' : 'Create account'}
        </h1>
        <p className={styles.subtitle}>
          {tab === 'login' ? 'Sign in to your Korisu account' : 'Start meeting with your team'}
        </p>

        {/* Google OAuth */}
        <a href="https://korisu-api-3x1x.onrender.com/auth/google" className={styles.googleBtn}>
          <GoogleIcon />
          Continue with Google
        </a>

        <div className={styles.divider}><span>or</span></div>

        {/* Form */}
        <form className={styles.form} onSubmit={handleSubmit}>
          {tab === 'register' && (
            <div className={styles.field}>
              <label>Name</label>
              <input
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          )}

          <div className={styles.field}>
            <label>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.field}>
            <label>Password</label>
            <input
              type="password"
              placeholder={tab === 'register' ? 'Min. 8 characters' : 'Your password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <Spinner /> : tab === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className={styles.switch}>
          {tab === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button onClick={() => { setTab(tab === 'login' ? 'register' : 'login'); setError(''); setSuccess('') }}>
            {tab === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function Spinner() {
  return <div style={{ width: 18, height: 18, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
}
