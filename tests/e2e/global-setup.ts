import { chromium } from '@playwright/test'
import { PrismaClient } from '@prisma/client'

export default async function globalSetup() {
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
  })

  // Sign in via mock credentials — role: 'STUDENT' triggers upsert of mock-student-001
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  // Fetch CSRF token required by NextAuth credentials provider
  const csrfRes = await page.request.get('http://localhost:3000/api/auth/csrf')
  const { csrfToken } = await csrfRes.json()

  await page.request.post('http://localhost:3000/api/auth/callback/credentials', {
    form: {
      role: 'STUDENT',
      csrfToken,
      callbackUrl: 'http://localhost:3000/student/dashboard',
      json: 'true',
    },
  })

  // Ensure the mock student has a Student DB row
  const user = await prisma.user.findUnique({
    where: { cleverId: 'mock-student-001' },
    select: { id: true },
  })
  if (user) {
    await prisma.student.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, gradeLevel: 7 },
    })
  }

  await prisma.$disconnect()
  await context.storageState({ path: 'tests/e2e/.auth/student.json' })
  await browser.close()
}
