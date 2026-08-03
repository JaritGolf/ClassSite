/**
 * GET /api/teacher/reports/export?type=class|eoc|activity[&classId=...][&range=]
 *
 * Download a class mastery report, class EOC-readiness report, or session
 * activity report as CSV (audit §36.18 item 2). Roster-scoped to the
 * requesting teacher.
 *
 * Access: TEACHER or ADMIN. Every export is recorded in the audit log.
 */

import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  getTeacherRoster,
  assertClassOwnedByTeacher,
  RosterError,
} from '@/lib/teacher-roster'
import {
  buildActivityReportCsv,
  buildClassReportCsv,
  buildEocReadinessReportCsv,
  csvResponse,
} from '@/lib/export'

/** Resolve a `range` token to concrete bounds; defaults to the last 7 days. */
function resolveRange(raw: string | null): { from: Date; to: Date } {
  const to = new Date()
  const from = new Date(to)
  from.setHours(0, 0, 0, 0)
  if (raw === 'today') return { from, to }
  from.setDate(from.getDate() - (raw === '30d' ? 29 : 6))
  return { from, to }
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'class'
  const teacherUserId = session.user.userId

  try {
    let report
    let metadata: Prisma.InputJsonObject

    if (type === 'class') {
      report = await buildClassReportCsv(teacherUserId)
      metadata = { type: 'class' }
    } else if (type === 'eoc') {
      // Resolve a class: explicit param, else the teacher's first class.
      const requested = searchParams.get('classId')
      let classId: string
      if (requested) {
        await assertClassOwnedByTeacher(teacherUserId, requested)
        classId = requested
      } else {
        const roster = await getTeacherRoster(teacherUserId)
        if (roster.classes.length === 0) {
          return NextResponse.json({ error: 'NO_CLASSES' }, { status: 404 })
        }
        classId = roster.classes[0].id
      }
      report = await buildEocReadinessReportCsv(classId)
      metadata = { type: 'eoc', classId }
    } else if (type === 'activity') {
      // Activity is always class-scoped: an explicit classId, else first class.
      const requested = searchParams.get('classId')
      let classId: string
      if (requested) {
        await assertClassOwnedByTeacher(teacherUserId, requested)
        classId = requested
      } else {
        const roster = await getTeacherRoster(teacherUserId)
        if (roster.classes.length === 0) {
          return NextResponse.json({ error: 'NO_CLASSES' }, { status: 404 })
        }
        classId = roster.classes[0].id
      }
      const range = resolveRange(searchParams.get('range'))
      report = await buildActivityReportCsv(teacherUserId, classId, range)
      metadata = {
        type: 'activity',
        classId,
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      }
    } else {
      return NextResponse.json({ error: 'INVALID_TYPE' }, { status: 400 })
    }

    await prisma.auditLog.create({
      data: {
        actorUserId: teacherUserId,
        action: 'REPORT_EXPORTED',
        entityType: 'Report',
        entityId: null,
        metadataJson: metadata,
      },
    })

    return csvResponse(report.filename, report.csv)
  } catch (err) {
    if (err instanceof RosterError) {
      return NextResponse.json(
        { error: err.code },
        { status: err.code === 'FORBIDDEN' ? 403 : 404 }
      )
    }
    throw err
  }
}
