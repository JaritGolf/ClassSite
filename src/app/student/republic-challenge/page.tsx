import { headers } from 'next/headers'
import { requireAuth } from '@/lib/auth'
import { Hub } from '@/components/student/republic-challenge/Hub'

interface HubConfig {
  featureEocReviewEnabled: boolean
  stamina: { label: string; length: number; isLadderPeak: boolean }
  finalTrial: { open: boolean; length: number; attemptsAllowed: number; reviewWindow: string }
}

async function fetchConfig(): Promise<HubConfig> {
  // SSR fetch — same-origin; pass through the session cookie.
  const h = headers()
  const host = h.get('host') ?? 'localhost:3000'
  const protocol = h.get('x-forwarded-proto') ?? 'http'
  const cookie = h.get('cookie') ?? ''
  const res = await fetch(`${protocol}://${host}/api/republic-challenge/config`, {
    headers: { cookie },
    cache: 'no-store',
  })
  if (!res.ok) {
    return {
      featureEocReviewEnabled: false,
      stamina: { label: '—', length: 10, isLadderPeak: false },
      finalTrial: { open: false, length: 50, attemptsAllowed: 1, reviewWindow: 'after_submit' },
    }
  }
  return res.json()
}

export default async function RepublicChallengeHubPage() {
  await requireAuth(['STUDENT'])
  const config = await fetchConfig()
  return <Hub config={config} />
}
