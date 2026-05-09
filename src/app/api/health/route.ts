import { NextResponse } from 'next/server'

/**
 * GET /api/health
 * Health-check endpoint — required by spec Section 2.4.
 * Returns 200 with service status. Expand in later phases to include DB ping.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'civics-quest',
    },
    { status: 200 }
  )
}
