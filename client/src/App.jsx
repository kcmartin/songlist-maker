import { Routes, Route, Navigate } from 'react-router-dom'
import { BandProvider } from './contexts/BandContext'
import Layout from './components/Layout'
import Songs from './pages/Songs'
import Songlists from './pages/Songlists'
import SonglistDetail from './pages/SonglistDetail'
import SharedSonglist from './pages/SharedSonglist'
import Bands from './pages/Bands'
import Repertoire from './pages/Repertoire'

export default function App() {
  return (
    <BandProvider>
      <Routes>
        <Route path="/share/:token" element={<SharedSonglist />} />
        <Route
          path="*"
          element={
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
          }
        />
      </Routes>
    </BandProvider>
  )
}
