/**
 * SOS Core Utilities
 * GPS fallback chain, offline queue, sendBeacon, Wake Lock
 */

export type LocationData = {
  latitude: number
  longitude: number
  accuracy: number | null
  source: 'gps' | 'network' | 'cached' | 'manual'
  timestamp: number
}

/* ── GPS Fallback Chain ──────────────────────────────── */

const CACHED_POSITION_KEY = 'cops_last_known_position'

export function cachePosition(loc: LocationData) {
  try {
    localStorage.setItem(CACHED_POSITION_KEY, JSON.stringify(loc))
  } catch {}
}

export function getCachedPosition(): LocationData | null {
  try {
    const raw = localStorage.getItem(CACHED_POSITION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

/**
 * Try high-accuracy GPS first (8s timeout), then network, then cache.
 * Never blocks — returns best available immediately.
 */
export function getLocation(): Promise<LocationData> {
  return new Promise((resolve) => {
    // Attempt 1: High-accuracy GPS
    if ('geolocation' in navigator) {
      const gpsTimeout = setTimeout(() => {
        // GPS timed out — try network-based
        tryNetworkLocation(resolve)
      }, 8000)

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(gpsTimeout)
          const loc: LocationData = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            source: 'gps',
            timestamp: Date.now(),
          }
          cachePosition(loc)
          resolve(loc)
        },
        () => {
          clearTimeout(gpsTimeout)
          tryNetworkLocation(resolve)
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      )
    } else {
      tryNetworkLocation(resolve)
    }
  })
}

function tryNetworkLocation(resolve: (loc: LocationData) => void) {
  // Attempt 2: Network / lower accuracy
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: LocationData = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          source: 'network',
          timestamp: Date.now(),
        }
        cachePosition(loc)
        resolve(loc)
      },
      () => {
        // Attempt 3: Cached position
        const cached = getCachedPosition()
        if (cached) {
          resolve({ ...cached, source: 'cached', timestamp: Date.now() })
        } else {
          // No location available — return zeros (manual entry needed)
          resolve({
            latitude: 0, longitude: 0,
            accuracy: null, source: 'manual',
            timestamp: Date.now(),
          })
        }
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    )
  } else {
    const cached = getCachedPosition()
    resolve(cached || { latitude: 0, longitude: 0, accuracy: null, source: 'manual', timestamp: Date.now() })
  }
}

/**
 * Continuous GPS broadcasting — returns cleanup function
 */
export function startLocationBroadcast(
  callback: (loc: LocationData) => void,
  intervalMs = 10000
): () => void {
  let watchId: number | null = null
  let intervalId: ReturnType<typeof setInterval> | null = null

  if ('geolocation' in navigator) {
    // Use watchPosition for continuous updates
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc: LocationData = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          source: 'gps',
          timestamp: Date.now(),
        }
        cachePosition(loc)
        callback(loc)
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    )

    // Also poll on interval as backup
    intervalId = setInterval(async () => {
      const loc = await getLocation()
      callback(loc)
    }, intervalMs)
  }

  return () => {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId)
    if (intervalId !== null) clearInterval(intervalId)
  }
}

/* ── Offline Queue (IndexedDB) ───────────────────────── */

const DB_NAME = 'cops_sos_queue'
const STORE_NAME = 'pending_alerts'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function queueSOSAlert(payload: Record<string, unknown>) {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).add({ ...payload, queued_at: Date.now() })
    await new Promise((r, j) => { tx.oncomplete = r; tx.onerror = j })
    db.close()
  } catch (e) {
    console.error('Failed to queue SOS:', e)
  }
}

export async function getQueuedAlerts(): Promise<any[]> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()
    return new Promise((resolve) => {
      request.onsuccess = () => { db.close(); resolve(request.result || []) }
      request.onerror = () => { db.close(); resolve([]) }
    })
  } catch { return [] }
}

export async function clearQueuedAlerts() {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).clear()
    await new Promise((r) => { tx.oncomplete = r })
    db.close()
  } catch {}
}

/* ── sendBeacon for Network Resilience ───────────────── */

export function sendSOSBeacon(url: string, payload: Record<string, unknown>): boolean {
  if ('sendBeacon' in navigator) {
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
    return navigator.sendBeacon(url, blob)
  }
  return false
}

/* ── Wake Lock ───────────────────────────────────────── */

let wakeLockSentinel: WakeLockSentinel | null = null

export async function acquireWakeLock(): Promise<boolean> {
  try {
    if ('wakeLock' in navigator) {
      wakeLockSentinel = await (navigator as any).wakeLock.request('screen')
      // Re-acquire on visibility change
      document.addEventListener('visibilitychange', handleVisibilityChange)
      return true
    }
  } catch {}
  return false
}

export function releaseWakeLock() {
  if (wakeLockSentinel) {
    wakeLockSentinel.release()
    wakeLockSentinel = null
  }
  document.removeEventListener('visibilitychange', handleVisibilityChange)
}

async function handleVisibilityChange() {
  if (document.visibilityState === 'visible' && !wakeLockSentinel) {
    try {
      wakeLockSentinel = await (navigator as any).wakeLock.request('screen')
    } catch {}
  }
}

/* ── Shake Detection ─────────────────────────────────── */

export function startShakeDetection(
  onShake: () => void,
  threshold = 25,
  requiredShakes = 3,
  windowMs = 1500
): () => void {
  const shakeTimes: number[] = []

  const handler = (event: DeviceMotionEvent) => {
    const acc = event.accelerationIncludingGravity
    if (!acc) return

    const magnitude = Math.sqrt(
      (acc.x || 0) ** 2 + (acc.y || 0) ** 2 + (acc.z || 0) ** 2
    )

    if (magnitude > threshold) {
      const now = Date.now()
      shakeTimes.push(now)

      // Remove old shakes outside the window
      while (shakeTimes.length > 0 && shakeTimes[0] < now - windowMs) {
        shakeTimes.shift()
      }

      if (shakeTimes.length >= requiredShakes) {
        shakeTimes.length = 0
        onShake()
      }
    }
  }

  if ('DeviceMotionEvent' in window) {
    window.addEventListener('devicemotion', handler)
  }

  return () => {
    window.removeEventListener('devicemotion', handler)
  }
}

/* ── SOS Settings (localStorage + DB sync) ───────────── */

export type SOSSettings = {
  holdDuration: number
  shakeEnabled: boolean
  emergencyContacts: string[]
  gpsAccuracy: 'high' | 'balanced'
  smsAlert: boolean
}

const SETTINGS_KEY = 'cops_sos_settings'

export const DEFAULT_SETTINGS: SOSSettings = {
  holdDuration: 2,
  shakeEnabled: false,
  emergencyContacts: [],
  gpsAccuracy: 'high',
  smsAlert: false,
}

export function loadLocalSettings(): SOSSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
  } catch { return DEFAULT_SETTINGS }
}

export function saveLocalSettings(settings: SOSSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {}
}
