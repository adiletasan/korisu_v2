import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../../store/auth'
import api from '../../lib/api'

interface Conversation {
  conversation_id: string
  partner: { id: string; name: string; avatar_url: string | null; email: string }
  last_message: string | null
  last_message_at: string | null
  unread_count: number
}
interface Message {
  id: string; sender_id: string; content: string; status: string; created_at: string
}
interface Props {
  initialUserId?: string | null
  initialUserName?: string | null
}

const COLORS = ['#4361ee','#7c3aed','#0ea5e9','#22c55e','#f59e0b','#ec4899','#10b981']
const getColor = (s: string) => COLORS[s.charCodeAt(0) % COLORS.length]
const initials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
const WS_URL = import.meta.env.VITE_WS_URL || 'wss://korisu-chat.onrender.com/ws'

function formatLastSeen(iso: string | null): string {
  if (!iso) return 'Offline'
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff/60)} min ago`
  if (diff < 86400) return `${Math.floor(diff/3600)} hours ago`
  return new Date(iso).toLocaleDateString()
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en', { hour:'2-digit', minute:'2-digit' })
}

export default function DashChat({ initialUserId, initialUserName }: Props) {
  const user = useAuthStore(s => s.user)
  const [convos, setConvos] = useState<Conversation[]>([])
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [convId, setConvId] = useState<string | null>(null)
  const [wsReady, setWsReady] = useState(false)
  const [partnerOnline, setPartnerOnline] = useState(false)
  const [partnerLastSeen, setPartnerLastSeen] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const wsRef = useRef<WebSocket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.get('/chats').then(r => setConvos(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!activeConvo) return
    const load = () => api.get(`/api/users/status/${activeConvo.partner.id}`)
      .then(r => { setPartnerOnline(r.data.is_online); setPartnerLastSeen(r.data.last_seen_at) })
      .catch(() => {})
    load()
    const iv = setInterval(load, 30000)
    return () => clearInterval(iv)
  }, [activeConvo?.partner.id])

  useEffect(() => {
    if (!initialUserId) return
    api.get(`/chats/${initialUserId}/messages`).then(r => {
      setMessages(r.data.messages); setConvId(r.data.conversation_id)
      setConvos(prev => prev.map(c => c.conversation_id===r.data.conversation_id?{...c,unread_count:0}:c))
      setActiveConvo({ conversation_id:r.data.conversation_id, partner:{id:initialUserId,name:initialUserName||initialUserId,avatar_url:null,email:''}, last_message:null, last_message_at:null, unread_count:0 })
    }).catch(() => {})
  }, [initialUserId])

  useEffect(() => {
    if (!user) return
    let ws: WebSocket; let retry: ReturnType<typeof setTimeout>
    const connect = () => {
      ws = new WebSocket(WS_URL); wsRef.current = ws; setWsReady(false)
      ws.onopen = async () => {
        const { data } = await api.get('/auth/token').catch(() => ({ data: { token: '' } }))
        ws.send(JSON.stringify({ token: data.token }))
      }
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data)
        if (msg.type==='auth_ok') { setWsReady(true); return }
        if (msg.type==='ping') { ws.send(JSON.stringify({type:'pong'})); return }
        if (msg.type==='message') {
          setMessages(prev => [...prev, msg])
          setConvos(prev => prev.map(c => c.conversation_id===msg.conversation_id ? {...c,last_message:msg.content,last_message_at:msg.created_at,unread_count:c.unread_count+1} : c))
        }
      }
      ws.onclose = () => { setWsReady(false); retry = setTimeout(connect, 3000) }
    }
    connect()
    return () => { ws?.close(); clearTimeout(retry) }
  }, [user])

  useEffect(() => {
    if (!activeConvo) return
    api.get(`/chats/${activeConvo.partner.id}/messages`).then(r => {
      setMessages(r.data.messages); setConvId(r.data.conversation_id)
      if (r.data.conversation_id) {
        wsRef.current?.send(JSON.stringify({type:'mark_read',conversation_id:r.data.conversation_id}))
        setConvos(prev => prev.map(c => c.conversation_id===r.data.conversation_id?{...c,unread_count:0}:c))
      }
    })
  }, [activeConvo?.conversation_id])

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:'smooth'}) }, [messages])

  const sendMessage = () => {
    if (!text.trim()||!convId||!wsRef.current||wsRef.current.readyState!==1) return
    wsRef.current.send(JSON.stringify({type:'message',conversation_id:convId,content:text.trim()}))
    setMessages(prev => [...prev, {id:crypto.randomUUID(),sender_id:user!.id,content:text.trim(),status:'sent',created_at:new Date().toISOString()}])
    setText('')
  }

  const openConvo = (c: Conversation) => {
    setActiveConvo(c)
    setConvos(prev => prev.map(x => x.conversation_id===c.conversation_id?{...x,unread_count:0}:x))
  }

  const filtered = convos.filter(c => c.partner.name.toLowerCase().includes(search.toLowerCase()) || c.partner.email.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{display:'flex',height:'100vh',background:'#f5f4f1',fontFamily:"'DM Sans',sans-serif"}}>
      {/* LEFT — Conversation list */}
      <div style={{width:300,flexShrink:0,borderRight:'1px solid rgba(0,0,0,0.07)',display:'flex',flexDirection:'column',background:'#ffffff'}}>
        <div style={{padding:'20px 16px 14px',borderBottom:'1px solid rgba(0,0,0,0.07)'}}>
          <div style={{fontSize:16,fontWeight:600,color:'#111318',marginBottom:10}}>Сообщения</div>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск..."
            style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1px solid rgba(0,0,0,0.07)',background:'#fafaf8',fontSize:13,color:'#111318',outline:'none'}}
          />
        </div>
        <div style={{flex:1,overflowY:'auto'}}>
          {filtered.length===0 && (
            <div style={{padding:'24px 16px',fontSize:13,color:'#9ca3af',lineHeight:1.6}}>
              Нет диалогов.<br/>Добавьте контакт чтобы начать чат.
            </div>
          )}
          {filtered.map(c => (
            <button key={c.conversation_id} onClick={() => openConvo(c)}
              style={{display:'flex',alignItems:'center',gap:12,width:'100%',padding:'12px 16px',border:'none',borderBottom:'1px solid rgba(0,0,0,0.05)',background:c.conversation_id===activeConvo?.conversation_id?'rgba(67,97,238,0.08)':'transparent',cursor:'pointer',textAlign:'left',transition:'background .15s'}}>
              <div style={{width:40,height:40,borderRadius:'50%',background:getColor(c.partner.name),display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:600,color:'white',flexShrink:0}}>
                {c.partner.avatar_url ? <img src={c.partner.avatar_url} style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}} /> : initials(c.partner.name)}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:500,color:'#111318',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.partner.name}</div>
                <div style={{fontSize:12,color:'#9ca3af',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',marginTop:2}}>{c.last_message||'Нет сообщений'}</div>
              </div>
              {c.unread_count>0 && (
                <div style={{minWidth:20,height:20,borderRadius:99,background:'#4361ee',color:'white',fontSize:11,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 5px',flexShrink:0}}>
                  {c.unread_count}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT — Chat window */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        {!activeConvo ? (
          <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,color:'#9ca3af'}}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.3}><path d="M42 30a2 2 0 01-2 2H14l-8 8V6a2 2 0 012-2h32a2 2 0 012 2v24z"/></svg>
            <div style={{fontSize:15,fontWeight:500,color:'#6b7280'}}>Выберите диалог</div>
            <div style={{fontSize:13}}>Нажмите на контакт слева</div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{background:'#ffffff',borderBottom:'1px solid rgba(0,0,0,0.07)',padding:'14px 20px',display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
              <div style={{width:36,height:36,borderRadius:'50%',background:getColor(activeConvo.partner.name),display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:600,color:'white'}}>
                {initials(activeConvo.partner.name)}
              </div>
              <div>
                <div style={{fontSize:14,fontWeight:500,color:'#111318'}}>{activeConvo.partner.name}</div>
                <div style={{fontSize:12,marginTop:1,color:partnerOnline?'#22c55e':'#9ca3af'}}>
                  {partnerOnline ? '● Online' : `Last seen ${formatLastSeen(partnerLastSeen)}`}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div style={{flex:1,overflowY:'auto',padding:'20px 24px',display:'flex',flexDirection:'column',gap:10}}>
              {messages.map(m => (
                <div key={m.id} style={{display:'flex',flexDirection:'column',maxWidth:'65%',alignSelf:m.sender_id===user?.id?'flex-end':'flex-start',alignItems:m.sender_id===user?.id?'flex-end':'flex-start'}}>
                  <div style={{padding:'10px 14px',borderRadius:16,fontSize:13.5,lineHeight:1.5,wordBreak:'break-word',background:m.sender_id===user?.id?'#4361ee':'#ffffff',color:m.sender_id===user?.id?'white':'#111318',borderBottomRightRadius:m.sender_id===user?.id?4:16,borderBottomLeftRadius:m.sender_id===user?.id?16:4,border:m.sender_id===user?.id?'none':'1px solid rgba(0,0,0,0.07)'}}>
                    {m.content}
                  </div>
                  <div style={{fontSize:10,color:'#9ca3af',marginTop:3,padding:'0 4px'}}>{formatTime(m.created_at)}</div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{background:'#ffffff',borderTop:'1px solid rgba(0,0,0,0.07)',padding:'14px 20px',display:'flex',gap:10,alignItems:'flex-end',flexShrink:0}}>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder="Написать сообщение..."
                rows={1}
                maxLength={4000}
                style={{flex:1,padding:'10px 14px',borderRadius:12,border:'1px solid rgba(0,0,0,0.07)',background:'#fafaf8',fontSize:13.5,color:'#111318',resize:'none',outline:'none',maxHeight:120,fontFamily:"'DM Sans',sans-serif"}}
              />
              <button onClick={sendMessage} disabled={!text.trim()}
                style={{width:40,height:40,borderRadius:'50%',background:text.trim()?'#4361ee':'#e5e7eb',border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:text.trim()?'pointer':'not-allowed',flexShrink:0,transition:'all .15s'}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}