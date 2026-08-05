/**
 * Progress checkpoints never gate content.
 *
 * The whole point of the checkpoint system is that it DESCRIBES how far a student
 * got by a date. It must never decide what a student may open — a student who is
 * ready to run the entire course in October has to be able to.
 *
 * Static guard: the modules that decide access must not depend on the checkpoint
 * module at all. Display surfaces (dashboard, map, teacher/parent views) are
 * allowed to import it — they render levels, they don't grant access.
 *
 * Pure filesystem scan — no DB.
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'fs'
import { join } from 'path'

const REPO_ROOT = join(__dirname, '../../..')
const CHECKPOINT_IMPORT = /progress-checkpoints/

/**
 * Modules that decide whether a student may open or submit something. None of
 * these may consult checkpoints.
 */
const ACCESS_DECIDING_PATHS = [
  // Progression: which missions are unlocked/open.
  'src/lib/mastery',
  // Assessment lifecycle: starting and grading attempts.
  'src/lib/assessment',
  // Spaced review and adaptive item selection.
  'src/lib/spaced-retrieval',
  'src/lib/adaptive-difficulty',
  // The mission page itself, which redirects/gates.
  'src/app/student/mission',
  // Assessment routes.
  'src/app/api/assessment',
]

function walk(dir: string): string[] {
  if (!existsSync(dir)) return []
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...walk(full))
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full)
    }
  }
  return out
}

describe('progress checkpoints do not gate content', () => {
  it('no access-deciding module imports the checkpoint module', () => {
    const offenders: string[] = []

    for (const rel of ACCESS_DECIDING_PATHS) {
      const abs = join(REPO_ROOT, rel)
      for (const file of walk(abs)) {
        const content = readFileSync(file, 'utf8')
        if (CHECKPOINT_IMPORT.test(content)) {
          offenders.push(file.slice(REPO_ROOT.length + 1))
        }
      }
    }

    expect(offenders).toEqual([])
  })

  it('the guarded paths actually exist (so this test cannot silently pass)', () => {
    for (const rel of ACCESS_DECIDING_PATHS) {
      const files = walk(join(REPO_ROOT, rel))
      expect(files.length).toBeGreaterThan(0)
    }
  })

  it('the checkpoint module itself never writes StudentProgress', () => {
    // Levels are derived from progress; they must not manufacture it.
    const files = walk(join(REPO_ROOT, 'src/lib/progress-checkpoints'))
    expect(files.length).toBeGreaterThan(0)

    const offenders: string[] = []
    for (const file of files) {
      const content = readFileSync(file, 'utf8')
      if (/studentProgress\s*\.\s*(create|createMany|update|updateMany|upsert|delete|deleteMany)/.test(content)) {
        offenders.push(file.slice(REPO_ROOT.length + 1))
      }
    }
    expect(offenders).toEqual([])
  })
})
