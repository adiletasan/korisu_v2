import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../store/auth'
import api from '../lib/api'
import DashChat from '../components/dashboard/DashChat'

type Section = 'overview' | 'meetings' | 'history' | 'contacts' | 'chat' | 'settings' | 'profile'
type Theme = 'light' | 'dark'
type Lang = 'ru' | 'en' | 'kz'

const T: Record<Lang, Record<string,string>> = {
  ru: {
    overview:'Обзор', meetings:'Встречи', history:'История', contacts:'Контакты',
    chat:'Чаты', settings:'Настройки', profile:'Профиль',
    newMeeting:'Новая встреча', schedule:'Запланировать', quickJoin:'Быстрое подключение',
    enterCode:'Введите код встречи', join:'Войти', today:'Встреч сегодня',
    total:'Всего встреч', active:'Активных', upcoming:'Ближайшие встречи',
    allMeetings:'Все встречи →', addContact:'Добавить контакт', searchContact:'Поиск...',
    message:'Сообщение', call:'Позвонить', remove:'Удалить', save:'Сохранить',
    cancel:'Отмена', create:'Создать', logout:'Выйти',
    meetingCreated:'Встреча создана!', copyLink:'Скопировать ссылку',
    enterRoom:'Войти в комнату', inviteCode:'Код приглашения', inviteLink:'Ссылка',
    greetingMorning:'Доброе утро', greetingDay:'Добрый день', greetingEvening:'Добрый вечер',
    appearance:'Внешний вид', theme:'Тема', language:'Язык', notifications:'Уведомления',
    emailNotif:'Email уведомления', lightTheme:'Светлая', darkTheme:'Тёмная',
    noMeetings:'Нет встреч', noContacts:'Нет контактов', noHistory:'История пуста',
    loading:'Загружаем...', error:'Ошибка', contactAdded:'Контакт добавлен',
    contactRemoved:'Контакт удалён', name:'Имя', email:'Email', nickname:'Никнейм (необязательно)',
    changePassword:'Смена пароля', currentPass:'Текущий пароль', newPass:'Новый пароль',
    dangerZone:'Опасная зона', deleteAccount:'Удалить аккаунт', freePlan:'Free план',
    participants:'участников', ended:'Завершена', live:'Активна',
    scheduleMeeting:'Запланировать встречу', meetingName:'Название встречи',
    date:'Дата', time:'Время', copied:'Скопировано!',
  },
  en: {
    overview:'Overview', meetings:'Meetings', history:'History', contacts:'Contacts',
    chat:'Chats', settings:'Settings', profile:'Profile',
    newMeeting:'New meeting', schedule:'Schedule', quickJoin:'Quick join',
    enterCode:'Enter meeting code', join:'Join', today:'Meetings today',
    total:'Total meetings', active:'Active', upcoming:'Upcoming meetings',
    allMeetings:'All meetings →', addContact:'Add contact', searchContact:'Search...',
    message:'Message', call:'Call', remove:'Remove', save:'Save',
    cancel:'Cancel', create:'Create', logout:'Sign out',
    meetingCreated:'Meeting created!', copyLink:'Copy link',
    enterRoom:'Enter room', inviteCode:'Invite code', inviteLink:'Link',
    greetingMorning:'Good morning', greetingDay:'Good afternoon', greetingEvening:'Good evening',
    appearance:'Appearance', theme:'Theme', language:'Language', notifications:'Notifications',
    emailNotif:'Email notifications', lightTheme:'Light', darkTheme:'Dark',
    noMeetings:'No meetings', noContacts:'No contacts', noHistory:'History is empty',
    loading:'Loading...', error:'Error', contactAdded:'Contact added',
    contactRemoved:'Contact removed', name:'Name', email:'Email', nickname:'Nickname (optional)',
    changePassword:'Change password', currentPass:'Current password', newPass:'New password',
    dangerZone:'Danger zone', deleteAccount:'Delete account', freePlan:'Free plan',
    participants:'participants', ended:'Ended', live:'Live',
    scheduleMeeting:'Schedule meeting', meetingName:'Meeting name',
    date:'Date', time:'Time', copied:'Copied!',
  },
  kz: {
    overview:'Шолу', meetings:'Кездесулер', history:'Тарих', contacts:'Контактілер',
    chat:'Чаттар', settings:'Параметрлер', profile:'Профиль',
    newMeeting:'Жаңа кездесу', schedule:'Жоспарлау', quickJoin:'Жылдам қосылу',
    enterCode:'Кездесу кодын енгізіңіз', join:'Кіру', today:'Бүгінгі кездесулер',
    total:'Барлық кездесулер', active:'Белсенді', upcoming:'Жақындағы кездесулер',
    allMeetings:'Барлық кездесулер →', addContact:'Контакт қосу', searchContact:'Іздеу...',
    message:'Хабарлама', call:'Қоңырау', remove:'Жою', save:'Сақтау',
    cancel:'Бас тарту', create:'Жасау', logout:'Шығу',
    meetingCreated:'Кездесу жасалды!', copyLink:'Сілтемені көшіру',
    enterRoom:'Бөлмеге кіру', inviteCode:'Шақыру коды', inviteLink:'Сілтеме',
    greetingMorning:'Қайырлы таң', greetingDay:'Қайырлы күн', greetingEvening:'Қайырлы кеш',
    appearance:'Сыртқы түр', theme:'Тақырып', language:'Тіл', notifications:'Хабарландырулар',
    emailNotif:'Email хабарландырулар', lightTheme:'Жарық', darkTheme:'Қараңғы',
    noMeetings:'Кездесулер жоқ', noContacts:'Контактілер жоқ', noHistory:'Тарих бос',
    loading:'Жүктелуде...', error:'Қате', contactAdded:'Контакт қосылды',
    contactRemoved:'Контакт жойылды', name:'Аты', email:'Email', nickname:'Лақап ат (міндетті емес)',
    changePassword:'Құпия сөзді өзгерту', currentPass:'Ағымдағы құпия сөз', newPass:'Жаңа құпия сөз',
    dangerZone:'Қауіпті аймақ', deleteAccount:'Аккаунтты жою', freePlan:'Тегін жоспар',
    participants:'қатысушы', ended:'Аяқталды', live:'Белсенді',
    scheduleMeeting:'Кездесуді жоспарлау', meetingName:'Кездесу атауы',
    date:'Күні', time:'Уақыты', copied:'Көшірілді!',
  }
}

