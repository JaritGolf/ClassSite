/**
 * Audit 17 — Item 7: No third-party analytics/telemetry on student data
 * (non-negotiable rule #9, spec §25.2).
 *
 * Static guard: scans the application source for known analytics/telemetry
 * vendor tokens. Pure filesystem scan — no DB.
 */

import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

const SRC_ROOT = join(__dirname, '../../../src')

// Known third-party analytics / session-replay / telemetry signatures.
const FORBIDDEN_PATTERNS: RegExp[] = [
  /google-analytics\.com/i,
  /googletagmanager\.com/i,
  /\bgtag\s*\(/,
  /\bga\s*\(\s*['"](create|send)['"]/,
  /cdn\.segment\.com/i,
  /\banalytics\.(track|identify|page)\s*\(/,
  /mixpanel/i,
  /static\.hotjar\.com/i,
  /\bhj\s*\(/,
  /fullstory\.com/i,
  /\bFS\.identify\s*\(/,
  /amplitude/i,
  /posthog/i,
  /datadog-rum|@datadog\/browser-rum/i,
  /js\.sentry-cdn\.com/i,
  // ADR 0015: plain YouTube embeds/thumbnails phone Google on page load.
  // Only the click-to-load youtube-nocookie facade is sanctioned (below) —
  // note "youtube-nocookie.com" does NOT substring-match /youtube\.com/.
  /youtube\.com/i,
  /ytimg\.com/i,
  /img\.youtube/i,
]

// The single sanctioned location for the privacy-enhanced embed host.
const NOCOOKIE_ALLOWED_FILE = 'components/student/mission/media/VideoStepView.tsx'

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...walk(full))
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
      out.push(full)
    }
  }
  return out
}

describe('Audit 17 — Item 7: no third-party analytics', () => {
  it('contains no known analytics/telemetry vendor signatures in src/', () => {
    const files = walk(SRC_ROOT)
    const offenders: string[] = []

    for (const file of files) {
      const content = readFileSync(file, 'utf8')
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(content)) {
          offenders.push(`${file} :: ${pattern}`)
        }
      }
    }

    expect(offenders).toEqual([])
  })

  it('youtube-nocookie.com appears only in the sanctioned click-to-load facade (ADR 0015)', () => {
    const files = walk(SRC_ROOT)
    const containing = files
      .filter((file) => /youtube-nocookie\.com/i.test(readFileSync(file, 'utf8')))
      .map((file) => file.slice(SRC_ROOT.length + 1))

    expect(containing).toEqual([NOCOOKIE_ALLOWED_FILE])
  })
})
