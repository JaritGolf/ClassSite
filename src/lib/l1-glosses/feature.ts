/**
 * FEATURE_L1_GLOSSES flag (spec §29 feature flags).
 * Opt-in (off by default, matching .env.example): set FEATURE_L1_GLOSSES="true"
 * to enable L1 glosses. Lets the feature be turned on for a pilot — or off
 * instantly — without a code change.
 */
export function isL1GlossesEnabled(): boolean {
  return process.env.FEATURE_L1_GLOSSES === 'true'
}
