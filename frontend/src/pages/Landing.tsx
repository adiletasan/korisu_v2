import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

function useCanvas(ref: React.RefObject<HTMLCanvasElement>) {
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let animId: number
    let W = 0, H = 0
    let mouse = { x: -9999, y: -9999 }
    const COLORS = ['#4361ee','#7c3aed','#3451d1','#5b21b6']
    const particles: any[] = []

    const resize = () => {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
    }

    const init = () => {
      particles.length = 0
      for (let i = 0; i < 80; i++) {
        const color = COLORS[Math.floor(Math.random() * COLORS.length)]
        particles.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
          r: Math.random() * 1.6 + 1.2,
          color, alpha: Math.random() * 0.5 + 0.3,
          pulseOffset: Math.random() * Math.PI * 2,
        })
      }
    }

    const hexRgb = (hex: string) => [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)]

    let t = 0
    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      t += 0.016

      for (const p of particles) {
        p.x += p.vx; p.y += p.vy
        if (p.x < -20) p.x = W + 20
        if (p.x > W + 20) p.x = -20
        if (p.y < -20) p.y = H + 20
        if (p.y > H + 20) p.y = -20

        const dx = mouse.x - p.x, dy = mouse.y - p.y
        const md = Math.sqrt(dx*dx + dy*dy)
        if (md < 200) { p.vx -= dx/md*0.015; p.vy -= dy/md*0.015; p.vx *= 0.98; p.vy *= 0.98 }

        const pulse = 0.5 + 0.5 * Math.sin(t * 1.5 + p.pulseOffset)
        const alpha = p.alpha * (0.6 + 0.4 * pulse)
        const [r,g,b] = hexRgb(p.color)
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2)
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`; ctx.fill()
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i+1; j < particles.length; j++) {
          const a = particles[i], b = particles[j]
          const dx = a.x-b.x, dy = a.y-b.y
          const dist = Math.sqrt(dx*dx+dy*dy)
          if (dist < 160) {
            ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y)
            ctx.strokeStyle = `rgba(67,97,238,${(1-dist/160)*0.18})`
            ctx.lineWidth = 0.5; ctx.stroke()
          }
        }
      }
      animId = requestAnimationFrame(draw)
    }

    resize(); init(); draw()
    window.addEventListener('resize', () => { resize(); init() })
    window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY })
    window.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999 })
    return () => cancelAnimationFrame(animId)
  }, [])
}

export default function Landing() {
  const nav = useNavigate()
  const user = useAuthStore(s => s.user)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useCanvas(canvasRef)

  const go = () => nav(user ? '/dashboard' : '/auth')

  return (
    <div style={{background:'#080b12',color:'#f0f2fa',minHeight:'100vh',fontFamily:"'Syne',sans-serif",overflowX:'hidden'}}>
      <canvas ref={canvasRef} style={{position:'fixed',inset:0,zIndex:0,pointerEvents:'none'}} />

      {/* HEADER */}
      <header style={{position:'fixed',top:0,left:0,right:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 48px',background:'rgba(8,11,18,0.8)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
        <div style={{fontSize:22,fontWeight:800,letterSpacing:'-0.5px',display:'flex',alignItems:'center',gap:2}}>
          <span style={{color:'#4361ee'}}>K</span>orisu
          <span style={{width:6,height:6,borderRadius:'50%',background:'#22c55e',margin:'0 1px 1px',display:'inline-block',animation:'blink 2.5s infinite'}} />
        </div>
        <nav style={{display:'flex',alignItems:'center',gap:6}}>
          {['Features','How it works','Pricing'].map(l => (
            <a key={l} href="#" style={{padding:'7px 16px',borderRadius:8,color:'rgba(240,242,250,0.55)',fontSize:14,fontWeight:500,textDecoration:'none',transition:'all .2s'}}
              onMouseEnter={e => { (e.target as HTMLElement).style.color='#f0f2fa'; (e.target as HTMLElement).style.background='rgba(255,255,255,0.05)' }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color='rgba(240,242,250,0.55)'; (e.target as HTMLElement).style.background='transparent' }}>
              {l}
            </a>
          ))}
        </nav>
        <button onClick={go} style={{padding:'10px 22px',borderRadius:12,background:'#4361ee',color:'white',border:'none',fontSize:14,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8,transition:'all .2s'}}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='#3451d1'; (e.currentTarget as HTMLElement).style.transform='translateY(-1px)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='#4361ee'; (e.currentTarget as HTMLElement).style.transform='translateY(0)' }}>
          {user ? 'Dashboard' : 'Get Started'}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.5 7h9M8 3.5l3.5 3.5L8 10.5"/></svg>
        </button>
      </header>

      {/* HERO */}
      <section style={{position:'relative',zIndex:1,minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:'120px 24px 80px'}}>
        <div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'6px 16px 6px 8px',background:'rgba(67,97,238,0.1)',border:'1px solid rgba(67,97,238,0.25)',borderRadius:999,fontSize:13,color:'rgba(180,196,255,0.9)',fontFamily:"'DM Mono',monospace",marginBottom:36,animation:'fadeUp .8s ease both'}}>
          <span style={{width:8,height:8,borderRadius:'50%',background:'#4361ee',animation:'pulse 1.5s infinite'}} />
          Now in public beta · v0.4
        </div>

        <h1 style={{fontSize:'clamp(48px,8vw,96px)',fontWeight:800,letterSpacing:'-3px',lineHeight:0.95,marginBottom:28,animation:'fadeUp .8s .1s ease both',maxWidth:900}}>
          Meet without<br />
          <em style={{fontStyle:'normal',background:'linear-gradient(135deg,#4361ee,#7c3aed,#a855f7)',WebkitBackgroundClip:'text',backgroundClip:'text',WebkitTextFillColor:'transparent'}}>friction</em>
        </h1>

        <p style={{fontSize:19,color:'rgba(240,242,250,0.55)',lineHeight:1.6,maxWidth:560,marginBottom:48,animation:'fadeUp .8s .2s ease both'}}>
          Korisu is a video platform built for teams who value clarity. Crystal-clear calls, instant lobbies, and a chat that actually works.
        </p>

        <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap',justifyContent:'center',animation:'fadeUp .8s .3s ease both'}}>
          <button onClick={go} style={{padding:'16px 32px',borderRadius:14,background:'#4361ee',color:'white',border:'none',fontSize:16,fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:10,transition:'all .2s'}}
            onMouseEnter={e => { (e.currentTarget).style.background='#3451d1'; (e.currentTarget).style.transform='translateY(-2px)'; (e.currentTarget).style.boxShadow='0 12px 40px rgba(67,97,238,0.35)' }}
            onMouseLeave={e => { (e.currentTarget).style.background='#4361ee'; (e.currentTarget).style.transform='translateY(0)'; (e.currentTarget).style.boxShadow='none' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 2L14 5v6L8 14 2 11V5L8 2z"/></svg>
            {user ? 'Open Dashboard' : 'Start meeting free'}
          </button>
          <a href="#features" style={{padding:'16px 28px',borderRadius:14,background:'transparent',color:'rgba(240,242,250,0.55)',border:'1px solid rgba(255,255,255,0.12)',fontSize:16,fontWeight:500,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8,textDecoration:'none',transition:'all .2s'}}>
            See how it works
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 2v10M3 8l4 4 4-4"/></svg>
          </a>
        </div>

        {/* Social proof */}
        <div style={{marginTop:60,display:'flex',alignItems:'center',gap:16,animation:'fadeUp .8s .45s ease both',flexWrap:'wrap',justifyContent:'center'}}>
          <div style={{display:'flex'}}>
            {[['#4361ee','АК'],['#7c3aed','ДМ'],['#0ea5e9','НС'],['#10b981','ТА'],['#f59e0b','РА']].map(([bg,l]) => (
              <div key={l} style={{width:32,height:32,borderRadius:'50%',background:bg,border:'2px solid #080b12',fontSize:11,fontWeight:700,color:'white',display:'flex',alignItems:'center',justifyContent:'center',marginRight:-8,flexShrink:0}}>{l}</div>
            ))}
          </div>
          <p style={{fontSize:13,color:'rgba(240,242,250,0.55)',paddingLeft:16}}><strong style={{color:'#f0f2fa'}}>2,400+ teams</strong> already using Korisu</p>
        </div>

        {/* Preview */}
        <div style={{marginTop:72,width:'100%',maxWidth:1000,animation:'fadeUp .9s .5s ease both',position:'relative'}}>
          <div style={{position:'absolute',inset:'-40px -40px -60px',background:'radial-gradient(ellipse at 50% 50%, rgba(67,97,238,0.18) 0%, transparent 70%)',pointerEvents:'none',zIndex:-1}} />
          <div style={{background:'#0e1220',border:'1px solid rgba(255,255,255,0.12)',borderRadius:18,overflow:'hidden',boxShadow:'0 40px 120px rgba(0,0,0,0.6)'}}>
            <div style={{background:'#141928',padding:'14px 18px',display:'flex',alignItems:'center',gap:10,borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
              <div style={{display:'flex',gap:6}}>
                {['#ef4444','#f59e0b','#22c55e'].map(c => <div key={c} style={{width:11,height:11,borderRadius:'50%',background:c}} />)}
              </div>
              <div style={{flex:1,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:6,padding:'5px 12px',fontFamily:"'DM Mono',monospace",fontSize:12,color:'rgba(240,242,250,0.28)',display:'flex',alignItems:'center',gap:6}}>
                <span style={{color:'#22c55e'}}>🔒</span> korisu.online/room/KRS-847-291
              </div>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:'rgba(240,242,250,0.28)'}}>04:07</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:2,background:'rgba(255,255,255,0.07)',padding:2,minHeight:280}}>
              <div style={{background:'#0e1220',position:'relative',display:'flex',alignItems:'center',justifyContent:'center',border:'1.5px solid #22c55e',borderRadius:4,gridRow:'span 2'}}>
                <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 40% 35%, #1a2040 0%, #0a0d16 70%)',borderRadius:4}} />
                <div style={{position:'relative',zIndex:1,width:48,height:48,borderRadius:'50%',background:'rgba(255,255,255,0.05)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1" opacity={0.25}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-5 3-8 8-8s8 3 8 8"/></svg>
                </div>
                <div style={{position:'absolute',bottom:10,left:12,zIndex:2,fontSize:11,color:'rgba(255,255,255,0.75)',fontFamily:"'DM Mono',monospace",background:'rgba(0,0,0,0.5)',padding:'3px 8px',borderRadius:5,display:'flex',alignItems:'center',gap:5}}>
                  <span style={{width:6,height:6,borderRadius:'50%',background:'#22c55e',animation:'pulse 1.2s infinite'}} />
                  Damir M. · speaking
                </div>
              </div>
              {[['#0ea5e9','НС','Nurziya S.'],['#f59e0b','РА','Rasul A.']].map(([bg,av,name]) => (
                <div key={av} style={{background:'#0e1220',position:'relative',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:4,minHeight:130}}>
                  <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 40% 35%, #1a2040 0%, #0a0d16 70%)',borderRadius:4}} />
                  <div style={{position:'relative',zIndex:1,width:36,height:36,borderRadius:'50%',background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'white'}}>{av}</div>
                  <div style={{position:'absolute',bottom:8,left:10,zIndex:2,fontSize:10,color:'rgba(255,255,255,0.6)',fontFamily:"'DM Mono',monospace",background:'rgba(0,0,0,0.5)',padding:'2px 6px',borderRadius:4}}>{name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{position:'relative',zIndex:1,padding:'100px 24px'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:12,letterSpacing:2,color:'#4361ee',textTransform:'uppercase',marginBottom:16}}>Features</div>
          <h2 style={{fontSize:'clamp(32px,5vw,52px)',fontWeight:800,letterSpacing:'-2px',lineHeight:1.05,marginBottom:18}}>Everything a team needs.<br />Nothing they don't.</h2>
          <p style={{fontSize:17,color:'rgba(240,242,250,0.55)',lineHeight:1.65,maxWidth:540,marginBottom:64}}>We stripped video calling back to the essentials, then obsessed over each one.</p>

          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:16}}>
            {/* Large card */}
            <div style={{background:'#0e1220',border:'1px solid rgba(255,255,255,0.07)',borderRadius:20,padding:32,gridColumn:'span 2',display:'grid',gridTemplateColumns:'1fr 1fr',gap:40,alignItems:'center',transition:'all .3s'}}>
              <div>
                <div style={{width:44,height:44,borderRadius:12,background:'rgba(67,97,238,0.12)',border:'1px solid rgba(67,97,238,0.2)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:20}}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#4361ee" strokeWidth="1.5"><rect x="1" y="4" width="13" height="12" rx="2"/><path d="M14 8l5-2v8l-5-2"/></svg>
                </div>
                <div style={{fontSize:20,fontWeight:700,letterSpacing:'-0.5px',marginBottom:10}}>HD Video Calls</div>
                <div style={{fontSize:15,color:'rgba(240,242,250,0.55)',lineHeight:1.65}}>Up to 1080p adaptive streaming that adjusts to every participant's connection. Background blur built in.</div>
                <div style={{marginTop:20,display:'flex',flexWrap:'wrap',gap:8}}>
                  {['Adaptive bitrate','E2E encrypted','Up to 100 participants'].map(t => (
                    <span key={t} style={{fontFamily:"'DM Mono',monospace",fontSize:11,padding:'4px 10px',borderRadius:6,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',color:'rgba(240,242,250,0.28)'}}>{t}</span>
                  ))}
                </div>
              </div>
              <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:20}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                  <div style={{aspectRatio:'16/9',background:'radial-gradient(ellipse at 40% 35%, #1a2040 0%, #0a0d16 80%)',borderRadius:8,border:'1px solid rgba(34,197,94,0.3)',display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="white" strokeWidth="1" opacity={0.15}><circle cx="14" cy="9" r="5"/><path d="M4 25c0-6 4-9 10-9s10 3 10 9"/></svg>
                    <div style={{position:'absolute',bottom:6,left:8,fontSize:9,color:'rgba(255,255,255,0.5)',fontFamily:"'DM Mono',monospace",background:'rgba(0,0,0,0.5)',padding:'2px 6px',borderRadius:4,display:'flex',gap:4,alignItems:'center'}}>
                      <div style={{width:5,height:5,borderRadius:'50%',background:'#22c55e',animation:'pulse 1.2s infinite'}} />Damir M.
                    </div>
                  </div>
                  {[['#4361ee','АК'],['#0ea5e9','НС'],['#f59e0b','РА']].map(([bg,av]) => (
                    <div key={av} style={{aspectRatio:'16/9',background:'#0e1220',borderRadius:8,border:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <div style={{width:32,height:32,borderRadius:'50%',background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'white'}}>{av}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',justifyContent:'center',gap:10}}>
                  {[['#ef4444',true],['rgba(255,255,255,0.07)',false],['#ef4444',true]].map(([bg,muted],i) => (
                    <div key={i} style={{width:40,height:40,borderRadius:'50%',background:bg as string,border:muted?`1px solid ${bg}40`:'none',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={muted?'#ef4444':'rgba(255,255,255,0.6)'} strokeWidth="1.5">
                        {i===0?<><line x1="3" y1="3" x2="13" y2="13"/><path d="M8 2a2.5 2.5 0 012.5 2.5v2.5M8 2a2.5 2.5 0 00-2.5 2.5v3a2.5 2.5 0 005 0M4.5 8A3.5 3.5 0 0011.5 8M8 11v2M6 13h4"/></>
                        :i===1?<><path d="M8 1.5v4a2 2 0 004 0V4M3.5 7a4.5 4.5 0 009 0M8 11v2.5M5.5 13.5h5"/></>
                        :<><line x1="2" y1="2" x2="14" y2="14"/><path d="M1 5h8a1 1 0 011 1v5a1 1 0 01-1 1H1a1 1 0 01-1-1V6a1 1 0 011-1zM10 7l5-2v6l-5-2"/></>}
                      </svg>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Smart Lobby */}
            <div style={{background:'#0e1220',border:'1px solid rgba(255,255,255,0.07)',borderRadius:20,padding:32,transition:'all .3s'}}>
              <div style={{width:44,height:44,borderRadius:12,background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.2)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:20}}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#22c55e" strokeWidth="1.5"><circle cx="10" cy="10" r="8"/><path d="M10 6v4.5l3 1.8"/></svg>
              </div>
              <div style={{fontSize:20,fontWeight:700,letterSpacing:'-0.5px',marginBottom:10}}>Smart Lobby</div>
              <div style={{fontSize:15,color:'rgba(240,242,250,0.55)',lineHeight:1.65}}>Participants wait in a pre-flight lobby. Check mic and camera before entering. Hosts see everyone waiting in real time.</div>
              <div style={{marginTop:20,background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:16,display:'flex',flexDirection:'column',gap:10}}>
                {[['Connection','#22c55e','92%','43ms'],['Microphone','#22c55e','100%','active'],['Camera','#ef4444','0%','off']].map(([label,color,w,status]) => (
                  <div key={label} style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:color,flexShrink:0}} />
                    <div style={{flex:1}}>
                      <div style={{fontSize:11,color:'rgba(240,242,250,0.55)',marginBottom:3}}>{label}</div>
                      <div style={{height:4,background:'rgba(255,255,255,0.04)',borderRadius:4,overflow:'hidden'}}>
                        <div style={{height:'100%',background:color,width:w,borderRadius:4}} />
                      </div>
                    </div>
                    <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:color}}>{status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* In-call Chat */}
            <div style={{background:'#0e1220',border:'1px solid rgba(255,255,255,0.07)',borderRadius:20,padding:32,transition:'all .3s'}}>
              <div style={{width:44,height:44,borderRadius:12,background:'rgba(124,58,237,0.1)',border:'1px solid rgba(124,58,237,0.2)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:20}}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#a78bfa" strokeWidth="1.5"><path d="M3 3h14a1 1 0 011 1v9a1 1 0 01-1 1H6l-4 3V4a1 1 0 011-1z"/></svg>
              </div>
              <div style={{fontSize:20,fontWeight:700,letterSpacing:'-0.5px',marginBottom:10}}>In-call Chat</div>
              <div style={{fontSize:15,color:'rgba(240,242,250,0.55)',lineHeight:1.65}}>A persistent chat alongside your video. Messages don't disappear — history is saved automatically.</div>
              <div style={{marginTop:20,background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:14,display:'flex',flexDirection:'column',gap:10}}>
                {[{me:false,bg:'#7c3aed',av:'ДМ',text:"Can everyone see my screen?"},
                  {me:true,bg:'#4361ee',av:'АК',text:"Yes, looks great!"},
                  {me:false,bg:'#0ea5e9',av:'НС',text:"Also visible here 👍"}].map((m,i) => (
                  <div key={i} style={{display:'flex',gap:8,flexDirection:m.me?'row-reverse':'row'}}>
                    <div style={{width:22,height:22,borderRadius:'50%',background:m.bg,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:700,color:'white'}}>{m.av}</div>
                    <div style={{maxWidth:'70%',padding:'8px 12px',borderRadius:12,fontSize:12,lineHeight:1.45,background:m.me?'rgba(67,97,238,0.2)':'rgba(255,255,255,0.05)',color:m.me?'rgba(180,196,255,0.9)':'rgba(240,242,250,0.55)'}}>{m.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NUMBERS */}
      <section style={{position:'relative',zIndex:1,background:'#0e1220',borderTop:'1px solid rgba(255,255,255,0.07)',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
        <div style={{maxWidth:1100,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(4,1fr)'}}>
          {[['43ms','avg latency'],['99.9%','uptime SLA'],['100+','participants/room'],['E2E 🔐','encrypted']].map(([v,l]) => (
            <div key={l} style={{padding:'60px 40px',textAlign:'center',borderRight:'1px solid rgba(255,255,255,0.07)'}}>
              <div style={{fontSize:54,fontWeight:800,letterSpacing:'-3px',lineHeight:1,marginBottom:8,color:'#f0f2fa'}}>{v}</div>
              <div style={{fontSize:14,color:'rgba(240,242,250,0.55)',fontFamily:"'DM Mono',monospace"}}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{position:'relative',zIndex:1,padding:'100px 24px'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:12,letterSpacing:2,color:'#4361ee',textTransform:'uppercase',marginBottom:16}}>How it works</div>
          <h2 style={{fontSize:'clamp(32px,5vw,52px)',fontWeight:800,letterSpacing:'-2px',lineHeight:1.05,marginBottom:64}}>From zero to meeting<br />in 30 seconds.</h2>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:2,background:'rgba(255,255,255,0.07)',borderRadius:20,overflow:'hidden'}}>
            {[
              {n:'01',title:'Create a room',desc:'Hit "New Meeting" from your dashboard. A unique room code is generated instantly — no configuration needed.'},
              {n:'02',title:'Share the link',desc:'Send the room link or the 9-digit code. Guests click through the lobby and wait until you let them in.'},
              {n:'03',title:'Meet & record',desc:'Collaborate with HD video, screen sharing, and live chat. Recording runs in the background automatically.'},
            ].map((s,i) => (
              <div key={s.n} style={{background:'#0e1220',padding:'40px 36px',position:'relative'}}>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:'#4361ee',letterSpacing:2,textTransform:'uppercase',marginBottom:20,display:'flex',alignItems:'center',gap:8}}>
                  {s.n}
                  <div style={{flex:1,height:1,background:'rgba(67,97,238,0.2)'}} />
                </div>
                <div style={{fontSize:22,fontWeight:700,letterSpacing:'-0.5px',marginBottom:12}}>{s.title}</div>
                <div style={{fontSize:15,color:'rgba(240,242,250,0.55)',lineHeight:1.65}}>{s.desc}</div>
                {i<2 && <div style={{position:'absolute',top:40,right:-1,zIndex:2,color:'#4361ee'}}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3.5 8h9M9 4.5l3.5 3.5L9 11.5"/></svg>
                </div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{position:'relative',zIndex:1,padding:'120px 24px',textAlign:'center'}}>
        <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 50% 60%, rgba(67,97,238,0.12) 0%, transparent 70%)',pointerEvents:'none'}} />
        <div style={{position:'relative',maxWidth:720,margin:'0 auto'}}>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:12,letterSpacing:2,color:'#4361ee',textTransform:'uppercase',marginBottom:16,display:'flex',justifyContent:'center'}}>Free to start</div>
          <h2 style={{fontSize:'clamp(40px,6vw,72px)',fontWeight:800,letterSpacing:'-2.5px',lineHeight:1,marginBottom:24}}>
            Ready to meet<br /><em style={{fontStyle:'normal',color:'#4361ee'}}>better</em>?
          </h2>
          <p style={{fontSize:18,color:'rgba(240,242,250,0.55)',marginBottom:48}}>Korisu is free for teams up to 10. No credit card, no limits on meeting length.</p>
          <div style={{display:'flex',alignItems:'center',gap:14,justifyContent:'center',flexWrap:'wrap'}}>
            <button onClick={go} style={{padding:'16px 32px',borderRadius:14,background:'#4361ee',color:'white',border:'none',fontSize:16,fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:10,transition:'all .2s'}}
              onMouseEnter={e => { (e.currentTarget).style.background='#3451d1'; (e.currentTarget).style.transform='translateY(-2px)' }}
              onMouseLeave={e => { (e.currentTarget).style.background='#4361ee'; (e.currentTarget).style.transform='translateY(0)' }}>
              Create free account
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.5 7h9M8 3.5l3.5 3.5L8 10.5"/></svg>
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{position:'relative',zIndex:1,background:'#0e1220',borderTop:'1px solid rgba(255,255,255,0.07)',padding:'60px 48px 40px'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{display:'grid',gridTemplateColumns:'1.5fr 1fr 1fr 1fr',gap:40,marginBottom:48}}>
            <div>
              <div style={{fontSize:20,fontWeight:800,marginBottom:12,display:'flex',alignItems:'center',gap:2}}>
                <span style={{color:'#4361ee'}}>K</span>orisu
              </div>
              <p style={{fontSize:14,color:'rgba(240,242,250,0.55)',lineHeight:1.6,maxWidth:220}}>Video meetings that respect your time. Built for async-first teams.</p>
            </div>
            {[['Product',['Features','Pricing','Changelog','Roadmap']],['Company',['About','Blog','Careers','Contact']],['Legal',['Privacy','Terms','Security','DPA']]].map(([title,links]) => (
              <div key={title as string}>
                <div style={{fontSize:13,fontWeight:600,color:'rgba(240,242,250,0.28)',textTransform:'uppercase',letterSpacing:1,marginBottom:16}}>{title}</div>
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {(links as string[]).map(l => <a key={l} href="#" style={{fontSize:14,color:'rgba(240,242,250,0.55)',textDecoration:'none'}}>{l}</a>)}
                </div>
              </div>
            ))}
          </div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:24,borderTop:'1px solid rgba(255,255,255,0.07)',fontSize:13,color:'rgba(240,242,250,0.28)',flexWrap:'wrap',gap:12}}>
            <span>© 2026 Korisu. All rights reserved.</span>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:'#22c55e'}} />
              <span>All systems operational</span>
            </div>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:12}}>korisu.online</span>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.3);opacity:0.6} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  )
}