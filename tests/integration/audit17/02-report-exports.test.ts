/**
 * Audit 17 — Item 2: CSV exports for student / class / EOC-readiness reports.
 *  - Each builder produces a well-formed CSV with the expected header.
 *  - FORBIDDEN-FIELD GUARD: no exported CSV may contain answer-key / item-level
 *    tokens (non-negotiable rules #2, spec §25.2).
 * Prefix: test-audit17-02-
 */

import { PrismaClient } from '@prisma/client'
import { seedReportingCategories } from '../../../seed/reporting_categories'
import { seedBenchmarks } from '../../../seed/benchmarks'
import {
  buildStudentReportCsv,
  buildClassReportCsv,
  buildEocReadinessReportCsv,
} from '@/lib/export'

const prisma = new PrismaClient()

const T_CLEVERID = 'test-audit17-02-teacher'
const S_CLEVERID = 'test-audit17-02-student'

let teacherUserId: string
let studentId: string
let classId: string

const FORBIDDEN_TOKENS = [
  'isCorrect',
  'is_correct',
  'pointsAwarded',
  'points_awarded',
  'correctOption',
  'answer_key',
  'feedback',
  'distractor',
  'selectedOptionId',
]

beforeAll(async () => {
  await seedReportingCategories(prisma)
  await seedBenchmarks(prisma)

  const tUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: { cleverId: T_CLEVERID, email: `${T_CLEVERID}@test.invalid`, firstName: 'A17', lastName: '02Teacher', role: 'TEACHER' },
    update: {},
    select: { id: true },
  })
  teacherUserId = tUser.id
  const teacher = await prisma.teacher.upsert({ where: { userId: teacherUserId }, create: { userId: teacherUserId }, update: {}, select: { id: true } })

  const sUser = await prisma.user.upsert({
    where: { cleverId: S_CLEVERID },
    create: { cleverId: S_CLEVERID, email: `${S_CLEVERID}@test.invalid`, firstName: 'A17', lastName: '02Student', role: 'STUDENT' },
    update: {},
    select: { id: true },
  })
  const student = await prisma.student.upsert({ where: { userId: sUser.id }, create: { userId: sUser.id }, update: {}, select: { id: true } })
  studentId = student.id

  const cls = await prisma.class.create({
    data: { teacherId: teacher.id, name: 'Audit 17-02 Class', schoolYear: '2025-2026' },
    select: { id: true },
  })
  classId = cls.id
  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId, studentId } },
    create: { classId, studentId, status: 'ACTIVE' },
    update: {},
  })
})

afterAll(async () => {
  await prisma.classEnrollment.deleteMany({ where: { classId } })
  await prisma.class.deleteMany({ where: { id: classId } })
  await prisma.student.deleteMany({ where: { id: studentId } })
  await prisma.user.deleteMany({ where: { cleverId: { in: [T_CLEVERID, S_CLEVERID] } } })
  await prisma.$disconnect()
})

describe('Audit 17 — Item 2: report CSV exports', () => {
  it('builds a student readiness report CSV', async () => {
    const { filename, csv } = await buildStudentReportCsv(studentId)
    expect(filename).toContain('student-report')
    expect(csv.split('\r\n')[0]).toContain('Reporting Category')
    expect(csv).toContain('OVERALL (weighted)')
  })

  it('builds a class report CSV', async () => {
    const { filename, csv } = await buildClassReportCsv(teacherUserId)
    expect(filename).toContain('class-report')
    expect(csv.split('\r\n')[0]).toContain('Benchmark')
    expect(csv.split('\r\n')[0]).toContain('Mastery Rate %')
  })

  it('builds an EOC readiness report CSV', async () => {
    const { filename, csv } = await buildEocReadinessReportCsv(classId)
    expect(filename).toContain('eoc-readiness')
    expect(csv.split('\r\n')[0]).toContain('Readiness %')
  })

  it('GUARD: no export leaks answer-key or item-level fields', async () => {
    const [a, b, c] = await Promise.all([
      buildStudentReportCsv(studentId),
      buildClassReportCsv(teacherUserId),
      buildEocReadinessReportCsv(classId),
    ])
    const combined = [a.csv, b.csv, c.csv].join('\n')
    for (const token of FORBIDDEN_TOKENS) {
      expect(combined).not.toContain(token)
    }
  })
})
