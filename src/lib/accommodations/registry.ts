/**
 * Accommodation Enforcement Registry
 *
 * ── WHY THIS FILE EXISTS ────────────────────────────────────────────────────
 * The accommodation catalog (`seed/benchmarks.ts`) and the code that acts on a
 * grant were two unrelated lists, with nothing making them agree. That is how
 * seven of fifteen codes came to be grantable, audit-logged, IEP-shaped labels
 * that no code anywhere read — a teacher could grant extended time to a student
 * whose IEP required it, see a green "✓ Granted" chip, and reasonably believe it
 * had taken effect.
 *
 * This registry is the single place that answers "what does granting this
 * actually do?", and `tests/unit/accommodations/registry.test.ts` fails if a code
 * exists in the seed catalog but not here (or the reverse). Adding an
 * accommodation now forces an explicit answer to that question.
 *
 * ── THE THREE STATUSES ──────────────────────────────────────────────────────
 * `enforced`            — code reads the grant and changes behaviour.
 * `satisfied-by-design` — the support is already true for every student, so
 *                         there is nothing for the grant to switch on. This is
 *                         an honest state, not a shortfall, but it must be said
 *                         out loud rather than left looking like a live toggle.
 * `not-implemented`     — the grant is recorded and does nothing yet. Shown to
 *                         teachers in amber. Never let a code sit here silently.
 *
 * `summary` is rendered verbatim to teachers in the student profile's
 * accommodation editor. Write it for someone holding an IEP, not for a developer.
 */

export type AccommodationEnforcementStatus =
  | 'enforced'
  | 'satisfied-by-design'
  | 'not-implemented'

export interface AccommodationEnforcement {
  status: AccommodationEnforcementStatus
  /** Teacher-facing sentence. Describes what ships today, never an intention. */
  summary: string
  /** Where the behaviour applies. Empty for non-enforced codes. */
  surfaces: string[]
}

export const ACCOMMODATION_ENFORCEMENT: Readonly<
  Record<string, AccommodationEnforcement>
> = {
  // ── Reading load ─────────────────────────────────────────────────────────
  'ACC-SIMPLE-LANG': {
    status: 'enforced',
    summary:
      'Passages default to the simplified (level 1) version wherever one has been written.',
    surfaces: ['Assessments', 'Practice Arena', 'Source passages'],
  },
  ELL: {
    status: 'enforced',
    summary:
      'Passages default to the simplified (level 1) version wherever one has been written.',
    surfaces: ['Assessments', 'Practice Arena', 'Source passages'],
  },
  'BELOW-GRADE-READER': {
    status: 'enforced',
    summary:
      'Passages default to the simplified (level 1) version wherever one has been written.',
    surfaces: ['Assessments', 'Practice Arena', 'Source passages'],
  },

  // ── Presentation ─────────────────────────────────────────────────────────
  'ACC-HIGH-CONTRAST': {
    status: 'enforced',
    summary:
      'Forces high-contrast colours on every student page. The student cannot turn this off in their own settings while it is granted.',
    surfaces: ['All student pages'],
  },
  'ACC-LARGE-TEXT': {
    status: 'enforced',
    summary:
      'Forces a larger base font size on every student page. The student cannot turn this off in their own settings while it is granted.',
    surfaces: ['All student pages'],
  },
  'ACC-CHUNK': {
    status: 'enforced',
    summary:
      'Passages open already split one sentence per line. The student can still switch it off for themselves, and that choice is remembered.',
    surfaces: ['Assessments', 'Lessons', 'Source passages'],
  },
  'ACC-T2-VOCAB': {
    status: 'enforced',
    summary:
      'Academic (tier-2) vocabulary keeps its tap-for-definition underline even on original-source passages, which normally carry no glossary help at all.',
    surfaces: ['Assessments', 'Lessons', 'Source passages'],
  },

  // ── Pacing ───────────────────────────────────────────────────────────────
  'ACC-BREAKS': {
    status: 'enforced',
    summary:
      'Suggests a break every 10 minutes instead of every 40, and taking one during a Focus Mode assessment is never recorded as leaving the test.',
    surfaces: ['All student pages', 'Focus Mode assessments'],
  },
  'ACC-EXT-TIME': {
    status: 'satisfied-by-design',
    summary:
      'No action needed — nothing in this platform is timed for any student. There is no countdown and no expiry on any assessment, drill, or lesson, so extended time is already met. Recorded here for IEP documentation.',
    surfaces: [],
  },

  // ── Item presentation ────────────────────────────────────────────────────
  'ACC-REDUCED-CHOICES': {
    status: 'enforced',
    summary:
      'Serves 3 answer choices instead of 4 on practice work. Never on the Mastery Challenge, Readiness Check, or Republic Challenge — changing the odds of a guess there would change what mastery means.',
    surfaces: [
      'Practice',
      'Pre-Check',
      'Word Builder',
      'Unit Review',
      'Practice Arena',
      'Daily Drill',
      'Remediation',
    ],
  },

  // ── Language ─────────────────────────────────────────────────────────────
  'ACC-L1-SPANISH': {
    status: 'enforced',
    summary:
      'Civics terms show an approved Spanish gloss alongside the English definition.',
    surfaces: ['Assessments', 'Lessons', 'Source passages'],
  },
  'ACC-L1-CREOLE': {
    status: 'enforced',
    summary:
      'Civics terms show an approved Haitian Creole gloss alongside the English definition.',
    surfaces: ['Assessments', 'Lessons', 'Source passages'],
  },

  // ── Application-wide obligations, not per-student switches ───────────────
  'ACC-READ-ALOUD': {
    status: 'satisfied-by-design',
    summary:
      'No action needed — the read-aloud button is on every passage for every student already. Recorded here for IEP documentation.',
    surfaces: [],
  },
  'ACC-SCREEN-READER': {
    status: 'satisfied-by-design',
    summary:
      'No action needed — screen-reader labelling and keyboard order apply to every page for every student, not per account. Recorded here for IEP documentation. Manual screen-reader testing is still outstanding (district packet §9).',
    surfaces: [],
  },

  // ── Genuinely outstanding ────────────────────────────────────────────────
  'ACC-CONTEXT-BOOST': {
    status: 'not-implemented',
    summary:
      'Not built yet. Granting this records the requirement on the student\'s profile but does not change anything they see. Background context cards are still on the backlog.',
    surfaces: [],
  },
}

/** All catalog codes this registry knows about. */
export const REGISTERED_ACCOMMODATION_CODES: readonly string[] = Object.keys(
  ACCOMMODATION_ENFORCEMENT
)

/**
 * Enforcement facts for a code. Returns `null` for a code the registry has never
 * heard of — callers should render that as unknown rather than assume it works.
 */
export function getAccommodationEnforcement(
  code: string
): AccommodationEnforcement | null {
  return ACCOMMODATION_ENFORCEMENT[code] ?? null
}

/** Codes whose grant currently changes nothing a student would notice. */
export function getUnimplementedAccommodationCodes(): string[] {
  return REGISTERED_ACCOMMODATION_CODES.filter(
    (code) => ACCOMMODATION_ENFORCEMENT[code].status === 'not-implemented'
  )
}
