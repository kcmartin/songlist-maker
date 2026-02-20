import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBand } from '../contexts/BandContext'
import {
  getBandSongs,
  addSongToBand,
  updateBandSong,
  removeSongFromBand,
  addTagToBandSong,
  removeTagFromBandSong,
  getSongs,
  getTags,
} from '../api'

const formatDuration = (seconds) => {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const parseDuration = (str) => {
  if (!str) return null
  const parts = str.split(':')
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1])
  }
  return null
}

export default function Repertoire() {
  const { selectedBandId, selectedBand, refreshBands } = useBand()
  const navigate = useNavigate()

  const [songs, setSongs] = useState([])
  const [allSongs, setAllSongs] = useState([])
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingSong, setEditingSong] = useState(null)
  const [editForm, setEditForm] = useState({ notes: '', duration: '' })
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState(null)

  useEffect(() => {
    if (!selectedBandId) {
      navigate('/bands')
      return
    }
    loadData()
  }, [selectedBandId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [bandSongs, globalSongs, tagsData] = await Promise.all([
        getBandSongs(selectedBandId),
        getSongs(),
        getTags(),
      ])
      setSongs(bandSongs)
      setAllSongs(globalSongs)
      setTags(tagsData)
    } catch (err) {
      console.error('Failed to load repertoire', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddSong = async (songId) => {
    try {
      await addSongToBand(selectedBandId, { songId })
      await loadData()
      await refreshBands()
    } catch (err) {
      alert('Failed to add song to repertoire')
    }
  }

  const handleRemoveSong = async (songId) => {
    if (!confirm('Remove this song from the band repertoire?')) return
    try {
      await removeSongFromBand(selectedBandId, songId)
      setSongs((prev) => prev.filter((s) => s.id !== songId))
      await refreshBands()
    } catch (err) {
      alert('Failed to remove song')
    }
  }

  const handleStartEdit = (song) => {
    setEditingSong(song.id)
    setEditForm({
      notes: song.band_notes || '',
      duration: song.band_duration ? formatDuration(song.band_duration) : '',
    })
  }

  const handleSaveEdit = async (songId) => {
    try {
      await updateBandSong(selectedBandId, songId, {
        notes: editForm.notes || null,
        duration: parseDuration(editForm.duration),
      })
      setEditingSong(null)
      await loadData()
    } catch (err) {
      alert('Failed to update song overrides')
    }
  }

  const handleAddTag = async (songId, tagId) => {
    try {
      const newTags = await addTagToBandSong(selectedBandId, songId, { tagId })
      setSongs((prev) =>
        prev.map((s) => (s.id === songId ? { ...s, tags: newTags } : s))
      )
    } catch (err) {
      alert('Failed to add tag')
    }
  }

  const handleRemoveTag = async (songId, tagId) => {
    try {
      const newTags = await removeTagFromBandSong(selectedBandId, songId, tagId)
      setSongs((prev) =>
        prev.map((s) => (s.id === songId ? { ...s, tags: newTags } : s))
      )
    } catch (err) {
      alert('Failed to remove tag')
    }
  }

  const availableSongs = allSongs.filter(
    (s) => !songs.some((rs) => rs.id === s.id)
  )

  const filteredSongs = songs.filter((song) => {
    const matchesSearch =
      !search ||
      song.title.toLowerCase().includes(search.toLowerCase()) ||
      song.artist.toLowerCase().includes(search.toLowerCase())
    const matchesTag =
      !filterTag || song.tags?.some((t) => t.id === filterTag)
    return matchesSearch && matchesTag
  })

  // Collect all unique tags used in repertoire
  const usedTags = []
  const seenTagIds = new Set()
  for (const song of songs) {
    for (const tag of song.tags || []) {
      if (!seenTagIds.has(tag.id)) {
        seenTagIds.add(tag.id)
        usedTags.push(tag)
      }
    }
  }

  if (!selectedBandId) return null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Repertoire</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {selectedBand?.name} — {songs.length} {songs.length === 1 ? 'song' : 'songs'}
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
          + Add to Repertoire
        </button>
      </div>

      {/* Search and tag filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search repertoire..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input flex-1"
        />
        {usedTags.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {usedTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => setFilterTag(filterTag === tag.id ? null : tag.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filterTag === tag.id
                    ? 'ring-2 ring-offset-1 ring-indigo-500'
                    : ''
                }`}
                style={{
                  backgroundColor: tag.color + '20',
                  color: tag.color,
                }}
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {songs.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-500 mb-4">
            No songs in this band's repertoire yet.
          </p>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            + Add to Repertoire
          </button>
        </div>
      ) : filteredSongs.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-500">No songs match your search.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSongs.map((song) => (
            <div
              key={song.id}
              className="card p-4 group"
            >
              {editingSong === song.id ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">{song.title}</span>
                    <span className="text-sm text-gray-500">— {song.artist}</span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Band-specific notes (overrides global)
                    </label>
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                      className="input min-h-[60px] text-sm"
                      placeholder={song.global_notes || 'No global notes'}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Band-specific duration (m:ss)
                    </label>
                    <input
                      type="text"
                      value={editForm.duration}
                      onChange={(e) => setEditForm((f) => ({ ...f, duration: e.target.value }))}
                      className="input text-sm w-32"
                      placeholder={song.global_duration ? formatDuration(song.global_duration) : '0:00'}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(song.id)}
                      className="btn btn-primary text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingSong(null)}
                      className="btn btn-secondary text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">{song.title}</p>
                      {song.duration && (
                        <span className="text-sm text-gray-400 shrink-0">
                          {formatDuration(song.duration)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {song.artist}
                    </p>
                    {song.notes && (
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 italic">
                        {song.notes}
                        {song.band_notes && (
                          <span className="text-indigo-400 text-xs ml-1">(band)</span>
                        )}
                      </p>
                    )}

                    {/* Tags */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {song.tags?.map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: tag.color + '20',
                            color: tag.color,
                          }}
                        >
                          {tag.name}
                          <button
                            onClick={() => handleRemoveTag(song.id, tag.id)}
                            className="hover:opacity-70"
                          >
                            x
                          </button>
                        </span>
                      ))}
                      <div className="relative inline-block">
                        <select
                          className="text-xs bg-transparent border border-dashed border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 text-gray-400 cursor-pointer"
                          value=""
                          onChange={(e) => {
                            if (e.target.value) handleAddTag(song.id, Number(e.target.value))
                          }}
                        >
                          <option value="">+ tag</option>
                          {tags
                            .filter((t) => !song.tags?.some((st) => st.id === t.id))
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {song.youtube_url && (
                      <a
                        href={song.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-600 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                      </a>
                    )}
                    <button
                      onClick={() => handleStartEdit(song)}
                      className="text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleRemoveSong(song.id)}
                      className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add to Repertoire Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card p-6 w-full max-w-md max-h-[80vh] flex flex-col">
            <h2 className="text-xl font-bold mb-4">Add to Repertoire</h2>

            {availableSongs.length === 0 ? (
              <p className="text-gray-500">All songs are already in this band's repertoire.</p>
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
              onClick={() => setShowAddModal(false)}
              className="btn btn-secondary mt-4"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
