import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../lib/api'

interface User {
  id: string
  email: string
  name: string
  avatar_url: string | null
}

interface AuthState {
  user: User | null
  loading: boolean
  setUser: (u: User | null) => void
  fetchMe: () => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: false,

      setUser: (user) => set({ user }),

      fetchMe: async () => {
        set({ loading: true })
        try {
          const { data } = await api.get('/api/users/me')
          set({ user: data, loading: false })
        } catch {
          set({ user: null, loading: false })
        }
      },

      logout: async () => {
        try { await api.post('/auth/logout') } catch {}
        set({ user: null })
        window.location.href = '/'
      },
    }),
    {
      name: 'korisu-auth',
      partialize: (s) => ({ user: s.user }),
    }
  )
)
