import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Landing.module.css'

/* ── Canvas particle network ─────────────────────────────── */
function useParticleCanvas(canvasRef: React.RefObject<HTMLCanvasElement>) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    let animId: number
    let W = 0, H = 0

    interface Particle {
      x: number; y: number
      vx: number; vy: number
      size: number; opacity: number
    }

    const particles: Particle[] = []
    const COUNT = 80
    const MAX_DIST = 140
    const ACCENT = '0, 255, 136'

    const resize = () => {
      W = canvas.width = canvas.offsetWidth
      H = canvas.height = canvas.offsetHeight
    }

    const init = () => {
      particles.length = 0
      for (let i = 0; i < COUNT; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          size: Math.random() * 1.5 + 0.5,
          opacity: Math.random() * 0.5 + 0.15,
        })
      }
    }

    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      // Update + draw dots
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > W) p.vx *= -1
        if (p.y < 0 || p.y > H) p.vy *= -1

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${ACCENT}, ${p.opacity})`
        ctx.fill()
      }

      // Draw connections
      for (let i = 0; i < COUNT; i++) {
        for (let j = i + 1; j < COUNT; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.12
            ctx.beginPath()
            ctx.strokeStyle = `rgba(${ACCENT}, ${alpha})`
            ctx.lineWidth = 0.5
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      animId = requestAnimationFrame(draw)
    }

    const ro = new ResizeObserver(() => { resize(); init() })
    ro.observe(canvas)
    resize()
    init()
    draw()

    return () => {
      cancelAnimationFrame(animId)
      ro.disconnect()
    }
  }, [])
}

/* ── Component ──────────────────────────────────────────────── */
export default function Landing() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nav = useNavigate()
  useParticleCanvas(canvasRef as React.RefObject<HTMLCanvasElement>)

  return (
    <div className={styles.root}>
      <canvas ref={canvasRef} className={styles.canvas} />

      {/* NAV */}
      <nav className={styles.nav}>
        <Logo />
        <div className={styles.navLinks}>
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <button className={styles.btnPrimary} onClick={() => nav('/auth')}>
            Get started
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.badge}>Video conferencing, rebuilt →</div>
        <h1 className={styles.heroTitle}>
          Meetings that<br />
          <span className={styles.accent}>actually work</span>
        </h1>
        <p className={styles.heroSub}>
          Korisu gives your team crystal-clear video, a smart lobby,<br />
          and real-time chat — all in one minimal interface.
        </p>
        <div className={styles.heroCta}>
          <button className={styles.btnPrimary} onClick={() => nav('/auth')}>
            Start for free
          </button>
          <button className={styles.btnGhost} onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}>
            See how it works
          </button>
        </div>
        <p className={styles.heroNote}>No credit card required · Free tier always available</p>
      </section>

      {/* STATS */}
      <section className={styles.stats}>
        {[
          { n: '<50ms', l: 'latency' },
          { n: '50+', l: 'participants' },
          { n: 'E2E', l: 'encrypted' },
          { n: '99.9%', l: 'uptime SLA' },
        ].map(({ n, l }) => (
          <div key={l} className={styles.stat}>
            <span className={styles.statNum}>{n}</span>
            <span className={styles.statLabel}>{l}</span>
          </div>
        ))}
      </section>

      {/* FEATURES */}
      <section id="features" className={styles.features}>
        <div className={styles.sectionLabel}>What you get</div>
        <h2 className={styles.sectionTitle}>Everything you need,<br />nothing you don't</h2>
        <div className={styles.featureGrid}>
          {FEATURES.map(f => (
            <div key={f.title} className={styles.featureCard}>
              <div className={styles.featureIcon}>{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className={styles.howSection}>
        <div className={styles.sectionLabel}>How it works</div>
        <h2 className={styles.sectionTitle}>Three steps to connected</h2>
        <div className={styles.steps}>
          {STEPS.map((s, i) => (
            <div key={s.title} className={styles.step}>
              <div className={styles.stepNum}>0{i + 1}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA BANNER */}
      <section className={styles.ctaBanner}>
        <div className={styles.ctaGlow} />
        <h2>Ready to meet better?</h2>
        <p>Join thousands of teams already using Korisu.</p>
        <button className={styles.btnPrimary} onClick={() => nav('/auth')}>
          Create your account
        </button>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <Logo />
        <p className={styles.footerCopy}>© 2026 Korisu. Built for the future of work.</p>
      </footer>
    </div>
  )
}

function Logo() {
  return (
    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, letterSpacing: '-0.5px' }}>
      KO<span style={{ color: 'var(--accent)' }}>RISU</span>
    </div>
  )
}

const FEATURES = [
  { icon: '⬡', title: 'Smart Lobby', desc: 'Guests wait in a waiting room. You approve or reject with one click before they join.' },
  { icon: '◈', title: 'Crystal Video', desc: 'WebRTC via LiveKit SFU delivers adaptive HD video with automatic quality scaling.' },
  { icon: '◇', title: 'Instant Chat', desc: 'Real-time messaging between contacts, backed by WebSocket and Redis Pub/Sub.' },
  { icon: '○', title: 'Invite Links', desc: 'Share a single link or short code. Guests can join without creating an account.' },
  { icon: '△', title: 'Meeting History', desc: 'Full log of all your meetings, participants and timestamps for the last 30 days.' },
  { icon: '□', title: 'Secure by Default', desc: 'RS256 JWT, httpOnly cookies, AES-256-GCM, bcrypt — security baked in, not bolted on.' },
]

const STEPS = [
  { title: 'Sign up', desc: 'Create an account with Google or email. Verified and ready in under a minute.' },
  { title: 'Start a meeting', desc: 'Hit "New Meeting", copy the link, share it. Your room is ready instantly.' },
  { title: 'Connect', desc: 'Approve guests from the lobby, turn on your camera, and start collaborating.' },
]
