/**
 * Unit Tests: Route Guard — checkRouteAccess
 *
 * Tests the pure role-check function used by src/middleware.ts.
 * No mocking needed — checkRouteAccess has no external dependencies.
 *
 * Covers all Audit 2 role-blocking scenarios:
 *   ✓ Unauthenticated access to unprotected routes → allow
 *   ✓ Unauthenticated access to protected routes → redirect-login
 *   ✓ STUDENT → /student/* → allow
 *   ✓ STUDENT → /teacher/* → redirect-unauthorized
 *   ✓ TEACHER → /student/* → redirect-unauthorized
 *   ✓ ADMIN → all routes → allow (super-access)
 */

import { checkRouteAccess } from '@/lib/auth/route-guard'

describe('checkRouteAccess — unauthenticated', () => {
  it('allows unauthenticated access to unprotected routes', () => {
    expect(checkRouteAccess('/', null)).toBe('allow')
    expect(checkRouteAccess('/login', null)).toBe('allow')
    expect(checkRouteAccess('/api/health', null)).toBe('allow')
    expect(checkRouteAccess('/unauthorized', null)).toBe('allow')
  })

  it('blocks unauthenticated access to /student/*', () => {
    expect(checkRouteAccess('/student/dashboard', null)).toBe('redirect-login')
    expect(checkRouteAccess('/student/missions/SS.7.CG.1.1', null)).toBe('redirect-login')
  })

  it('blocks unauthenticated access to /teacher/*', () => {
    expect(checkRouteAccess('/teacher/dashboard', null)).toBe('redirect-login')
  })

  it('blocks unauthenticated access to /parent/*', () => {
    expect(checkRouteAccess('/parent/dashboard', null)).toBe('redirect-login')
  })

  it('blocks unauthenticated access to /admin/*', () => {
    expect(checkRouteAccess('/admin/users', null)).toBe('redirect-login')
  })
})

describe('checkRouteAccess — STUDENT role', () => {
  it('allows STUDENT to access /student/*', () => {
    expect(checkRouteAccess('/student/dashboard', 'STUDENT')).toBe('allow')
    expect(checkRouteAccess('/student/missions/SS.7.CG.1.1', 'STUDENT')).toBe('allow')
    expect(checkRouteAccess('/student/badges', 'STUDENT')).toBe('allow')
  })

  it('blocks STUDENT from /teacher/*', () => {
    expect(checkRouteAccess('/teacher/dashboard', 'STUDENT')).toBe('redirect-unauthorized')
    expect(checkRouteAccess('/teacher/students/123', 'STUDENT')).toBe('redirect-unauthorized')
  })

  it('blocks STUDENT from /parent/*', () => {
    expect(checkRouteAccess('/parent/dashboard', 'STUDENT')).toBe('redirect-unauthorized')
  })

  it('blocks STUDENT from /admin/*', () => {
    expect(checkRouteAccess('/admin/users', 'STUDENT')).toBe('redirect-unauthorized')
  })

  it('allows STUDENT access to unprotected routes', () => {
    expect(checkRouteAccess('/', 'STUDENT')).toBe('allow')
    expect(checkRouteAccess('/login', 'STUDENT')).toBe('allow')
    expect(checkRouteAccess('/api/health', 'STUDENT')).toBe('allow')
  })
})

describe('checkRouteAccess — TEACHER role', () => {
  it('allows TEACHER to access /teacher/*', () => {
    expect(checkRouteAccess('/teacher/dashboard', 'TEACHER')).toBe('allow')
    expect(checkRouteAccess('/teacher/classes/1', 'TEACHER')).toBe('allow')
  })

  it('blocks TEACHER from /student/*', () => {
    expect(checkRouteAccess('/student/dashboard', 'TEACHER')).toBe('redirect-unauthorized')
  })

  it('blocks TEACHER from /parent/*', () => {
    expect(checkRouteAccess('/parent/dashboard', 'TEACHER')).toBe('redirect-unauthorized')
  })

  it('blocks TEACHER from /admin/*', () => {
    expect(checkRouteAccess('/admin/users', 'TEACHER')).toBe('redirect-unauthorized')
  })
})

describe('checkRouteAccess — PARENT role', () => {
  it('allows PARENT to access /parent/*', () => {
    expect(checkRouteAccess('/parent/dashboard', 'PARENT')).toBe('allow')
  })

  it('blocks PARENT from /student/*', () => {
    expect(checkRouteAccess('/student/dashboard', 'PARENT')).toBe('redirect-unauthorized')
  })

  it('blocks PARENT from /teacher/*', () => {
    expect(checkRouteAccess('/teacher/dashboard', 'PARENT')).toBe('redirect-unauthorized')
  })
})

describe('checkRouteAccess — ADMIN super-access', () => {
  it('allows ADMIN to access /admin/*', () => {
    expect(checkRouteAccess('/admin/users', 'ADMIN')).toBe('allow')
    expect(checkRouteAccess('/admin/curriculum', 'ADMIN')).toBe('allow')
  })

  it('allows ADMIN to access /student/* (super-access)', () => {
    expect(checkRouteAccess('/student/dashboard', 'ADMIN')).toBe('allow')
    expect(checkRouteAccess('/student/missions/SS.7.CG.1.1', 'ADMIN')).toBe('allow')
  })

  it('allows ADMIN to access /teacher/* (super-access)', () => {
    expect(checkRouteAccess('/teacher/dashboard', 'ADMIN')).toBe('allow')
  })

  it('allows ADMIN to access /parent/* (super-access)', () => {
    expect(checkRouteAccess('/parent/dashboard', 'ADMIN')).toBe('allow')
  })

  it('allows ADMIN to access unprotected routes', () => {
    expect(checkRouteAccess('/', 'ADMIN')).toBe('allow')
    expect(checkRouteAccess('/api/health', 'ADMIN')).toBe('allow')
  })
})
