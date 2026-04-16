import { useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

function useParticles(ref: React.RefObject<HTMLCanvasElement>) {
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let animId: number
    let W = 0, H = 0
    const particles: {x:number;y:number;vx:number;vy:number;size:number;op:number}[] = []

    const resize = () => {
      W = canvas.width = canvas.offsetWidth
      H = canvas.height = canvas.offsetHeight
      particles.length = 0
      for (let i = 0; i < 70; i++) {
        particles.push({ x:Math.random()*W, y:Math.random()*H, vx:(Math.random()-.5)*.3, vy:(Math.random()-.5)*.3, size:Math.random()*1.5+.5, op:Math.random()*.5+.1 })
      }
    }

    const draw = () => {
      ctx.clearRect(0,0,W,H)
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy
        if (p.x<0||p.x>W) p.vx*=-1
        if (p.y<0||p.y>H) p.vy*=-1
        ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2)
        ctx.fillStyle = `rgba(67,97,238,${p.op})`; ctx.fill()
      }
      for (let i=0;i<particles.length;i++) for (let j=i+1;j<particles.length;j++) {
        const dx=particles[i].x-particles[j].x, dy=particles[i].y-particles[j].y
        const d=Math.sqrt(dx*dx+dy*dy)
        if (d<130) { ctx.beginPath(); ctx.strokeStyle=`rgba(67,97,238,${(1-d/130)*.1})`; ctx.lineWidth=.5; ctx.moveTo(particles[i].x,particles[i].y); ctx.lineTo(particles[j].x,particles[j].y); ctx.stroke() }
      }
      animId = requestAnimationFrame(draw)
    }

    resize(); draw()
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])
}

