'use client'

/**
 * React access to device-local progress.
 *
 * `hydrated` is false during server render and the first client render, when
 * the app has not yet looked at localStorage. Components must not draw
 * conclusions from progress until it is true — otherwise a returning student
 * briefly sees a brand-new map.
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import {
  getProgress,
  getServerProgress,
  subscribeProgress,
  updateProgress,
} from './store'
import type { LocalProgress } from './types'

export function useLocalProgress(): {
  progress: LocalProgress
  hydrated: boolean
  update: (change: (current: LocalProgress) => LocalProgress) => LocalProgress
} {
  const progress = useSyncExternalStore(subscribeProgress, getProgress, getServerProgress)
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])
  const update = useCallback(
    (change: (current: LocalProgress) => LocalProgress) => updateProgress(change),
    []
  )
  return { progress, hydrated, update }
}
