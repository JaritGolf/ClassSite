/**
 * Suggestion Box — page-location resolution (pure).
 *
 * The highest-value assertions here are the ORDERING ones: ROUTE_DEFS is a
 * hand-maintained, most-specific-first list, so a nested route landing on its
 * parent's pattern is the most likely regression in that file.
 */

import { labelForPathname, resolvePageLocation } from '@/lib/suggestions/location'

describe('resolvePageLocation — static routes', () => {
  it.each([
    ['/student/dashboard', 'Dashboard'],
    ['/student/map', 'Mission Map'],
    ['/student/daily-drill', 'Daily Drill'],
    ['/student/badges', 'Badges'],
    ['/student/settings', 'Settings'],
    ['/teacher/dashboard', 'Teacher Dashboard'],
    ['/teacher/reports', 'Reports'],
    ['/admin/reports', 'Admin Reports'],
    ['/admin/audit', 'Admin — Audit Log'],
    ['/parent/dashboard', 'Family Dashboard'],
    ['/', 'Landing page'],
  ])('%s resolves to "%s"', (pathname, label) => {
    const result = resolvePageLocation(pathname)
    expect(result.pageLabel).toBe(label)
    expect(result.routePattern).toBe(pathname)
  })
})

describe('resolvePageLocation — dynamic segments', () => {
  it('parameterizes a mission code', () => {
    expect(resolvePageLocation('/student/mission/SS.7.CG.1.1')).toEqual({
      routePattern: '/student/mission/[benchmarkCode]',
      pageLabel: 'Mission page',
    })
  })

  it('parameterizes an assessment id', () => {
    expect(resolvePageLocation('/student/assessment/clx123abc').routePattern).toBe(
      '/student/assessment/[assessmentId]'
    )
  })

  it('groups different ids onto the same pattern', () => {
    const a = resolvePageLocation('/student/mission/SS.7.CG.1.1')
    const b = resolvePageLocation('/student/mission/SS.7.CG.3.12')
    expect(a.routePattern).toBe(b.routePattern)
  })

  it('does not let a dynamic segment swallow a slash', () => {
    // /student/mission/[benchmarkCode] uses [^/]+, so a two-segment tail must NOT
    // match it — otherwise a nested route would be mislabeled as its parent.
    expect(resolvePageLocation('/student/mission/a/b').pageLabel).toBe('Unknown page')
  })
})

describe('resolvePageLocation — ordering (most specific wins)', () => {
  it('lesson /edit beats the bare [benchmarkCode]', () => {
    expect(resolvePageLocation('/teacher/lessons/SS.7.CG.1.1/edit')).toEqual({
      routePattern: '/teacher/lessons/[benchmarkCode]/edit',
      pageLabel: 'Lesson Editor',
    })
  })

  it('lesson /walkthrough beats the bare [benchmarkCode]', () => {
    expect(resolvePageLocation('/teacher/lessons/SS.7.CG.1.1/walkthrough').routePattern).toBe(
      '/teacher/lessons/[benchmarkCode]/walkthrough'
    )
  })

  it('the bare lesson route still resolves on its own', () => {
    expect(resolvePageLocation('/teacher/lessons/SS.7.CG.1.1').routePattern).toBe(
      '/teacher/lessons/[benchmarkCode]'
    )
  })

  it('/parent-summary beats the bare [studentId]', () => {
    expect(resolvePageLocation('/teacher/students/abc123/parent-summary').routePattern).toBe(
      '/teacher/students/[studentId]/parent-summary'
    )
  })

  it('students/class/[classId] beats students/[studentId]', () => {
    expect(resolvePageLocation('/teacher/students/class/cls_1')).toEqual({
      routePattern: '/teacher/students/class/[classId]',
      pageLabel: 'Class roster',
    })
  })

  it('republic-challenge sub-pages beat the hub', () => {
    expect(resolvePageLocation('/student/republic-challenge/category').pageLabel).toBe(
      'Republic Challenge — Category'
    )
    expect(resolvePageLocation('/student/republic-challenge/source-sprint').pageLabel).toBe(
      'Republic Challenge — Source Sprint'
    )
    expect(resolvePageLocation('/student/republic-challenge').pageLabel).toBe(
      'Republic Challenge'
    )
  })

  it('content/bulk-approve beats content', () => {
    expect(resolvePageLocation('/teacher/content/bulk-approve').pageLabel).toBe('Bulk Approve')
    expect(resolvePageLocation('/teacher/content').pageLabel).toBe('Content Approval')
  })
})

describe('resolvePageLocation — normalization', () => {
  it('strips a query string', () => {
    expect(resolvePageLocation('/teacher/reports?tab=suggestions&status=NEW')).toEqual({
      routePattern: '/teacher/reports',
      pageLabel: 'Reports',
    })
  })

  it('strips a hash', () => {
    expect(resolvePageLocation('/teacher/benchmarks#unit-unit-2').pageLabel).toBe('Benchmarks')
  })

  it('collapses a trailing slash', () => {
    expect(resolvePageLocation('/student/dashboard/').pageLabel).toBe('Dashboard')
  })

  it('treats an empty string as the root', () => {
    expect(resolvePageLocation('').routePattern).toBe('/')
  })

  it('keeps the root as "/"', () => {
    expect(resolvePageLocation('/').routePattern).toBe('/')
  })
})

describe('resolvePageLocation — unknown and hostile input', () => {
  it('falls back to the normalized path with an Unknown page label', () => {
    expect(resolvePageLocation('/student/some-future-page')).toEqual({
      routePattern: '/student/some-future-page',
      pageLabel: 'Unknown page',
    })
  })

  it('does not blow up on traversal-looking input', () => {
    const result = resolvePageLocation('/student/../../etc/passwd')
    expect(result.pageLabel).toBe('Unknown page')
    expect(typeof result.routePattern).toBe('string')
  })

  it('clamps an absurdly long pathname', () => {
    const long = `/student/${'x'.repeat(5000)}`
    const result = resolvePageLocation(long)
    expect(result.routePattern.length).toBeLessThanOrEqual(512)
  })
})

describe('labelForPathname', () => {
  it('returns just the label', () => {
    expect(labelForPathname('/student/map')).toBe('Mission Map')
  })

  it('returns the fallback label for an unknown route', () => {
    expect(labelForPathname('/nope')).toBe('Unknown page')
  })
})
