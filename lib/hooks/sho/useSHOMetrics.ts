import { useState, useEffect } from 'react'
import { getLiveStationStats } from '@/lib/api/sho'

export function useSHOMetrics(stationId: string | undefined) {
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!stationId) return
    const fetchMetrics = async () => {
      try {
        const { data, error } = await getLiveStationStats(stationId)
        if (!error && data) {
          setMetrics(data)
        }
      } catch (err) {
        console.error('Failed to load SHO metrics', err)
      } finally {
        setLoading(false)
      }
    }
    fetchMetrics()
    
    // Refresh every 5 minutes backing up realtime
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [stationId])

  return { metrics, loading }
}
