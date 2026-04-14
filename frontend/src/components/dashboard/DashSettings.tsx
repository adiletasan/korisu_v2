import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/auth'
import api from '../../lib/api'
import styles from './DashSettings.module.css'

export default function DashSettings() {
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const [settings, setSettings] = useState({ email_notifications: true, language: 'en', theme: 'dark' })
  const [saved, setSaved] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')

  useEffect(() => {
    api.get('/api/users/settings').then(r => setSettings(r.data)).catch(() => {})
  }, [])

  const saveSettings = async () => {
    await api.patch('/api/users/settings', settings).catch(() => {})
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError(''); setPwSuccess('')
    if (pwForm.next !== pwForm.confirm) { setPwError('Passwords do not match'); return }
    if (pwForm.next.length < 8) { setPwError('Minimum 8 characters'); return }
    try {
      await api.post('/api/users/change-password', { current_password: pwForm.current, new_password: pwForm.next })
      setPwSuccess('Password updated.')
      setPwForm({ current: '', next: '', confirm: '' })
    } catch { setPwError('Current password is incorrect.') }
  }

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>Settings</h1>

      {/* Profile */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Profile</h2>
        <div className={styles.profileRow}>
          <div className={styles.avatar}>
            {user?.avatar_url ? <img src={user.avatar_url} alt="" /> : user?.name?.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className={styles.profileName}>{user?.name}</div>
            <div className={styles.profileEmail}>{user?.email}</div>
          </div>
        </div>
      </section>

      {/* Preferences */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Preferences</h2>
        <div className={styles.prefRow}>
          <div>
            <div className={styles.prefLabel}>Email notifications</div>
            <div className={styles.prefSub}>Receive meeting and contact updates</div>
          </div>
          <button
            className={settings.email_notifications ? styles.toggleOn : styles.toggleOff}
            onClick={() => setSettings(s => ({ ...s, email_notifications: !s.email_notifications }))}
          >
            <span className={styles.toggleThumb} />
          </button>
        </div>
        <button className={styles.saveBtn} onClick={saveSettings}>
          {saved ? '✓ Saved' : 'Save preferences'}
        </button>
      </section>

      {/* Change password */}
      {user && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Change password</h2>
          <form className={styles.pwForm} onSubmit={changePassword}>
            <input className={styles.input} type="password" placeholder="Current password" value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} required />
            <input className={styles.input} type="password" placeholder="New password (min. 8 chars)" value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} required />
            <input className={styles.input} type="password" placeholder="Confirm new password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} required />
            {pwError && <p className={styles.error}>{pwError}</p>}
            {pwSuccess && <p className={styles.success}>{pwSuccess}</p>}
            <button type="submit" className={styles.saveBtn}>Update password</button>
          </form>
        </section>
      )}

      {/* Danger */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle} style={{ color: 'var(--red)' }}>Account</h2>
        <button className={styles.logoutBtn} onClick={logout}>Sign out of Korisu</button>
      </section>
    </div>
  )
}
