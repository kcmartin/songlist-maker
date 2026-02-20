import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getBands } from '../api'

const BandContext = createContext()

export function BandProvider({ children }) {
  const [bands, setBands] = useState([])
  const [selectedBandId, setSelectedBandId] = useState(() => {
    const saved = localStorage.getItem('selectedBandId')
    return saved ? Number(saved) : null
  })

  const refreshBands = useCallback(async () => {
    try {
      const data = await getBands()
      setBands(data)
    } catch (err) {
      console.error('Failed to load bands', err)
    }
  }, [])

  useEffect(() => {
    refreshBands()
  }, [refreshBands])

  useEffect(() => {
    if (selectedBandId) {
      localStorage.setItem('selectedBandId', String(selectedBandId))
    } else {
      localStorage.removeItem('selectedBandId')
    }
  }, [selectedBandId])

  // If the selected band was deleted, clear selection
  const selectedBand = bands.find((b) => b.id === selectedBandId) || null
  useEffect(() => {
    if (selectedBandId && bands.length > 0 && !selectedBand) {
      setSelectedBandId(null)
    }
  }, [selectedBandId, bands, selectedBand])

  return (
    <BandContext.Provider
      value={{ bands, selectedBandId, setSelectedBandId, selectedBand, refreshBands }}
    >
      {children}
    </BandContext.Provider>
  )
}

export function useBand() {
  const ctx = useContext(BandContext)
  if (!ctx) throw new Error('useBand must be used within BandProvider')
  return ctx
}
