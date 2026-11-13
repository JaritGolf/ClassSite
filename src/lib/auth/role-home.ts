/**
 * Where each staff role lands after signing in. Students have no accounts and
 * therefore no entry here.
 */

export const ROLE_HOME: Record<string, string> = {
  TEACHER: '/teacher/dashboard',
  ADMIN: '/admin/lessons',
}
