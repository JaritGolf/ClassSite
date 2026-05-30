/**
 * Seed: Units and Benchmarks — Unit 1 (SS.7.CG.1.1–1.6)
 *
 * Phase 1 seeds Unit 1 (Foundations of American Government) with full metadata.
 * Units 2–7 are stubbed and will be populated in Phase 15 (full course expansion).
 * Idempotent: unit upserted by sequenceOrder, benchmarks upserted by code.
 */

import { PrismaClient } from '@prisma/client'
import { REPORTING_CATEGORY_NAMES } from './reporting_categories'

interface ClarificationDef {
  text: string
  sequenceOrder: number
}

interface BenchmarkDef {
  code: string
  title: string
  sequenceOrder: number
  lessonSummary: string
  clarifications: ClarificationDef[]
  connectsTo: string[] // other benchmark codes this one connects to
}

// ── Unit 1 Benchmark Definitions ──────────────────────────────────────────

const UNIT_1_BENCHMARKS: BenchmarkDef[] = [
  {
    code: 'SS.7.CG.1.1',
    title: 'Enlightenment and European Influences on American Democracy',
    sequenceOrder: 1,
    lessonSummary:
      'Students will trace how Enlightenment ideas — especially natural rights, social contract, ' +
      'popular sovereignty, and consent of the governed — influenced the American founding. ' +
      'Key thinkers: John Locke, Montesquieu, Rousseau. Key documents: Magna Carta, English Bill of Rights, ' +
      'Mayflower Compact.',
    clarifications: [
      {
        text: 'Explain how Enlightenment philosophers (Locke, Montesquieu) contributed ideas used in founding documents.',
        sequenceOrder: 1,
      },
      {
        text: 'Identify key European foundational documents (Magna Carta, English Bill of Rights) and explain their influence on American self-governance.',
        sequenceOrder: 2,
      },
      {
        text: 'Describe the concepts of natural rights, social contract, popular sovereignty, consent of the governed, and rule of law.',
        sequenceOrder: 3,
      },
    ],
    connectsTo: ['SS.7.CG.1.4'],
  },
  {
    code: 'SS.7.CG.1.2',
    title: 'Colonial and British Governmental Traditions',
    sequenceOrder: 2,
    lessonSummary:
      'Students will examine how British governmental traditions and colonial experiences created a ' +
      'foundation for American self-governance. Key concepts: colonial assemblies, Virginia House of Burgesses, ' +
      'New England town meetings, common law, salutary neglect, Mayflower Compact.',
    clarifications: [
      {
        text: 'Describe how colonial governments developed traditions of self-governance through institutions such as the Virginia House of Burgesses and New England town meetings.',
        sequenceOrder: 1,
      },
      {
        text: 'Explain the role of salutary neglect in enabling colonial self-governance to develop prior to the Revolution.',
        sequenceOrder: 2,
      },
      {
        text: 'Identify the influence of English common law on American legal and governmental traditions.',
        sequenceOrder: 3,
      },
    ],
    connectsTo: ['SS.7.CG.1.1', 'SS.7.CG.1.3'],
  },
  {
    code: 'SS.7.CG.1.3',
    title: 'British Policies and Colonial Reactions',
    sequenceOrder: 3,
    lessonSummary:
      'Students will analyze how British economic and political policies following the French and Indian War ' +
      'created colonial grievances and sparked resistance. Key topics: Navigation Acts, Stamp Act, Townshend Acts, ' +
      'taxation without representation, colonial responses (petitions, boycotts, Sons of Liberty).',
    clarifications: [
      {
        text: 'Describe British policies following the French and Indian War and how they increased tensions with the colonists.',
        sequenceOrder: 1,
      },
      {
        text: 'Explain how colonial responses — including petitions, boycotts, and committees of correspondence — represented organized resistance.',
        sequenceOrder: 2,
      },
      {
        text: 'Analyze how the principle of "no taxation without representation" reflected Enlightenment ideas about consent of the governed.',
        sequenceOrder: 3,
      },
    ],
    connectsTo: ['SS.7.CG.1.2', 'SS.7.CG.1.4'],
  },
  {
    code: 'SS.7.CG.1.4',
    title: 'Principles and Ideals of the Declaration of Independence',
    sequenceOrder: 4,
    lessonSummary:
      'Students will explain the philosophical foundations and historical significance of the Declaration of Independence. ' +
      'Key concepts: natural rights, self-evident truths, consent of the governed, right to alter or abolish government, ' +
      'specific grievances vs. universal principles, Thomas Jefferson.',
    clarifications: [
      {
        text: 'Identify the philosophical foundations of the Declaration — natural rights, social contract, and popular sovereignty — and trace them to Enlightenment thinkers.',
        sequenceOrder: 1,
      },
      {
        text: 'Distinguish between the universal principles stated in the Declaration and the specific grievances listed against King George III.',
        sequenceOrder: 2,
      },
      {
        text: 'Explain why the Declaration of Independence was historically significant as both a political break and a statement of democratic ideals.',
        sequenceOrder: 3,
      },
    ],
    connectsTo: ['SS.7.CG.1.1', 'SS.7.CG.1.3', 'SS.7.CG.1.5'],
  },
  {
    code: 'SS.7.CG.1.5',
    title: 'Strengths and Weaknesses of the Articles of Confederation',
    sequenceOrder: 5,
    lessonSummary:
      "Students will analyze the first U.S. plan of government. Key weaknesses: Congress couldn't tax, " +
      "couldn't enforce laws, no executive branch, no national courts, each state had one vote, amendments required " +
      'unanimity. Key event: Shays\' Rebellion revealed the government\'s inability to maintain order.',
    clarifications: [
      {
        text: 'Identify the key weaknesses of the Articles of Confederation, including the inability to tax, lack of executive branch, no national courts, and inability to enforce laws.',
        sequenceOrder: 1,
      },
      {
        text: "Explain how events such as Shays' Rebellion demonstrated that the Articles of Confederation were inadequate to govern the new nation.",
        sequenceOrder: 2,
      },
      {
        text: 'Describe why leaders called for a Constitutional Convention rather than simply amending the Articles.',
        sequenceOrder: 3,
      },
    ],
    connectsTo: ['SS.7.CG.1.4', 'SS.7.CG.1.6'],
  },
  {
    code: 'SS.7.CG.1.6',
    title: 'Creating the Constitution: Addressing the Articles\' Weaknesses',
    sequenceOrder: 6,
    lessonSummary:
      'Students will examine how the Constitutional Convention addressed the failures of the Articles of Confederation. ' +
      'Key topics: Great Compromise (bicameral legislature), Three-Fifths Compromise, Connecticut Plan, Virginia Plan, ' +
      'New Jersey Plan, Federalists vs. Anti-Federalists, ratification debate, Bill of Rights.',
    clarifications: [
      {
        text: 'Explain how the Constitution addressed specific weaknesses of the Articles, including granting Congress power to tax, creating an executive branch, and establishing federal courts.',
        sequenceOrder: 1,
      },
      {
        text: 'Describe the key debates and compromises at the Constitutional Convention, including the Great Compromise (equal Senate seats + proportional House) and the Three-Fifths Compromise.',
        sequenceOrder: 2,
      },
      {
        text: 'Explain the Federalist/Anti-Federalist debate over ratification and how the promise of a Bill of Rights helped secure ratification.',
        sequenceOrder: 3,
      },
    ],
    connectsTo: ['SS.7.CG.1.5'],
  },
]

