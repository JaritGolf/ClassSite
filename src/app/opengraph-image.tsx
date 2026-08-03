/**
 * Open Graph / Twitter share card for mycivicsclass.com.
 *
 * Rendered by `next/og` (built into Next 14 — no extra dependency). The eagle
 * mark is an inline data-URI SVG rather than a fetched asset so this makes zero
 * network requests at render time (non-negotiable rule #9: nothing leaves the
 * app). Text uses the ImageResponse default face; the brand display font
 * (Baloo 2) would require fetching a font file at runtime.
 */

import { ImageResponse } from 'next/og'

export const alt = 'My Civics Class — Build the Republic'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// The same mark as src/app/icon.svg (itself lifted from Mascot.tsx), but with
// every coordinate pre-translated into a ZERO-OFFSET `viewBox="0 0 84 84"`.
// That translation is load-bearing: satori (the renderer behind ImageResponse)
// ignores a viewBox's min-x/min-y, so the icon's `viewBox="18 2 84 84"` renders
// shifted and clips the eagle's chin. Keep the two files in visual sync by hand.
const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 84 84" width="300" height="300">
  <rect x="0" y="0" width="84" height="84" rx="18" fill="#4f46e5" />
  <circle cx="42" cy="50" r="24" fill="#ffffff" />
  <circle cx="34" cy="47.5" r="3.8" fill="#1f2937" />
  <circle cx="50" cy="47.5" r="3.8" fill="#1f2937" />
  <path d="M34.5 52.5 Q42 50 49.5 52.5 Q48.5 62 42 66.5 Q35.5 62 34.5 52.5 Z" fill="#f59e0b" />
  <path d="M20 31 Q42 10 64 31 Q42 23 20 31 Z" fill="#1e1b4b" />
  <path d="M5 26 Q22 35 42 35 Q62 35 79 26 Q72 41 42 41 Q12 41 5 26 Z" fill="#1e1b4b" />
  <path d="M8 28.5 Q42 38 76 28.5" stroke="#f59e0b" stroke-width="2.6" fill="none" stroke-linecap="round" />
  <circle cx="64" cy="31.5" r="4.5" fill="#ef4444" />
  <circle cx="64" cy="31.5" r="2.2" fill="#ffffff" />
</svg>`

const MARK_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(MARK_SVG)}`

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 56,
          backgroundColor: '#eef2ff',
          borderBottom: '20px solid #4f46e5',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MARK_DATA_URI} width={300} height={300} alt="" />

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 86, fontWeight: 700, color: '#312e81', lineHeight: 1.1 }}>
            My Civics Class
          </div>
          <div style={{ fontSize: 44, fontWeight: 600, color: '#4f46e5', marginTop: 12 }}>
            Build the Republic
          </div>
          <div style={{ fontSize: 30, color: '#374151', marginTop: 24 }}>
            Florida 7th Grade Civics
          </div>
        </div>
      </div>
    ),
    size,
  )
}
