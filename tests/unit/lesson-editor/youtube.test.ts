import { assertYoutubeVideoExists, YoutubeVerificationError } from '@/lib/lesson-editor/youtube'

const originalFetch = global.fetch

afterEach(() => {
  global.fetch = originalFetch
})

describe('assertYoutubeVideoExists', () => {
  it('resolves when oEmbed returns 200', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 }) as unknown as typeof fetch
    await expect(assertYoutubeVideoExists('dQw4w9WgXcQ')).resolves.toBeUndefined()
  })

  it('throws NOT_FOUND on a 404 response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 }) as unknown as typeof fetch
    await expect(assertYoutubeVideoExists('badbadbadbb')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })

  it('throws UNVERIFIABLE on a non-404 error response (fail-closed, not fail-open)', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch
    await expect(assertYoutubeVideoExists('someidhere1')).rejects.toMatchObject({
      code: 'UNVERIFIABLE',
    })
  })

  it('throws UNVERIFIABLE on a network error (fail-closed)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch
    await expect(assertYoutubeVideoExists('someidhere2')).rejects.toBeInstanceOf(
      YoutubeVerificationError
    )
  })
})
