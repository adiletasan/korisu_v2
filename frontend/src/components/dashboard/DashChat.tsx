import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../../store/auth'
import api from '../../lib/api'
import styles from './DashChat.module.css'

interface Conversation {
  conversation_id: string
  partner: { id: string; name: string; avatar_url: string | null; email: string }
  last_message: string | null
  last_message_at: string | null
  unread_count: number
}

interface Message {
  id: string
  sender_id: string
  content: string
  status: string
  created_at: string
}

interface Props {
  initialUserId?: string | null
  initialUserName?: string | null
}

const WS_URL = import.meta.env.VITE_WS_URL || 'wss://korisu-chat.onrender.com/ws'

export default function DashChat({ initialUserId, initialUserName }: Props) {
  const user = useAuthStore(s => s.user)
  const [convos, setConvos] = useState<Conversation[]>([])
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [convId, setConvId] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load conversations
  useEffect(() => {
    api.get('/chats').then(r => setConvos(r.data)).catch(() => {})
  }, [])

  // If opened from contacts — auto open chat with that user
  useEffect(() => {
    if (!initialUserId) return
    api.get(`/chats/${initialUserId}/messages`)
      .then(r => {
        setMessages(r.data.messages)
        setConvId(r.data.conversation_id)
        setActiveConvo({
          conversation_id: r.data.conversation_id,
          partner: {
            id: initialUserId,
            name: initialUserName || initialUserId,
            avatar_url: null,
            email: '',
          },
          last_message: null,
          last_message_at: null,
          unread_count: 0,
        })
      })
      .catch(() => {})
  }, [initialUserId])

  // WebSocket
  useEffect(() => {
    if (!user) return
    let ws: WebSocket
    let retryTimeout: ReturnType<typeof setTimeout>

    const connect = () => {
      ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data)
        if (msg.type === 'ping') { ws.send(JSON.stringify({ type: 'pong' })); return }
        if (msg.type === 'message') {
          setMessages(prev => [...prev, msg])
          setConvos(prev => prev.map(c =>
            c.conversation_id === msg.conversation_id
              ? { ...c, last_message: msg.content, last_message_at: msg.created_at }
              : c
          ))
        }
      }

      ws.onclose = () => {
        retryTimeout = setTimeout(connect, 3000)
      }
    }

    connect()
    return () => {
      ws?.close()
      clearTimeout(retryTimeout)
    }
  }, [user])

  // Load messages when conversation selected
  useEffect(() => {
    if (!activeConvo) return
    api.get(`/chats/${activeConvo.partner.id}/messages`)
      .then(r => {
        setMessages(r.data.messages)
        setConvId(r.data.conversation_id)
      })
  }, [activeConvo?.conversation_id])

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = () => {
    if (!text.trim() || !convId || !wsRef.current || wsRef.current.readyState !== 1) return
    const payload = { type: 'message', conversation_id: convId, content: text.trim() }
    wsRef.current.send(JSON.stringify(payload))
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      sender_id: user!.id,
      content: text.trim(),
      status: 'sent',
      created_at: new Date().toISOString(),
    }])
    setText('')
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div className={styles.root}>
      <aside className={styles.list}>
        <div className={styles.listHeader}><h2>Messages</h2></div>
        <div className={styles.listBody}>
          {convos.length === 0 && <p className={styles.empty}>No conversations yet.<br />Add a contact to start chatting.</p>}
          {convos.map(c => (
            <button
              key={c.conversation_id}
              className={c.conversation_id === activeConvo?.conversation_id ? styles.convoItemActive : styles.convoItem}
              onClick={() => setActiveConvo(c)}
            >
              <div className={styles.convoAvatar}>
                {c.partner.avatar_url ? <img src={c.partner.avatar_url} alt={c.partner.name} /> : c.partner.name.slice(0, 2).toUpperCase()}
              </div>
              <div className={styles.convoInfo}>
                <div className={styles.convoName}>{c.partner.name}</div>
                <div className={styles.convoLast}>{c.last_message || 'No messages yet'}</div>
              </div>
              {c.unread_count > 0 && <div className={styles.badge}>{c.unread_count}</div>}
            </button>
          ))}
        </div>
      </aside>

      <div className={styles.chat}>
        {!activeConvo ? (
          <div className={styles.placeholder}>
            <div className={styles.placeholderIcon}>◇</div>
            <p>Select a conversation</p>
          </div>
        ) : (
          <>
            <div className={styles.chatHeader}>
              <div className={styles.convoAvatar}>
                {activeConvo.partner.avatar_url
                  ? <img src={activeConvo.partner.avatar_url} alt="" />
                  : activeConvo.partner.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className={styles.chatHeaderName}>{activeConvo.partner.name}</div>
                <div className={styles.chatHeaderEmail}>{activeConvo.partner.email}</div>
              </div>
            </div>

            <div className={styles.messages}>
              {messages.map(m => (
                <div key={m.id} className={m.sender_id === user?.id ? styles.msgOwn : styles.msgOther}>
                  <div className={styles.msgBubble}>{m.content}</div>
                  <div className={styles.msgTime}>{formatTime(m.created_at)}</div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className={styles.inputRow}>
              <textarea
                className={styles.input}
                placeholder="Type a message…"
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKey}
                rows={1}
                maxLength={4000}
              />
              <button className={styles.sendBtn} onClick={sendMessage} disabled={!text.trim()}>
                <SendIcon />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })
}

const SendIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
