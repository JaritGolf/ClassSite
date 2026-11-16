/**
 * Teacher Roster — public API
 *
 * A teacher's classes and the guard that a class belongs to them. "Roster"
 * here means the teacher's list of CLASSES — classes have no students in them;
 * they exist so lesson arrangements can differ by class.
 */

export class RosterError extends Error {
  constructor(
    public readonly code: 'FORBIDDEN' | 'NOT_FOUND',
    message: string
  ) {
    super(message)
    this.name = 'RosterError'
  }
}

export { resolveTeacherId } from './resolve'
export { getTeacherRoster } from './roster'
export type { TeacherRoster } from './roster'
export { assertClassOwnedByTeacher, assertClassesOwnedByTeacher } from './authorize'
