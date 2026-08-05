/**
 * Demo Seed — People & Structural Rows
 *
 * Hand-written Prisma upserts (no engine logic exists for identity/roster
 * data — this is the sanctioned exception category). Ties the teacher,
 * hero student, and parent to the exact mock-auth identities
 * (mock-teacher-001 / mock-student-001 / mock-parent-001) so the /login
 * dev panel's one-click buttons land on this pre-populated data.
 *
 * Idempotent: every upsert is keyed by a stable unique field (cleverId,
 * userId, classId_studentId, parentId_studentId).
 */

import { prisma } from '@/lib/db'
import { linkParentToStudent, setLinkVerification } from '@/lib/parent-portal/admin'
import type { UserRole } from '@prisma/client'

const TEACHER_CLEVER_ID = 'mock-teacher-001'
const HERO_STUDENT_CLEVER_ID = 'mock-student-001'
const PARENT_CLEVER_ID = 'mock-parent-001'

const CLASS_NAME = 'Period 3 — Civics'
const CLASS_PERIOD = '3'
const SCHOOL_YEAR = '2026-2027'

const CLASSMATES = [
  { cleverId: 'demo-student-002', firstName: 'Jordan', lastName: 'Rivera' },
  { cleverId: 'demo-student-003', firstName: 'Maya', lastName: 'Chen' },
  { cleverId: 'demo-student-004', firstName: 'Devon', lastName: 'Brooks' },
  { cleverId: 'demo-student-005', firstName: 'Sofia', lastName: 'Ramirez' },
  { cleverId: 'demo-student-006', firstName: 'Elijah', lastName: 'Turner' },
]

export interface DemoPeople {
  teacherUserId: string
  teacherId: string
  classId: string
  heroUserId: string
  heroStudentId: string
  /** Student.id values, in the same order as CLASSMATES above. */
  classmateStudentIds: string[]
  parentUserId: string
  parentId: string
}

async function upsertMockUser(
  cleverId: string,
  firstName: string,
  lastName: string,
  role: UserRole
): Promise<{ id: string }> {
  return prisma.user.upsert({
    where: { cleverId },
    update: {},
    create: { cleverId, firstName, lastName, role, status: 'ACTIVE' },
    select: { id: true },
  })
}

export async function seedDemoPeople(): Promise<DemoPeople> {
  // ── Teacher + Class ──────────────────────────────────────────────────────
  const teacherUser = await upsertMockUser(TEACHER_CLEVER_ID, 'Ms', 'Teacher', 'TEACHER')
  const teacher = await prisma.teacher.upsert({
    where: { userId: teacherUser.id },
    update: {},
    create: { userId: teacherUser.id },
    select: { id: true },
  })

  let cls = await prisma.class.findFirst({
    where: { teacherId: teacher.id, name: CLASS_NAME },
    select: { id: true },
  })
  if (!cls) {
    cls = await prisma.class.create({
      data: {
        teacherId: teacher.id,
        name: CLASS_NAME,
        period: CLASS_PERIOD,
        schoolYear: SCHOOL_YEAR,
        // Turn the Strategist Track ON in the demo. The column defaults to 0
        // ("no requirement"), which is the right default for a real class — the
        // teacher opts in — but it meant all 7 authored strategy missions sat
        // unexercised and the whole track looked like dead weight. 2 asks for a
        // second correct round, which is what makes it practice rather than a
        // click-through.
        strategyUsesRequired: 2,
      },
      select: { id: true },
    })
  }

  // ── Hero student (tied to the STUDENT mock-login button) ────────────────
  const heroUser = await upsertMockUser(HERO_STUDENT_CLEVER_ID, 'Alex', 'Student', 'STUDENT')
  const heroStudent = await prisma.student.upsert({
    where: { userId: heroUser.id },
    update: {},
    create: { userId: heroUser.id, gradeLevel: 7 },
    select: { id: true },
  })

  // ── Classmates (roster/analytics realism only — not wired to mock auth) ──
  const classmateStudentIds: string[] = []
  for (const c of CLASSMATES) {
    const user = await upsertMockUser(c.cleverId, c.firstName, c.lastName, 'STUDENT')
    const student = await prisma.student.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, gradeLevel: 7 },
      select: { id: true },
    })
    classmateStudentIds.push(student.id)
  }

  // ── Enrollments ───────────────────────────────────────────────────────────
  for (const studentId of [heroStudent.id, ...classmateStudentIds]) {
    await prisma.classEnrollment.upsert({
      where: { classId_studentId: { classId: cls.id, studentId } },
      update: {},
      create: { classId: cls.id, studentId, status: 'ACTIVE' },
    })
  }

  // ── Parent, verified link to the hero student ────────────────────────────
  const parentUser = await upsertMockUser(PARENT_CLEVER_ID, 'Pat', 'Parent', 'PARENT')
  // Hand-written, not via createParentAccount: that function upserts by email,
  // and the mock parent User has email=null — using it would create an
  // orphaned second Parent instead of attaching to mock-parent-001.
  const parent = await prisma.parent.upsert({
    where: { userId: parentUser.id },
    update: {},
    create: { userId: parentUser.id },
    select: { id: true },
  })

  // Real parent-portal engine functions — reusable as-is (upsert-based,
  // no email dependency), produce identical data to the real /admin/parents flow.
  const { linkId } = await linkParentToStudent(parentUser.id, parent.id, heroStudent.id, 'guardian')
  await setLinkVerification(parentUser.id, linkId, 'VERIFIED')

  return {
    teacherUserId: teacherUser.id,
    teacherId: teacher.id,
    classId: cls.id,
    heroUserId: heroUser.id,
    heroStudentId: heroStudent.id,
    classmateStudentIds,
    parentUserId: parentUser.id,
    parentId: parent.id,
  }
}
