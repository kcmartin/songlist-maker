import { useBand } from '../contexts/BandContext'

export default function BandSelector() {
  const { bands, selectedBandId, setSelectedBandId } = useBand()

  if (bands.length === 0) return null

  return (
    <select
      value={selectedBandId || ''}
      onChange={(e) => setSelectedBandId(e.target.value ? Number(e.target.value) : null)}
      className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <option value="">All Bands</option>
      {bands.map((band) => (
        <option key={band.id} value={band.id}>
          {band.name}
        </option>
      ))}
    </select>
  )
}
