'use client'

import { useState } from 'react'
import { NarrativeOverlay } from './NarrativeOverlay'

interface Beat {
  beatKey: string
  unitId: string
  npcName: string
  dialogue: string
}

interface NarrativeOverlayWrapperProps {
  beat: Beat | null
}

export function NarrativeOverlayWrapper({ beat: initialBeat }: NarrativeOverlayWrapperProps) {
  const [beat, setBeat] = useState<Beat | null>(initialBeat)
  return <NarrativeOverlay beat={beat} onDismiss={() => setBeat(null)} />
}
