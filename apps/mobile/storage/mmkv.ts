import { MMKV } from 'react-native-mmkv'
import { type StateStorage } from 'zustand/middleware'

const LAST_BACKGROUND_TIMESTAMP_KEY = 'lastBackgroundTimestamp'

// Lazy initialization with fallback for when JSI isn't ready
let _storage: MMKV | null = null
let _memoryFallback: Map<string, string> = new Map()
let _initializationAttempted = false
let _jsiAvailable = false

function tryInitializeStorage(): boolean {
  if (_storage) return true
  if (_initializationAttempted && !_jsiAvailable) return false

  _initializationAttempted = true

  try {
    _storage = new MMKV({ id: 'mmkv.satsigner' })
    _jsiAvailable = true

    // Migrate any data from memory fallback to MMKV
    if (_memoryFallback.size > 0) {
      _memoryFallback.forEach((value, key) => {
        _storage!.set(key, value)
      })
      _memoryFallback.clear()
    }

    return true
  } catch (error) {
    // JSI not ready yet - use memory fallback
    console.warn('[MMKV] JSI not ready, using memory fallback:', error)
    _jsiAvailable = false
    return false
  }
}

// Retry initialization periodically if it failed initially
function scheduleRetry() {
  if (!_storage && !_jsiAvailable) {
    setTimeout(() => {
      if (tryInitializeStorage()) {
        console.log('[MMKV] Successfully initialized after retry')
      } else {
        scheduleRetry()
      }
    }, 100)
  }
}

const mmkvStorage: StateStorage = {
  setItem: (name, value) => {
    if (tryInitializeStorage()) {
      return _storage!.set(name, value)
    }
    // Fallback to memory
    _memoryFallback.set(name, value)
    scheduleRetry()
  },
  getItem: (name) => {
    if (tryInitializeStorage()) {
      const value = _storage!.getString(name)
      return value ?? null
    }
    // Fallback to memory
    scheduleRetry()
    return _memoryFallback.get(name) ?? null
  },
  removeItem: (name) => {
    if (tryInitializeStorage()) {
      return _storage!.delete(name)
    }
    // Fallback to memory
    _memoryFallback.delete(name)
    scheduleRetry()
  }
}

function setLastBackgroundTimestamp(timestamp: number) {
  if (tryInitializeStorage()) {
    _storage!.set(LAST_BACKGROUND_TIMESTAMP_KEY, timestamp)
  } else {
    _memoryFallback.set(LAST_BACKGROUND_TIMESTAMP_KEY, String(timestamp))
    scheduleRetry()
  }
}

function getLastBackgroundTimestamp() {
  if (tryInitializeStorage()) {
    return _storage!.getNumber(LAST_BACKGROUND_TIMESTAMP_KEY) ?? null
  }
  // Fallback to memory
  scheduleRetry()
  const val = _memoryFallback.get(LAST_BACKGROUND_TIMESTAMP_KEY)
  return val ? Number(val) : null
}

export default mmkvStorage
export { getLastBackgroundTimestamp, mmkvStorage, setLastBackgroundTimestamp }
