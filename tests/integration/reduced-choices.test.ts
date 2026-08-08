/**
 * ACC-REDUCED-CHOICES end-to-end, through the real serving path.
 *
 * The unit tests cover the selection logic. What matters here is the wiring: the
 * accommodation has to actually reach fetchAssessmentForStudent, and — the whole
 * reason the eligibility set is an allowlist — it must NOT reach a Mastery
 * Challenge, where dropping a distractor would change the odds of a lucky guess
 * and therefore change what the 80% threshold means.
 */

import { PrismaClient } from '@prisma/client'
import { fetchAssessmentForStudent } from '@/lib/assessment/question-fetcher'
import { REDUCED_CHOICE_COUNT } from '@/lib/reading-load/reduced-choices'

const prisma = new PrismaClient()
const PREFIX = 'test-reduced-choices'

let studentWithAccId: string
let studentWithoutAccId: string
let practiceId: string
let masteryId: string

async function makeStudent(tag: string): Promise<string> {
  const user = await prisma.user.create({
    data: {
      role: 'STUDENT',
      firstName: PREFIX,
      lastName: tag,
      cleverId: `${PREFIX}-${tag}`,
    },
  })
  const student = await prisma.student.create({
    data: { userId: user.id, gradeLevel: 7 },
  })
  return student.id
}

async function cleanup() {
  const users = await prisma.user.findMany({
    where: { firstName: PREFIX },
    select: { id: true, student: { select: { id: true } } },
  })
  for (const u of users) {
    if (u.student) {
      await prisma.studentAccommodation.deleteMany({ where: { studentId: u.student.id } })
      await prisma.student.deleteMany({ where: { id: u.student.id } })
    }
    await prisma.user.deleteMany({ where: { id: u.id } })
  }
}

beforeAll(async () => {
  await cleanup()

  studentWithAccId = await makeStudent('with')
  studentWithoutAccId = await makeStudent('without')

  const acc = await prisma.accommodation.findUnique({
    where: { code: 'ACC-REDUCED-CHOICES' },
    select: { id: true },
  })
  if (!acc) throw new Error('ACC-REDUCED-CHOICES not seeded — run npm run db:seed')

  await prisma.studentAccommodation.create({
    data: {
      studentId: studentWithAccId,
      accommodationId: acc.id,
      grantedBy: 'test',
      active: true,
    },
  })

  const practice = await prisma.assessment.findFirst({
    where: { assessmentType: 'PRACTICE' },
    select: { id: true },
  })
  const mastery = await prisma.assessment.findFirst({
    where: { assessmentType: 'MASTERY_CHALLENGE' },
    select: { id: true },
  })
  if (!practice || !mastery) throw new Error('Seeded assessments missing — run npm run db:seed')
  practiceId = practice.id
  masteryId = mastery.id
})

afterAll(async () => {
  await cleanup()
  await prisma.$disconnect()
})

describe('ACC-REDUCED-CHOICES on an eligible assessment', () => {
  it('serves 3 options instead of 4', async () => {
    const res = await fetchAssessmentForStudent(practiceId, studentWithAccId)
    expect(res).not.toBeNull()
    expect(res!.questions.length).toBeGreaterThan(0)
    for (const q of res!.questions) {
      expect(q.options).toHaveLength(REDUCED_CHOICE_COUNT)
    }
  })

  it('is stable across repeated fetches (same three choices on refresh)', async () => {
    const a = await fetchAssessmentForStudent(practiceId, studentWithAccId)
    const b = await fetchAssessmentForStudent(practiceId, studentWithAccId)
    expect(a!.questions.map((q) => q.options.map((o) => o.id))).toEqual(
      b!.questions.map((q) => q.options.map((o) => o.id))
    )
  })

  it('still keeps the correct answer among the choices served', async () => {
    const res = await fetchAssessmentForStudent(practiceId, studentWithAccId)
    for (const q of res!.questions) {
      const correct = await prisma.questionOption.findFirst({
        where: { questionId: q.id, isCorrect: true },
        select: { id: true },
      })
      expect(q.options.map((o) => o.id)).toContain(correct!.id)
    }
  })

  it('does not leak the answer key (rule #2)', async () => {
    const res = await fetchAssessmentForStudent(practiceId, studentWithAccId)
    const serialized = JSON.stringify(res)
    expect(serialized).not.toContain('isCorrect')
    expect(serialized).not.toContain('feedback')
  })
})

describe('ACC-REDUCED-CHOICES never applies where mastery is decided', () => {
  it('leaves the Mastery Challenge at 4 options for the SAME student', async () => {
    const res = await fetchAssessmentForStudent(masteryId, studentWithAccId)
    expect(res!.questions.length).toBeGreaterThan(0)
    for (const q of res!.questions) {
      expect(q.options).toHaveLength(4)
    }
  })
})

describe('a student without the accommodation', () => {
  it('sees the full option set on the same practice assessment', async () => {
    const res = await fetchAssessmentForStudent(practiceId, studentWithoutAccId)
    for (const q of res!.questions) {
      expect(q.options).toHaveLength(4)
    }
  })
})
