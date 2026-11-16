/**
 * Curriculum loaders for the student area.
 *
 * Every function here is a READ of curriculum tables. None takes a student, a
 * session or a request: a student page is rendered from content that is the
 * same for everyone, and whatever is personal about it is filled in afterwards
 * by the browser from device-local progress.
 *
 * A guard test asserts nothing under src/app/student or the student API
 * routes reads a session, writes to the database, or sets a cookie.
 */

import { prisma } from '@/lib/db'
import { PLAYABLE_BENCHMARK_WHERE } from '@/lib/mastery/availability'
import { getGlossaryTermsForBenchmark } from '@/lib/l1-glosses'
import { resolveClassLessonSteps, type ResolvedStep } from '@/lib/lesson-content'
import { getClassStepOverrideMap, getClassLessonLayer } from '@/lib/lesson-media/read'
import { isCriteriaWinnable } from '@/lib/local-progress/badge-rules'
import type { MissionCatalogEntry } from '@/lib/local-progress/engine'
import type { GlossaryTerm } from '@/lib/reading-load'

// ── The class whose arrangement students see ────────────────────────────────

export interface PublishedClass {
  id: string
  schoolYear: string
  strategyUsesRequired: number
  rcSessionLengthOverride: number | null
  rcStaminaOverride: number | null
  featureEocReviewEnabled: boolean
}

/**
 * Students never say which class they are in — there is no class code and no
 * enrollment. So the student area shows ONE arrangement: the teacher's first
 * active class (lowest id, i.e. the one created first). Its lesson order,
 * teacher-added modules and Republic Challenge settings are what every
 * student sees. Returns null when no class exists; the built-in lesson is
 * used as-is.
 */
export async function getPublishedClass(): Promise<PublishedClass | null> {
  return prisma.class.findFirst({
    where: { active: true },
    orderBy: { id: 'asc' },
    select: {
      id: true,
      schoolYear: true,
      strategyUsesRequired: true,
      rcSessionLengthOverride: true,
      rcStaminaOverride: true,
      featureEocReviewEnabled: true,
    },
  })
}

// ── Mission catalog (map, plan, badges) ─────────────────────────────────────

export interface CatalogUnit {
  id: string
  title: string
  sequenceOrder: number
  gameRegionName: string
  benchmarks: { code: string; title: string }[]
}

export interface StudentCatalog {
  units: CatalogUnit[]
  /** Every benchmark in active units, in curriculum order. */
  missions: MissionCatalogEntry[]
}

export async function getStudentCatalog(): Promise<StudentCatalog> {
  const [units, playable] = await Promise.all([
    prisma.unit.findMany({
      where: { active: true },
      orderBy: { sequenceOrder: 'asc' },
      select: {
        id: true,
        title: true,
        sequenceOrder: true,
        gameRegionName: true,
        benchmarks: {
          orderBy: { sequenceOrder: 'asc' },
          select: {
            id: true,
            code: true,
            title: true,
            reportingCategory: { select: { name: true } },
          },
        },
      },
    }),
    prisma.benchmark.findMany({
      where: { ...PLAYABLE_BENCHMARK_WHERE, unit: { active: true } },
      select: { id: true },
    }),
  ])
  const playableIds = new Set(playable.map((p) => p.id))

  return {
    units: units.map((u) => ({
      id: u.id,
      title: u.title,
      sequenceOrder: u.sequenceOrder,
      gameRegionName: u.gameRegionName,
      benchmarks: u.benchmarks.map((b) => ({ code: b.code, title: b.title })),
    })),
    missions: units.flatMap((u) =>
      u.benchmarks.map((b) => ({
        code: b.code,
        title: b.title,
        playable: playableIds.has(b.id),
        unitId: u.id,
        reportingCategory: b.reportingCategory.name,
      }))
    ),
  }
}

// ── Badges ──────────────────────────────────────────────────────────────────

export interface BadgeCatalogItem {
  name: string
  description: string
  iconKey: string
  track: string
  criteria: unknown
  /** False for badges whose criteria no data source can ever satisfy. */
  winnable: boolean
}

export async function getBadgeCatalog(): Promise<BadgeCatalogItem[]> {
  const badges = await prisma.badge.findMany({
    orderBy: [{ track: 'asc' }, { name: 'asc' }],
    select: { name: true, description: true, iconKey: true, track: true, criteriaJson: true },
  })
  return badges.map((b) => ({
    name: b.name,
    description: b.description,
    iconKey: b.iconKey,
    track: b.track,
    criteria: b.criteriaJson,
    winnable: isCriteriaWinnable(b.criteriaJson),
  }))
}

