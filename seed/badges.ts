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
  {
    name: 'Pillar I — Origins',
    description: 'Master all Origins of American Democracy benchmarks.',
    iconKey: 'pillar',
    track: 'MASTERY' as const,
    criteriaJson: { event: 'reporting_category_mastered', category: 'Origins of American Democracy' },
  },
  {
    name: 'Pillar II — Citizens',
    description: 'Master all Civic Foundations benchmarks.',
    iconKey: 'users',
    track: 'MASTERY' as const,
    criteriaJson: { event: 'reporting_category_mastered', category: 'Civic Foundations' },
  },
  {
    name: 'Pillar III — Policies',
    description: 'Master all Government Structures and Functions benchmarks.',
    iconKey: 'building',
    track: 'MASTERY' as const,
    criteriaJson: { event: 'reporting_category_mastered', category: 'Government Structures and Functions' },
  },
  {
    name: 'Pillar IV — Organization',
    description: 'Master all Civic Participation benchmarks.',
    iconKey: 'organization',
    track: 'MASTERY' as const,
    criteriaJson: { event: 'reporting_category_mastered', category: 'Civic Participation' },
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
  {
    name: 'Purpose Finder',
    description: 'Correctly identify author purpose in 5 Source Decoder activities.',
    iconKey: 'target',
    track: 'READING' as const,
    criteriaJson: { event: 'source_decoder_purpose', count: 5 },
  },
  {
    name: 'Source Showdown Champion',
    description: 'Complete a compare-sources Source Decoder activity.',
    iconKey: 'arrows-right-left',
    track: 'READING' as const,
    criteriaJson: { event: 'source_decoder_compare', count: 1 },
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
