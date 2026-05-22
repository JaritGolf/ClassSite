/**
 * Resolve a teacher User.id to a Teacher.id
 */

import { prisma } from '@/lib/db'
import { RosterError } from './index'

export async function resolveTeacherId(teacherUserId: string): Promise<string> {
  const teacher = await prisma.teacher.findUnique({
    where: { userId: teacherUserId },
    select: { id: true },
  })
  if (!teacher) throw new RosterError('FORBIDDEN', 'Not a teacher user')
  return teacher.id
}
