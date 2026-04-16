import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../store/auth'
import api from '../lib/api'
import DashChat from '../components/dashboard/DashChat'
import styles from './Dashboard.module.css'

type Section = 'overview' | 'meetings' | 'history' | 'contacts' | 'chat' | 'settings' | 'profile'

interface Meeting {
  id: string
  title: string
  invite_code: string
  status: string
  created_at: string
  ended_at: string | null
  participant_count: number
  participants?: { email: string; name: string; role: string }[]
}

interface Contact {
  id: string
  user_id: string
  email: string
  name: string
  avatar_url: string | null
}

const COLORS = ['#4361ee','#7c3aed','#0ea5e9','#22c55e','#f59e0b','#ec4899','#10b981','#ef4444']
const getColor = (s: string) => COLORS[s.charCodeAt(0) % COLORS.length]
const initials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
const formatDate = (iso: string) => new Date(iso).toLocaleString('ru-RU', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })
const formatDateShort = (iso: string) => new Date(iso).toLocaleDateString('ru-RU', { day:'numeric', month:'short' })

export default function Dashboard() {
  const [section, setSection] = useState<Section>('overview')
  const [collapsed, setCollapsed] = useState(false)
  const [chatUserId, setChatUserId] = useState<string|null>(null)
  const [chatUserName, setChatUserName] = useState<string|null>(null)
  const user = useAuthStore(s => s.user)
  const fetchMe = useAuthStore(s => s.fetchMe)
  const logout = useAuthStore(s => s.logout)

  useEffect(() => { fetchMe() }, [])

  const handleStartChat = (userId: string, userName: string) => {
    setChatUserId(userId)
    setChatUserName(userName)
    setSection('chat')
  }

  const initials2 = user?.name ? initials(user.name) : 'KR'
  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Доброе утро'
    if (h < 18) return 'Добрый день'
    return 'Добрый вечер'
  }
  const today = new Date().toLocaleDateString('ru-RU', { weekday:'long', day:'numeric', month:'long', year:'numeric' })

  const navItems = [
    { id: 'overview', label: 'Обзор', icon: <GridIcon /> },
    { id: 'meetings', label: 'Встречи', icon: <CalIcon />, badge: '3' },
    { id: 'history', label: 'История', icon: <ClockIcon /> },
    { id: 'contacts', label: 'Контакты', icon: <PeopleIcon /> },
    { id: 'chat', label: 'Чаты', icon: <ChatIcon /> },
  ]

  return (
    <div className="dash-root">
      {/* SIDEBAR */}
      <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
        <div className="sidebar-logo">
          <svg width="22" height="22" viewBox="0 0 33 36" fill="none"><path d="M16.5 3L30 10.5v15L16.5 33 3 25.5v-15L16.5 3z" fill="#4361ee" opacity="0.2"/><path d="M16.5 8L27 14v10l-10.5 6L6 24V14L16.5 8z" fill="#4361ee"/></svg>
          <span className="sidebar-logo-text">K<span>orisu</span></span>
          <button className="sidebar-lock" onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Развернуть' : 'Свернуть'}>
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Главное</div>
          {navItems.map(item => (
            <button
              key={item.id}
              className={`sidebar-item${section === item.id ? ' active' : ''}`}
              onClick={() => setSection(item.id as Section)}
              title={item.label}
            >
              {item.icon}
              <span className="sidebar-item-label">{item.label}</span>
              {item.badge && <span className="sidebar-badge">{item.badge}</span>}
            </button>
          ))}

          <div className="sidebar-section-label" style={{marginTop: 20}}>Настройки</div>
          <button className={`sidebar-item${section === 'settings' ? ' active' : ''}`} onClick={() => setSection('settings')} title="Настройки">
            <SettingsIcon />
            <span className="sidebar-item-label">Настройки</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user" onClick={() => setSection('profile')}>
            <div className="sidebar-user-av">{initials2}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name || 'Пользователь'}</div>
              <div className="sidebar-user-plan">Free план</div>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className={`dash-main${collapsed ? ' collapsed' : ''}`}>
        {section === 'overview' && (
          <OverviewPage greeting={greeting()} today={today} user={user} onStartChat={handleStartChat} onNavigate={setSection} />
        )}
        {section === 'meetings' && <MeetingsPage user={user} />}
        {section === 'history' && <HistoryPage />}
        {section === 'contacts' && <ContactsPage onStartChat={handleStartChat} />}
        {section === 'chat' && <div style={{height: 'calc(100vh - 0px)'}}><DashChat initialUserId={chatUserId} initialUserName={chatUserName} /></div>}
        {section === 'settings' && <SettingsPage />}
        {section === 'profile' && <ProfilePage user={user} onLogout={logout} />}
      </main>

      <div className="toast-container" id="toast-container" />
    </div>
  )
}