interface Meeting {
  id: string; title: string; invite_code: string; status: string
  created_at: string; ended_at: string | null; participant_count: number
  participants?: { email: string; name: string; role: string }[]
}
interface Contact {
  id: string; user_id: string; email: string; name: string; avatar_url: string | null
}
interface CreatedMeeting {
  meeting_id: string; invite_code: string; invite_link: string; host_token: string
}

const COLORS = ['#4361ee','#7c3aed','#0ea5e9','#22c55e','#f59e0b','#ec4899','#10b981','#ef4444']
const getColor = (s: string) => COLORS[s.charCodeAt(0) % COLORS.length]
const initials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
const formatDate = (iso: string) => new Date(iso).toLocaleString('ru-RU', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })

function toast(msg: string, type: 'success'|'error'|'' = '') {
  const c = document.getElementById('toast-root')
  if (!c) return
  const el = document.createElement('div')
  el.style.cssText = `background:${type==='success'?'#166534':type==='error'?'#991b1b':'#1a1a2e'};color:white;padding:12px 18px;border-radius:12px;font-size:13.5px;box-shadow:0 8px 24px rgba(0,0,0,0.2);animation:toastIn .2s ease;pointer-events:all`
  el.textContent = msg
  c.appendChild(el)
  setTimeout(() => el.remove(), 3000)
}

