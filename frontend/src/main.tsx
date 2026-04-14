import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import '@livekit/components-styles'
import './index.css'
import { useAuthStore } from './store/auth'

const Landing   = React.lazy(() => import('./pages/Landing'))
const Auth      = React.lazy(() => import('./pages/Auth'))
const Dashboard = React.lazy(() => import('./pages/Dashboard'))
const Room      = React.lazy(() => import('./pages/Room'))
const Lobby     = React.lazy(() => import('./pages/Lobby'))
const AuthCallback = React.lazy(() => import('./pages/AuthCallback'))

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user)
  if (!user) return <Navigate to="/auth" replace />
  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <React.Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/verify" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/dashboard/*" element={
            <PrivateRoute><Dashboard /></PrivateRoute>
          } />
          <Route path="/room/:meetingId" element={
            <PrivateRoute><Room /></PrivateRoute>
          } />
          <Route path="/lobby/:meetingId" element={
            <PrivateRoute><Lobby /></PrivateRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  )
}

function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg)',
    }}>
      <div style={{
        width: 28, height: 28, border: '2px solid var(--border)',
        borderTopColor: 'var(--accent)', borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
