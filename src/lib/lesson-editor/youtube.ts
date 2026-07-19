/**
 * YouTube video-existence check for the lesson content editor.
 *
 * VideoSchema's regex only validates ID *format* (11 alnum/_/- chars) —
 * it can't tell a real video from a typo. This calls YouTube's public,
 * unauthenticated oEmbed endpoint to catch a bad id at edit time, before it
 * ever goes live to students.
 *
 * Fails CLOSED: a network error or timeout rejects the edit rather than
 * silently accepting it. This is a low-frequency, human-initiated action —
 * "try again in a minute" is a trivial cost, whereas fail-open would defeat
 * the entire point of this check.
 */

const OEMBED_TIMEOUT_MS = 5000

export class YoutubeVerificationError extends Error {
  constructor(public readonly code: 'NOT_FOUND' | 'UNVERIFIABLE') {
    super(
      code === 'NOT_FOUND'
        ? 'This YouTube video could not be found'
        : "Couldn't verify this YouTube video right now"
    )
    this.name = 'YoutubeVerificationError'
  }
}

export async function assertYoutubeVideoExists(youtubeId: string): Promise<void> {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${youtubeId}`
  )}&format=json`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), OEMBED_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (res.ok) return
    if (res.status === 404) throw new YoutubeVerificationError('NOT_FOUND')
    throw new YoutubeVerificationError('UNVERIFIABLE')
  } catch (e) {
    if (e instanceof YoutubeVerificationError) throw e
    throw new YoutubeVerificationError('UNVERIFIABLE')
  } finally {
    clearTimeout(timeout)
  }
}
