import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''
const CHAT_URL = import.meta.env.VITE_CHAT_URL || ''
const CONFERENCE_URL = import.meta.env.VITE_CONFERENCE_URL || ''

export const api = axios.create({ baseURL: API_URL, withCredentials: true })
export const chatApi = axios.create({ baseURL: CHAT_URL, withCredentials: true })
export const conferenceApi = axios.create({ baseURL: CONFERENCE_URL, withCredentials: true })

let refreshing = false
let queue: Array<() => void> = []

const refreshInterceptor = (instance: typeof api) => {
  instance.interceptors.response.use(
    r => r,
    async err => {
      const original = err.config
      if (err.response?.status === 401 && !original._retry) {
        if (refreshing) {
          return new Promise(resolve => { queue.push(() => resolve(instance(original))) })
        }
        original._retry = true
        refreshing = true
        try {
          await api.post('/auth/refresh')
          queue.forEach(fn => fn())
          queue = []
          return instance(original)
        } catch {
          window.location.href = '/auth'
        } finally {
          refreshing = false
        }
      }
      return Promise.reject(err)
    }
  )
}

refreshInterceptor(api)
refreshInterceptor(chatApi)
refreshInterceptor(conferenceApi)

export default api
