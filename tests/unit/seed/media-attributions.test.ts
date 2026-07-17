/**
 * ADR 0015 — public-domain media attribution manifest.
 *
 * Every self-hosted image under public/media/** must have a complete
 * attribution entry (and vice versa): title, author, source, sourceUrl,
 * license, retrieved date. Pure filesystem check — no DB.
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'fs'
import { join } from 'path'

const PUBLIC_ROOT = join(__dirname, '../../../public')
const MEDIA_ROOT = join(PUBLIC_ROOT, 'media')
const MANIFEST = join(MEDIA_ROOT, 'attributions.json')

interface Attribution {
  file: string
  title: string
  author: string
  date: string
  source: string
  sourceUrl: string
  license: string
  retrieved: string
}

function walkImages(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walkImages(full))
    else if (/\.(jpe?g|png|webp|gif)$/i.test(entry)) out.push(full)
  }
  return out
}

describe('ADR 0015 — media attribution manifest', () => {
  const manifest: Attribution[] = JSON.parse(readFileSync(MANIFEST, 'utf8'))

  it('every manifest entry is complete and points at an existing file', () => {
    expect(manifest.length).toBeGreaterThan(0)
    for (const entry of manifest) {
      for (const field of [
        'file',
        'title',
        'author',
        'date',
        'source',
        'sourceUrl',
        'license',
        'retrieved',
      ] as const) {
        expect(`${entry.file ?? '?'}:${field}:${entry[field] ?? ''}`).toMatch(/:.+$/)
      }
      expect(entry.file).toMatch(/^\/media\//)
      expect(entry.license.toLowerCase()).toContain('public domain')
      expect(existsSync(join(PUBLIC_ROOT, entry.file))).toBe(true)
    }
  })

  it('every image file under public/media has a manifest entry', () => {
    const files = walkImages(MEDIA_ROOT).map((f) => f.slice(PUBLIC_ROOT.length))
    const manifestFiles = new Set(manifest.map((e) => e.file))
    const orphans = files.filter((f) => !manifestFiles.has(f))
    expect(orphans).toEqual([])
  })

  it('manifest has no duplicate files', () => {
    const seen = manifest.map((e) => e.file)
    expect(new Set(seen).size).toBe(seen.length)
  })
})
