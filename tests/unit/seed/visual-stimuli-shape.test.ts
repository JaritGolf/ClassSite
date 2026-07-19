/**
 * Visual-stimuli shape (pure, no DB) — ADR 0018 pilot.
 *
 * Every Canva-generated visual stimulus must ship with its asset on disk,
 * an attribution manifest entry, a real (non-EXCERPT) stimulus type, and all
 * three reading-load text variants — the text IS the accessible equivalent
 * of the visual, so a thin variant would silently break the accessibility
 * contract (rule #10).
 */

import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { VISUAL_STIMULI } from '../../../seed/stimuli_visuals'

const PUBLIC_ROOT = join(__dirname, '../../../public')
const ATTRIBUTIONS: { file: string; license: string }[] = JSON.parse(
  readFileSync(join(PUBLIC_ROOT, 'stimuli/attributions.json'), 'utf8')
)

describe('Visual stimuli — asset + text-equivalent contract', () => {
  it('declares at least one visual stimulus', () => {
    expect(VISUAL_STIMULI.length).toBeGreaterThanOrEqual(1)
  })

  it('titles are unique and carry the [SEED] find-key prefix', () => {
    const titles = VISUAL_STIMULI.map((d) => d.title)
    expect(new Set(titles).size).toBe(titles.length)
    for (const t of titles) expect(t.startsWith('[SEED]')).toBe(true)
  })

  for (const def of VISUAL_STIMULI) {
    describe(def.title, () => {
      it('asset exists on disk under public/ and is same-origin', () => {
        expect(def.mediaUrl.startsWith('/')).toBe(true)
        expect(def.mediaUrl).not.toMatch(/^https?:\/\//)
        expect(existsSync(join(PUBLIC_ROOT, def.mediaUrl.slice(1)))).toBe(true)
      })

      it('asset has an attribution manifest entry', () => {
        const entry = ATTRIBUTIONS.find((a) => `/${a.file}` === def.mediaUrl)
        expect(entry).toBeDefined()
        expect(entry!.license.length).toBeGreaterThan(0)
      })

      it('uses a genuinely visual stimulus type', () => {
        expect(['EXCERPT', 'NONE']).not.toContain(def.stimulusType)
      })

      it('carries substantial text equivalents at all three reading loads', () => {
        for (const text of [def.level1, def.level2, def.level3]) {
          expect(text.trim().length).toBeGreaterThan(150)
        }
        // Levels must actually differ (a copy-pasted variant defeats the ladder)
        expect(def.level1).not.toBe(def.level2)
        expect(def.level2).not.toBe(def.level3)
      })

      it('attaches to at least one question', () => {
        expect(def.attachQuestionKeys.length).toBeGreaterThanOrEqual(1)
      })
    })
  }
})
