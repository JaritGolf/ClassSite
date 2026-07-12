'use client'

import { useEffect, useRef } from 'react'
import { Mascot } from '@/components/ui/Mascot'

interface Beat {
  beatKey: string
  unitId: string
  npcName: string
  dialogue: string
}

interface NarrativeOverlayProps {
  beat: Beat | null
  onDismiss: () => void
}

export function NarrativeOverlay({ beat, onDismiss }: NarrativeOverlayProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (beat) {
      if (!dialog.open) dialog.showModal()
    } else {
      if (dialog.open) dialog.close()
    }
  }, [beat])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && beat) {
        e.preventDefault()
        handleDismiss()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat])

  async function handleDismiss() {
    if (!beat) return
    await fetch(`/api/narrative/${beat.unitId}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ beatKey: beat.beatKey }),
    })
    onDismiss()
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="npc-name"
      aria-describedby="npc-dialogue"
      className="w-full max-w-md rounded-3xl border-2 border-indigo-100 bg-white p-6 shadow-2xl backdrop:bg-indigo-950/50"
      onCancel={(e) => {
        e.preventDefault()
        handleDismiss()
      }}
    >
      {beat && (
        <div className="flex flex-col gap-4">
          <div className="flex items-end gap-3">
            <Mascot pose="pointing" className="h-16 w-16 flex-shrink-0" />
            <div className="mb-1">
              <p className="font-display text-xs font-bold uppercase tracking-widest text-indigo-600">
                A message from
              </p>
              <span id="npc-name" className="font-display text-lg font-bold text-gray-900">
                {beat.npcName}
              </span>
            </div>
          </div>
          {/* Speech bubble */}
          <div className="relative rounded-2xl border-2 border-indigo-100 bg-indigo-50 p-4">
            <div
              aria-hidden="true"
              className="absolute -top-2.5 left-8 h-4 w-4 rotate-45 border-l-2 border-t-2 border-indigo-100 bg-indigo-50"
            />
            <p id="npc-dialogue" className="text-base leading-relaxed text-gray-800">
              {beat.dialogue}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="self-end rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-5 py-2 font-display text-base font-bold text-white transition-colors hover:bg-indigo-500 active:translate-y-[3px] active:border-b-0"
          >
            Got it
          </button>
        </div>
      )}
    </dialog>
  )
}