export default function Landing() {
  const nav = useNavigate()
  const user = useAuthStore(s => s.user)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useParticles(canvasRef)

  return (
    <div style={{background:'#080808',color:'#f0f0f0',minHeight:'100vh',fontFamily:"'DM Sans',sans-serif",overflow:'hidden'}}>
      {/* NAV */}
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 48px',height:64,borderBottom:'1px solid #1a1a1a',background:'rgba(8,8,8,0.85)',backdropFilter:'blur(12px)'}}>
        <div style={{fontSize:18,fontWeight:700,letterSpacing:'-0.5px',fontFamily:"'Syne',sans-serif"}}>
          KO<span style={{color:'#4361ee'}}>RISU</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {user ? (
            <button onClick={() => nav('/dashboard')} style={{padding:'9px 22px',borderRadius:10,background:'#4361ee',color:'#080808',fontSize:14,fontWeight:600,cursor:'pointer',transition:'all .18s'}}>
              Dashboard →
            </button>
          ) : (
            <>
              <button onClick={() => nav('/auth')} style={{padding:'9px 18px',borderRadius:10,background:'transparent',color:'#888',border:'1px solid #2a2a2a',fontSize:14,cursor:'pointer',transition:'all .18s'}}>
                Войти
              </button>
              <button onClick={() => nav('/auth')} style={{padding:'9px 22px',borderRadius:10,background:'#4361ee',color:'#080808',fontSize:14,fontWeight:600,cursor:'pointer',transition:'all .18s'}}>
                Начать →
              </button>
            </>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section style={{position:'relative',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
        <canvas ref={canvasRef} style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}} />
        <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(67,97,238,0.04) 0%, transparent 70%)'}} />

        <div style={{position:'relative',textAlign:'center',maxWidth:780,padding:'0 24px',animation:'fadeUp .7s ease forwards'}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'6px 16px',borderRadius:99,border:'1px solid #2a2a2a',background:'rgba(67,97,238,0.06)',fontSize:13,color:'#4361ee',marginBottom:28,fontWeight:500}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:'#4361ee',display:'inline-block',animation:'pulse 1.5s infinite'}} />
            Видеоконференции нового поколения
          </div>

          <h1 style={{fontSize:'clamp(42px,7vw,80px)',fontWeight:800,letterSpacing:'-3px',lineHeight:1.05,fontFamily:"'Syne',sans-serif",marginBottom:24}}>
            Встречи без<br />
            <span style={{color:'#4361ee'}}>лишних слов</span>
          </h1>

          <p style={{fontSize:'clamp(15px,2vw,18px)',color:'#888',lineHeight:1.7,marginBottom:40,maxWidth:520,margin:'0 auto 40px'}}>
            Быстрые видеозвонки, лобби с подтверждением входа, текстовый чат — всё в одном месте.
          </p>

          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12,flexWrap:'wrap'}}>
            <button onClick={() => nav(user?'/dashboard':'/auth')} style={{padding:'14px 32px',borderRadius:12,background:'#4361ee',color:'#080808',fontSize:15,fontWeight:700,cursor:'pointer',transition:'all .18s',display:'flex',alignItems:'center',gap:8}}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 5h9a1 1 0 011 1v5a1 1 0 01-1 1H2a1 1 0 01-1-1V6a1 1 0 011-1z"/><path d="M11 7.5l5-2.5v5l-5-2.5"/></svg>
              {user ? 'Открыть Dashboard' : 'Начать бесплатно'}
            </button>
            <button style={{padding:'14px 28px',borderRadius:12,background:'transparent',color:'#f0f0f0',fontSize:15,fontWeight:500,cursor:'pointer',border:'1px solid #2a2a2a',transition:'all .18s'}}>
              Смотреть демо
            </button>
          </div>

          {/* Stats */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:40,marginTop:60,paddingTop:40,borderTop:'1px solid #1a1a1a'}}>
            {[['<50ms','Задержка'],['50','Участников'],['99.9%','Uptime']].map(([v,l]) => (
              <div key={l} style={{textAlign:'center'}}>
                <div style={{fontSize:28,fontWeight:700,letterSpacing:'-1px',fontFamily:"'Syne',sans-serif",color:'#f0f0f0'}}>{v}</div>
                <div style={{fontSize:13,color:'#555',marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{position:'absolute',bottom:32,left:'50%',transform:'translateX(-50%)',display:'flex',flexDirection:'column',alignItems:'center',gap:8,color:'#333'}}>
          <div style={{width:1,height:48,background:'linear-gradient(to bottom, transparent, #2a2a2a)'}} />
        </div>
      </section>

      {/* FEATURES */}
      <section style={{padding:'100px 48px',maxWidth:1100,margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:64}}>
          <div style={{fontSize:13,color:'#4361ee',fontWeight:500,letterSpacing:'1px',textTransform:'uppercase',marginBottom:12}}>Возможности</div>
          <h2 style={{fontSize:'clamp(28px,4vw,44px)',fontWeight:700,letterSpacing:'-1.5px',fontFamily:"'Syne',sans-serif"}}>Всё что нужно для работы</h2>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
          {[
            { icon:'🎥', title:'Видеозвонки', desc:'WebRTC через LiveKit. HD качество, низкая задержка, до 50 участников одновременно.' },
            { icon:'🚪', title:'Лобби', desc:'Гости ждут подтверждения хоста. Полный контроль над тем, кто входит в встречу.' },
            { icon:'💬', title:'Чат', desc:'Личные сообщения между контактами в реальном времени через WebSocket.' },
            { icon:'📅', title:'Расписание', desc:'Планируйте встречи заранее. Приглашайте участников по коду или ссылке.' },
            { icon:'📺', title:'Демонстрация', desc:'Показывайте экран прямо во время звонка одним нажатием.' },
            { icon:'🔒', title:'Безопасность', desc:'JWT RS256, httpOnly куки, верификация email, rate limiting на все эндпоинты.' },
          ].map(f => (
            <div key={f.title} style={{background:'#111',border:'1px solid #1e1e1e',borderRadius:16,padding:24,transition:'all .18s',cursor:'default'}}>
              <div style={{fontSize:28,marginBottom:14}}>{f.icon}</div>
              <div style={{fontSize:15,fontWeight:600,marginBottom:8,fontFamily:"'Syne',sans-serif"}}>{f.title}</div>
              <div style={{fontSize:13.5,color:'#666',lineHeight:1.6}}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{padding:'100px 48px',textAlign:'center',position:'relative'}}>
        <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(67,97,238,0.05) 0%, transparent 70%)'}} />
        <div style={{position:'relative',maxWidth:600,margin:'0 auto'}}>
          <h2 style={{fontSize:'clamp(28px,4vw,48px)',fontWeight:700,letterSpacing:'-1.5px',fontFamily:"'Syne',sans-serif",marginBottom:16}}>
            Готовы начать?
          </h2>
          <p style={{fontSize:16,color:'#666',marginBottom:36}}>
            Бесплатно. Без кредитной карты.
          </p>
          <button onClick={() => nav(user?'/dashboard':'/auth')} style={{padding:'16px 40px',borderRadius:12,background:'#4361ee',color:'#080808',fontSize:15,fontWeight:700,cursor:'pointer',transition:'all .18s'}}>
            {user ? 'Открыть Dashboard →' : 'Создать аккаунт →'}
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{padding:'32px 48px',borderTop:'1px solid #1a1a1a',display:'flex',alignItems:'center',justifyContent:'space-between',color:'#333',fontSize:13}}>
        <div style={{fontWeight:700,fontSize:15,fontFamily:"'Syne',sans-serif"}}>KO<span style={{color:'#4361ee'}}>RISU</span></div>
        <div>© 2026 Korisu. Все права защищены.</div>
      </footer>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>
    </div>
  )
}