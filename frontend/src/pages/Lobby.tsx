import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import api from '../lib/api'

type Status = 'requesting' | 'waiting' | 'approved' | 'rejected' | 'error'

export default function Lobby() {
  const { meetingId } = useParams<{ meetingId: string }>()
  const nav = useNavigate()
  const user = useAuthStore(s => s.user)
  const [status, setStatus] = useState<Status>('requesting')
  const [elapsed, setElapsed] = useState(0)
  const [micOn, setMicOn] = useState(false)
  const [camOn, setCamOn] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval>|null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null)

  useEffect(() => {
    if (!meetingId) return
    const request = async () => {
      try {
        await api.post(`/lobby/${meetingId}/request`)
        setStatus('waiting')
        timerRef.current = setInterval(() => setElapsed(s => s+1), 1000)
        pollRef.current = setInterval(async () => {
          try {
            const { data } = await api.get(`/lobby/${meetingId}/status`)
            if (data.status === 'approved') {
              clearInterval(pollRef.current!); clearInterval(timerRef.current!)
              sessionStorage.setItem(`guest_token_${meetingId}`, data.livekit_token)
              api.post('/meetings/join-record', { meeting_id: meetingId }).catch(() => {})
              setStatus('approved')
              setTimeout(() => nav(`/room/${meetingId}`), 800)
            } else if (data.status === 'rejected') {
              clearInterval(pollRef.current!); clearInterval(timerRef.current!)
              setStatus('rejected')
            }
          } catch {}
        }, 2000)
      } catch { setStatus('error') }
    }
    request()
    return () => { if (pollRef.current) clearInterval(pollRef.current); if (timerRef.current) clearInterval(timerRef.current) }
  }, [meetingId])

  const fmt = (s: number) => { const m = Math.floor(s/60); return m>0?`${m}м ${s%60}с`:`${s}с` }

  return (
    <div style={{background:'#080808',minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:"'DM Sans',sans-serif",color:'#f0f0f0',padding:'24px'}}>

      {/* Logo */}
      <div style={{position:'fixed',top:0,left:0,right:0,padding:'0 32px',height:60,display:'flex',alignItems:'center',borderBottom:'1px solid #1a1a1a',background:'rgba(8,8,8,0.9)',backdropFilter:'blur(12px)',zIndex:10}}>
        <div style={{fontSize:16,fontWeight:700,fontFamily:"'Syne',sans-serif"}}>KO<span style={{color:'#4361ee'}}>RISU</span></div>
      </div>

      <div style={{width:'100%',maxWidth:900,display:'grid',gridTemplateColumns:'1fr 360px',gap:20,alignItems:'start',marginTop:60}}>

        {/* LEFT — Camera preview */}
        <div>
          <div style={{fontSize:15,fontWeight:500,marginBottom:14}}>Проверка устройств</div>

          {/* Video box */}
          <div style={{background:'#111',borderRadius:16,overflow:'hidden',position:'relative',aspectRatio:'16/9',marginBottom:16}}>
            <div style={{width:'100%',height:'100%',background:'radial-gradient(ellipse at 50% 40%, #1a1a2e 0%, #080808 70%)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{width:72,height:72,borderRadius:'50%',background:'#1a1a1a',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="#333" strokeWidth="1.5"><circle cx="18" cy="13" r="7"/><path d="M4 34c0-8 6-13 14-13s14 5 14 13"/></svg>
              </div>
            </div>
            {user && <div style={{position:'absolute',bottom:12,left:12,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',borderRadius:8,padding:'5px 12px',fontSize:13,color:'rgba(255,255,255,0.9)'}}>{user.name} (Вы)</div>}

            {/* Controls */}
            <div style={{position:'absolute',bottom:0,left:0,right:0,background:'linear-gradient(transparent,rgba(0,0,0,0.8))',padding:'20px 16px 14px',display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
              <CtrlBtn active={micOn} onClick={() => setMicOn(m=>!m)} icon={micOn ? <MicOnIcon/> : <MicOffIcon/>} />
              <CtrlBtn active={camOn} onClick={() => setCamOn(c=>!c)} icon={camOn ? <CamOnIcon/> : <CamOffIcon/>} />
              <CtrlBtn active icon={<SettingsIcon/>} onClick={() => {}} />
            </div>
          </div>

          {/* Device info */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div style={{background:'#111',border:'1px solid #1e1e1e',borderRadius:12,padding:'12px 14px'}}>
              <div style={{fontSize:10,color:'#444',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4}}>Микрофон</div>
              <div style={{fontSize:13,color:'#888'}}>AirPods / Default</div>
              <div style={{marginTop:8,height:3,background:'#1a1a1a',borderRadius:2,overflow:'hidden'}}>
                <div style={{height:'100%',background:micOn?'#4361ee':'#2a2a2a',width:micOn?'60%':'0%',borderRadius:2,transition:'width .3s'}} />
              </div>
            </div>
            <div style={{background:'#111',border:'1px solid #1e1e1e',borderRadius:12,padding:'12px 14px'}}>
              <div style={{fontSize:10,color:'#444',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4}}>Камера</div>
              <div style={{fontSize:13,color:'#888'}}>FaceTime HD</div>
              <div style={{marginTop:6,display:'flex',alignItems:'center',gap:5}}>
                <div style={{width:6,height:6,borderRadius:'50%',background:camOn?'#4361ee':'#ff4444'}} />
                <span style={{fontSize:11,color:'#444'}}>{camOn?'Активна':'Отключена'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Panel */}
        <div style={{background:'#111',border:'1px solid #1e1e1e',borderRadius:20,padding:24,display:'flex',flexDirection:'column',gap:20}}>

          {/* Meeting info */}
          <div>
            <div style={{fontSize:17,fontWeight:500,letterSpacing:'-0.3px'}}>Встреча</div>
            <div style={{fontSize:12,color:'#444',fontFamily:"'DM Mono',monospace",marginTop:4}}>{meetingId?.slice(0,8)}...</div>
          </div>

          <div style={{height:1,background:'#1e1e1e'}} />

          {/* Status checks */}
          <div>
            <div style={{fontSize:11,color:'#333',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:10}}>Статус</div>
            {[
              { label:'Микрофон', ok:micOn, warn:!micOn, text:micOn?'активен':'выключен' },
              { label:'Камера', ok:camOn, err:!camOn, text:camOn?'активна':'выключена' },
              { label:'Соединение', ok:true, text:'хорошее' },
              { label:'Браузер', ok:true, text:'поддерживается' },
            ].map(c => (
              <div key={c.label} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:8,background:'rgba(255,255,255,0.03)',marginBottom:6}}>
                <div style={{width:7,height:7,borderRadius:'50%',background:c.ok?'#4361ee':c.warn?'#ffcc00':'#ff4444',flexShrink:0}} />
                <span style={{flex:1,fontSize:13,color:'rgba(255,255,255,0.7)'}}>{c.label}</span>
                <span style={{fontSize:11,color:'#444',fontFamily:"'DM Mono',monospace"}}>{c.text}</span>
              </div>
            ))}
          </div>

          <div style={{height:1,background:'#1e1e1e'}} />

          {/* Waiting status */}
          {status === 'requesting' && (
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',borderRadius:12,background:'rgba(67,97,238,0.08)',border:'1px solid rgba(67,97,238,0.2)'}}>
              <div style={{width:32,height:32,borderRadius:'50%',border:'2px solid #4361ee',borderTopColor:'transparent',animation:'spin .8s linear infinite',flexShrink:0}} />
              <div>
                <div style={{fontSize:13,fontWeight:500}}>Подключение...</div>
                <div style={{fontSize:11,color:'#444',marginTop:2}}>Отправляем запрос</div>
              </div>
            </div>
          )}

          {status === 'waiting' && (
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',borderRadius:12,background:'rgba(67,97,238,0.08)',border:'1px solid rgba(67,97,238,0.2)'}}>
              <div style={{width:32,height:32,borderRadius:'50%',background:'rgba(67,97,238,0.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#4361ee" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5l2 1.5"/></svg>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:500}}>Ожидание хоста</div>
                <div style={{fontSize:11,color:'#444',marginTop:2}}>Ждём {fmt(elapsed)}</div>
              </div>
              <div style={{display:'flex',gap:3}}>
                {[0,1,2].map(i => <span key={i} style={{width:5,height:5,borderRadius:'50%',background:'#4361ee',display:'inline-block',animation:`bounceDot 1.2s infinite`,animationDelay:`${i*.2}s`}} />)}
              </div>
            </div>
          )}

          {status === 'approved' && (
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',borderRadius:12,background:'rgba(67,97,238,0.08)',border:'1px solid rgba(67,97,238,0.2)'}}>
              <div style={{width:32,height:32,borderRadius:'50%',background:'rgba(67,97,238,0.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#4361ee" strokeWidth="2"><path d="M3 8l4 4 6-6"/></svg>
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:500,color:'#4361ee'}}>Одобрено!</div>
                <div style={{fontSize:11,color:'#444',marginTop:2}}>Входим в комнату...</div>
              </div>
            </div>
          )}

          {status === 'rejected' && (
            <div style={{padding:'12px 14px',borderRadius:12,background:'rgba(255,68,68,0.08)',border:'1px solid rgba(255,68,68,0.2)',textAlign:'center'}}>
              <div style={{fontSize:13,fontWeight:500,color:'#ff4444',marginBottom:4}}>Запрос отклонён</div>
              <div style={{fontSize:11,color:'#444'}}>Хост не пустил вас в встречу</div>
            </div>
          )}

          {status === 'error' && (
            <div style={{padding:'12px 14px',borderRadius:12,background:'rgba(255,68,68,0.08)',border:'1px solid rgba(255,68,68,0.2)',textAlign:'center'}}>
              <div style={{fontSize:13,fontWeight:500,color:'#ff4444',marginBottom:4}}>Встреча не найдена</div>
              <div style={{fontSize:11,color:'#444'}}>Ссылка недействительна</div>
            </div>
          )}

          {/* Actions */}
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {status === 'waiting' && (
              <button onClick={() => nav('/dashboard')} style={{width:'100%',padding:12,borderRadius:12,border:'1px solid #1e1e1e',background:'transparent',color:'#555',fontSize:13,cursor:'pointer'}}>
                ← Отмена
              </button>
            )}
            {(status === 'rejected' || status === 'error') && (
              <button onClick={() => nav('/dashboard')} style={{width:'100%',padding:13,borderRadius:12,border:'none',background:'#4361ee',color:'#080808',fontSize:14,fontWeight:600,cursor:'pointer'}}>
                ← На главную
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes bounceDot{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-4px);opacity:1}}
      `}</style>
    </div>
  )
}

function CtrlBtn({ active, onClick, icon }: { active: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{width:44,height:44,borderRadius:'50%',background:active?'rgba(255,255,255,0.1)':'#ff4444',border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'white',transition:'all .18s'}}>
      {icon}
    </button>
  )
}

const MicOnIcon = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 2a3 3 0 013 3v3a3 3 0 01-6 0V5a3 3 0 013-3z"/><path d="M5 9a4 4 0 008 0M9 13v3M6 16h6"/></svg>
const MicOffIcon = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="3" y1="3" x2="15" y2="15"/><path d="M9 2a3 3 0 013 3v3a3 3 0 01-6 0V5a3 3 0 013-3z"/><path d="M5 9a4 4 0 008 0M9 13v3M6 16h6"/></svg>
const CamOnIcon = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 5h9a1 1 0 011 1v6a1 1 0 01-1 1H1a1 1 0 01-1-1V6a1 1 0 011-1z"/><path d="M11 8l6-3v7l-6-3"/></svg>
const CamOffIcon = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="3" y1="3" x2="15" y2="15"/><path d="M1 5h9a1 1 0 011 1v6a1 1 0 01-1 1H1a1 1 0 01-1-1V6a1 1 0 011-1z"/><path d="M11 8l6-3v7l-6-3"/></svg>
const SettingsIcon = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="9" r="2.5"/><path d="M9 2v1.5M9 14.5V16M2 9h1.5M14.5 9H16M3.6 3.6l1 1M13.4 13.4l1 1M13.4 3.6l-1 1M4.6 13.4l-1 1"/></svg>