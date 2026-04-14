import axios from 'axios'

// In dev: empty baseURL (uses Vite proxy)
// In production: uses VITE_API_URL from env
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true,
})

let refreshing = false
let queue: Array<() => void> = []

api.interceptors.response.use(
  r => r,
  async err => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      if (refreshing) {
        return new Promise(resolve => {
          queue.push(() => resolve(api(original)))
        })
      }
      original._retry = true
      refreshing = true
      try {
        await api.post('/auth/refresh')
        queue.forEach(fn => fn())
        queue = []
        return api(original)
      } catch {
        window.location.href = '/auth'
      } finally {
        refreshing = false
      }
    }
    return Promise.reject(err)
  }
)

export default api