// ── Stub units for Phases 2–7 (full data in Phase 15) ─────────────────────

const UNIT_STUBS = [
  { sequenceOrder: 2, title: 'Unit 2: Creating and Limiting Government', gameRegionName: 'Constitution Forge' },
  { sequenceOrder: 3, title: 'Unit 3: Citizenship, Rights, and Responsibilities', gameRegionName: 'Rights District' },
  { sequenceOrder: 4, title: 'Unit 4: Participation and Public Influence', gameRegionName: 'Civic Square' },
  { sequenceOrder: 5, title: 'Unit 5: Constitutional Structure and Federalism', gameRegionName: 'Federalism Frontier' },
  { sequenceOrder: 6, title: 'Unit 6: Rights Expansion, Branches, Courts, and Law', gameRegionName: 'Justice Citadel' },
  { sequenceOrder: 7, title: 'Unit 7: Government Services, Electoral College, and Economics', gameRegionName: 'Republic Summit' },
]

export async function seedBenchmarks(prisma: PrismaClient): Promise<void> {
  // ── Look up Origins reporting category ──────────────────────────────────
  const originsCategory = await prisma.reportingCategory.findUnique({
    where: { name: REPORTING_CATEGORY_NAMES.ORIGINS },
  })
  if (!originsCategory) {
    throw new Error('Origins reporting category not found — run seedReportingCategories first.')
  }

  // ── Upsert Unit 1 ─────────────────────────────────────────────────────
  const unit1 = await prisma.unit.upsert({
    where: { id: 'unit-1' },
    create: {
      id: 'unit-1',
      title: 'Unit 1: Foundations of American Government',
      description:
        'Covers the origins of American democracy including Enlightenment influences, colonial self-governance, ' +
        'British policies, the Declaration of Independence, Articles of Confederation, and the Constitution.',
      sequenceOrder: 1,
      gameRegionName: "Founders' Harbor",
      active: true,
    },
    update: {
      title: 'Unit 1: Foundations of American Government',
      gameRegionName: "Founders' Harbor",
      active: true,
    },
  })

  // ── Upsert stub units 2–7 ─────────────────────────────────────────────
  for (const stub of UNIT_STUBS) {
    const stubId = `unit-${stub.sequenceOrder}`
    await prisma.unit.upsert({
      where: { id: stubId },
      create: {
        id: stubId,
        title: stub.title,
        sequenceOrder: stub.sequenceOrder,
        gameRegionName: stub.gameRegionName,
        active: false, // not active until Phase 15 populates them
      },
      update: { title: stub.title, gameRegionName: stub.gameRegionName },
    })
  }

  // ── Upsert Unit 1 benchmarks ──────────────────────────────────────────
  for (const bm of UNIT_1_BENCHMARKS) {
    const benchmark = await prisma.benchmark.upsert({
      where: { code: bm.code },
      create: {
        code: bm.code,
        title: bm.title,
        unitId: unit1.id,
        reportingCategoryId: originsCategory.id,
        sequenceOrder: bm.sequenceOrder,
        lessonSummary: bm.lessonSummary,
        approvalStatus: 'APPROVED',
        version: 1,
      },
      update: {
        title: bm.title,
        lessonSummary: bm.lessonSummary,
      },
    })

    // Upsert clarifications — delete-and-recreate for simplicity (they have no stable unique key)
    const existingClarifications = await prisma.benchmarkClarification.findMany({
      where: { benchmarkId: benchmark.id },
    })
    if (existingClarifications.length === 0) {
      for (const clar of bm.clarifications) {
        await prisma.benchmarkClarification.create({
          data: {
            benchmarkId: benchmark.id,
            text: clar.text,
            sequenceOrder: clar.sequenceOrder,
          },
        })
      }
    }
  }

  // ── Upsert benchmark connections ─────────────────────────────────────
  for (const bm of UNIT_1_BENCHMARKS) {
    const source = await prisma.benchmark.findUnique({ where: { code: bm.code } })
    if (!source) continue

    for (const targetCode of bm.connectsTo) {
      const target = await prisma.benchmark.findUnique({ where: { code: targetCode } })
      if (!target) continue

      await prisma.benchmarkConnection.upsert({
        where: { benchmarkId_connectedBenchmarkId: { benchmarkId: source.id, connectedBenchmarkId: target.id } },
        create: {
          benchmarkId: source.id,
          connectedBenchmarkId: target.id,
          relationshipType: 'SUPPORTS',
        },
        update: {},
      })
    }
  }

  // ── Seed default accommodations ───────────────────────────────────────
  const accommodations = [
    { code: 'ACC-EXT-TIME', name: 'Extended Time', description: 'Adds configurable time multiplier (1.5x, 2x) to timed activities.' },
    { code: 'ACC-READ-ALOUD', name: 'Read-Aloud', description: 'Auto-enables read-aloud control on all stimulus passages.' },
    { code: 'ACC-CHUNK', name: 'Sentence Chunking', description: 'Visual chunking of long passages into shorter units.' },
    { code: 'ACC-SIMPLE-LANG', name: 'Simplified Language', description: 'Defaults stimulus to reading-load level 1 where available.' },
    { code: 'ACC-T2-VOCAB', name: 'Tier-2 Vocabulary Popovers Always On', description: 'Tier-2 academic words always show glossary popover.' },
    { code: 'ACC-REDUCED-CHOICES', name: 'Reduced Answer Choices', description: '3 instead of 4 answer choices on practice (not Mastery). Phase 9+.' },
    // Phase 12: remaining MVP accommodations (Appendix G)
    { code: 'ACC-BREAKS', name: 'Frequent Breaks', description: 'Auto-suggests a pause every 10 minutes across all sessions.' },
    { code: 'ACC-SCREEN-READER', name: 'Screen Reader Optimized', description: 'Ensures all controls have ARIA labels and a logical tab order.' },
    { code: 'ACC-HIGH-CONTRAST', name: 'High Contrast Mode', description: 'Switches the color palette to a high-contrast scheme.' },
    { code: 'ACC-LARGE-TEXT', name: 'Large Text', description: 'Bumps the base font size; layout reflows.' },
    { code: 'ACC-CONTEXT-BOOST', name: 'Background Context Cards', description: 'Optional 30-60s context cards before unfamiliar references. (Cards wired in a later phase.)' },
    // Phase 7: reading-load accommodation codes used by getEffectiveReadingLevel
    { code: 'ELL', name: 'English Language Learner', description: 'Defaults stimulus content to reading-load level 1 for practice. Tier-2 glossary and sentence-chunking enabled by default.' },
    { code: 'BELOW-GRADE-READER', name: 'Below-Grade Reader', description: 'Defaults stimulus content to reading-load level 1. Read-aloud and sentence-chunking enabled by default.' },
  ]
  for (const acc of accommodations) {
    await prisma.accommodation.upsert({
      where: { code: acc.code },
      create: acc,
      update: { name: acc.name, description: acc.description },
    })
  }

  console.log(`  ✓ Units seeded (7 total, Unit 1 fully populated)`)
  console.log(`  ✓ Benchmarks seeded (${UNIT_1_BENCHMARKS.length} Unit 1 benchmarks)`)
  console.log(`  ✓ Accommodations seeded (${accommodations.length})`)
}