/* ══ OVERVIEW PAGE ══════════════════════════════════════════ */
function OverviewPage({ greeting, today, user, onStartChat, onNavigate }: any) {
  const [history, setHistory] = useState<Meeting[]>([])
  const [showSchedule, setShowSchedule] = useState(false)
  const [showDetail, setShowDetail] = useState<Meeting|null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    api.get('/meetings/history').then(r => setHistory(r.data)).catch(() => {})
  }, [])

  const activeMeetings = history.filter(m => m.status === 'active')
  const todayMeetings = history.filter(m => new Date(m.created_at).toDateString() === new Date().toDateString())

  const handleNewMeeting = async () => {
    setCreating(true)
    try {
      const { data } = await api.post('/meetings/create', { title: 'Быстрая встреча' })
      sessionStorage.setItem(`host_token_${data.meeting_id}`, data.host_token)
      window.location.href = `/room/${data.meeting_id}`
    } catch { toast('Ошибка создания встречи', 'error') }
    setCreating(false)
  }

  const handleJoin = async () => {
    if (!joinCode.trim()) return
    try {
      const { data } = await api.get(`/meetings/join/${joinCode.replace(/-/g,'').trim()}`)
      window.location.href = `/lobby/${data.meeting_id}`
    } catch { toast('Встреча не найдена', 'error') }
  }

  return (
    <div className="dash-content">
      <div className="page-header">
        <div>
          <div className="page-greeting">{greeting}, {user?.name?.split(' ')[0] || 'пользователь'} 👋</div>
          <div className="page-date">{today}</div>
        </div>
        <div className="page-actions">
          <button className="btn-secondary" onClick={() => setShowSchedule(true)}>
            <CalIcon /> Запланировать
          </button>
          <button className="btn-primary" onClick={handleNewMeeting} disabled={creating}>
            <VideoIcon /> {creating ? 'Создаём...' : 'Новая встреча'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Встреч сегодня</div>
          <div className="stat-row">
            <div>
              <div className="stat-value">{todayMeetings.length}</div>
              <div className="stat-delta">↑ встреч за сегодня</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Всего встреч</div>
          <div className="stat-row">
            <div>
              <div className="stat-value">{history.length}</div>
              <div className="stat-delta">↑ за все время</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Активных встреч</div>
          <div className="stat-row">
            <div>
              <div className="stat-value" style={{color: activeMeetings.length > 0 ? 'var(--green)' : undefined}}>{activeMeetings.length}</div>
              <div className="stat-delta">{activeMeetings.length > 0 ? '● Идут сейчас' : 'Нет активных'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming / recent meetings */}
      <div className="section-header">
        <span className="section-title">Ближайшие встречи</span>
        <button className="section-link" onClick={() => onNavigate('meetings')}>Все встречи →</button>
      </div>

      {history.length === 0 ? (
        <div className="meetings-grid">
          <div className="meeting-card" onClick={handleNewMeeting} style={{gridColumn:'span 3', textAlign:'center', padding: '32px'}}>
            <div style={{fontSize:13, color:'var(--text-tertiary)'}}>Нет встреч. Нажмите чтобы создать первую</div>
          </div>
        </div>
      ) : (
        <div className="meetings-grid">
          {history.slice(0, 3).map(m => (
            <div
              key={m.id}
              className={`meeting-card${m.status === 'active' ? ' live' : ''}`}
              onClick={() => setShowDetail(m)}
            >
              <div className="meeting-time">{formatDate(m.created_at)}</div>
              <div className="meeting-title">{m.title || `Встреча ${m.invite_code}`}</div>
              <div className="meeting-meta">
                <div className="meeting-avatars">
                  {(m.participants || []).slice(0,3).map((p,i) => (
                    <div key={i} className="meeting-av" style={{background: getColor(p.name)}}>{initials(p.name)}</div>
                  ))}
                  {(m.participant_count || 0) > 3 && (
                    <div className="meeting-av" style={{background:'#888'}}>+{(m.participant_count||0)-3}</div>
                  )}
                </div>
                {m.status === 'active'
                  ? <span className="badge-live">LIVE</span>
                  : <span className="badge-soon">{m.invite_code}</span>
                }
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom */}
      <div className="two-col">
        <div>
          <div className="section-header"><span className="section-title">Быстрое подключение</span></div>
          <div className="quick-join-card">
            <div style={{fontSize:13, color:'var(--text-secondary)', lineHeight:1.5}}>
              Введите код встречи для мгновенного подключения
            </div>
            <div className="join-input-row">
              <input
                className="join-input"
                type="text"
                placeholder="XXXX-XXXX"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                maxLength={9}
              />
              <button className="btn-primary" onClick={handleJoin} style={{padding:'10px 16px'}}>Войти</button>
            </div>
          </div>
        </div>
        <div>
          <div className="section-header"><span className="section-title">&nbsp;</span></div>
          <div className="schedule-cta" onClick={() => setShowSchedule(true)}>
            <div className="schedule-cta-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.5"><rect x="3" y="4" width="14" height="13" rx="2"/><path d="M7 4V2M13 4V2M3 9h14"/><path d="M7 13h6M10 11v4"/></svg>
            </div>
            <div className="schedule-cta-title">Запланировать встречу</div>
            <div className="schedule-cta-sub">Создать заранее с участниками</div>
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      <ScheduleModal open={showSchedule} onClose={() => setShowSchedule(false)} />

      {/* Detail Modal */}
      {showDetail && (
        <div className={`overlay${showDetail ? ' open' : ''}`} onClick={() => setShowDetail(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{width:380}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
              <div style={{fontSize:16,fontWeight:500}}>{showDetail.title || `Встреча ${showDetail.invite_code}`}</div>
              {showDetail.status === 'active' ? <span className="badge-live">LIVE</span> : <span className="badge-soon">Завершена</span>}
            </div>
            <div style={{fontSize:12,color:'var(--text-tertiary)',fontFamily:'var(--font-mono)',marginBottom:16}}>{formatDate(showDetail.created_at)}</div>
            {(showDetail.participants||[]).map((p,i) => (
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:'var(--radius-sm)',background:'var(--bg-elevated)',marginBottom:6}}>
                <div style={{width:30,height:30,borderRadius:'50%',background:getColor(p.name),display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:600,color:'white'}}>{initials(p.name)}</div>
                <div style={{flex:1,fontSize:13}}>{p.name}</div>
                <div style={{fontSize:11,color:'var(--text-tertiary)'}}>{p.role}</div>
              </div>
            ))}
            <button className="btn-primary" style={{width:'100%',justifyContent:'center',marginTop:16}}
              onClick={() => { setShowDetail(null); window.location.href = `/lobby/${showDetail.id}` }}>
              Присоединиться
            </button>
            <button className="btn-secondary" style={{width:'100%',justifyContent:'center',marginTop:8}}
              onClick={() => setShowDetail(null)}>
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ══ MEETINGS PAGE ══════════════════════════════════════════ */
function MeetingsPage({ user }: any) {
  const [showSchedule, setShowSchedule] = useState(false)
  const [history, setHistory] = useState<Meeting[]>([])
  const [creating, setCreating] = useState(false)
  const [joinCode, setJoinCode] = useState('')

  useEffect(() => {
    api.get('/meetings/history').then(r => setHistory(r.data)).catch(() => {})
  }, [])

  const handleNew = async () => {
    setCreating(true)
    try {
      const { data } = await api.post('/meetings/create', { title: 'Новая встреча' })
      sessionStorage.setItem(`host_token_${data.meeting_id}`, data.host_token)
      window.location.href = `/room/${data.meeting_id}`
    } catch { toast('Ошибка', 'error') }
    setCreating(false)
  }

  const handleJoin = async () => {
    if (!joinCode.trim()) return
    try {
      const { data } = await api.get(`/meetings/join/${joinCode.replace(/-/g,'').trim()}`)
      window.location.href = `/lobby/${data.meeting_id}`
    } catch { toast('Встреча не найдена', 'error') }
  }

  return (
    <div className="dash-content">
      <div className="page-header">
        <div>
          <div className="page-greeting">Встречи</div>
          <div className="page-date">Управление встречами</div>
        </div>
        <div className="page-actions">
          <button className="btn-secondary" onClick={() => setShowSchedule(true)}><CalIcon /> Запланировать</button>
          <button className="btn-primary" onClick={handleNew} disabled={creating}><VideoIcon /> {creating ? '...' : 'Новая встреча'}</button>
        </div>
      </div>

      <div className="two-col" style={{marginBottom:28}}>
        <div className="quick-join-card">
          <div style={{fontSize:14,fontWeight:500,marginBottom:4}}>Быстрое подключение</div>
          <div style={{fontSize:13,color:'var(--text-secondary)',marginBottom:12}}>Введите код или ссылку встречи</div>
          <div className="join-input-row">
            <input className="join-input" placeholder="XXXX-XXXX" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} maxLength={9} onKeyDown={e => e.key==='Enter'&&handleJoin()} />
            <button className="btn-primary" onClick={handleJoin} style={{padding:'10px 16px'}}>Войти</button>
          </div>
        </div>
        <div className="schedule-cta" onClick={() => setShowSchedule(true)}>
          <div className="schedule-cta-icon"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.5"><rect x="3" y="4" width="14" height="13" rx="2"/><path d="M7 4V2M13 4V2M3 9h14M7 13h6M10 11v4"/></svg></div>
          <div className="schedule-cta-title">Запланировать встречу</div>
          <div className="schedule-cta-sub">Создать заранее с участниками</div>
        </div>
      </div>

      <div className="section-header"><span className="section-title">Запланированные встречи</span></div>
      {history.filter(m => m.status === 'active').length === 0 ? (
        <div className="empty-state">
          <CalIcon />
          <div className="empty-title">Нет активных встреч</div>
          <div className="empty-sub">Создайте новую встречу или запланируйте заранее</div>
        </div>
      ) : (
        <div className="meetings-grid">
          {history.filter(m => m.status === 'active').map(m => (
            <div key={m.id} className="meeting-card live" onClick={() => window.location.href=`/lobby/${m.id}`}>
              <div className="meeting-time">{formatDate(m.created_at)}</div>
              <div className="meeting-title">{m.title || `Встреча ${m.invite_code}`}</div>
              <div className="meeting-meta">
                <div style={{fontSize:12,color:'var(--text-tertiary)',fontFamily:'var(--font-mono)'}}>{m.invite_code}</div>
                <span className="badge-live">LIVE</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <ScheduleModal open={showSchedule} onClose={() => setShowSchedule(false)} />
    </div>
  )
}

/* ══ HISTORY PAGE ══════════════════════════════════════════ */
function HistoryPage() {
  const [history, setHistory] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/meetings/history').then(r => { setHistory(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  return (
    <div className="dash-content">
      <div className="page-header">
        <div>
          <div className="page-greeting">История встреч</div>
          <div className="page-date">Все прошедшие встречи за 30 дней</div>
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><div className="empty-sub">Загружаем...</div></div>
      ) : history.length === 0 ? (
        <div className="empty-state">
          <ClockIcon />
          <div className="empty-title">История пуста</div>
          <div className="empty-sub">Прошедшие встречи будут отображаться здесь</div>
        </div>
      ) : (
        <div className="history-list">
          {history.map(m => (
            <div key={m.id} className="history-item">
              <div className={`history-dot ${m.status === 'active' ? 'active' : 'ended'}`} />
              <div style={{flex:1}}>
                <div className="history-title">{m.title || `Встреча ${m.invite_code}`}</div>
                <div style={{fontSize:12,color:'var(--text-tertiary)',marginTop:2}}>
                  {formatDate(m.created_at)}
                  {m.ended_at && ` → ${formatDateShort(m.ended_at)}`}
                </div>
                {(m.participants||[]).length > 0 && (
                  <div style={{fontSize:12,color:'var(--text-tertiary)',marginTop:4}}>
                    Участники: {(m.participants||[]).map(p=>p.name).join(', ')}
                  </div>
                )}
              </div>
              <div className="history-meta" style={{fontFamily:'var(--font-mono)'}}>{m.invite_code}</div>
              <div className="history-participants">
                {(m.participants||[]).slice(0,4).map((p,i) => (
                  <div key={i} className="history-av" style={{background:getColor(p.name)}}>{initials(p.name)}</div>
                ))}
              </div>
              {m.status === 'active'
                ? <span className="badge-live">LIVE</span>
                : <span style={{fontSize:11,color:'var(--text-tertiary)',padding:'3px 8px',background:'var(--bg-elevated)',borderRadius:'var(--radius-full)'}}>Завершена</span>
              }
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ══ CONTACTS PAGE ══════════════════════════════════════════ */
function ContactsPage({ onStartChat }: { onStartChat: (id: string, name: string) => void }) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const load = () => api.get('/api/contacts/').then(r => setContacts(r.data)).catch(() => {})
  useEffect(() => { load() }, [])

  const addContact = async () => {
    if (!email.trim()) return
    setAdding(true); setError('')
    try {
      await api.post('/api/contacts/', { email: email.trim(), nickname: nickname.trim() || undefined })
      setEmail(''); setNickname('')
      load()
      toast('Контакт добавлен', 'success')
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Ошибка'
      const map: any = { USER_NOT_FOUND:'Пользователь не найден', ALREADY_IN_CONTACTS:'Уже в контактах', CANNOT_ADD_SELF:'Нельзя добавить себя' }
      setError(map[msg] || msg)
    }
    setAdding(false)
  }

  const removeContact = async (id: string) => {
    await api.delete(`/api/contacts/${id}`).catch(() => {})
    setContacts(prev => prev.filter(c => c.id !== id))
    toast('Контакт удалён')
  }

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="dash-content">
      <div className="page-header">
        <div>
          <div className="page-greeting">Контакты</div>
          <div className="page-date">{contacts.length} контактов</div>
        </div>
      </div>

      <div className="add-contact-form">
        <div style={{fontSize:14,fontWeight:500,marginBottom:12}}>Добавить контакт</div>
        <div className="add-contact-row">
          <input className="add-contact-input" placeholder="Email адрес" value={email} onChange={e => setEmail(e.target.value)} type="email" />
          <input className="add-contact-input" placeholder="Никнейм (необязательно)" value={nickname} onChange={e => setNickname(e.target.value)} />
          <button className="btn-primary" onClick={addContact} disabled={adding}>{adding ? '...' : 'Добавить'}</button>
        </div>
        {error && <div style={{fontSize:12,color:'var(--red)',marginTop:8}}>{error}</div>}
      </div>

      <div className="contacts-search">
        <input className="search-input" placeholder="Поиск по имени или email..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <PeopleIcon />
          <div className="empty-title">{search ? 'Не найдено' : 'Нет контактов'}</div>
          <div className="empty-sub">Добавьте первый контакт по email</div>
        </div>
      ) : (
        <div className="contacts-grid">
          {filtered.map(c => (
            <div key={c.id} className="contact-item">
              <div className="contact-av" style={{background: getColor(c.name)}}>{initials(c.name)}</div>
              <div>
                <div className="contact-name">{c.name}</div>
                <div className="contact-email">{c.email}</div>
              </div>
              <div className="contact-actions">
                <button className="contact-btn primary" onClick={() => onStartChat(c.user_id, c.name)}>Сообщение</button>
                <button className="contact-btn" onClick={() => window.location.href=`/lobby/new?invite=${c.user_id}`}>Позвонить</button>
                <button className="contact-btn danger" onClick={() => removeContact(c.id)}>Удалить</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ══ SETTINGS PAGE ══════════════════════════════════════════ */
function SettingsPage() {
  const [theme, setTheme] = useState('light')
  const [lang, setLang] = useState('ru')
  const [notifs, setNotifs] = useState(true)

  return (
    <div className="dash-content">
      <div className="page-header">
        <div>
          <div className="page-greeting">Настройки</div>
          <div className="page-date">Настройки аккаунта и приложения</div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Внешний вид</div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Тема</div>
            <div className="settings-sub">Светлая или тёмная тема интерфейса</div>
          </div>
          <select className="select-input" value={theme} onChange={e => setTheme(e.target.value)}>
            <option value="light">Светлая</option>
            <option value="dark">Тёмная</option>
            <option value="system">Системная</option>
          </select>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Язык</div>
            <div className="settings-sub">Язык интерфейса</div>
          </div>
          <select className="select-input" value={lang} onChange={e => setLang(e.target.value)}>
            <option value="ru">Русский</option>
            <option value="en">English</option>
            <option value="kk">Қазақша</option>
          </select>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Уведомления</div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Email уведомления</div>
            <div className="settings-sub">Получать уведомления о встречах по email</div>
          </div>
          <div className={`toggle${notifs ? ' on' : ''}`} onClick={() => setNotifs(n => !n)} />
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Видео и аудио</div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Микрофон по умолчанию</div>
            <div className="settings-sub">Отключать микрофон при входе в встречу</div>
          </div>
          <div className="toggle on" />
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Камера по умолчанию</div>
            <div className="settings-sub">Отключать камеру при входе в встречу</div>
          </div>
          <div className="toggle" />
        </div>
      </div>
    </div>
  )
}

/* ══ PROFILE PAGE ══════════════════════════════════════════ */
function ProfilePage({ user, onLogout }: any) {
  const [name, setName] = useState(user?.name || '')
  const [oldPass, setOldPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [saving, setSaving] = useState(false)

  const saveName = async () => {
    setSaving(true)
    try {
      await api.put('/api/users/me', { name })
      toast('Имя обновлено', 'success')
    } catch { toast('Ошибка сохранения', 'error') }
    setSaving(false)
  }

  const initials2 = user?.name ? initials(user.name) : 'KR'

  return (
    <div className="dash-content">
      <div className="page-header">
        <div>
          <div className="page-greeting">Профиль</div>
          <div className="page-date">Управление аккаунтом</div>
        </div>
      </div>

      <div className="profile-header">
        <div className="profile-av-lg">{initials2}</div>
        <div>
          <div className="profile-name">{user?.name || 'Пользователь'}</div>
          <div className="profile-email">{user?.email}</div>
          <div className="profile-plan">✦ Free план</div>
        </div>
        <button className="btn-secondary" style={{marginLeft:'auto'}} onClick={onLogout}>Выйти</button>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Основная информация</div>
        <div className="field"><label className="field-label">Имя</label><input className="field-input" value={name} onChange={e => setName(e.target.value)} /></div>
        <div className="field"><label className="field-label">Email</label><input className="field-input" value={user?.email || ''} disabled style={{opacity:0.6}} /></div>
        <button className="btn-primary" onClick={saveName} disabled={saving}>{saving ? 'Сохраняем...' : 'Сохранить'}</button>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Смена пароля</div>
        <div className="field"><label className="field-label">Текущий пароль</label><input className="field-input" type="password" value={oldPass} onChange={e => setOldPass(e.target.value)} /></div>
        <div className="field"><label className="field-label">Новый пароль</label><input className="field-input" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} /></div>
        <button className="btn-primary" onClick={() => toast('Функция в разработке')}>Изменить пароль</button>
      </div>

      <div className="settings-section">
        <div className="settings-section-title" style={{color:'var(--red)'}}>Опасная зона</div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Удалить аккаунт</div>
            <div className="settings-sub">Это действие необратимо</div>
          </div>
          <button className="contact-btn danger" onClick={() => toast('Функция в разработке')}>Удалить</button>
        </div>
      </div>
    </div>
  )
}

/* ══ SCHEDULE MODAL ══════════════════════════════════════════ */
function ScheduleModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0,10))
  const [time, setTime] = useState('10:00')
  const [creating, setCreating] = useState(false)

  const create = async () => {
    if (!title.trim()) return
    setCreating(true)
    try {
      const { data } = await api.post('/meetings/create', { title })
      toast(`Встреча "${title}" создана`, 'success')
      onClose()
      setTitle('')
    } catch { toast('Ошибка', 'error') }
    setCreating(false)
  }

  return (
    <div className={`overlay${open ? ' open' : ''}`} onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Новая встреча</div>
        <div className="field"><label className="field-label">Название</label><input className="field-input" placeholder="Например: Квартальный обзор" value={title} onChange={e => setTitle(e.target.value)} autoFocus /></div>
        <div className="field-row">
          <div className="field"><label className="field-label">Дата</label><input className="field-input" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="field"><label className="field-label">Время</label><input className="field-input" type="time" value={time} onChange={e => setTime(e.target.value)} /></div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Отмена</button>
          <button className="btn-confirm" onClick={create} disabled={creating}>{creating ? '...' : 'Создать'}</button>
        </div>
      </div>
    </div>
  )
}

/* ══ TOAST ══════════════════════════════════════════════════ */
function toast(msg: string, type: 'success'|'error'|'' = '') {
  const container = document.getElementById('toast-container')
  if (!container) return
  const el = document.createElement('div')
  el.className = `toast${type ? ' '+type : ''}`
  el.textContent = msg
  container.appendChild(el)
  setTimeout(() => el.remove(), 3000)
}

/* ══ ICONS ══════════════════════════════════════════════════ */
const GridIcon = () => <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg>
const CalIcon = () => <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M5 3V2M11 3V2M2 7h12"/></svg>
const ClockIcon = () => <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5l2.5 1.5"/></svg>
const PeopleIcon = () => <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6" cy="5" r="3"/><path d="M1 14c0-3 2-4 5-4s5 1 5 4"/><path d="M11 3a2 2 0 010 4M15 14c0-2-1-3-3-3.5"/></svg>
const ChatIcon = () => <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 10a1 1 0 01-1 1H5l-3 3V3a1 1 0 011-1h10a1 1 0 011 1v7z"/></svg>
const SettingsIcon = () => <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="2.5"/><path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.5 3.5l1 1M11.5 11.5l1 1M11.5 3.5l-1 1M4.5 11.5l-1 1"/></svg>
const VideoIcon = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 5h9a1 1 0 011 1v5a1 1 0 01-1 1H1a1 1 0 01-1-1V6a1 1 0 011-1z"/><path d="M11 7.5l5-2.5v6l-5-2.5"/></svg>
const ChevronLeftIcon = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2L4 6l4 4"/></svg>
const ChevronRightIcon = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 2l4 4-4 4"/></svg>