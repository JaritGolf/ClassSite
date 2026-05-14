/**
 * Remediation Assignment
 *
 * Reads wrong responses from a failed attempt (with their confidence and
 * misconception tags), routes each to the appropriate RemediationType per
 * spec Section 17.5, and creates StudentRemediation rows.
 *
 * Confidence routing:
 *   confidence=2 (high, "Very sure") + wrong  → MISCONCEPTION_FIX
 *   confidence=0/1 (low/medium)     + wrong  → MINI_LESSON_REPLAY (if misconception) / BASIC_RETEACH
 *   confidence=null                 + wrong  → BASIC_RETEACH (fallback)
 */

import { prisma } from '@/lib/db'
import type { RemediationType } from '@prisma/client'

// ── Pure routing function — exported for unit testing ─────────────────────────

/**
 * Select the appropriate remediation type based on confidence level and
 * whether the question has a linked misconception.
 *
 * Pure function — no DB access. Directly testable.
 *
 * @param confidence       - Student's confidence (0=Not sure, 1=Pretty sure, 2=Very sure), or null
 * @param hasMisconception - Whether the missed question has a misconceptionId
 */
export function selectRemediationType(
  confidence: number | null,
  hasMisconception: boolean
): RemediationType {
  if (confidence === 2) {
    // High confidence + wrong → misconception fix
    return 'MISCONCEPTION_FIX'
  }
  if (hasMisconception) {
    // Low/medium confidence + known misconception → concept reteach via lesson replay
    return 'MINI_LESSON_REPLAY'
  }
  // Low/medium/null confidence + no specific misconception → basic reteach
  return 'BASIC_RETEACH'
}

// ── Result type ───────────────────────────────────────────────────────────────

export interface AssignRemediationResult {
  assigned: Array<{ studentRemediationId: string; remediationType: RemediationType }>
  count: number
}

// ── Main assignment function ──────────────────────────────────────────────────

/**
 * Assign remediation items to a student based on the wrong responses in an
 * assessment attempt.
 *
 * Routing: reads confidence + misconceptionId from each wrong response's question,
 * selects the most appropriate RemediationItem, and creates StudentRemediation rows.
 * Skips skills where no approved RemediationItem exists (graceful degradation).
 * Deduplicates by item ID — will not assign the same item twice.
 *
 * @param studentId   - The Student.id
 * @param benchmarkId - The Benchmark.id for this assessment
 * @param attemptId   - The AssessmentAttempt.id to read wrong responses from
 */
export async function assignRemediation(
  studentId: string,
  benchmarkId: string,
  attemptId: string
): Promise<AssignRemediationResult> {
  // 1. Load wrong responses from this attempt, with question metadata
  const wrongResponses = await prisma.attemptResponse.findMany({
    where: { attemptId, isCorrect: false },
    select: {
      confidence: true,
      question: {
        select: {
          skillTag: true,
          misconceptionId: true,
        },
      },
    },
  })

  if (wrongResponses.length === 0) {
    return { assigned: [], count: 0 }
  }

  // 2. Collect unique (skillTag, remediationType) pairs
  type RoutingPair = { skillTag: string; remediationType: RemediationType; misconceptionId: string | null }
  const pairMap = new Map<string, RoutingPair>()

  for (const r of wrongResponses) {
    const skillTag = r.question.skillTag
    const hasMisconception = r.question.misconceptionId !== null
    const remType = selectRemediationType(r.confidence, hasMisconception)
    const key = `${skillTag}|${remType}`

    if (!pairMap.has(key)) {
      pairMap.set(key, {
        skillTag,
        remediationType: remType,
        misconceptionId: r.question.misconceptionId,
      })
    }
  }

  // 3. Fetch matching approved RemediationItems for each unique pair (in parallel)
  const itemFetches = Array.from(pairMap.values()).map(async (pair) => {
    // For MISCONCEPTION_FIX, prefer a remediation item that targets the specific misconception
    if (pair.remediationType === 'MISCONCEPTION_FIX' && pair.misconceptionId) {
      const item = await prisma.remediationItem.findFirst({
        where: {
          benchmarkId,
          remediationType: 'MISCONCEPTION_FIX',
          misconceptionId: pair.misconceptionId,
          approvalStatus: 'APPROVED',
        },
        select: { id: true, remediationType: true },
      })
      if (item) return item

      // Fallback: any MISCONCEPTION_FIX item for this benchmark + skill
      return prisma.remediationItem.findFirst({
        where: {
          benchmarkId,
          skillTag: pair.skillTag,
          remediationType: 'MISCONCEPTION_FIX',
          approvalStatus: 'APPROVED',
        },
        select: { id: true, remediationType: true },
      })
    }

    // For other types, match by skillTag and remediationType
    return prisma.remediationItem.findFirst({
      where: {
        benchmarkId,
        skillTag: pair.skillTag,
        remediationType: pair.remediationType,
        approvalStatus: 'APPROVED',
      },
      select: { id: true, remediationType: true },
    })
  })

  const foundItems = (await Promise.all(itemFetches)).filter(
    (item): item is { id: string; remediationType: RemediationType } => item !== null
  )

  if (foundItems.length === 0) {
    return { assigned: [], count: 0 }
  }

  // 4. Deduplicate by item ID (multiple routing pairs may resolve to the same item)
  const uniqueItems = Array.from(
    new Map(foundItems.map((item) => [item.id, item])).values()
  )

  // 5. Exclude items already assigned/in-progress for this student+benchmark
  const existingIds = (
    await prisma.studentRemediation.findMany({
      where: {
        studentId,
        benchmarkId,
        status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
      },
      select: { remediationItemId: true },
    })
  ).map((r) => r.remediationItemId)

  const newItems = uniqueItems.filter((item) => !existingIds.includes(item.id))

  if (newItems.length === 0) {
    return { assigned: [], count: 0 }
  }

  // 6. Create StudentRemediation rows
  const created = await Promise.all(
    newItems.map((item) =>
      prisma.studentRemediation.create({
        data: {
          studentId,
          benchmarkId,
          remediationItemId: item.id,
          status: 'ASSIGNED',
        },
        select: { id: true },
      })
    )
  )

  return {
    assigned: created.map((row, i) => ({
      studentRemediationId: row.id,
      remediationType: newItems[i].remediationType,
    })),
    count: created.length,
  }
}
