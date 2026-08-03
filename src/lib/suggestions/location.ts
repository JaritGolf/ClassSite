/**
 * Suggestion Box — page-location resolution (ADR 0021). Pure; no DB access.
 *
 * Turns a concrete pathname ("/student/mission/SS.7.CG.1.1") into:
 *   - routePattern: "/student/mission/[benchmarkCode]"  — the groupable, PII-free
 *     dimension. This is what "which page confuses people" aggregates on, and the
 *     only location value ever placed in a query string.
 *   - pageLabel:    "Mission page"                      — human-readable.
 *
 * The SERVER is authoritative: `createSuggestion` always calls this and stores its
 * own result. A client-supplied label is honoured only when this table misses, so
 * a route added later still reads sensibly instead of showing "Unknown page".
 *
 * `document.title` is deliberately NOT used as a label source — it's set
 * inconsistently across this app and would produce a label set nobody can group on.
 *
 * MUST stay free of any `@/lib/db` import — `SuggestionBox` deep-imports this file.
 */

import { SUGGESTION_UNKNOWN_PAGE_LABEL } from './constants'

export interface PageLocation {
  routePattern: string
  pageLabel: string
}

interface RouteDef {
  pattern: string
  test: RegExp
  label: string
}

/**
 * ORDERED, most-specific-first. The first match wins, so a nested route must be
 * listed above the parent that would also match it:
 *   /teacher/lessons/[benchmarkCode]/edit  BEFORE  /teacher/lessons/[benchmarkCode]
 * Getting this order wrong is the most likely regression in this file, and
 * `tests/unit/suggestions/location.test.ts` pins the ordering cases explicitly.
 *
 * `[^/]+` (not `.+`) for dynamic segments so a segment can never swallow a slash.
 */
