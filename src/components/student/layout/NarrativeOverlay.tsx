'use client'

import { useEffect, useRef } from 'react'

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
      className="rounded-2xl bg-white p-6 shadow-2xl max-w-md w-full backdrop:bg-black/40"
      onCancel={(e) => {
        e.preventDefault()
        handleDismiss()
      }}
    >
      {beat && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
              {beat.npcName[0]}
            </div>
            <span id="npc-name" className="font-semibold text-gray-900">
              {beat.npcName}
            </span>
          </div>
          <p id="npc-dialogue" className="text-gray-700 text-sm leading-relaxed">
            {beat.dialogue}
          </p>
          <button
            onClick={handleDismiss}
            className="self-end rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            Got it
          </button>
        </div>
      )}
    </dialog>
  )
}
