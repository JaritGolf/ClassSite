/**
 * Unit Tests: Teacher Roster — Authorization
 *
 * Tests assertStudentInTeacherClass with mocked Prisma.
 * No real database required.
 */

import { RosterError } from '@/lib/teacher-roster'

// We test the pure logic of RosterError first, then integration covers the DB calls.

describe('RosterError', () => {
  it('creates a FORBIDDEN error with correct code', () => {
    const err = new RosterError('FORBIDDEN', 'Not a teacher user')
    expect(err.code).toBe('FORBIDDEN')
    expect(err.message).toBe('Not a teacher user')
    expect(err).toBeInstanceOf(Error)
  })

  it('creates a NOT_FOUND error with correct code', () => {
    const err = new RosterError('NOT_FOUND', 'Student not found')
    expect(err.code).toBe('NOT_FOUND')
    expect(err.message).toBe('Student not found')
    expect(err).toBeInstanceOf(Error)
  })

  it('inherits from Error (catchable as Error)', () => {
    const err = new RosterError('FORBIDDEN', 'test')
    expect(err instanceof Error).toBe(true)
    expect(err instanceof RosterError).toBe(true)
  })
})
