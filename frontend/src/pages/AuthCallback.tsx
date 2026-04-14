import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

export default function AuthCallback() {
  const nav = useNavigate()
  const fetchMe = useAuthStore(s => s.fetchMe)

  useEffect(() => {
    // Cookie is already set by backend redirect
    // Just fetch user info and go to dashboard
    fetchMe().then(() => {
      nav('/dashboard', { replace: true })
    }).catch(() => {
      nav('/auth', { replace: true })
    })
  }, [])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg)', flexDirection: 'column', gap: 16
    }}>
      <div style={{
        width: 32, height: 32,
        border: '2px solid var(--border)',
        borderTopColor: 'var(--accent)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite'
      }} />
      <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Signing you in…</p>
    </div>
  )
}
