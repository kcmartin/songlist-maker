import { useState } from 'react'
import { useBand } from '../contexts/BandContext'
import { createBand, updateBand, deleteBand, createBandInvite } from '../api'
import BandForm from '../components/BandForm'

export default function Bands() {
  const { bands, refreshBands, setSelectedBandId } = useBand()
  const [showForm, setShowForm] = useState(false)
  const [editingBand, setEditingBand] = useState(null)
  const [inviteModal, setInviteModal] = useState(null)
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)

  const handleCreate = async (data) => {
    try {
      const newBand = await createBand(data)
      await refreshBands()
      setShowForm(false)
      setSelectedBandId(newBand.id)
    } catch (err) {
      alert('Failed to create band')
    }
  }

  const handleUpdate = async (data) => {
    try {
      await updateBand(editingBand.id, data)
      await refreshBands()
      setEditingBand(null)
    } catch (err) {
      alert('Failed to update band')
    }
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Delete this band? Songs in the repertoire will be unlinked but not deleted.')) return

    try {
      await deleteBand(id)
      await refreshBands()
    } catch (err) {
      alert('Failed to delete band')
    }
  }

  const handleInvite = async (band) => {
    try {
      const { token } = await createBandInvite(band.id)
      const link = `${window.location.origin}/invite/${token}`
      setInviteLink(link)
      setInviteModal(band)
      setCopied(false)
    } catch (err) {
      alert('Failed to create invite link')
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      const input = document.createElement('input')
      input.value = inviteLink
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Bands</h1>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">
          + New Band
        </button>
      </div>

      {bands.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-500 mb-4">
            No bands yet. Create one to start managing per-band repertoires!
          </p>
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            + New Band
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bands.map((band) => (
            <div
              key={band.id}
              className="card p-4 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-lg">{band.name}</h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleInvite(band)}
                    className="text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Invite member"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setEditingBand(band)}
                    className="text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  {band.user_role === 'owner' && (
                    <button
                      onClick={(e) => handleDelete(band.id, e)}
                      className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                <span>
                  {band.song_count} {band.song_count === 1 ? 'song' : 'songs'} in repertoire
                </span>
                <span className="text-gray-400">|</span>
                <span>
                  {band.member_count} {band.member_count === 1 ? 'member' : 'members'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <BandForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editingBand && (
        <BandForm
          band={editingBand}
          onSubmit={handleUpdate}
          onCancel={() => setEditingBand(null)}
        />
      )}

      {inviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-2">
              Invite to {inviteModal.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Share this link with someone to invite them to your band.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="input flex-1 text-sm"
                onClick={(e) => e.target.select()}
              />
              <button
                onClick={copyLink}
                className={`btn ${copied ? 'btn-primary' : 'btn-secondary'} whitespace-nowrap`}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setInviteModal(null)}
                className="btn btn-secondary"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