const ROUTE_DEFS: RouteDef[] = [
  // ── Student ──────────────────────────────────────────────────────────────
  { pattern: '/student/dashboard', test: /^\/student\/dashboard$/, label: 'Dashboard' },
  { pattern: '/student/map', test: /^\/student\/map$/, label: 'Mission Map' },
  { pattern: '/student/daily-drill', test: /^\/student\/daily-drill$/, label: 'Daily Drill' },
  {
    pattern: '/student/mission/[benchmarkCode]',
    test: /^\/student\/mission\/[^/]+$/,
    label: 'Mission page',
  },
  {
    pattern: '/student/assessment/[assessmentId]',
    test: /^\/student\/assessment\/[^/]+$/,
    label: 'Assessment',
  },
  {
    pattern: '/student/remediation/[id]',
    test: /^\/student\/remediation\/[^/]+$/,
    label: 'Review activity',
  },
  {
    pattern: '/student/republic-challenge/category',
    test: /^\/student\/republic-challenge\/category$/,
    label: 'Republic Challenge — Category',
  },
  {
    pattern: '/student/republic-challenge/source-sprint',
    test: /^\/student\/republic-challenge\/source-sprint$/,
    label: 'Republic Challenge — Source Sprint',
  },
  {
    pattern: '/student/republic-challenge',
    test: /^\/student\/republic-challenge$/,
    label: 'Republic Challenge',
  },
  {
    pattern: '/student/source-decoder',
    test: /^\/student\/source-decoder$/,
    label: 'Source Decoder',
  },
  { pattern: '/student/source-lab/[id]', test: /^\/student\/source-lab\/[^/]+$/, label: 'Source Lab' },
  { pattern: '/student/strategy', test: /^\/student\/strategy$/, label: 'Strategy' },
  { pattern: '/student/badges', test: /^\/student\/badges$/, label: 'Badges' },
  { pattern: '/student/settings', test: /^\/student\/settings$/, label: 'Settings' },

  // ── Teacher ──────────────────────────────────────────────────────────────
  { pattern: '/teacher/dashboard', test: /^\/teacher\/dashboard$/, label: 'Teacher Dashboard' },
  {
    pattern: '/teacher/classes/[classId]/settings',
    test: /^\/teacher\/classes\/[^/]+\/settings$/,
    label: 'Class Settings',
  },
  { pattern: '/teacher/classes', test: /^\/teacher\/classes$/, label: 'Classes' },
  {
    pattern: '/teacher/benchmarks/[benchmarkId]',
    test: /^\/teacher\/benchmarks\/[^/]+$/,
    label: 'Benchmark detail',
  },
  { pattern: '/teacher/benchmarks', test: /^\/teacher\/benchmarks$/, label: 'Benchmarks' },
  {
    pattern: '/teacher/reporting-categories',
    test: /^\/teacher\/reporting-categories$/,
    label: 'Reporting Categories',
  },
  { pattern: '/teacher/eoc-readiness', test: /^\/teacher\/eoc-readiness$/, label: 'EOC Readiness' },
  {
    pattern: '/teacher/students/class/[classId]',
    test: /^\/teacher\/students\/class\/[^/]+$/,
    label: 'Class roster',
  },
  {
    pattern: '/teacher/students/[studentId]/parent-summary',
    test: /^\/teacher\/students\/[^/]+\/parent-summary$/,
    label: 'Parent Summary',
  },
  {
    pattern: '/teacher/students/[studentId]',
    test: /^\/teacher\/students\/[^/]+$/,
    label: 'Student profile',
  },
  { pattern: '/teacher/students', test: /^\/teacher\/students$/, label: 'Students' },
  { pattern: '/teacher/decay', test: /^\/teacher\/decay$/, label: 'Decay' },
  { pattern: '/teacher/calibration', test: /^\/teacher\/calibration$/, label: 'Calibration' },
  { pattern: '/teacher/questions', test: /^\/teacher\/questions$/, label: 'Question Bank' },
  {
    pattern: '/teacher/lessons/[benchmarkCode]/walkthrough',
    test: /^\/teacher\/lessons\/[^/]+\/walkthrough$/,
    label: 'Lesson Walkthrough',
  },
  {
    pattern: '/teacher/lessons/[benchmarkCode]/edit',
    test: /^\/teacher\/lessons\/[^/]+\/edit$/,
    label: 'Lesson Editor',
  },
  {
    pattern: '/teacher/lessons/[benchmarkCode]',
    test: /^\/teacher\/lessons\/[^/]+$/,
    label: 'Lesson media',
  },
  { pattern: '/teacher/lessons', test: /^\/teacher\/lessons$/, label: 'Lessons' },
  {
    pattern: '/teacher/content/bulk-approve',
    test: /^\/teacher\/content\/bulk-approve$/,
    label: 'Bulk Approve',
  },
  { pattern: '/teacher/content', test: /^\/teacher\/content$/, label: 'Content Approval' },
  { pattern: '/teacher/interventions', test: /^\/teacher\/interventions$/, label: 'Interventions' },
  { pattern: '/teacher/reports', test: /^\/teacher\/reports$/, label: 'Reports' },
  { pattern: '/teacher/settings', test: /^\/teacher\/settings$/, label: 'Teacher Settings' },

  // ── Admin ────────────────────────────────────────────────────────────────
  { pattern: '/admin/reports', test: /^\/admin\/reports$/, label: 'Admin Reports' },
  { pattern: '/admin/users', test: /^\/admin\/users$/, label: 'Admin — Users' },
  {
    pattern: '/admin/lessons/[benchmarkCode]',
    test: /^\/admin\/lessons\/[^/]+$/,
    label: 'Admin — Lesson detail',
  },
  { pattern: '/admin/lessons', test: /^\/admin\/lessons$/, label: 'Admin — Lessons' },
  { pattern: '/admin/eoc-scores', test: /^\/admin\/eoc-scores$/, label: 'Admin — EOC Scores' },
  { pattern: '/admin/calibration', test: /^\/admin\/calibration$/, label: 'Admin — Calibration' },
  { pattern: '/admin/parents', test: /^\/admin\/parents$/, label: 'Admin — Parents' },
  { pattern: '/admin/audit', test: /^\/admin\/audit$/, label: 'Admin — Audit Log' },
  { pattern: '/admin/retention', test: /^\/admin\/retention$/, label: 'Admin — Retention' },

  // ── Parent + shell ───────────────────────────────────────────────────────
  { pattern: '/parent/dashboard', test: /^\/parent\/dashboard$/, label: 'Family Dashboard' },
  {
    pattern: '/parent/students/[studentId]',
    test: /^\/parent\/students\/[^/]+$/,
    label: 'Student progress',
  },
  { pattern: '/login', test: /^\/login$/, label: 'Sign in' },
  { pattern: '/unauthorized', test: /^\/unauthorized$/, label: 'Unauthorized' },
  { pattern: '/', test: /^\/$/, label: 'Landing page' },
]

/**
 * Strip query/hash, collapse a trailing slash, and clamp length so a hostile or
 * malformed pathname can't produce an unbounded `routePattern`.
 */
function normalizePathname(pathname: string): string {
  const withoutQuery = pathname.split(/[?#]/)[0]
  const trimmed = withoutQuery.trim()
  if (trimmed === '' ) return '/'
  const collapsed =
    trimmed.length > 1 && trimmed.endsWith('/') ? trimmed.replace(/\/+$/, '') : trimmed
  return collapsed === '' ? '/' : collapsed.slice(0, 512)
}

export function resolvePageLocation(pathname: string): PageLocation {
  const normalized = normalizePathname(pathname)
  const hit = ROUTE_DEFS.find((def) => def.test.test(normalized))
  if (hit) return { routePattern: hit.pattern, pageLabel: hit.label }
  // Unknown route: keep the normalized path as the pattern so it still groups,
  // and let the caller fall back to a client-supplied label.
  return { routePattern: normalized, pageLabel: SUGGESTION_UNKNOWN_PAGE_LABEL }
}

/** Convenience for the client-side "About: <page>" hint. */
export function labelForPathname(pathname: string): string {
  return resolvePageLocation(pathname).pageLabel
}
