import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Songs from './pages/Songs'
import Songlists from './pages/Songlists'
import SonglistDetail from './pages/SonglistDetail'
import SharedSonglist from './pages/SharedSonglist'

export default function App() {
  return (
    <Routes>
      <Route path="/share/:token" element={<SharedSonglist />} />
      <Route
        path="*"
        element={
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/songs" replace />} />
              <Route path="/songs" element={<Songs />} />
              <Route path="/songlists" element={<Songlists />} />
              <Route path="/songlists/:id" element={<SonglistDetail />} />
            </Routes>
          </Layout>
        }
      />
    </Routes>
  )
}
