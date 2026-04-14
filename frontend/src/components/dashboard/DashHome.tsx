import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { useAuthStore } from '../../store/auth'
import styles from './DashHome.module.css'

interface Meeting {
  id: string
  title: string | null
  invite_code: string
  status: string
  created_at: string
  participant_count: number
}

export default function DashHome() {
  const [creating, setCreating] = useState(false)
  const [modal, setModal] = useState<{ link: string; code: string; token: string; id: string } | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [history, setHistory] = useState<Meeting[]>([])
  const [histLoading, setHistLoading] = useState(true)
  const user = useAuthStore(s => s.user)
  const nav = useNavigate()

  useEffect(() => {
    api.get('/meetings/history')
      .then(r => setHistory(r.data))
      .catch(() => {})
      .finally(() => setHistLoading(false))
  }, [])

  const createMeeting = async () => {
    setCreating(true)
    try {
      const { data } = await api.post('/meetings/create', { title: null })
      setModal({ link: data.invite_link, code: data.invite_code, token: data.host_token, id: data.meeting_id })
    } catch { }
    setCreating(false)
  }

  const joinMeeting = async (e: React.FormEvent) => {
    e.preventDefault()
    setJoinError('')
    const code = joinCode.trim().toUpperCase()
    if (!code) return
    try {
      const { data } = await api.get(`/meetings/join/${code}`)
      nav(`/lobby/${data.meeting_id}`)
    } catch (err: any) {
      setJoinError('Meeting not found or already ended.')
    }
  }

  const enterRoom = () => {
    if (!modal) return
    // Store host token in sessionStorage for Room page
    sessionStorage.setItem(`host_token_${modal.id}`, modal.token)
    nav(`/room/${modal.id}`)
  }

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.greeting}>
            Good {getGreeting()}, <span>{user?.name?.split(' ')[0] || 'there'}</span>
          </h1>
          <p className={styles.sub}>What would you like to do today?</p>
        </div>
      </header>

      {/* ACTIONS */}
      <div className={styles.actions}>
        <button className={styles.actionCard} onClick={createMeeting} disabled={creating}>
          <div className={styles.actionIcon} style={{ background: 'rgba(0,255,136,0.1)' }}>
            <VideoIcon />
          </div>
          <div>
            <div className={styles.actionTitle}>New meeting</div>
            <div className={styles.actionSub}>Start an instant meeting</div>
          </div>
          {creating && <Spinner />}
        </button>

        <form className={styles.actionCard} onSubmit={joinMeeting} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%' }}>
            <div className={styles.actionIcon} style={{ background: 'rgba(68,136,255,0.1)', color: 'var(--blue)' }}>
              <LinkIcon />
            </div>
            <div>
              <div className={styles.actionTitle}>Join meeting</div>
              <div className={styles.actionSub}>Enter a code or link</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <input
              className={styles.joinInput}
              placeholder="XXXX-XXXX or paste link"
              value={joinCode}
              onChange={e => { setJoinCode(e.target.value); setJoinError('') }}
            />
            <button type="submit" className={styles.joinBtn}>Join</button>
          </div>
          {joinError && <p className={styles.joinError}>{joinError}</p>}
        </form>
      </div>

      {/* HISTORY */}
      <section className={styles.historySection}>
        <h2 className={styles.historyTitle}>Recent meetings</h2>
        {histLoading ? (
          <div className={styles.histLoader}><Spinner /></div>
        ) : history.length === 0 ? (
          <div className={styles.empty}>No meetings yet. Start one above!</div>
        ) : (
          <div className={styles.historyList}>
            {history.map(m => (
              <div key={m.id} className={styles.historyItem}>
                <div className={styles.historyLeft}>
                  <div className={styles.historyName}>{m.title || 'Meeting'}</div>
                  <div className={styles.historyMeta}>
                    <span className={styles.code}>{m.invite_code}</span>
                    <span>·</span>
                    <span>{formatDate(m.created_at)}</span>
                    <span>·</span>
                    <span>{m.participant_count} participant{m.participant_count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className={styles.historyStatus} data-status={m.status}>
                  {m.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MODAL */}
      {modal && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Meeting ready</h2>
              <button className={styles.closeBtn} onClick={() => setModal(null)}>×</button>
            </div>
            <p className={styles.modalSub}>Share the link or code with participants</p>

            <div className={styles.codeDisplay}>
              <span className={styles.codeLabel}>Code</span>
              <span className={styles.codeValue}>{modal.code}</span>
            </div>

            <div className={styles.linkRow}>
              <input readOnly value={modal.link} className={styles.linkInput} />
              <button className={styles.copyBtn} onClick={() => navigator.clipboard.writeText(modal.link)}>
                Copy
              </button>
            </div>

            <button className={styles.enterBtn} onClick={enterRoom}>
              Enter room →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function Spinner() {
  return <div style={{ width: 16, height: 16, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
}

const VideoIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
const LinkIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
