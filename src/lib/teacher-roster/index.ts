/**
 * Teacher Roster — public API
 *
 * Provides authorization guards and roster lookup for teacher-scoped
 * analytics and student profile access.
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
export {
  assertStudentInTeacherClass,
  assertClassOwnedByTeacher,
  getStudentInTeacherClass,
} from './authorize'