export default function Dashboard() {
  const [section, setSection] = useState<Section>('overview')
  const [collapsed, setCollapsed] = useState(false)
  const [theme, setTheme] = useState<Theme>('light')
  const [lang, setLang] = useState<Lang>('ru')
  const [chatUserId, setChatUserId] = useState<string|null>(null)
  const [chatUserName, setChatUserName] = useState<string|null>(null)
  const user = useAuthStore(s => s.user)
  const fetchMe = useAuthStore(s => s.fetchMe)
  const logout = useAuthStore(s => s.logout)
  const t = T[lang]

  useEffect(() => { fetchMe() }, [])
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    if (theme === 'dark') {
      document.documentElement.style.setProperty('--bg-page', '#0d0f14')
      document.documentElement.style.setProperty('--bg-surface', '#151821')
      document.documentElement.style.setProperty('--bg-elevated', '#1c2030')
      document.documentElement.style.setProperty('--text-primary', '#f1f2f6')
      document.documentElement.style.setProperty('--text-secondary', '#9ca3af')
      document.documentElement.style.setProperty('--text-tertiary', '#6b7280')
      document.documentElement.style.setProperty('--border', 'rgba(255,255,255,0.07)')
    } else {
      document.documentElement.style.setProperty('--bg-page', '#f5f4f1')
      document.documentElement.style.setProperty('--bg-surface', '#ffffff')
      document.documentElement.style.setProperty('--bg-elevated', '#fafaf8')
      document.documentElement.style.setProperty('--text-primary', '#111318')
      document.documentElement.style.setProperty('--text-secondary', '#6b7280')
      document.documentElement.style.setProperty('--text-tertiary', '#9ca3af')
      document.documentElement.style.setProperty('--border', 'rgba(0,0,0,0.07)')
    }
  }, [theme])

  const handleStartChat = (userId: string, userName: string) => {
    setChatUserId(userId); setChatUserName(userName); setSection('chat')
  }

  const initials2 = user?.name ? initials(user.name) : 'KR'
  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return t.greetingMorning
    if (h < 18) return t.greetingDay
    return t.greetingEvening
  }

  const navItems = [
    { id: 'overview', label: t.overview, icon: <GridIcon /> },
    { id: 'meetings', label: t.meetings, icon: <CalIcon /> },
    { id: 'history', label: t.history, icon: <ClockIcon /> },
    { id: 'contacts', label: t.contacts, icon: <PeopleIcon /> },
    { id: 'chat', label: t.chat, icon: <ChatIcon /> },
  ]

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'var(--bg-page)',color:'var(--text-primary)',fontFamily:'var(--font)',transition:'background .3s,color .3s'}}>
      {/* SIDEBAR */}
      <aside style={{
        width: collapsed ? 64 : 240, background:'var(--bg-surface)',
        borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column',
        position:'fixed', top:0, left:0, bottom:0, zIndex:50,
        transition:'width .2s cubic-bezier(.4,0,.2,1)', overflow:'hidden',
      }}>
        {/* Logo */}
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'20px 18px 16px',borderBottom:'1px solid var(--border)',flexShrink:0}}>
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill="#4361ee" opacity=".15"/><path d="M16 6l10 5.5v9L16 26 6 20.5v-9L16 6z" fill="#4361ee"/></svg>
          {!collapsed && <span style={{fontSize:15,fontWeight:600,letterSpacing:'-0.3px',color:'var(--accent)',whiteSpace:'nowrap'}}>K<span style={{color:'var(--text-primary)'}}>orisu</span></span>}
          <button onClick={() => setCollapsed(c=>!c)} style={{marginLeft:'auto',width:26,height:26,borderRadius:6,border:'1px solid var(--border)',background:'transparent',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'var(--text-tertiary)',flexShrink:0}} title={collapsed?'Развернуть':'Свернуть'}>
            {collapsed ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 2l4 4-4 4"/></svg> : <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2L4 6l4 4"/></svg>}
          </button>
        </div>

        {/* Nav */}
        <nav style={{flex:1,padding:'12px 10px',overflowY:'auto'}}>
          {!collapsed && <div style={{fontSize:'10.5px',fontWeight:500,letterSpacing:'0.7px',textTransform:'uppercase',color:'var(--text-tertiary)',padding:'0 8px',margin:'0 0 5px'}}>{lang==='ru'?'Главное':lang==='en'?'Main':'Негізгі'}</div>}
          {navItems.map(item => (
            <button key={item.id} onClick={() => setSection(item.id as Section)} title={item.label}
              style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:8,color:section===item.id?'var(--accent)':'var(--text-secondary)',background:section===item.id?'var(--accent-dim)':'transparent',fontWeight:section===item.id?500:400,border:'none',width:'100%',textAlign:'left',cursor:'pointer',fontSize:13.5,whiteSpace:'nowrap',overflow:'hidden',transition:'all .18s',marginBottom:2}}>
              {item.icon}
              {!collapsed && <span style={{overflow:'hidden'}}>{item.label}</span>}
            </button>
          ))}
          {!collapsed && <div style={{fontSize:'10.5px',fontWeight:500,letterSpacing:'0.7px',textTransform:'uppercase',color:'var(--text-tertiary)',padding:'0 8px',margin:'16px 0 5px'}}>{lang==='ru'?'Прочее':lang==='en'?'Other':'Басқа'}</div>}
          <button onClick={() => setSection('settings')} title={t.settings}
            style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:8,color:section==='settings'?'var(--accent)':'var(--text-secondary)',background:section==='settings'?'var(--accent-dim)':'transparent',fontWeight:section==='settings'?500:400,border:'none',width:'100%',textAlign:'left',cursor:'pointer',fontSize:13.5,whiteSpace:'nowrap',overflow:'hidden',transition:'all .18s',marginBottom:2}}>
            <SettingsIcon />{!collapsed && <span>{t.settings}</span>}
          </button>
        </nav>

        {/* User */}
        <div style={{padding:10,borderTop:'1px solid var(--border)',flexShrink:0}}>
          <div onClick={() => setSection('profile')} style={{display:'flex',alignItems:'center',gap:10,padding:10,borderRadius:12,background:'var(--bg-elevated)',cursor:'pointer',overflow:'hidden',transition:'background .18s'}}>
            <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#4361ee,#7c3aed)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:600,color:'white',flexShrink:0}}>{initials2}</div>
            {!collapsed && <div style={{overflow:'hidden'}}>
              <div style={{fontSize:13,fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{user?.name||'User'}</div>
              <div style={{fontSize:11,color:'var(--text-tertiary)'}}>{t.freePlan}</div>
            </div>}
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{marginLeft: collapsed?64:240, flex:1, minHeight:'100vh', transition:'margin-left .2s cubic-bezier(.4,0,.2,1)'}}>
        {section==='overview' && <OverviewPage t={t} greeting={greeting()} user={user} onStartChat={handleStartChat} onNavigate={setSection} lang={lang} />}
        {section==='meetings' && <MeetingsPage t={t} />}
        {section==='history' && <HistoryPage t={t} />}
        {section==='contacts' && <ContactsPage t={t} onStartChat={handleStartChat} />}
        {section==='chat' && <div style={{height:'100vh'}}><DashChat initialUserId={chatUserId} initialUserName={chatUserName} /></div>}
        {section==='settings' && <SettingsPage t={t} theme={theme} setTheme={setTheme} lang={lang} setLang={setLang} />}
        {section==='profile' && <ProfilePage t={t} user={user} onLogout={logout} />}
      </main>

      <div id="toast-root" style={{position:'fixed',bottom:24,right:24,zIndex:500,display:'flex',flexDirection:'column',gap:8,pointerEvents:'none'}} />
      <style>{`@keyframes toastIn{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  )
}

/* ══ OVERVIEW ══════════════════════════════════ */
function OverviewPage({ t, greeting, user, onStartChat, onNavigate, lang }: any) {
  const [history, setHistory] = useState<Meeting[]>([])
  const [showSchedule, setShowSchedule] = useState(false)
  const [showDetail, setShowDetail] = useState<Meeting|null>(null)
  const [showCreated, setShowCreated] = useState<CreatedMeeting|null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => { api.get('/meetings/history').then(r => setHistory(r.data)).catch(() => {}) }, [])

  const todayCount = history.filter(m => new Date(m.created_at).toDateString()===new Date().toDateString()).length
  const activeCount = history.filter(m => m.status==='active').length

  const handleNew = async () => {
    setCreating(true)
    try {
      const { data } = await api.post('/meetings/create', { title: lang==='ru'?'Быстрая встреча':lang==='en'?'Quick meeting':'Жылдам кездесу' })
      sessionStorage.setItem(`host_token_${data.meeting_id}`, data.host_token)
      setShowCreated(data)
    } catch { toast(t.error, 'error') }
    setCreating(false)
  }

  const handleJoin = async () => {
    if (!joinCode.trim()) return
    try {
      const { data } = await api.get(`/meetings/join/${joinCode.replace(/-/g,'').trim()}`)
      window.location.href = `/lobby/${data.meeting_id}`
    } catch { toast(lang==='ru'?'Встреча не найдена':lang==='en'?'Meeting not found':'Кездесу табылмады', 'error') }
  }

  return (
    <div style={{padding:32, maxWidth:1100}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:28}}>
        <div>
          <div style={{fontSize:22,fontWeight:500,letterSpacing:'-0.4px'}}>{greeting}, {user?.name?.split(' ')[0]||'...'} 👋</div>
          <div style={{fontSize:13,color:'var(--text-tertiary)',marginTop:3}}>{new Date().toLocaleDateString(lang==='ru'?'ru-RU':lang==='kz'?'kk-KZ':'en-US',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={() => setShowSchedule(true)} style={{display:'inline-flex',alignItems:'center',gap:7,padding:'9px 18px',borderRadius:12,background:'transparent',color:'var(--text-primary)',border:'1px solid var(--border)',fontSize:13.5,cursor:'pointer'}}>
            <CalIcon /> {t.schedule}
          </button>
          <button onClick={handleNew} disabled={creating} style={{display:'inline-flex',alignItems:'center',gap:7,padding:'9px 18px',borderRadius:12,background:'var(--accent)',color:'white',border:'none',fontSize:13.5,fontWeight:500,cursor:'pointer'}}>
            <VideoIcon /> {creating?'...':t.newMeeting}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:28}}>
        {[
          {label:t.today, value:todayCount, delta:'↑'},
          {label:t.total, value:history.length, delta:'↑'},
          {label:t.active, value:activeCount, delta:activeCount>0?'●':'—', color:activeCount>0?'var(--green)':undefined},
        ].map((s,i) => (
          <div key={i} style={{background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:16,padding:'18px 20px',transition:'all .18s',cursor:'default'}}>
            <div style={{fontSize:12,color:'var(--text-tertiary)',marginBottom:10}}>{s.label}</div>
            <div style={{fontSize:30,fontWeight:500,letterSpacing:'-1.5px',color:s.color||'var(--text-primary)'}}>{s.value}</div>
            <div style={{fontSize:12,color:s.color||'var(--green)',marginTop:6}}>{s.delta}</div>
          </div>
        ))}
      </div>

      {/* Upcoming */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
        <span style={{fontSize:15,fontWeight:500}}>{t.upcoming}</span>
        <button onClick={() => onNavigate('meetings')} style={{fontSize:12,color:'var(--accent)',background:'none',border:'none',cursor:'pointer'}}>{t.allMeetings}</button>
      </div>

      {history.length===0 ? (
        <div onClick={handleNew} style={{background:'var(--bg-surface)',border:'1px dashed var(--border)',borderRadius:16,padding:32,textAlign:'center',cursor:'pointer',marginBottom:28,color:'var(--text-tertiary)',fontSize:13}}>
          {t.noMeetings} — {lang==='ru'?'нажмите чтобы создать':lang==='en'?'click to create':'жасау үшін басыңыз'}
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:28}}>
          {history.slice(0,3).map(m => (
            <div key={m.id} onClick={() => setShowDetail(m)} style={{background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:16,padding:18,cursor:'pointer',transition:'all .18s',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:m.status==='active'?'var(--green)':'var(--accent)',opacity:m.status==='active'?1:0.3}} />
              <div style={{fontSize:11,color:'var(--text-tertiary)',marginBottom:6,fontFamily:'var(--font-mono)'}}>{formatDate(m.created_at)}</div>
              <div style={{fontSize:14,fontWeight:500,marginBottom:12,lineHeight:1.35}}>{m.title||`${lang==='ru'?'Встреча':lang==='en'?'Meeting':'Кездесу'} ${m.invite_code}`}</div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex'}}>
                  {(m.participants||[]).slice(0,3).map((p,i) => (
                    <div key={i} style={{width:24,height:24,borderRadius:'50%',background:getColor(p.name),marginRight:-6,border:'2px solid var(--bg-surface)',fontSize:9,fontWeight:600,color:'white',display:'flex',alignItems:'center',justifyContent:'center'}}>{initials(p.name)}</div>
                  ))}
                </div>
                {m.status==='active'
                  ? <span style={{fontSize:10,fontWeight:600,padding:'3px 8px',background:'var(--green-dim)',color:'var(--green)',borderRadius:99,display:'flex',alignItems:'center',gap:4}}>● LIVE</span>
                  : <span style={{fontSize:10,fontWeight:500,padding:'3px 8px',background:'var(--amber-dim)',color:'var(--amber)',borderRadius:99}}>{m.invite_code}</span>
                }
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <div>
          <div style={{fontSize:15,fontWeight:500,marginBottom:14}}>{t.quickJoin}</div>
          <div style={{background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:16,padding:20}}>
            <div style={{fontSize:13,color:'var(--text-secondary)',lineHeight:1.5,marginBottom:12}}>{t.enterCode}</div>
            <div style={{display:'flex',gap:8}}>
              <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} onKeyDown={e=>e.key==='Enter'&&handleJoin()} placeholder="XXXX-XXXX" maxLength={9}
                style={{flex:1,padding:'10px 14px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg-elevated)',fontFamily:'var(--font-mono)',fontSize:14,color:'var(--text-primary)',outline:'none',letterSpacing:2}} />
              <button onClick={handleJoin} style={{padding:'10px 16px',borderRadius:12,background:'var(--accent)',color:'white',border:'none',fontSize:13.5,fontWeight:500,cursor:'pointer'}}>{t.join}</button>
            </div>
          </div>
        </div>
        <div>
          <div style={{fontSize:15,fontWeight:500,marginBottom:14}}>&nbsp;</div>
          <div onClick={() => setShowSchedule(true)} style={{background:'var(--accent-dim)',borderRadius:16,padding:24,textAlign:'center',cursor:'pointer',border:'1px solid rgba(67,97,238,.18)',transition:'all .18s',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:110}}>
            <div style={{width:44,height:44,borderRadius:'50%',background:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px'}}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.5"><rect x="3" y="4" width="14" height="13" rx="2"/><path d="M7 4V2M13 4V2M3 9h14M7 13h6M10 11v4"/></svg>
            </div>
            <div style={{fontSize:14,fontWeight:500,color:'var(--accent)'}}>{t.scheduleMeeting}</div>
            <div style={{fontSize:12,color:'var(--text-secondary)',marginTop:4}}>{lang==='ru'?'Создать заранее с участниками':lang==='en'?'Create in advance with participants':'Қатысушылармен алдын ала жасаңыз'}</div>
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      <ScheduleModal open={showSchedule} onClose={() => setShowSchedule(false)} t={t} />

      {/* Detail Modal */}
      {showDetail && (
        <Modal onClose={() => setShowDetail(null)}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
            <div style={{fontSize:16,fontWeight:500}}>{showDetail.title||`${t.meetings} ${showDetail.invite_code}`}</div>
            {showDetail.status==='active'?<span style={{fontSize:10,fontWeight:600,padding:'3px 8px',background:'var(--green-dim)',color:'var(--green)',borderRadius:99,display:'flex',alignItems:'center',gap:4}}>● LIVE</span>:<span style={{fontSize:10,padding:'3px 8px',background:'var(--bg-elevated)',color:'var(--text-tertiary)',borderRadius:99}}>{t.ended}</span>}
          </div>
          <div style={{fontSize:12,color:'var(--text-tertiary)',fontFamily:'var(--font-mono)',marginBottom:16}}>{formatDate(showDetail.created_at)}</div>
          {(showDetail.participants||[]).map((p,i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:8,background:'var(--bg-elevated)',marginBottom:6}}>
              <div style={{width:30,height:30,borderRadius:'50%',background:getColor(p.name),display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:600,color:'white'}}>{initials(p.name)}</div>
              <div style={{flex:1,fontSize:13}}>{p.name}</div>
              <div style={{fontSize:11,color:'var(--text-tertiary)'}}>{p.role}</div>
            </div>
          ))}
          <button onClick={() => { setShowDetail(null); window.location.href=`/lobby/${showDetail.id}` }} style={{width:'100%',padding:13,borderRadius:12,border:'none',background:'var(--accent)',color:'white',fontSize:14,fontWeight:500,cursor:'pointer',marginTop:16}}>
            {lang==='ru'?'Присоединиться':lang==='en'?'Join':'Қосылу'}
          </button>
          <button onClick={() => setShowDetail(null)} style={{width:'100%',padding:10,borderRadius:12,border:'1px solid var(--border)',background:'transparent',color:'var(--text-secondary)',fontSize:13,cursor:'pointer',marginTop:8}}>{t.cancel}</button>
        </Modal>
      )}

      {/* Created Meeting Modal */}
      {showCreated && (
        <Modal onClose={() => setShowCreated(null)}>
          <div style={{textAlign:'center',marginBottom:20}}>
            <div style={{width:56,height:56,borderRadius:'50%',background:'var(--green-dim)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <div style={{fontSize:18,fontWeight:500}}>{t.meetingCreated}</div>
          </div>
          <div style={{background:'var(--bg-elevated)',borderRadius:12,padding:16,marginBottom:12}}>
            <div style={{fontSize:11,color:'var(--text-tertiary)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:6}}>{t.inviteCode}</div>
            <div style={{fontSize:22,fontWeight:600,fontFamily:'var(--font-mono)',letterSpacing:4,color:'var(--accent)'}}>{showCreated.invite_code}</div>
          </div>
          <div style={{background:'var(--bg-elevated)',borderRadius:12,padding:12,marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
            <div style={{flex:1,fontSize:12,color:'var(--text-secondary)',fontFamily:'var(--font-mono)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{`${window.location.origin}/lobby/${showCreated.meeting_id}`}</div>
            <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/lobby/${showCreated.meeting_id}`); toast(t.copied,'success') }} style={{padding:'6px 12px',borderRadius:8,border:'1px solid var(--border)',background:'transparent',fontSize:12,cursor:'pointer',color:'var(--text-secondary)',flexShrink:0}}>{t.copyLink}</button>
          </div>
          <button onClick={() => { setShowCreated(null); window.location.href=`/room/${showCreated.meeting_id}` }} style={{width:'100%',padding:13,borderRadius:12,border:'none',background:'var(--accent)',color:'white',fontSize:14,fontWeight:500,cursor:'pointer'}}>
            {t.enterRoom}
          </button>
          <button onClick={() => setShowCreated(null)} style={{width:'100%',padding:10,borderRadius:12,border:'1px solid var(--border)',background:'transparent',color:'var(--text-secondary)',fontSize:13,cursor:'pointer',marginTop:8}}>{t.cancel}</button>
        </Modal>
      )}
    </div>
  )
}

