/**
 * Clever OAuth Provider for next-auth v4
 *
 * Clever is the primary SSO provider for My Civics Class.
 * Students and teachers authenticate via their district's Clever portal.
 *
 * Clever OAuth2 Endpoints:
 *   Authorization: https://clever.com/oauth/authorize
 *   Token:         https://clever.com/oauth/tokens
 *   User info:     https://api.clever.com/v3.0/me
 *
 * IMPORTANT: Clever does NOT support PKCE.
 *   next-auth v4 defaults to checks: ['pkce', 'state'] for OAuth providers.
 *   This MUST be overridden to checks: ['state'] or callbacks will fail with
 *   "Code verifier did not match the expected value."
 *
 * Setup steps (for district onboarding — see docs/runbook.md):
 *   1. Create an app at https://dev.clever.com
 *   2. Set redirect URI to: https://your-domain/api/auth/callback/clever
 *   3. Request scope: read:user_id  (only — see the note on `scope` below)
 *   4. Copy Client ID and Secret to CLEVER_CLIENT_ID / CLEVER_CLIENT_SECRET
 *
 * TODO (Phase 17 — district production wiring):
 *   The /v3.0/me endpoint only returns { data: { id, type, district } }.
 *   Name and email require a second API call:
 *     Students: GET https://api.clever.com/v3.0/students/{id}
 *     Teachers: GET https://api.clever.com/v3.0/teachers/{id}
 *   Response shape: { data: { name: { first, last }, email, ... } }
 *   Use account.access_token in the signIn callback to make this call.
 *   See src/lib/auth/options.ts signIn callback for the hook point.
 */

import type { OAuthConfig } from 'next-auth/providers/oauth'
import type { UserRole } from '@prisma/client'

/** Shape of the Clever /v3.0/me response */
export interface CleverProfile {
  data: {
    id: string
    type: 'student' | 'teacher' | 'district_admin'
    district: string
  }
}

/** Map Clever user types to Prisma UserRole */
const CLEVER_TYPE_TO_ROLE: Partial<Record<string, UserRole>> = {
  student: 'STUDENT',
  teacher: 'TEACHER',
  district_admin: 'ADMIN',
}

export function cleverProvider(): OAuthConfig<CleverProfile> {
  return {
    id: 'clever',
    name: 'Clever',
    type: 'oauth',
    authorization: {
      url: 'https://clever.com/oauth/authorize',
      params: {
        // MINIMISED DELIBERATELY — do not widen without implementing the reader.
        //
        // This app only ever calls /v3.0/me, which returns { id, type, district }
        // and needs `read:user_id` alone. `read:students` and `read:teachers` were
        // requested here for a name lookup that was never built (see the Phase 17
        // TODO above), so they were scope we asked for and never exercised.
        //
        // Two reasons that had to go: Fla. Stat. § 1006.1494(3)(a) requires an
        // operator to "collect no more covered information than is reasonably
        // necessary", and SDPBC routes anything touching student data through a
        // Legal review that reads the scope string against actual use.
        //
        // If the name lookup is implemented, add the scope back in the SAME commit
        // that adds the API call — never ahead of it.
        scope: 'read:user_id',
        response_type: 'code',
      },
    },
    token: 'https://clever.com/oauth/tokens',
    userinfo: {
      url: 'https://api.clever.com/v3.0/me',
    },
    // Must be ['state'] only — Clever does not support PKCE
    checks: ['state'],
    clientId: process.env.CLEVER_CLIENT_ID,
    clientSecret: process.env.CLEVER_CLIENT_SECRET,
    profile(profile: CleverProfile) {
      const role = CLEVER_TYPE_TO_ROLE[profile.data.type] ?? null

      return {
        // `id` here is the Clever native ID — used as `cleverId` during DB upsert
        id: profile.data.id,
        // userId is the DB cuid — filled after upsert in signIn callback
        userId: '',
        role: role as UserRole,
        // TODO (Phase 17): fetch real name from /v3.0/students/{id} or /v3.0/teachers/{id}
        name: 'Clever User',
        // TODO (Phase 17): fetch real email from user detail endpoint
        email: null,
        image: null,
      }
    },
  }
}
