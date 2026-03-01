import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { BandProvider } from './contexts/BandContext'
import Layout from './components/Layout'
import Songs from './pages/Songs'
import Songlists from './pages/Songlists'
import SonglistDetail from './pages/SonglistDetail'
import SharedSonglist from './pages/SharedSonglist'
import StageMode from './pages/StageMode'
import Bands from './pages/Bands'
import Repertoire from './pages/Repertoire'
import Login from './pages/Login'
import BandInvite from './pages/BandInvite'

function ProtectedRoutes() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ returnTo: location.pathname }} replace />
  }

  return (
    <BandProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/songs" replace />} />
          <Route path="/songs" element={<Songs />} />
          <Route path="/bands" element={<Bands />} />
          <Route path="/repertoire" element={<Repertoire />} />
          <Route path="/songlists" element={<Songlists />} />
          <Route path="/songlists/:id" element={<SonglistDetail />} />
        </Routes>
      </Layout>
    </BandProvider>
  )
}

function ProtectedStageRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ returnTo: location.pathname }} replace />
  }

  return <StageMode />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/share/:token" element={<SharedSonglist />} />
        <Route path="/songlists/:id/stage" element={<ProtectedStageRoute />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/invite/:token" element={<BandInvite />} />
        <Route path="*" element={<ProtectedRoutes />} />
      </Routes>
    </AuthProvider>
  )
}

function LoginRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (isAuthenticated) {
    // Check if there's a return URL from invite flow
    const returnTo = sessionStorage.getItem('returnTo')
    if (returnTo) {
      sessionStorage.removeItem('returnTo')
      return <Navigate to={returnTo} replace />
    }
    return <Navigate to="/" replace />
  }

  return <Login />
}
