import { PrismaClient } from '@prisma/client'

const BADGES = [
  // MASTERY track
  {
    name: 'Citizen-in-Training',
    description: 'Complete your first benchmark mission.',
    iconKey: 'shield-check',
    track: 'MASTERY' as const,
    criteriaJson: { event: 'benchmark_mastered', count: 1 },
  },
  {
    name: 'Branches Strategist',
    description: 'Master all three branches of government benchmarks.',
    iconKey: 'tree',
    track: 'MASTERY' as const,
    criteriaJson: { event: 'benchmark_mastered', tags: ['branches'], count: 3 },
  },
  {
    name: 'Rights Defender',
    description: 'Master all rights and freedoms benchmarks.',
    iconKey: 'scale',
    track: 'MASTERY' as const,
    criteriaJson: { event: 'benchmark_mastered', tags: ['rights'], count: 2 },
  },
  {
    name: 'Constitution Builder',
    description: 'Master all constitutional foundations benchmarks.',
    iconKey: 'document-text',
    track: 'MASTERY' as const,
    criteriaJson: { event: 'benchmark_mastered', tags: ['constitution'], count: 2 },
  },
  {
    name: 'Justice Guardian',
    description: 'Master all judicial system benchmarks.',
    iconKey: 'gavel',
    track: 'MASTERY' as const,
    criteriaJson: { event: 'benchmark_mastered', tags: ['judiciary'], count: 2 },
  },
  {
    name: 'Policy Problem Solver',
    description: 'Master all public policy benchmarks.',
    iconKey: 'lightbulb',
    track: 'MASTERY' as const,
    criteriaJson: { event: 'benchmark_mastered', tags: ['policy'], count: 2 },
  },
  {
    name: 'Republic Guardian',
    description: 'Master all benchmarks in Unit 1.',
    iconKey: 'flag',
    track: 'MASTERY' as const,
    criteriaJson: { event: 'unit_complete', unitCode: 'unit-1' },
  },
  {
    name: 'Founding Documents',
    description: 'Score 90%+ on a Founding Documents mastery challenge.',
    iconKey: 'scroll',
    track: 'MASTERY' as const,
    criteriaJson: { event: 'mastery_score_above', threshold: 0.9, tag: 'founding-documents' },
  },
  // The four Pillar badges match on ReportingCategory.name EXACTLY.
  //
  // All four previously carried invented names ('Origins of American
  // Democracy', 'Civic Foundations', 'Government Structures and Functions',
  // 'Civic Participation') that match nothing in `seed/reporting_categories.ts`,
  // so the lookup returned zero benchmarks and every one of them was dead.
  // These strings are now the real four, verbatim. If you rename a reporting
  // category, rename it here in the same commit.
  {
    name: 'Pillar I — Origins',
    description: 'Master every available Origins and Purposes of Law and Government mission.',
    iconKey: 'pillar',
    track: 'MASTERY' as const,
    criteriaJson: {
      event: 'reporting_category_mastered',
      category: 'Origins and Purposes of Law and Government',
    },
  },
  {
    name: 'Pillar II — Citizens',
    description: 'Master every available Roles, Rights, and Responsibilities of Citizens mission.',
    iconKey: 'users',
    track: 'MASTERY' as const,
    criteriaJson: {
      event: 'reporting_category_mastered',
      category: 'Roles, Rights, and Responsibilities of Citizens',
    },
  },
  {
    name: 'Pillar III — Policies',
    description: 'Master every available Government Policies and Political Processes mission.',
    iconKey: 'building',
    track: 'MASTERY' as const,
    criteriaJson: {
      event: 'reporting_category_mastered',
      category: 'Government Policies and Political Processes',
    },
  },
  {
    name: 'Pillar IV — Organization',
    description: 'Master every available Organization and Function of Government mission.',
    iconKey: 'organization',
    track: 'MASTERY' as const,
    criteriaJson: {
      event: 'reporting_category_mastered',
      category: 'Organization and Function of Government',
    },
  },
  {
    name: 'Source Reader',
    description: 'Complete Source Decoder Level 1.',
    iconKey: 'book-open',
    track: 'MASTERY' as const,
    criteriaJson: { event: 'source_decoder_level', level: 1 },
  },
  {
    name: 'Source Analyst',
    description: 'Complete Source Decoder Level 2.',
    iconKey: 'magnifying-glass',
    track: 'MASTERY' as const,
    criteriaJson: { event: 'source_decoder_level', level: 2 },
  },
  {
    name: '14-Day Sentinel',
    description: 'Maintain a 14-day streak.',
    iconKey: 'calendar-check',
    track: 'MASTERY' as const,
    criteriaJson: { event: 'streak_days', count: 14 },
  },
  {
    name: '30-Day Guardian',
    description: 'Maintain a 30-day streak.',
    iconKey: 'fire',
    track: 'MASTERY' as const,
    criteriaJson: { event: 'streak_days', count: 30 },
  },
  // READING track
  {
    name: 'Source Spotter',
    description: 'Complete 5 source-analysis practice items.',
    iconKey: 'eye',
    track: 'READING' as const,
    criteriaJson: { event: 'source_analysis_complete', count: 5 },
  },
  {
    name: 'Claim Cracker',
    description: 'Correctly identify the main claim in 5 excerpts.',
    iconKey: 'chat-bubble',
    track: 'READING' as const,
    criteriaJson: { event: 'claim_identified', count: 5 },
  },
  // These two are retargeted onto Source Decoder LEVEL COMPLETION, which is a
  // real, tracked event (`SourceDecoderProgress`), instead of the per-item
  // counters that no table records. The levels line up with what the badges
  // already claim to be about: level 3 is "Author's Purpose", level 4 is
  // "Source Showdown".
  //
  // Only these two. Levels 1 and 2 are already claimed by Source Reader and
  // Source Analyst above — pointing all four READING badges at levels would
  // hand out two badges for one action.
  {
    name: 'Purpose Finder',
    description: "Complete Source Decoder Level 3 — Author's Purpose.",
    iconKey: 'target',
    track: 'READING' as const,
    criteriaJson: { event: 'source_decoder_level', level: 3 },
  },
  {
    name: 'Source Showdown Champion',
    description: 'Complete Source Decoder Level 4 — Source Showdown.',
    iconKey: 'arrows-right-left',
    track: 'READING' as const,
    criteriaJson: { event: 'source_decoder_level', level: 4 },
  },
  // ENGAGEMENT track
  {
    name: 'First Drill',
    description: 'Complete your first Daily Republic Drill.',
    iconKey: 'star',
    track: 'ENGAGEMENT' as const,
    criteriaJson: { event: 'drill_complete', count: 1 },
  },
  {
    name: '7-Day Patriot',
    description: 'Maintain a 7-day activity streak.',
    iconKey: 'calendar',
    track: 'ENGAGEMENT' as const,
    criteriaJson: { event: 'streak_days', count: 7 },
  },
  {
    name: '30-Day Republic Builder',
    description: 'Complete at least one activity every day for 30 days.',
    iconKey: 'trophy',
    track: 'ENGAGEMENT' as const,
    criteriaJson: { event: 'streak_days', count: 30 },
  },
  // STRATEGY track (spec §19.2)
  {
    name: 'Distractor Hunter',
    description: 'Complete the Eliminate the Distractor strategy mission.',
    iconKey: 'scissors',
    track: 'STRATEGY' as const,
    criteriaJson: { event: 'strategy_mission', missionCode: 'eliminate-distractor' },
  },
  {
    name: 'Evidence Tracker',
    description: 'Complete the Evidence-Based Answers strategy mission.',
    iconKey: 'magnifying-glass',
    track: 'STRATEGY' as const,
    criteriaJson: { event: 'strategy_mission', missionCode: 'evidence-based' },
  },
  {
    name: 'Master Strategist',
    description: 'Complete all 7 Test-Taking Strategy missions.',
    iconKey: 'chess-knight',
    track: 'STRATEGY' as const,
    criteriaJson: { event: 'strategy_track_complete', count: 7 },
  },
]

export async function seedBadges(prisma: PrismaClient) {
  for (const badge of BADGES) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: {
        description: badge.description,
        iconKey: badge.iconKey,
        criteriaJson: badge.criteriaJson,
      },
      create: {
        name: badge.name,
        description: badge.description,
        iconKey: badge.iconKey,
        track: badge.track,
        criteriaJson: badge.criteriaJson,
      },
    })
  }
  console.log(`  Upserted ${BADGES.length} badges`)
}
