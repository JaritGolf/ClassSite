import { chromium } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { mkdirSync, writeFileSync } from 'fs'

const BASE = 'http://localhost:3000'
const AUTH_DIR = 'tests/e2e/.auth'

/**
 * Sign in as a mock role and persist the browser storage state.
 * The credentials provider id is 'mock-credentials' (src/lib/auth/options.ts),
 * so the NextAuth callback is /callback/mock-credentials.
 */
async function signInAndSave(
  role: 'STUDENT' | 'TEACHER' | 'ADMIN',
  file: string
): Promise<void> {
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  const csrfRes = await page.request.get(`${BASE}/api/auth/csrf`)
  const { csrfToken } = await csrfRes.json()

  await page.request.post(`${BASE}/api/auth/callback/mock-credentials`, {
    form: {
      role,
      csrfToken,
      callbackUrl: `${BASE}/`,
      json: 'true',
    },
  })

  await context.storageState({ path: `${AUTH_DIR}/${file}` })
  await browser.close()
}

export default async function globalSetup() {
  mkdirSync(AUTH_DIR, { recursive: true })

  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
  })

  // Sign in all three roles (each sign-in upserts the mock user).
  await signInAndSave('STUDENT', 'student.json')
  await signInAndSave('TEACHER', 'teacher.json')
  await signInAndSave('ADMIN', 'admin.json')

  // Ensure DB rows so data-bearing pages render (student profile, reports,
  // parent-summary). Enroll the mock student into a class owned by the mock
  // teacher, and expose the student id to the staff a11y test via a fixture.
  const studentUser = await prisma.user.findUnique({
    where: { cleverId: 'mock-student-001' },
    select: { id: true },
  })
  const teacherUser = await prisma.user.findUnique({
    where: { cleverId: 'mock-teacher-001' },
    select: { id: true },
  })

  let teacherStudentId = ''

  if (studentUser) {
    const student = await prisma.student.upsert({
      where: { userId: studentUser.id },
      update: {},
      create: { userId: studentUser.id, gradeLevel: 7 },
      select: { id: true },
    })
    teacherStudentId = student.id

    if (teacherUser) {
      const teacher = await prisma.teacher.upsert({
        where: { userId: teacherUser.id },
        update: {},
        create: { userId: teacherUser.id },
        select: { id: true },
      })

      let cls = await prisma.class.findFirst({
        where: { teacherId: teacher.id, name: 'E2E A11y Class' },
        select: { id: true },
      })
      if (!cls) {
        cls = await prisma.class.create({
          data: { teacherId: teacher.id, name: 'E2E A11y Class', schoolYear: '2025-2026' },
          select: { id: true },
        })
      }

      await prisma.classEnrollment.upsert({
        where: { classId_studentId: { classId: cls.id, studentId: student.id } },
        update: {},
        create: { classId: cls.id, studentId: student.id, status: 'ACTIVE' },
      })
    }
  }

  writeFileSync(`${AUTH_DIR}/fixtures.json`, JSON.stringify({ teacherStudentId }))

  await prisma.$disconnect()
}
