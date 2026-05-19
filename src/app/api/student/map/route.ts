import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const student = await prisma.student.findUnique({
    where: { userId: session.user.userId },
    select: { id: true },
  })
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  const [units, progressRows] = await Promise.all([
    prisma.unit.findMany({
      where: { active: true },
      orderBy: { sequenceOrder: 'asc' },
      include: {
        benchmarks: {
          orderBy: { sequenceOrder: 'asc' },
          select: { id: true, code: true, title: true, sequenceOrder: true },
        },
      },
    }),
    prisma.studentProgress.findMany({
      where: { studentId: student.id },
      select: { benchmarkId: true, status: true, masteryScore: true },
    }),
  ])

  const progressByBenchmarkId = new Map(progressRows.map((p) => [p.benchmarkId, p]))

  const map = units.map((unit) => ({
    id: unit.id,
    title: unit.title,
    sequenceOrder: unit.sequenceOrder,
    gameRegionName: unit.gameRegionName,
    benchmarks: unit.benchmarks.map((b) => {
      const progress = progressByBenchmarkId.get(b.id)
      return {
        id: b.id,
        code: b.code,
        title: b.title,
        sequenceOrder: b.sequenceOrder,
        status: progress?.status ?? 'NOT_STARTED',
        masteryScore: progress?.masteryScore ?? null,
      }
    }),
  }))

  return NextResponse.json({ map })
}