/* ══ MEETINGS PAGE ══════════════════════════════ */
function MeetingsPage({ t }: any) {
  const [history, setHistory] = useState<Meeting[]>([])
  const [showSchedule, setShowSchedule] = useState(false)
  const [showCreated, setShowCreated] = useState<CreatedMeeting|null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => { api.get('/meetings/history').then(r => setHistory(r.data)).catch(() => {}) }, [])

  const handleNew = async () => {
    setCreating(true)
    try {
      const { data } = await api.post('/meetings/create', { title: t.newMeeting })
      sessionStorage.setItem(`host_token_${data.meeting_id}`, data.host_token)
      setShowCreated(data)
    } catch { toast(t.error, 'error') }
    setCreating(false)
  }

  const handleJoin = async () => {
    if (!joinCode.trim()) return
    try {
      const { data } = await api.get(`/meetings/join/${joinCode.replace(/-/g,'').trim()}`)
      window.location.href = `/lobby/${data.meeting_id}`
    } catch { toast(t.error, 'error') }
  }

  return (
    <div style={{padding:32,maxWidth:1100}}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:28}}>
        <div><div style={{fontSize:22,fontWeight:500,letterSpacing:'-0.4px'}}>{t.meetings}</div><div style={{fontSize:13,color:'var(--text-tertiary)',marginTop:3}}>{history.length} {t.total?.toLowerCase()}</div></div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={() => setShowSchedule(true)} style={{display:'inline-flex',alignItems:'center',gap:7,padding:'9px 18px',borderRadius:12,background:'transparent',color:'var(--text-primary)',border:'1px solid var(--border)',fontSize:13.5,cursor:'pointer'}}><CalIcon /> {t.schedule}</button>
          <button onClick={handleNew} disabled={creating} style={{display:'inline-flex',alignItems:'center',gap:7,padding:'9px 18px',borderRadius:12,background:'var(--accent)',color:'white',border:'none',fontSize:13.5,fontWeight:500,cursor:'pointer'}}><VideoIcon /> {creating?'...':t.newMeeting}</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:28}}>
        <div style={{background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:16,padding:20}}>
          <div style={{fontSize:14,fontWeight:500,marginBottom:4}}>{t.quickJoin}</div>
          <div style={{fontSize:13,color:'var(--text-secondary)',marginBottom:12}}>{t.enterCode}</div>
          <div style={{display:'flex',gap:8}}>
            <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} onKeyDown={e=>e.key==='Enter'&&handleJoin()} placeholder="XXXX-XXXX" maxLength={9}
              style={{flex:1,padding:'10px 14px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg-elevated)',fontFamily:'var(--font-mono)',fontSize:14,color:'var(--text-primary)',outline:'none',letterSpacing:2}} />
            <button onClick={handleJoin} style={{padding:'10px 16px',borderRadius:12,background:'var(--accent)',color:'white',border:'none',fontSize:13.5,fontWeight:500,cursor:'pointer'}}>{t.join}</button>
          </div>
        </div>
        <div onClick={() => setShowSchedule(true)} style={{background:'var(--accent-dim)',borderRadius:16,padding:20,cursor:'pointer',border:'1px solid rgba(67,97,238,.18)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8}}>
          <div style={{width:40,height:40,borderRadius:'50%',background:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.5"><rect x="3" y="4" width="14" height="13" rx="2"/><path d="M7 4V2M13 4V2M3 9h14M7 13h6M10 11v4"/></svg></div>
          <div style={{fontSize:14,fontWeight:500,color:'var(--accent)'}}>{t.scheduleMeeting}</div>
        </div>
      </div>

      <div style={{fontSize:15,fontWeight:500,marginBottom:14}}>{t.upcoming}</div>
      {history.length===0 ? (
        <div style={{textAlign:'center',padding:'60px 20px',color:'var(--text-tertiary)',fontSize:13}}>{t.noMeetings}</div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
          {history.map(m => (
            <div key={m.id} onClick={() => window.location.href=`/lobby/${m.id}`} style={{background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:16,padding:18,cursor:'pointer',transition:'all .18s',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:m.status==='active'?'var(--green)':'var(--accent)',opacity:m.status==='active'?1:0.25}} />
              <div style={{fontSize:11,color:'var(--text-tertiary)',marginBottom:6,fontFamily:'var(--font-mono)'}}>{formatDate(m.created_at)}</div>
              <div style={{fontSize:14,fontWeight:500,marginBottom:10}}>{m.title||m.invite_code}</div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{fontSize:12,color:'var(--text-tertiary)',fontFamily:'var(--font-mono)'}}>{m.invite_code}</div>
                {m.status==='active'?<span style={{fontSize:10,fontWeight:600,padding:'3px 8px',background:'var(--green-dim)',color:'var(--green)',borderRadius:99,display:'flex',alignItems:'center',gap:4}}>● LIVE</span>:<span style={{fontSize:10,padding:'3px 8px',background:'var(--bg-elevated)',color:'var(--text-tertiary)',borderRadius:99}}>{t.ended}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <ScheduleModal open={showSchedule} onClose={() => setShowSchedule(false)} t={t} />
      {showCreated && (
        <Modal onClose={() => setShowCreated(null)}>
          <div style={{textAlign:'center',marginBottom:20}}>
            <div style={{width:56,height:56,borderRadius:'50%',background:'var(--green-dim)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg></div>
            <div style={{fontSize:18,fontWeight:500}}>{t.meetingCreated}</div>
          </div>
          <div style={{background:'var(--bg-elevated)',borderRadius:12,padding:16,marginBottom:12}}>
            <div style={{fontSize:11,color:'var(--text-tertiary)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:6}}>{t.inviteCode}</div>
            <div style={{fontSize:22,fontWeight:600,fontFamily:'var(--font-mono)',letterSpacing:4,color:'var(--accent)'}}>{showCreated.invite_code}</div>
          </div>
          <div style={{background:'var(--bg-elevated)',borderRadius:12,padding:12,marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
            <div style={{flex:1,fontSize:12,color:'var(--text-secondary)',fontFamily:'var(--font-mono)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{`${window.location.origin}/lobby/${showCreated.meeting_id}`}</div>
            <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/lobby/${showCreated.meeting_id}`); toast(t.copied,'success') }} style={{padding:'6px 12px',borderRadius:8,border:'1px solid var(--border)',background:'transparent',fontSize:12,cursor:'pointer',color:'var(--text-secondary)',flexShrink:0}}>{t.copyLink}</button>
          </div>
          <button onClick={() => { setShowCreated(null); window.location.href=`/room/${showCreated.meeting_id}` }} style={{width:'100%',padding:13,borderRadius:12,border:'none',background:'var(--accent)',color:'white',fontSize:14,fontWeight:500,cursor:'pointer'}}>{t.enterRoom}</button>
          <button onClick={() => setShowCreated(null)} style={{width:'100%',padding:10,borderRadius:12,border:'1px solid var(--border)',background:'transparent',color:'var(--text-secondary)',fontSize:13,cursor:'pointer',marginTop:8}}>{t.cancel}</button>
        </Modal>
      )}
    </div>
  )
}

/* ══ HISTORY PAGE ══════════════════════════════ */
function HistoryPage({ t }: any) {
  const [history, setHistory] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { api.get('/meetings/history').then(r => { setHistory(r.data); setLoading(false) }).catch(() => setLoading(false)) }, [])

  return (
    <div style={{padding:32,maxWidth:1100}}>
      <div style={{marginBottom:28}}><div style={{fontSize:22,fontWeight:500,letterSpacing:'-0.4px'}}>{t.history}</div><div style={{fontSize:13,color:'var(--text-tertiary)',marginTop:3}}>{history.length} {t.total?.toLowerCase()}</div></div>
      {loading ? <div style={{textAlign:'center',padding:40,color:'var(--text-tertiary)'}}>{t.loading}</div>
      : history.length===0 ? <div style={{textAlign:'center',padding:'60px 20px',color:'var(--text-tertiary)',fontSize:13}}>{t.noHistory}</div>
      : (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {history.map(m => (
            <div key={m.id} style={{background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:12,padding:'14px 18px',display:'flex',alignItems:'center',gap:16}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:m.status==='active'?'var(--green)':'var(--text-tertiary)',flexShrink:0}} />
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:500}}>{m.title||`${t.meetings} ${m.invite_code}`}</div>
                <div style={{fontSize:12,color:'var(--text-tertiary)',marginTop:2}}>{formatDate(m.created_at)}</div>
                {(m.participants||[]).length>0 && <div style={{fontSize:12,color:'var(--text-tertiary)',marginTop:3}}>{(m.participants||[]).map(p=>p.name).join(', ')}</div>}
              </div>
              <div style={{fontSize:12,color:'var(--text-tertiary)',fontFamily:'var(--font-mono)'}}>{m.invite_code}</div>
              <div style={{display:'flex'}}>
                {(m.participants||[]).slice(0,4).map((p,i) => (
                  <div key={i} style={{width:22,height:22,borderRadius:'50%',background:getColor(p.name),marginRight:-5,border:'2px solid var(--bg-surface)',fontSize:8,fontWeight:600,color:'white',display:'flex',alignItems:'center',justifyContent:'center'}}>{initials(p.name)}</div>
                ))}
              </div>
              {m.status==='active'?<span style={{fontSize:10,fontWeight:600,padding:'3px 8px',background:'var(--green-dim)',color:'var(--green)',borderRadius:99,display:'flex',alignItems:'center',gap:4}}>● LIVE</span>:<span style={{fontSize:11,color:'var(--text-tertiary)',padding:'3px 8px',background:'var(--bg-elevated)',borderRadius:99}}>{t.ended}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ══ CONTACTS PAGE ══════════════════════════════ */
function ContactsPage({ t, onStartChat }: any) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const load = () => api.get('/api/contacts').then(r => setContacts(r.data)).catch(() => {})
  useEffect(() => { load() }, [])

  const addContact = async () => {
    if (!email.trim()) return
    setAdding(true); setError('')
    try {
      await api.post('/api/contacts', { email: email.trim(), nickname: nickname.trim() || undefined })
      setEmail(''); setNickname(''); load()
      toast(t.contactAdded, 'success')
    } catch (e: any) {
      const msg = e.response?.data?.detail || t.error
      const map: any = { USER_NOT_FOUND: t.lang==='ru'?'Пользователь не найден':'User not found', ALREADY_IN_CONTACTS:'Already in contacts', CANNOT_ADD_SELF:'Cannot add yourself' }
      setError(map[msg] || msg)
    }
    setAdding(false)
  }

  const remove = async (id: string) => {
    await api.delete(`/api/contacts/${id}`).catch(() => {})
    setContacts(prev => prev.filter(c => c.id !== id))
    toast(t.contactRemoved)
  }

  const filtered = contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{padding:32,maxWidth:900}}>
      <div style={{marginBottom:24}}><div style={{fontSize:22,fontWeight:500,letterSpacing:'-0.4px'}}>{t.contacts}</div><div style={{fontSize:13,color:'var(--text-tertiary)',marginTop:3}}>{contacts.length}</div></div>

      <div style={{background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:16,padding:20,marginBottom:24}}>
        <div style={{fontSize:14,fontWeight:500,marginBottom:12}}>{t.addContact}</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder={t.email} type="email"
            style={{flex:2,minWidth:180,padding:'10px 13px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg-elevated)',fontSize:13.5,color:'var(--text-primary)',outline:'none'}} />
          <input value={nickname} onChange={e=>setNickname(e.target.value)} placeholder={t.nickname}
            style={{flex:1,minWidth:140,padding:'10px 13px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg-elevated)',fontSize:13.5,color:'var(--text-primary)',outline:'none'}} />
          <button onClick={addContact} disabled={adding} style={{padding:'10px 20px',borderRadius:12,background:'var(--accent)',color:'white',border:'none',fontSize:13.5,fontWeight:500,cursor:'pointer'}}>{adding?'...':t.addContact}</button>
        </div>
        {error && <div style={{fontSize:12,color:'var(--red)',marginTop:8}}>{error}</div>}
      </div>

      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.searchContact}
        style={{width:'100%',padding:'10px 14px',borderRadius:12,border:'1px solid var(--border)',background:'var(--bg-surface)',fontSize:13.5,color:'var(--text-primary)',outline:'none',marginBottom:16}} />

      {filtered.length===0 ? (
        <div style={{textAlign:'center',padding:'60px 20px',color:'var(--text-tertiary)',fontSize:13}}>{t.noContacts}</div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {filtered.map(c => (
            <div key={c.id} style={{background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:12,padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:38,height:38,borderRadius:'50%',background:getColor(c.name),display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:600,color:'white',flexShrink:0}}>{initials(c.name)}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:500}}>{c.name}</div>
                <div style={{fontSize:12,color:'var(--text-tertiary)'}}>{c.email}</div>
              </div>
              <div style={{display:'flex',gap:6}}>
                <button onClick={() => onStartChat(c.user_id, c.name)} style={{padding:'6px 12px',borderRadius:8,border:'none',background:'var(--accent-dim)',color:'var(--accent)',fontSize:12,cursor:'pointer'}}>{t.message}</button>
                <button onClick={() => remove(c.id)} style={{padding:'6px 12px',borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--red)',fontSize:12,cursor:'pointer'}}>{t.remove}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ══ SETTINGS PAGE ══════════════════════════════ */
function SettingsPage({ t, theme, setTheme, lang, setLang }: any) {
  const [notifs, setNotifs] = useState(true)

  return (
    <div style={{padding:32,maxWidth:700}}>
      <div style={{marginBottom:28}}><div style={{fontSize:22,fontWeight:500,letterSpacing:'-0.4px'}}>{t.settings}</div></div>

      <SettingsCard title={t.appearance}>
        <SettingsRow label={t.theme} sub="">
          <div style={{display:'flex',gap:6}}>
            {(['light','dark'] as Theme[]).map(th => (
              <button key={th} onClick={() => setTheme(th)} style={{padding:'7px 14px',borderRadius:8,border:`1px solid ${theme===th?'var(--accent)':'var(--border)'}`,background:theme===th?'var(--accent-dim)':'transparent',color:theme===th?'var(--accent)':'var(--text-secondary)',fontSize:13,cursor:'pointer',fontWeight:theme===th?500:400}}>
                {th==='light'?t.lightTheme:t.darkTheme}
              </button>
            ))}
          </div>
        </SettingsRow>
        <SettingsRow label={t.language} sub="">
          <div style={{display:'flex',gap:6}}>
            {(['ru','en','kz'] as Lang[]).map(l => (
              <button key={l} onClick={() => setLang(l)} style={{padding:'7px 14px',borderRadius:8,border:`1px solid ${lang===l?'var(--accent)':'var(--border)'}`,background:lang===l?'var(--accent-dim)':'transparent',color:lang===l?'var(--accent)':'var(--text-secondary)',fontSize:13,cursor:'pointer',fontWeight:lang===l?500:400}}>
                {l==='ru'?'Русский':l==='en'?'English':'Қазақша'}
              </button>
            ))}
          </div>
        </SettingsRow>
      </SettingsCard>

      <SettingsCard title={t.notifications}>
        <SettingsRow label={t.emailNotif} sub="">
          <Toggle on={notifs} onClick={() => setNotifs(n=>!n)} />
        </SettingsRow>
      </SettingsCard>
    </div>
  )
}

function SettingsCard({ title, children }: any) {
  return (
    <div style={{background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:16,padding:20,marginBottom:16}}>
      <div style={{fontSize:14,fontWeight:500,marginBottom:16}}>{title}</div>
      {children}
    </div>
  )
}
function SettingsRow({ label, sub, children }: any) {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
      <div><div style={{fontSize:13.5}}>{label}</div>{sub&&<div style={{fontSize:12,color:'var(--text-tertiary)',marginTop:2}}>{sub}</div>}</div>
      {children}
    </div>
  )
}
function Toggle({ on, onClick }: any) {
  return (
    <div onClick={onClick} style={{width:40,height:22,background:on?'var(--accent)':'var(--border)',borderRadius:99,position:'relative',cursor:'pointer',transition:'background .18s'}}>
      <div style={{position:'absolute',top:3,left:on?21:3,width:16,height:16,borderRadius:'50%',background:'white',transition:'left .18s'}} />
    </div>
  )
}

/* ══ PROFILE PAGE ══════════════════════════════ */
function ProfilePage({ t, user, onLogout }: any) {
  const [name, setName] = useState(user?.name||'')
  const [saving, setSaving] = useState(false)
  const initials2 = user?.name ? initials(user.name) : 'KR'

  const saveName = async () => {
    setSaving(true)
    try { await api.put('/api/users/me', { name }); toast(t.save+' ✓', 'success') }
    catch { toast(t.error, 'error') }
    setSaving(false)
  }

  return (
    <div style={{padding:32,maxWidth:700}}>
      <div style={{marginBottom:24}}><div style={{fontSize:22,fontWeight:500,letterSpacing:'-0.4px'}}>{t.profile}</div></div>

      <div style={{background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:16,padding:24,marginBottom:16,display:'flex',alignItems:'center',gap:20}}>
        <div style={{width:72,height:72,borderRadius:'50%',background:'linear-gradient(135deg,#4361ee,#7c3aed)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,fontWeight:600,color:'white',flexShrink:0}}>{initials2}</div>
        <div>
          <div style={{fontSize:20,fontWeight:500,letterSpacing:'-0.3px'}}>{user?.name||'...'}</div>
          <div style={{fontSize:13,color:'var(--text-secondary)',marginTop:3}}>{user?.email}</div>
          <div style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,fontWeight:500,padding:'3px 10px',background:'var(--accent-dim)',color:'var(--accent)',borderRadius:99,marginTop:6}}>✦ {t.freePlan}</div>
        </div>
        <button onClick={onLogout} style={{marginLeft:'auto',display:'inline-flex',alignItems:'center',gap:7,padding:'9px 18px',borderRadius:12,background:'transparent',color:'var(--text-primary)',border:'1px solid var(--border)',fontSize:13.5,cursor:'pointer'}}>{t.logout}</button>
      </div>

      <SettingsCard title={t.name}>
        <div style={{display:'flex',gap:10,paddingTop:4}}>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder={t.name}
            style={{flex:1,padding:'10px 13px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg-elevated)',fontSize:13.5,color:'var(--text-primary)',outline:'none'}} />
          <button onClick={saveName} disabled={saving} style={{padding:'10px 20px',borderRadius:12,background:'var(--accent)',color:'white',border:'none',fontSize:13.5,fontWeight:500,cursor:'pointer'}}>{saving?'...':t.save}</button>
        </div>
      </SettingsCard>

      <SettingsCard title={t.changePassword}>
        <div style={{display:'flex',flexDirection:'column',gap:10,paddingTop:4}}>
          <input type="password" placeholder={t.currentPass} style={{padding:'10px 13px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg-elevated)',fontSize:13.5,color:'var(--text-primary)',outline:'none'}} />
          <input type="password" placeholder={t.newPass} style={{padding:'10px 13px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg-elevated)',fontSize:13.5,color:'var(--text-primary)',outline:'none'}} />
          <button onClick={() => toast('В разработке')} style={{padding:'10px 20px',borderRadius:12,background:'var(--accent)',color:'white',border:'none',fontSize:13.5,fontWeight:500,cursor:'pointer',alignSelf:'flex-start'}}>{t.changePassword}</button>
        </div>
      </SettingsCard>
    </div>
  )
}

/* ══ SCHEDULE MODAL ══════════════════════════════ */
function ScheduleModal({ open, onClose, t }: any) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0,10))
  const [time, setTime] = useState('10:00')
  const [creating, setCreating] = useState(false)

  const create = async () => {
    if (!title.trim()) return
    setCreating(true)
    try { await api.post('/meetings/create', { title }); toast(t.meetingCreated, 'success'); onClose(); setTitle('') }
    catch { toast(t.error, 'error') }
    setCreating(false)
  }

  if (!open) return null
  return (
    <Modal onClose={onClose}>
      <div style={{fontSize:17,fontWeight:500,marginBottom:22}}>{t.scheduleMeeting}</div>
      <div style={{marginBottom:14}}>
        <label style={{fontSize:11,color:'var(--text-tertiary)',display:'block',marginBottom:5,fontWeight:500,letterSpacing:'0.3px',textTransform:'uppercase'}}>{t.meetingName}</label>
        <input className="" value={title} onChange={e=>setTitle(e.target.value)} autoFocus placeholder={t.meetingName}
          style={{width:'100%',padding:'10px 13px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg-elevated)',fontSize:13.5,color:'var(--text-primary)',outline:'none'}} />
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
        <div>
          <label style={{fontSize:11,color:'var(--text-tertiary)',display:'block',marginBottom:5,fontWeight:500,letterSpacing:'0.3px',textTransform:'uppercase'}}>{t.date}</label>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{width:'100%',padding:'10px 13px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg-elevated)',fontSize:13.5,color:'var(--text-primary)',outline:'none'}} />
        </div>
        <div>
          <label style={{fontSize:11,color:'var(--text-tertiary)',display:'block',marginBottom:5,fontWeight:500,letterSpacing:'0.3px',textTransform:'uppercase'}}>{t.time}</label>
          <input type="time" value={time} onChange={e=>setTime(e.target.value)} style={{width:'100%',padding:'10px 13px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg-elevated)',fontSize:13.5,color:'var(--text-primary)',outline:'none'}} />
        </div>
      </div>
      <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:22}}>
        <button onClick={onClose} style={{padding:'9px 18px',borderRadius:8,border:'1px solid var(--border)',background:'transparent',fontSize:13,cursor:'pointer',color:'var(--text-secondary)'}}>{t.cancel}</button>
        <button onClick={create} disabled={creating} style={{padding:'9px 20px',borderRadius:8,border:'none',background:'var(--accent)',color:'white',fontSize:13,fontWeight:500,cursor:'pointer'}}>{creating?'...':t.create}</button>
      </div>
    </Modal>
  )
}

/* ══ MODAL WRAPPER ══════════════════════════════ */
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.3)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',animation:'fadeIn .15s'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg-surface)',borderRadius:24,padding:28,width:440,maxWidth:'92vw',boxShadow:'0 8px 32px rgba(0,0,0,0.15)',maxHeight:'90vh',overflowY:'auto',animation:'slideUp .2s'}}>
        {children}
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  )
}

/* ══ ICONS ══════════════════════════════════════ */
const GridIcon = () => <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg>
const CalIcon = () => <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M5 3V2M11 3V2M2 7h12"/></svg>
const ClockIcon = () => <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5l2.5 1.5"/></svg>
const PeopleIcon = () => <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6" cy="5" r="3"/><path d="M1 14c0-3 2-4 5-4s5 1 5 4"/><path d="M11 3a2 2 0 010 4M15 14c0-2-1-3-3-3.5"/></svg>
const ChatIcon = () => <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 10a1 1 0 01-1 1H5l-3 3V3a1 1 0 011-1h10a1 1 0 011 1v7z"/></svg>
const SettingsIcon = () => <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="2.5"/><path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.5 3.5l1 1M11.5 11.5l1 1M11.5 3.5l-1 1M4.5 11.5l-1 1"/></svg>
const VideoIcon = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 5h9a1 1 0 011 1v5a1 1 0 01-1 1H1a1 1 0 01-1-1V6a1 1 0 011-1z"/><path d="M11 7.5l5-2.5v6l-5-2.5"/></svg>