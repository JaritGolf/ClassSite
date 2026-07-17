/**
 * Illustration registry keys (ADR 0015) — plain .ts so jest (which transforms
 * .ts only, no JSX infra) and the seed shape tests can import the key list
 * without pulling in React components. index.tsx types its scene map against
 * IllustrationKey, so a key added here without a scene fails typecheck.
 */

export const illustrationKeys = [
  'social-contract-handshake',
  'crown-vs-law',
  'colonial-town-meeting',
  'quill-declaration',
  'weak-links-chain',
  'convention-compromise',
  'three-branches-seed',
] as const

export type IllustrationKey = (typeof illustrationKeys)[number]
