import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSonglist } from '../api'
import useWakeLock from '../hooks/useWakeLock'

const formatDuration = (seconds) => {
  if (!seconds) return null
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function StageMode() {
  const { id } = useParams()
  const navigate = useNavigate()
  useWakeLock()

  const [songlist, setSonglist] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentSongId, setCurrentSongId] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [display, setDisplay] = useState(() => {
    const saved = localStorage.getItem('stage-display')
    return saved ? JSON.parse(saved) : {
      artist: true,
      notes: false,
      duration: true,
    }
  })

  useEffect(() => {
    localStorage.setItem('stage-display', JSON.stringify(display))
  }, [display])

  const toggleDisplay = (key) => {
    setDisplay((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getSonglist(id)
      setSonglist(data)
    } catch {
      setError('Failed to load songlist')
    } finally {
      setLoading(false)
    }
  }

  const handleSongTap = (songId) => {
    setCurrentSongId((prev) => (prev === songId ? null : songId))
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white text-lg mb-4">{error}</p>
          <button
            onClick={() => navigate(`/songlists/${id}`)}
            className="px-4 py-2 bg-white/10 text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <h1 className="text-white font-bold text-lg truncate mr-3">
          {songlist.name}
        </h1>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowSettings((prev) => !prev)}
            className="p-2 text-white/60 hover:text-white transition-colors"
            aria-label="Settings"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            onClick={() => navigate(`/songlists/${id}`)}
            className="p-2 text-white/60 hover:text-white transition-colors"
            aria-label="Exit stage mode"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="px-4 py-3 border-b border-white/10 flex flex-wrap gap-3 flex-shrink-0">
          {[
            { key: 'artist', label: 'Artist' },
            { key: 'notes', label: 'Notes' },
            { key: 'duration', label: 'Duration' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => toggleDisplay(key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                display[key]
                  ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/40'
                  : 'bg-white/5 text-white/40 border border-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Song list */}
      <div className="flex-1 overflow-y-auto">
        {songlist.songs?.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-white/40 text-lg">No songs in this list</p>
          </div>
        ) : (
          <div className="py-2">
            {songlist.songs?.map((song, index) => {
              const isCurrent = currentSongId === song.id
              return (
                <button
                  key={song.id}
                  onClick={() => handleSongTap(song.id)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                    isCurrent
                      ? 'bg-yellow-400/10 border-l-4 border-yellow-400'
                      : 'border-l-4 border-transparent'
                  }`}
                >
                  <span className={`w-8 text-right font-mono text-lg flex-shrink-0 ${
                    isCurrent ? 'text-yellow-400' : 'text-white/30'
                  }`}>
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xl font-semibold truncate ${
                      isCurrent ? 'text-white' : 'text-white/90'
                    }`}>
                      {song.title}
                    </p>
                    {display.artist && song.artist && (
                      <p className={`text-base truncate ${
                        isCurrent ? 'text-white/70' : 'text-white/40'
                      }`}>
                        {song.artist}
                      </p>
                    )}
                    {display.notes && song.notes && (
                      <p className={`text-sm italic truncate mt-0.5 ${
                        isCurrent ? 'text-white/50' : 'text-white/25'
                      }`}>
                        {song.notes}
                      </p>
                    )}
                  </div>
                  {display.duration && song.duration && (
                    <span className={`text-base font-mono flex-shrink-0 ${
                      isCurrent ? 'text-yellow-400/70' : 'text-white/25'
                    }`}>
                      {formatDuration(song.duration)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
