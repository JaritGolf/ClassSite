import { PrismaClient } from '@prisma/client'
import { encode } from 'next-auth/jwt'
import { mkdirSync, writeFileSync } from 'fs'

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
const AUTH_DIR = 'tests/e2e/.auth'

/**
 * e2e global setup.
 *
 * STUDENT tests need nothing from here: the student area is public, so those
 * tests run with an empty browser — no cookie, no stored state.
 *
 * STAFF tests need a session. There is no demo login to click, so this mints
 * the same encrypted session cookie a real Google sign-in would produce, for
 * two local test accounts, using the local SESSION_SECRET. It only works
 * against a database and secret you control.
 */
async function saveStaffSession(
  prisma: PrismaClient,
  role: 'TEACHER' | 'ADMIN',
  file: string
): Promise<void> {
  const email = `e2e-${role.toLowerCase()}@example.test`
  const user = await prisma.user.upsert({
    where: { email },
    update: { role, status: 'ACTIVE' },
    create: { email, firstName: 'E2E', lastName: role, role, status: 'ACTIVE' },
    select: { id: true },
  })
  if (role === 'TEACHER') {
    const teacher = await prisma.teacher.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
      select: { id: true },
    })
    if ((await prisma.class.count({ where: { teacherId: teacher.id } })) === 0) {
      await prisma.class.create({
        data: { teacherId: teacher.id, name: 'E2E Class', schoolYear: '2026-2027' },
      })
    }
  }

  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET must be set to run the staff e2e tests')
  const token = await encode({ token: { userId: user.id, role, email }, secret })

  writeFileSync(
    `${AUTH_DIR}/${file}`,
    JSON.stringify({
      cookies: [
        {
          name: 'next-auth.session-token',
          value: token,
          domain: new URL(BASE).hostname,
          path: '/',
          expires: -1,
          httpOnly: true,
          secure: false,
          sameSite: 'Lax',
        },
      ],
      origins: [],
    })
  )
}

export default async function globalSetup() {
  mkdirSync(AUTH_DIR, { recursive: true })
  const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } })
  await saveStaffSession(prisma, 'TEACHER', 'teacher.json')
  await saveStaffSession(prisma, 'ADMIN', 'admin.json')
  await prisma.$disconnect()
}
