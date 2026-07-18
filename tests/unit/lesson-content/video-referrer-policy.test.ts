/**
 * Regression guard: `VideoStepView`'s iframe must use `referrerPolicy="origin"`.
 *
 * `referrerPolicy="no-referrer"` was the original ADR 0015 choice but was found
 * live to make YouTube's player reject every embed with "Error 153: Video
 * player configuration error" — the player requires some referrer to validate
 * the request. `origin` sends only the site's origin (never the specific
 * lesson/benchmark path), preserving the facade's privacy intent without
 * breaking playback. Static source guard (no component-rendering test harness
 * exists in this project — see jest.config.ts, node environment, .ts-only
 * testMatch) — pins the literal so this can't silently regress back to a
 * setting that breaks every video.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const VIDEO_STEP_VIEW_PATH = join(
  __dirname,
  '../../../src/components/student/mission/media/VideoStepView.tsx'
)

describe('VideoStepView referrerPolicy', () => {
  const source = readFileSync(VIDEO_STEP_VIEW_PATH, 'utf8')

  it('sets referrerPolicy="origin" on the video iframe', () => {
    expect(source).toMatch(/referrerPolicy="origin"/)
  })

  it('never reintroduces referrerPolicy="no-referrer" (breaks YouTube embeds — Error 153)', () => {
    expect(source).not.toMatch(/referrerPolicy="no-referrer"/)
  })
})
