import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  getSonglist,
  getSongs,
  getBandSongs,
  updateSonglist,
  updateSonglistSongs,
  deleteSonglist,
  generateShareLink,
  removeShareLink,
} from '../api'
import { useBand } from '../contexts/BandContext'
import SonglistForm from '../components/SonglistForm'
import PrintModal from '../components/PrintModal'

const formatDuration = (seconds) => {
  if (!seconds) return null
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const formatTotalTime = (seconds) => {
  if (!seconds) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${s}s`
}

function SortableSong({ song, onRemove, display }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 group"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
        </svg>
      </button>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{song.title}</p>
        {display.artist && (
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {song.artist}
          </p>
        )}
        {display.notes && song.notes && (
          <p className="text-sm text-gray-400 dark:text-gray-500 truncate italic">
            {song.notes}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {display.duration && song.duration && (
          <span className="text-sm text-gray-400">{formatDuration(song.duration)}</span>
        )}
        {display.links && song.youtube_url && (
          <a
            href={song.youtube_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-600 hover:text-red-700"
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </a>
        )}
        <button
          onClick={() => onRemove(song.id)}
          className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function SonglistDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { bands } = useBand()

  const [songlist, setSonglist] = useState(null)
  const [allSongs, setAllSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showAddSong, setShowAddSong] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [shareLink, setShareLink] = useState(null)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [display, setDisplay] = useState(() => {
    const saved = localStorage.getItem('songlist-display')
    return saved ? JSON.parse(saved) : {
      numbers: true,
      artist: true,
      notes: false,
      duration: true,
      links: false,
    }
  })

  useEffect(() => {
    localStorage.setItem('songlist-display', JSON.stringify(display))
  }, [display])

  const toggleDisplay = (key) => {
    setDisplay((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const totalDuration = songlist?.songs?.reduce((sum, s) => sum + (s.duration || 0), 0) || 0

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    try {
      setLoading(true)
      const listData = await getSonglist(id)

      // If songlist has a band, fetch band repertoire; otherwise fetch all songs
      let songsData
      if (listData.band_id) {
        songsData = await getBandSongs(listData.band_id)
      } else {
        songsData = await getSongs()
      }

      setSonglist(listData)
      setAllSongs(songsData)
    } catch (err) {
      alert('Failed to load songlist')
      navigate('/songlists')
    } finally {
      setLoading(false)
    }
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = songlist.songs.findIndex((s) => s.id === active.id)
    const newIndex = songlist.songs.findIndex((s) => s.id === over.id)

    const newSongs = arrayMove(songlist.songs, oldIndex, newIndex)
    setSonglist((prev) => ({ ...prev, songs: newSongs }))

    try {
      await updateSonglistSongs(id, newSongs.map((s) => s.id))
    } catch (err) {
      loadData()
    }
  }

  const handleAddSong = async (songId) => {
    const song = allSongs.find((s) => s.id === Number(songId))
    if (!song) return

    const newSongs = [...songlist.songs, song]
    setSonglist((prev) => ({ ...prev, songs: newSongs }))
    setShowAddSong(false)

    try {
      await updateSonglistSongs(id, newSongs.map((s) => s.id))
    } catch (err) {
      loadData()
    }
  }

  const handleRemoveSong = async (songId) => {
    const newSongs = songlist.songs.filter((s) => s.id !== songId)
    setSonglist((prev) => ({ ...prev, songs: newSongs }))

    try {
      await updateSonglistSongs(id, newSongs.map((s) => s.id))
    } catch (err) {
      loadData()
    }
  }

  const handleUpdateDetails = async (data) => {
    try {
      await updateSonglist(id, data)
      setSonglist((prev) => ({ ...prev, ...data }))
      setShowEditForm(false)
      // Reload to refresh band-specific data if band changed
      loadData()
    } catch (err) {
      alert('Failed to update songlist')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this songlist?')) return
    try {
      await deleteSonglist(id)
      navigate('/songlists')
    } catch (err) {
      alert('Failed to delete songlist')
    }
  }

  const handleShare = async () => {
    try {
      // Check if songlist already has a share token
      if (songlist.share_token) {
        setShareLink(`${window.location.origin}/share/${songlist.share_token}`)
      } else {
        const result = await generateShareLink(id)
        setShareLink(`${window.location.origin}/share/${result.share_token}`)
        setSonglist((prev) => ({ ...prev, share_token: result.share_token }))
      }
      setShowShareModal(true)
    } catch (err) {
      alert('Failed to generate share link')
    }
  }

  const handleRemoveShare = async () => {
    try {
      await removeShareLink(id)
      setSonglist((prev) => ({ ...prev, share_token: null }))
      setShareLink(null)
      setShowShareModal(false)
    } catch (err) {
      alert('Failed to remove share link')
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    } catch (err) {
      alert('Failed to copy link')
    }
  }

  const availableSongs = allSongs.filter(
    (s) => !songlist?.songs?.some((ls) => ls.id === s.id)
  )

  const formatDate = (dateStr) => {
    if (!dateStr) return null
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!songlist) return null

  return (
    <div>
      <button
        onClick={() => navigate('/songlists')}
        className="flex items-center gap-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Songlists
      </button>

      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  songlist.type === 'gig'
                    ? 'bg-gig-100 text-gig-700 dark:bg-gig-900 dark:text-gig-300'
                    : 'bg-practice-100 text-practice-700 dark:bg-practice-900 dark:text-practice-300'
                }`}
              >
                {songlist.type === 'gig' ? 'Gig' : 'Practice'}
              </span>
              {songlist.band_name && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
                  {songlist.band_name}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold mb-1">{songlist.name}</h1>
            {songlist.date && (
              <p className="text-gray-600 dark:text-gray-400">
                {formatDate(songlist.date)}
              </p>
            )}
            {songlist.notes && (
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                {songlist.notes}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate(`/songlists/${id}/stage`)}
              className="btn btn-secondary"
            >
              Stage Mode
            </button>
            <button
              onClick={handleShare}
              className="btn btn-secondary"
            >
              Share
            </button>
            <button
              onClick={() => setShowPrintModal(true)}
              className="btn btn-secondary"
            >
              Print / Export
            </button>
            <button
              onClick={() => setShowEditForm(true)}
              className="btn btn-secondary"
            >
              Edit Details
            </button>
            <button
              onClick={handleDelete}
              className="btn btn-danger"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">
              Songs ({songlist.songs?.length || 0})
            </h2>
            {totalDuration > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {formatTotalTime(totalDuration)}
              </span>
            )}
          </div>
          {availableSongs.length > 0 && (
            <button
              onClick={() => setShowAddSong(true)}
              className="btn btn-primary"
            >
              + Add Song
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'numbers', label: '#' },
            { key: 'artist', label: 'Artist' },
            { key: 'notes', label: 'Notes' },
            { key: 'duration', label: 'Time' },
            { key: 'links', label: 'Links' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => toggleDisplay(key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                display[key]
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {songlist.songs?.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-500 mb-4">No songs in this list yet.</p>
          {availableSongs.length > 0 ? (
            <button
              onClick={() => setShowAddSong(true)}
              className="btn btn-primary"
            >
              + Add Song
            </button>
          ) : (
            <p className="text-sm text-gray-400">
              {songlist.band_id
                ? 'Add some songs to the band\'s repertoire first!'
                : 'Add some songs to your library first!'}
            </p>
          )}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={songlist.songs.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {songlist.songs.map((song, index) => (
                <div key={song.id} className="flex items-center gap-3">
                  {display.numbers && (
                    <span className="w-6 text-center text-gray-400 font-medium">
                      {index + 1}
                    </span>
                  )}
                  <div className="flex-1">
                    <SortableSong song={song} onRemove={handleRemoveSong} display={display} />
                  </div>
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {showEditForm && (
        <SonglistForm
          songlist={songlist}
          bands={bands}
          onSubmit={handleUpdateDetails}
          onCancel={() => setShowEditForm(false)}
        />
      )}

      {showAddSong && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card p-6 w-full max-w-md max-h-[80vh] flex flex-col">
            <h2 className="text-xl font-bold mb-4">
              Add Song
              {songlist.band_name && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  from {songlist.band_name} repertoire
                </span>
              )}
            </h2>

            {availableSongs.length === 0 ? (
              <p className="text-gray-500">
                {songlist.band_id
                  ? 'All songs from the band repertoire are already in this list.'
                  : 'All songs are already in this list.'}
              </p>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2">
                {availableSongs.map((song) => (
                  <button
                    key={song.id}
                    onClick={() => handleAddSong(song.id)}
                    className="w-full p-3 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <p className="font-medium">{song.title}</p>
                    <p className="text-sm text-gray-500">{song.artist}</p>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowAddSong(false)}
              className="btn btn-secondary mt-4"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Share Songlist</h2>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Anyone with this link can view this songlist (read-only).
            </p>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="input flex-1 text-sm"
              />
              <button
                onClick={handleCopyLink}
                className={`btn ${copyFeedback ? 'bg-green-600 text-white' : 'btn-primary'}`}
              >
                {copyFeedback ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleRemoveShare}
                className="btn btn-danger flex-1"
              >
                Remove Link
              </button>
              <button
                onClick={() => setShowShareModal(false)}
                className="btn btn-secondary flex-1"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showPrintModal && (
        <PrintModal songlist={songlist} onClose={() => setShowPrintModal(false)} />
      )}
    </div>
  )
}
