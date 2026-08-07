/**
 * App Router modules may only export what Next.js recognises.
 *
 * WHY THIS TEST EXISTS: a `route.ts` that exports anything beyond its HTTP
 * handlers and Next's own config fields fails `next build` with
 *
 *   Type error: Route "src/app/.../route.ts" does not match the required types
 *   of a Next.js Route. "X" is not a valid Route export field.
 *
 * `tsc --noEmit` does NOT catch it — the constraint is Next's, applied to the
 * generated `.next/types` route shims, not TypeScript's. Nor does any runtime
 * test, because the module still imports and executes perfectly well. It fails
 * only at `next build`, which is Tier 3 / non-blocking under ADR 0006 — so a
 * violation sails through both blocking tiers and surfaces as a red deployment.
 *
 * That is exactly how `IMPORT_URL_AUDIT_ACTION` reached production on
 * 2026-08-07. This guard moves the failure into Tier 1/2 where it blocks.
 *
 * Pure filesystem scan — no DB, no compilation. Same shape as
 * tests/integration/audit17/04-no-analytics-guard.test.ts.
 */

import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

const APP_ROOT = join(__dirname, '../../../src/app')

/**
 * https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config
 * plus the HTTP methods a Route Handler may define.
 */
const ROUTE_ALLOWED = new Set([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
  'dynamic',
  'dynamicParams',
  'revalidate',
  'fetchCache',
  'runtime',
  'preferredRegion',
  'maxDuration',
  'generateStaticParams',
])

/** Pages, layouts and the other segment files share the segment config plus metadata. */
const PAGE_ALLOWED = new Set([
  'default',
  'dynamic',
  'dynamicParams',
  'revalidate',
  'fetchCache',
  'runtime',
  'preferredRegion',
  'maxDuration',
  'metadata',
  'generateMetadata',
  'viewport',
  'generateViewport',
  'generateStaticParams',
])

const PAGE_FILES = /^(page|layout|template|loading|error|global-error|not-found|default)\.tsx?$/
const ROUTE_FILES = /^route\.tsx?$/

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...walk(full))
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full)
    }
  }
  return out
}

/**
 * Top-level export names in a module.
 *
 * `export type` / `export interface` are deliberately skipped: they are erased
 * at compile time, so Next never sees them and they are legal in a route file.
 * A bare `export *` is reported as `*` because its names cannot be resolved
 * statically here — and an unresolvable export surface is itself unsafe in a
 * route module.
 */
function topLevelExports(source: string): string[] {
  const names: string[] = []

  for (const raw of source.split('\n')) {
    // Anchored at column 0: a top-level export is never indented in this
    // codebase, and this keeps `export` inside strings/comments out of scope.
    if (!raw.startsWith('export')) continue
    const line = raw.trim()

    if (/^export\s+(type|interface)\b/.test(line)) continue
    if (/^export\s+default\b/.test(line)) {
      names.push('default')
      continue
    }

    const decl = line.match(/^export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+(\w+)/)
    if (decl) {
      names.push(decl[1])
      continue
    }

    // `export { handler as GET, handler as POST }` — the exported name is the
    // alias when one is present, otherwise the local name.
    const named = line.match(/^export\s*\{([^}]*)\}/)
    if (named) {
      for (const part of named[1].split(',')) {
        const entry = part.trim()
        if (!entry) continue
        if (/^type\s/.test(entry)) continue
        const alias = entry.match(/\bas\s+(\w+)\s*$/)
        names.push(alias ? alias[1] : entry.split(/\s+/)[0])
      }
      continue
    }

    if (/^export\s*\*/.test(line)) names.push('*')
  }

  return names
}

describe('App Router export contract', () => {
  const files = walk(APP_ROOT)

  it('finds the route files it is meant to be guarding', () => {
    // A silent zero-match walk would make every assertion below pass vacuously.
    const routeCount = files.filter((f) => ROUTE_FILES.test(f.split('/').pop()!)).length
    expect(routeCount).toBeGreaterThan(50)
  })

  it('route.ts exports only HTTP handlers and Next segment config', () => {
    const offenders: string[] = []

    for (const file of files) {
      if (!ROUTE_FILES.test(file.split('/').pop()!)) continue
      const relative = file.slice(APP_ROOT.length + 1)
      for (const name of topLevelExports(readFileSync(file, 'utf8'))) {
        if (!ROUTE_ALLOWED.has(name)) {
          offenders.push(
            `src/app/${relative} exports "${name}" — not a valid Route export. ` +
              `Move it to a module under src/lib/ and import it here.`
          )
        }
      }
    }

    expect(offenders).toEqual([])
  })

  it('page/layout files export only components and Next segment config', () => {
    const offenders: string[] = []

    for (const file of files) {
      if (!PAGE_FILES.test(file.split('/').pop()!)) continue
      const relative = file.slice(APP_ROOT.length + 1)
      for (const name of topLevelExports(readFileSync(file, 'utf8'))) {
        if (!PAGE_ALLOWED.has(name)) {
          offenders.push(`src/app/${relative} exports "${name}" — not a valid Page export.`)
        }
      }
    }

    expect(offenders).toEqual([])
  })
})

describe('topLevelExports — the parser the guard depends on', () => {
  // If this parser silently missed a form, the guard above would pass while
  // letting the real thing through, so its shapes are pinned directly.
  it('reads declaration exports', () => {
    expect(topLevelExports('export const runtime = "nodejs"')).toEqual(['runtime'])
    expect(topLevelExports('export async function POST(req: Request) {}')).toEqual(['POST'])
    expect(topLevelExports('export class Thing {}')).toEqual(['Thing'])
  })

  it('reads aliased named exports, which is how the NextAuth route is written', () => {
    expect(topLevelExports('export { handler as GET, handler as POST }')).toEqual(['GET', 'POST'])
    expect(topLevelExports('export { GET }')).toEqual(['GET'])
  })

  it('ignores type-only exports, which are erased before Next sees them', () => {
    expect(topLevelExports('export type Foo = string')).toEqual([])
    expect(topLevelExports('export interface Bar { a: string }')).toEqual([])
    expect(topLevelExports('export { type Foo }')).toEqual([])
  })

  it('ignores indented and in-string occurrences', () => {
    expect(topLevelExports('  export const nested = 1')).toEqual([])
    expect(topLevelExports('const s = "export const fake = 1"')).toEqual([])
  })

  it('catches the exact export that broke the deploy', () => {
    expect(topLevelExports('export const IMPORT_URL_AUDIT_ACTION = "X"')).toEqual([
      'IMPORT_URL_AUDIT_ACTION',
    ])
  })

  it('flags a star re-export, whose surface cannot be checked statically', () => {
    expect(topLevelExports("export * from './x'")).toEqual(['*'])
  })
})
