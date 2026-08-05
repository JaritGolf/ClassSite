/**
 * GET /api/teacher/classes/[classId]/progress-levels/export
 *
 * CSV of each student's nine-week checkpoint Level, for entry into the teacher's
 * own gradebook. Column-allowlisted: student identity, missions cleared, Level.
 * No answer keys, no item-level data, no per-question detail.
 *
 * `level` is emitted as a bare integer so it can be imported directly. Notably it
 * is never "—" or "-": escapeCsvField prefixes a leading hyphen with a quote to
 * neutralize spreadsheet formula injection, which would mangle the cell.
 *
 * Writes an AuditLog row with the existing REPORT_EXPORTED action.
 */

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { assertClassOwnedByTeacher, RosterError } from '@/lib/teacher-roster'
import { getCheckpointLevelsForTeacher } from '@/lib/class-analytics'
import { toCsv, csvResponse, type CsvColumn } from '@/lib/export/csv'

interface LevelExportRow {
  student: string
  quarter: number
  checkpointEndsOn: string
  missionsCleared: number
  level: number
  maxLevel: number
  status: string
}

const COLUMNS: readonly CsvColumn<LevelExportRow>[] = [
  { key: 'student', header: 'Student' },
  { key: 'quarter', header: 'Quarter' },
  { key: 'checkpointEndsOn', header: 'Checkpoint Ends' },
  { key: 'missionsCleared', header: 'Missions Cleared' },
  { key: 'level', header: 'Level' },
  { key: 'maxLevel', header: 'Levels Set' },
  { key: 'status', header: 'Status' },
]

export async function GET(_req: Request, { params }: { params: { classId: string } }) {
  const session = await requireAuth(['TEACHER', 'ADMIN'])

  try {
    await assertClassOwnedByTeacher(session.user.userId, params.classId)
  } catch (e) {
    if (e instanceof RosterError) {
      return NextResponse.json(
        { error: e.code },
        { status: e.code === 'NOT_FOUND' ? 404 : 403 }
      )
    }
    throw e
  }

  const tables = await getCheckpointLevelsForTeacher(session.user.userId)
  const table = tables.find((t) => t.classId === params.classId)

  if (!table) {
    return NextResponse.json({ error: 'NO_CHECKPOINTS_CONFIGURED' }, { status: 404 })
  }

  const endsOn = table.endsOn.toISOString().slice(0, 10)
  const rows: LevelExportRow[] = table.rows.map((r) => ({
    student: r.displayName,
    quarter: table.checkpointNumber,
    checkpointEndsOn: endsOn,
    missionsCleared: r.missionsCleared,
    level: r.level,
    maxLevel: r.maxLevel,
    status: table.isClosed
      ? r.caughtUpLevel !== null
        ? `locked; has since reached level ${r.caughtUpLevel}`
        : 'locked'
      : 'in progress',
  }))

  await prisma.auditLog.create({
    data: {
      actorUserId: session.user.userId,
      action: 'REPORT_EXPORTED',
      entityType: 'Class',
      entityId: params.classId,
      metadataJson: {
        report: 'progress-levels',
        classId: params.classId,
        checkpointNumber: table.checkpointNumber,
        rowCount: rows.length,
      },
    },
  })

  return csvResponse(
    `nine-week-levels-q${table.checkpointNumber}-${endsOn}.csv`,
    toCsv(rows, COLUMNS)
  )
}
