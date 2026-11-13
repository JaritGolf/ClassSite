/**
 * Save progress to a file and load it back.
 *
 * School Chromebooks are wiped, swapped and shared, and there is no account to
 * restore from — the file is the backup. It is plain JSON the student keeps
 * (Google Drive, a USB stick, the Downloads folder); the app never uploads it.
 *
 * The file holds the same anonymous progress as localStorage: no name, no
 * email, no class. The file NAME is fixed apart from the date for the same
 * reason — students should not be prompted to put their name anywhere.
 */

import { parseProgress } from './schema'
import type { LocalProgress } from './types'

export const PROGRESS_FILE_KIND = 'my-civics-class-progress'

interface ProgressFile {
  kind: typeof PROGRESS_FILE_KIND
  savedAt: string
  progress: LocalProgress
}

export function progressFileName(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `my-civics-class-progress-${y}-${m}-${d}.json`
}

export function serializeProgress(progress: LocalProgress, now: Date = new Date()): string {
  const file: ProgressFile = {
    kind: PROGRESS_FILE_KIND,
    savedAt: now.toISOString(),
    progress,
  }
  return JSON.stringify(file, null, 2)
}

export type ImportResult =
  | { ok: true; progress: LocalProgress; savedAt: string | null }
  | { ok: false; reason: string }

/** Parse the text of a saved progress file. Never throws. */
export function parseProgressFile(text: string): ImportResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'That file could not be read. Choose the progress file you saved from this site.' }
  }
  if (!data || typeof data !== 'object') {
    return { ok: false, reason: 'That file is not a My Civics Class progress file.' }
  }
  const file = data as Partial<ProgressFile>
  if (file.kind !== PROGRESS_FILE_KIND) {
    return { ok: false, reason: 'That file is not a My Civics Class progress file.' }
  }
  const progress = parseProgress(file.progress)
  if (!progress) {
    return {
      ok: false,
      reason: 'That progress file is damaged or was made by a different version of the site.',
    }
  }
  return {
    ok: true,
    progress,
    savedAt: typeof file.savedAt === 'string' ? file.savedAt : null,
  }
}
