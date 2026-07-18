'use client'

import type { VideoContent } from '@/lib/lesson-content'
import { FormField, inputClasses, textareaClasses } from './form/FormField'

function extractYoutubeId(raw: string): string {
  const trimmed = raw.trim()
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/)([A-Za-z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = trimmed.match(p)
    if (m) return m[1]
  }
  return trimmed
}

export function VideoStepEditor({
  value,
  onChange,
  errors,
}: {
  value: VideoContent
  onChange: (value: VideoContent) => void
  errors?: Partial<Record<string, string>>
}) {
  return (
    <div className="space-y-4">
      <FormField
        label="YouTube video"
        hint="Paste a full YouTube URL or just the 11-character video id."
        error={errors?.youtubeId}
      >
        {(props) => (
          <input
            {...props}
            type="text"
            className={inputClasses}
            value={value.youtubeId}
            onChange={(e) => onChange({ ...value, youtubeId: extractYoutubeId(e.target.value) })}
          />
        )}
      </FormField>

      <FormField label="Video title" error={errors?.title}>
        {(props) => (
          <input
            {...props}
            type="text"
            className={inputClasses}
            value={value.title}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
          />
        )}
      </FormField>

      <FormField
        label="Description"
        hint="Always-visible text alternative (also the read-aloud target) — at least 20 characters."
        error={errors?.description}
      >
        {(props) => (
          <textarea
            {...props}
            className={textareaClasses}
            value={value.description}
            onChange={(e) => onChange({ ...value, description: e.target.value })}
          />
        )}
      </FormField>

      <FormField label="Why watch (optional motivation line)" error={errors?.whyWatch}>
        {(props) => (
          <input
            {...props}
            type="text"
            className={inputClasses}
            value={value.whyWatch ?? ''}
            onChange={(e) => onChange({ ...value, whyWatch: e.target.value || undefined })}
          />
        )}
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Duration label (optional, e.g. 3:45)" error={errors?.durationLabel}>
          {(props) => (
            <input
              {...props}
              type="text"
              maxLength={12}
              className={inputClasses}
              value={value.durationLabel ?? ''}
              onChange={(e) => onChange({ ...value, durationLabel: e.target.value || undefined })}
            />
          )}
        </FormField>
        <FormField label="Start at (seconds, optional)" error={errors?.startSeconds}>
          {(props) => (
            <input
              {...props}
              type="number"
              min={0}
              className={inputClasses}
              value={value.startSeconds ?? ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  startSeconds: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          )}
        </FormField>
      </div>
    </div>
  )
}
