import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useRoomContext,
  useParticipants,
  useLocalParticipant,
  GridLayout,
  ParticipantTile,
  useTracks,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import { useAuthStore } from '../store/auth'
import api from '../lib/api'
import styles from './Room.module.css'

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || ''

export default function Room() {
  const { meetingId } = useParams<{ meetingId: string }>()
  const nav = useNavigate()
  const user = useAuthStore(s => s.user)
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [isHost, setIsHost] = useState(false)

  useEffect(() => {
    if (!meetingId) return
    const hostToken = sessionStorage.getItem(`host_token_${meetingId}`)
    if (hostToken) { setToken(hostToken); setIsHost(true); return }
    const guestToken = sessionStorage.getItem(`guest_token_${meetingId}`)
    if (guestToken) { setToken(guestToken); setIsHost(false); return }
    nav(`/lobby/${meetingId}`, { replace: true })
  }, [meetingId])

  const handleDisconnect = useCallback(() => {
    if (meetingId) {
      sessionStorage.removeItem(`host_token_${meetingId}`)
      sessionStorage.removeItem(`guest_token_${meetingId}`)
    }
    nav('/dashboard')
  }, [meetingId, nav])

  if (error) return (
    <div className={styles.errorPage}>
      <h2>Cannot join meeting</h2>
      <p>{error}</p>
      <button onClick={() => nav('/dashboard')}>Back to dashboard</button>
    </div>
  )

  if (!token) return (
    <div className={styles.loadingPage}>
      <div className={styles.spinner} />
      <p>Connecting to room…</p>
    </div>
  )

  return (
    <div className={styles.root}>
      <LiveKitRoom
        serverUrl={LIVEKIT_URL}
        token={token}
        connect={true}
        video={true}
        audio={true}
        onDisconnected={handleDisconnect}
        className={styles.livekitRoom}
      >
        <RoomAudioRenderer />
        <RoomContent meetingId={meetingId!} isHost={isHost} onLeave={handleDisconnect} />
      </LiveKitRoom>
    </div>
  )
}

interface LobbyGuest { user_id: string; email: string; name: string; requested_at: string }

function ParticipantGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  )
  return (
    <GridLayout tracks={tracks} style={{ width: '100%', height: '100%' }}>
      <ParticipantTile />
    </GridLayout>
  )
}

