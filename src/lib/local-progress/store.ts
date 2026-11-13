/**
 * The device-local progress store.
 *
 * One localStorage key holds everything. Reads and writes happen only in the
 * browser; on the server (and before hydration) every caller sees an empty
 * snapshot, which is exactly what the server knows about a student: nothing.
 *
 * This module makes NO network requests and sets NO cookies. A guard test
 * (tests/unit/guards) fails if either ever appears under src/lib/local-progress.
 */

import { emptyProgress, type LocalProgress } from './types'
import { parseProgress } from './schema'

export const PROGRESS_STORAGE_KEY = 'mcc:progress:v1'

type Listener = () => void

const listeners = new Set<Listener>()
const SERVER_SNAPSHOT: LocalProgress = emptyProgress()
let cache: LocalProgress | null = null

function readFromStorage(): LocalProgress {
  if (typeof window === 'undefined') return SERVER_SNAPSHOT
  try {
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY)
    if (!raw) return emptyProgress()
    return parseProgress(JSON.parse(raw)) ?? emptyProgress()
  } catch {
    // Storage blocked or corrupt — behave as a fresh device.
    return emptyProgress()
  }
}

/** Current progress. Stable reference until something changes it. */
export function getProgress(): LocalProgress {
  if (typeof window === 'undefined') return SERVER_SNAPSHOT
  if (cache === null) cache = readFromStorage()
  return cache
}

export function getServerProgress(): LocalProgress {
  return SERVER_SNAPSHOT
}

function emit() {
  for (const l of listeners) l()
}

/** Replace the stored progress. Returns false if the device refused the write. */
export function setProgress(next: LocalProgress): boolean {
  cache = next
  let saved = true
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(next))
    } catch {
      saved = false
    }
  }
  emit()
  return saved
}

/** Apply a pure change to the stored progress. */
export function updateProgress(change: (current: LocalProgress) => LocalProgress): LocalProgress {
  const next = change(getProgress())
  setProgress(next)
  return next
}

/** Wipe this device's progress. */
export function clearProgress(): void {
  cache = emptyProgress()
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(PROGRESS_STORAGE_KEY)
    } catch {
      /* nothing to do */
    }
  }
  emit()
}

export function subscribeProgress(listener: Listener): () => void {
  listeners.add(listener)
  // Another tab on the same device changed progress — pick it up.
  const onStorage = (e: StorageEvent) => {
    if (e.key === PROGRESS_STORAGE_KEY) {
      cache = readFromStorage()
      listener()
    }
  }
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage)
  }
}

/** Test hook: forget the in-memory copy so the next read hits storage. */
export function resetProgressCacheForTests(): void {
  cache = null
}
