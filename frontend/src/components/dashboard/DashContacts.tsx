import { useState, useEffect } from 'react'
import api from '../../lib/api'
import styles from './DashContacts.module.css'

interface Contact {
  id: string; user_id: string; email: string; name: string; avatar_url: string | null
}

export default function DashContacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [adding, setAdding] = useState(false)

  const load = () => api.get('/api/contacts/').then(r => setContacts(r.data)).catch(() => {})
  useEffect(() => { load() }, [])

  const addContact = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess(''); setAdding(true)
    try {
      await api.post('/api/contacts/', { email, nickname: nickname || undefined })
      setSuccess(`${email} added to contacts.`)
      setEmail(''); setNickname('')
      load()
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Error'
      const map: Record<string, string> = {
        USER_NOT_FOUND: 'User not found in Korisu.',
        ALREADY_IN_CONTACTS: 'Already in your contacts.',
        CANNOT_ADD_SELF: 'You cannot add yourself.',
      }
      setError(map[msg] || msg)
    } finally { setAdding(false) }
  }

  const remove = async (id: string) => {
    await api.delete(`/api/contacts/${id}`).catch(() => {})
    setContacts(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>Contacts</h1>

      {/* Add contact */}
      <form className={styles.addForm} onSubmit={addContact}>
        <h2 className={styles.sectionTitle}>Add contact</h2>
        <div className={styles.fields}>
          <input className={styles.input} type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required />
          <input className={styles.input} type="text" placeholder="Nickname (optional)" value={nickname} onChange={e => setNickname(e.target.value)} />
          <button className={styles.addBtn} type="submit" disabled={adding}>
            {adding ? '…' : 'Add'}
          </button>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>{success}</p>}
      </form>

      {/* List */}
      <div className={styles.listSection}>
        <h2 className={styles.sectionTitle}>Your contacts ({contacts.length})</h2>
        {contacts.length === 0
          ? <p className={styles.empty}>No contacts yet. Add someone above.</p>
          : contacts.map(c => (
            <div key={c.id} className={styles.contactRow}>
              <div className={styles.avatar}>
                {c.avatar_url ? <img src={c.avatar_url} alt={c.name} /> : c.name.slice(0, 2).toUpperCase()}
              </div>
              <div className={styles.info}>
                <div className={styles.name}>{c.name}</div>
                <div className={styles.emailText}>{c.email}</div>
              </div>
              <button className={styles.removeBtn} onClick={() => remove(c.id)}>Remove</button>
            </div>
          ))
        }
      </div>
    </div>
  )
}
