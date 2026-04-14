import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { conferenceApi as api } from '../lib/api'
import styles from './Lobby.module.css'

type LobbyStatus = 'requesting' | 'waiting' | 'approved' | 'rejected' | 'error'

export default function Lobby() {
  const { meetingId } = useParams<{ meetingId: string }>()
  const nav = useNavigate()
  const user = useAuthStore(s => s.user)
  const [status, setStatus] = useState<LobbyStatus>('requesting')
  const [elapsed, setElapsed] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // On mount: send lobby request
  useEffect(() => {
    if (!meetingId) return

    const request = async () => {
      try {
        await api.post(`/lobby/${meetingId}/request`)
        setStatus('waiting')
        startPolling()
        startTimer()
      } catch (err: any) {
        const detail = err.response?.data?.detail
        if (detail === 'MEETING_NOT_FOUND') {
          setStatus('error')
        } else {
          setStatus('error')
        }
      }
    }

    request()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [meetingId])

  const startTimer = () => {
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
  }

  const startPolling = () => {
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/lobby/${meetingId}/status`)
        if (data.status === 'approved') {
          clearInterval(pollRef.current!)
          clearInterval(timerRef.current!)
          // Store livekit token and enter room
          sessionStorage.setItem(`guest_token_${meetingId}`, data.livekit_token)
          setStatus('approved')
          setTimeout(() => nav(`/room/${meetingId}`), 800)
        } else if (data.status === 'rejected') {
          clearInterval(pollRef.current!)
          clearInterval(timerRef.current!)
          setStatus('rejected')
        }
      } catch {}
    }, 2000)
  }

  const cancel = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
    nav('/dashboard')
  }

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`
  }

  return (
    <div className={styles.root}>
      <a href="/" className={styles.logo}>KO<span>RISU</span></a>

      <div className={styles.card}>
        {status === 'requesting' && (
          <>
            <div className={styles.spinner} />
            <h1 className={styles.title}>Connecting…</h1>
            <p className={styles.sub}>Sending your join request</p>
          </>
        )}

        {status === 'waiting' && (
          <>
            <div className={styles.pulseRing}>
              <div className={styles.pulseCore}>
                <WaitIcon />
              </div>
            </div>
            <h1 className={styles.title}>Waiting for host</h1>
            <p className={styles.sub}>
              The host will let you in shortly.<br />
              Waiting for <span className={styles.elapsed}>{formatElapsed(elapsed)}</span>
            </p>
            <div className={styles.meetingInfo}>
              <span className={styles.meetingLabel}>Meeting</span>
              <code className={styles.meetingId}>{meetingId?.slice(0, 8)}…</code>
            </div>
            <div className={styles.dots}>
              <span /><span /><span />
            </div>
            <button className={styles.cancelBtn} onClick={cancel}>Cancel</button>
          </>
        )}

        {status === 'approved' && (
          <>
            <div className={styles.approvedIcon}>✓</div>
            <h1 className={styles.title}>Approved!</h1>
            <p className={styles.sub}>Entering the room…</p>
          </>
        )}

        {status === 'rejected' && (
          <>
            <div className={styles.rejectedIcon}>✕</div>
            <h1 className={styles.title}>Request declined</h1>
            <p className={styles.sub}>The host didn't let you in this time.</p>
            <button className={styles.backBtn} onClick={() => nav('/dashboard')}>
              Back to dashboard
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className={styles.rejectedIcon}>!</div>
            <h1 className={styles.title}>Meeting not found</h1>
            <p className={styles.sub}>This meeting may have ended or the link is invalid.</p>
            <button className={styles.backBtn} onClick={() => nav('/dashboard')}>
              Back to dashboard
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const WaitIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
)