function RoomContent({ meetingId, isHost, onLeave }: {
  meetingId: string; isHost: boolean; onLeave: () => void
}) {
  const room = useRoomContext()
  const participants = useParticipants()
  const { localParticipant } = useLocalParticipant()
  const [lobbyGuests, setLobbyGuests] = useState<LobbyGuest[]>([])
  const [showLobby, setShowLobby] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<{ id: string; sender: string; text: string }[]>([])
  const [chatText, setChatText] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const [isCamOff, setIsCamOff] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

  useEffect(() => {
    if (!isHost) return
    const poll = setInterval(async () => {
      try {
        const { data } = await api.get(`/lobby/${meetingId}/guests`)
        setLobbyGuests(data)
        if (data.length > 0) setShowLobby(true)
      } catch {}
    }, 3000)
    return () => clearInterval(poll)
  }, [isHost, meetingId])

  useEffect(() => {
    const handler = (payload: Uint8Array, participant: any) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload))
        if (msg.type === 'chat') {
          setChatMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            sender: participant?.name || 'Guest',
            text: msg.text,
          }])
        }
      } catch {}
    }
    room.on('dataReceived', handler)
    return () => { room.off('dataReceived', handler) }
  }, [room])

  const sendChat = () => {
    if (!chatText.trim()) return
    const payload = new TextEncoder().encode(JSON.stringify({ type: 'chat', text: chatText.trim() }))
    room.localParticipant.publishData(payload, { reliable: true })
    setChatMessages(prev => [...prev, { id: crypto.randomUUID(), sender: 'You', text: chatText.trim() }])
    setChatText('')
  }

  const toggleMic = async () => {
    await localParticipant.setMicrophoneEnabled(isMuted)
    setIsMuted(!isMuted)
  }

  const toggleCam = async () => {
    await localParticipant.setCameraEnabled(isCamOff)
    setIsCamOff(!isCamOff)
  }

  const toggleShare = async () => {
    try {
      if (isSharing) {
        await localParticipant.setScreenShareEnabled(false)
        setIsSharing(false)
      } else {
        await localParticipant.setScreenShareEnabled(true)
        setIsSharing(true)
      }
    } catch {
      setIsSharing(false)
    }
  }

  const endMeeting = async () => {
    if (!isHost) return
    await api.post(`/lobby/${meetingId}/end`).catch(() => {})
    room.disconnect()
  }

  const approveGuest = async (userId: string) => {
    await api.post(`/lobby/${meetingId}/approve/${userId}`).catch(() => {})
    setLobbyGuests(prev => prev.filter(g => g.user_id !== userId))
  }

  const rejectGuest = async (userId: string) => {
    await api.post(`/lobby/${meetingId}/reject/${userId}`).catch(() => {})
    setLobbyGuests(prev => prev.filter(g => g.user_id !== userId))
  }

  return (
    <div className={styles.roomShell}>
      {/* HEADER */}
      <div className={styles.roomHeader}>
        <div className={styles.roomLogo}>KO<span>RISU</span></div>
        <div className={styles.roomMeta}>
          <div className={styles.participantCount}>
            <DotIcon /> {participants.length} participant{participants.length !== 1 ? 's' : ''}
          </div>
          <div className={styles.meetingCode}>{meetingId?.slice(0, 8)}</div>
        </div>
        <div className={styles.headerActions}>
          {isHost && lobbyGuests.length > 0 && (
            <button className={styles.lobbyBadgeBtn} onClick={() => setShowLobby(s => !s)}>
              Lobby <span className={styles.guestCount}>{lobbyGuests.length}</span>
            </button>
          )}
          <button className={styles.chatToggle} onClick={() => setChatOpen(s => !s)}>
            <ChatIcon />
            {chatMessages.length > 0 && <span className={styles.chatDot} />}
          </button>
        </div>
      </div>

      {/* VIDEO GRID */}
      <div className={styles.videoArea}>
        <ParticipantGrid />
      </div>

      {/* CONTROLS */}
      <div className={styles.controls}>
        <button className={isMuted ? styles.controlBtnOff : styles.controlBtn} onClick={toggleMic}>
          {isMuted ? <MicOffIcon /> : <MicIcon />}
          <span>{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        <button className={isCamOff ? styles.controlBtnOff : styles.controlBtn} onClick={toggleCam}>
          {isCamOff ? <CamOffIcon /> : <CamIcon />}
          <span>{isCamOff ? 'Start video' : 'Stop video'}</span>
        </button>

        <button className={isSharing ? styles.controlBtnOff : styles.controlBtn} onClick={toggleShare}>
          <ShareIcon />
          <span>{isSharing ? 'Stop share' : 'Share screen'}</span>
        </button>

        <button className={styles.controlBtn} onClick={() => navigator.clipboard.writeText(`${window.location.origin}/lobby/${meetingId}`)}>
          <LinkIcon />
          <span>Invite</span>
        </button>

        {isHost ? (
          <button className={styles.endBtn} onClick={endMeeting}>
            <PhoneOffIcon />
            <span>End meeting</span>
          </button>
        ) : (
          <button className={styles.leaveBtn} onClick={() => room.disconnect()}>
            <PhoneOffIcon />
            <span>Leave</span>
          </button>
        )}
      </div>

      {/* LOBBY PANEL */}
      {showLobby && isHost && (
        <div className={styles.lobbyPanel}>
          <div className={styles.panelHeader}>
            <h3>Waiting to join</h3>
            <button className={styles.panelClose} onClick={() => setShowLobby(false)}>×</button>
          </div>
          {lobbyGuests.length === 0
            ? <p className={styles.panelEmpty}>No one waiting</p>
            : lobbyGuests.map(g => (
              <div key={g.user_id} className={styles.guestRow}>
                <div className={styles.guestAvatar}>{g.email.slice(0, 2).toUpperCase()}</div>
                <div className={styles.guestInfo}>
                  <div className={styles.guestName}>{g.name || g.email}</div>
                </div>
                <div className={styles.guestActions}>
                  <button className={styles.admitBtn} onClick={() => approveGuest(g.user_id)}>Admit</button>
                  <button className={styles.denyBtn} onClick={() => rejectGuest(g.user_id)}>Deny</button>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* CHAT PANEL */}
      {chatOpen && (
        <div className={styles.chatPanel}>
          <div className={styles.panelHeader}>
            <h3>In-meeting chat</h3>
            <button className={styles.panelClose} onClick={() => setChatOpen(false)}>×</button>
          </div>
          <div className={styles.chatMessages}>
            {chatMessages.length === 0 && <p className={styles.panelEmpty}>No messages yet</p>}
            {chatMessages.map(m => (
              <div key={m.id} className={styles.chatMsg}>
                <span className={styles.chatSender}>{m.sender}</span>
                <span className={styles.chatText}>{m.text}</span>
              </div>
            ))}
          </div>
          <div className={styles.chatInputRow}>
            <input
              className={styles.chatInput}
              placeholder="Message everyone…"
              value={chatText}
              onChange={e => setChatText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendChat() }}
              maxLength={500}
            />
            <button className={styles.chatSendBtn} onClick={sendChat}><SendIcon /></button>
          </div>
        </div>
      )}
    </div>
  )
}

const DotIcon = () => <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="var(--accent)"/></svg>
const MicIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>
const MicOffIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/><path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23M12 19v4M8 23h8"/></svg>
const CamIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
const CamOffIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 16v1a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2h2m5.66 0H14a2 2 0 012 2v3.34l1 1L23 7v10"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
const ShareIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
const LinkIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
const PhoneOffIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 011.72 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07"/><path d="M13.31 10.68A16 16 0 0010.7 7.27L9.43 8.54a2 2 0 01-2.11.45 12.84 12.84 0 00-2.81-.7 2 2 0 01-1.72-2v-3A2 2 0 015 1.07a19.79 19.79 0 018.63 3.07"/><line x1="23" y1="1" x2="1" y2="23"/></svg>
const ChatIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
const SendIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
