/**
 * Unit Tests: Route Guard — checkRouteAccess
 *
 * The pure role-check used by src/middleware.ts. The student area is public
 * (students have no accounts), so the guard must never ask a student request
 * to sign in.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { checkRouteAccess, ROLE_ROUTES } from '@/lib/auth/route-guard'

describe('checkRouteAccess — the student area is public', () => {
  it('allows /student/* with no session at all', () => {
    expect(checkRouteAccess('/student/dashboard', null)).toBe('allow')
    expect(checkRouteAccess('/student/map', undefined)).toBe('allow')
    expect(checkRouteAccess('/student/mission/SS.7.CG.1.1', null)).toBe('allow')
  })

  it('has no /student or /parent entry in the protected-route table', () => {
    expect(Object.keys(ROLE_ROUTES).sort()).toEqual(['/admin', '/teacher'])
  })

  it('the middleware matcher does not include /student, so it never runs there', () => {
    const src = readFileSync(join(__dirname, '../../../src/middleware.ts'), 'utf8')
    const matcher = src.slice(src.indexOf('matcher:'))
    expect(matcher).not.toMatch(/\/student/)
    expect(matcher).not.toMatch(/\/parent/)
    expect(matcher).toMatch(/\/teacher\/:path\*/)
    expect(matcher).toMatch(/\/admin\/:path\*/)
  })
})

describe('checkRouteAccess — unauthenticated', () => {
  it('allows unprotected routes', () => {
    expect(checkRouteAccess('/', null)).toBe('allow')
    expect(checkRouteAccess('/login', null)).toBe('allow')
    expect(checkRouteAccess('/api/health', null)).toBe('allow')
    expect(checkRouteAccess('/unauthorized', null)).toBe('allow')
  })

  it('sends /teacher/* and /admin/* to the login page', () => {
    expect(checkRouteAccess('/teacher/dashboard', null)).toBe('redirect-login')
    expect(checkRouteAccess('/teacher', null)).toBe('redirect-login')
    expect(checkRouteAccess('/admin/lessons', null)).toBe('redirect-login')
  })
})

describe('checkRouteAccess — TEACHER', () => {
  it('allows /teacher/*', () => {
    expect(checkRouteAccess('/teacher/dashboard', 'TEACHER')).toBe('allow')
    expect(checkRouteAccess('/teacher/lessons/SS.7.CG.1.1/edit', 'TEACHER')).toBe('allow')
  })

  it('blocks /admin/*', () => {
    expect(checkRouteAccess('/admin/lessons', 'TEACHER')).toBe('redirect-unauthorized')
  })
})

describe('checkRouteAccess — ADMIN', () => {
  it('allows every protected route', () => {
    expect(checkRouteAccess('/teacher/dashboard', 'ADMIN')).toBe('allow')
    expect(checkRouteAccess('/admin/lessons', 'ADMIN')).toBe('allow')
  })
})

describe('checkRouteAccess — roles that no longer exist', () => {
  it('a stale STUDENT or PARENT token gets no staff access', () => {
    expect(checkRouteAccess('/teacher/dashboard', 'STUDENT')).toBe('redirect-unauthorized')
    expect(checkRouteAccess('/admin/lessons', 'PARENT')).toBe('redirect-unauthorized')
  })

  it('does not treat a look-alike prefix as protected or as a match', () => {
    expect(checkRouteAccess('/teachers-lounge', null)).toBe('allow')
  })
})