// ── One mission ─────────────────────────────────────────────────────────────

export interface MissionTerm {
  term: string
  definition: string
  relatedVocab: string | null
  l1Definitions?: Partial<Record<'es' | 'ht', string>>
}

export interface MissionContent {
  benchmarkCode: string
  benchmarkTitle: string
  playable: boolean
  lessonSummary: string | null
  lessonBody: string | null
  studentFriendlyTarget: string
  preCheckAssessmentId: string | null
  vocabCheckAssessmentId: string | null
  practiceAssessmentId: string | null
  readinessAssessmentId: string | null
  /** Rotating Mastery Challenge forms, in a stable order (A, B, …). */
  masteryFormIds: string[]
  lessonSteps: ResolvedStep[]
  glossaryTerms: GlossaryTerm[]
  terms: MissionTerm[]
}

export async function getMissionContent(benchmarkCode: string): Promise<MissionContent | null> {
  const benchmark = await prisma.benchmark.findFirst({
    where: { code: benchmarkCode, unit: { active: true } },
    select: {
      id: true,
      code: true,
      title: true,
      lessonSummary: true,
      lessons: {
        // Only approved content reaches students.
        where: { approvalStatus: 'APPROVED' },
        orderBy: { version: 'desc' },
        take: 1,
        select: {
          id: true,
          body: true,
          studentFriendlyTarget: true,
          steps: { orderBy: { sequenceOrder: 'asc' } },
        },
      },
      assessments: {
        where: {
          assessmentType: {
            in: ['PRE_CHECK', 'READINESS_CHECK', 'MASTERY_CHALLENGE', 'PRACTICE', 'VOCAB_CHECK'],
          },
          approvalStatus: 'APPROVED',
        },
        select: { id: true, assessmentType: true, title: true },
      },
    },
  })
  if (!benchmark) return null

  const lesson = benchmark.lessons[0]

  const [playable, termRows, glossaryTerms, publishedClass] = await Promise.all([
    prisma.benchmark.count({ where: { id: benchmark.id, ...PLAYABLE_BENCHMARK_WHERE } }),
    prisma.term.findMany({
      where: { benchmarkId: benchmark.id, tier: 'TIER_3', approvalStatus: 'APPROVED' },
      orderBy: { term: 'asc' },
      select: {
        term: true,
        definition: true,
        relatedVocab: true,
        translations: {
          where: { approvalStatus: 'APPROVED', languageCode: { in: ['es', 'ht'] } },
          select: { definitionTranslated: true, languageCode: true },
        },
      },
    }),
    getGlossaryTermsForBenchmark(benchmark.id),
    getPublishedClass(),
  ])

  let lessonSteps: ResolvedStep[] = []
  if (lesson) {
    const classId = publishedClass?.id ?? null
    const [overrides, layer] = await Promise.all([
      getClassStepOverrideMap(
        classId,
        lesson.steps.map((s) => s.id)
      ),
      getClassLessonLayer(classId, lesson.id),
    ])
    lessonSteps = resolveClassLessonSteps({
      builtInSteps: lesson.steps,
      overrides,
      classSteps: layer.classSteps,
      savedOrder: layer.savedOrder,
    })
  }

  const idForType = (t: string) =>
    benchmark.assessments.find((a) => a.assessmentType === t)?.id ?? null

  return {
    benchmarkCode: benchmark.code,
    benchmarkTitle: benchmark.title,
    playable: playable > 0,
    lessonSummary: benchmark.lessonSummary ?? null,
    lessonBody: lesson?.body ?? null,
    studentFriendlyTarget: lesson?.studentFriendlyTarget ?? benchmark.title,
    preCheckAssessmentId: idForType('PRE_CHECK'),
    vocabCheckAssessmentId: idForType('VOCAB_CHECK'),
    practiceAssessmentId: idForType('PRACTICE'),
    readinessAssessmentId: idForType('READINESS_CHECK'),
    masteryFormIds: benchmark.assessments
      .filter((a) => a.assessmentType === 'MASTERY_CHALLENGE')
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((a) => a.id),
    lessonSteps,
    glossaryTerms,
    terms: termRows.map((t) => {
      const l1Definitions: Partial<Record<'es' | 'ht', string>> = {}
      for (const tr of t.translations) {
        if (tr.languageCode === 'es' || tr.languageCode === 'ht') {
          l1Definitions[tr.languageCode] = tr.definitionTranslated
        }
      }
      return {
        term: t.term,
        definition: t.definition,
        relatedVocab: t.relatedVocab ?? null,
        ...(Object.keys(l1Definitions).length > 0 ? { l1Definitions } : {}),
      }
    }),
  }
}
