import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/auth'
import api from '../lib/api'
import DashHome from '../components/dashboard/DashHome'
import DashChat from '../components/dashboard/DashChat'
import DashContacts from '../components/dashboard/DashContacts'
import DashSettings from '../components/dashboard/DashSettings'
import styles from './Dashboard.module.css'

type Section = 'home' | 'chat' | 'contacts' | 'settings'

export default function Dashboard() {
  const [section, setSection] = useState<Section>('home')
  const [chatUserId, setChatUserId] = useState<string | null>(null)
  const [chatUserName, setChatUserName] = useState<string | null>(null)
  const user = useAuthStore(s => s.user)
  const fetchMe = useAuthStore(s => s.fetchMe)
  const logout = useAuthStore(s => s.logout)

  useEffect(() => { fetchMe() }, [])

  const avatar = user?.avatar_url
  const initials = user?.name?.slice(0, 2).toUpperCase() || 'KR'

  const handleStartChat = (userId: string, userName: string) => {
    setChatUserId(userId)
    setChatUserName(userName)
    setSection('chat')
  }

  return (
    <div className={styles.root}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>KO<span>RISU</span></div>
        <nav className={styles.sideNav}>
          <NavItem icon={<HomeIcon />} label="Home" active={section === 'home'} onClick={() => setSection('home')} />
          <NavItem icon={<ChatIcon />} label="Chat" active={section === 'chat'} onClick={() => setSection('chat')} />
          <NavItem icon={<PeopleIcon />} label="Contacts" active={section === 'contacts'} onClick={() => setSection('contacts')} />
        </nav>
        <div className={styles.sideBottom}>
          <NavItem icon={<SettingsIcon />} label="Settings" active={section === 'settings'} onClick={() => setSection('settings')} />
          <div className={styles.profile} onClick={() => setSection('settings')}>
            <div className={styles.avatar}>
              {avatar ? <img src={avatar} alt={user?.name} /> : initials}
            </div>
            <div className={styles.profileInfo}>
              <span className={styles.profileName}>{user?.name || 'User'}</span>
              <span className={styles.profileEmail}>{user?.email}</span>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={logout} title="Sign out">
            <LogoutIcon />
          </button>
        </div>
      </aside>
      <main className={styles.main}>
        {section === 'home' && <DashHome />}
        {section === 'chat' && <DashChat initialUserId={chatUserId} initialUserName={chatUserName} />}
        {section === 'contacts' && <DashContacts onStartChat={handleStartChat} />}
        {section === 'settings' && <DashSettings />}
      </main>
    </div>
  )
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button className={active ? styles.navItemActive : styles.navItem} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  )
}

const HomeIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
const ChatIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
const PeopleIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
const SettingsIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
const LogoutIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
