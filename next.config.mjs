/**
 * Next.js configuration.
 *
 * The `headers()` block below is the app-layer half of the security posture that
 * `docs/hosting-plan.md` describes. TLS termination, at-rest encryption, and DDoS
 * handling belong to the hosting layer (Cloudflare → Vercel → Neon); these headers
 * are the part the application itself is responsible for, and they are what a
 * district IT review actually inspects with `curl -I`.
 *
 * See `docs/district-approval-packet.md` § F for the reviewer-facing explanation.
 */

/**
 * Content-Security-Policy.
 *
 * Scoped to what this app genuinely loads. Verified before writing this: the ONLY
 * external subresource anywhere in `src/` is the click-to-load YouTube facade
 * (`src/components/student/mission/media/VideoStepView.tsx`), which embeds
 * `youtube-nocookie.com` and only after the student presses play. There are no CDN
 * scripts, no external stylesheets, no remote images, and no analytics SDKs — fonts
 * are downloaded at build time by `next/font/google` and served from our own origin.
 * The static guard test `tests/integration/audit17/04-no-analytics-guard.test.ts`
 * keeps that true.
 *
 * KNOWN WEAKNESS, deliberately accepted and disclosed: `script-src` and `style-src`
 * carry `'unsafe-inline'`. Next 14's App Router injects inline bootstrap/hydration
 * scripts, and `next/font` injects an inline style block. Removing `'unsafe-inline'`
 * requires generating a per-request nonce in middleware and threading it through the
 * document — real work with real breakage risk against a working app. It is scheduled,
 * not forgotten, and the packet says so rather than describing this CSP as strict.
 * `'unsafe-eval'` is needed by the dev-mode React refresh runtime only, so it is
 * added in development and withheld in production.
 *
 * The directives that do carry weight here are the ones that bound damage even with
 * inline script allowed: `default-src 'self'` (nothing loads from anywhere else),
 * `connect-src 'self'` (no exfiltration endpoint — this is the rule-#9 backstop),
 * `frame-src` limited to the one sanctioned video host, `object-src 'none'`,
 * `base-uri 'self'`, and `frame-ancestors 'none'`.
 */
function contentSecurityPolicy() {
  const isDev = process.env.NODE_ENV !== 'production'

  const directives = [
    "default-src 'self'",
    // 'unsafe-eval' is the dev-only React refresh runtime; production omits it.
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    // data: covers next/font's inlined font faces and inline SVG data URIs;
    // blob: covers the client-side preview of a teacher's lesson-image upload.
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // No external endpoint may be contacted from a student's browser. In dev,
    // Next's HMR websocket needs the same origin over ws:.
    `connect-src 'self'${isDev ? ' ws: wss:' : ''}`,
    // The click-to-load lesson-video facade (ADR 0015) is the only embed.
    "frame-src 'self' https://www.youtube-nocookie.com",
    // This app is never meant to be framed. Paired with X-Frame-Options below for
    // older browsers. Clever's Instant Login opens apps in a new tab, not an iframe,
    // so this does not interfere with district SSO launch.
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    // next-auth's signIn() uses fetch + a top-level navigation rather than an HTML
    // form post, so 'self' is sufficient in practice — the OAuth hosts are listed
    // anyway so that a future switch to a real <form> cannot silently break sign-in.
    "form-action 'self' https://clever.com https://accounts.google.com",
    'upgrade-insecure-requests',
  ]

  return directives.join('; ')
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy(),
          },
          {
            // Two years, subdomains included. The edge already redirects HTTP→HTTPS;
            // this instructs the browser never to try plaintext in the first place.
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            // Reinforces the standing "no PII in URLs or query strings" rule
            // (spec §25.2): even the path is withheld from cross-origin referers.
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            // This platform serves 12-13 year olds. It has no feature that needs a
            // camera, microphone, or location, and denying them at the header level
            // means the browser will not surface a permission prompt even if some
            // future code asked — a claim a district reviewer can verify in one curl.
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), usb=(), payment=(), midi=(), magnetometer=(), accelerometer=(), gyroscope=()',
          },
        ],
      },
    ]
  },
}

export default nextConfig
