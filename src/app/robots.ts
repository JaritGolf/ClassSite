/**
 * robots.txt for mycivicsclass.com.
 *
 * Only the public marketing surface (landing page) is crawlable. The role
 * surfaces and API are disallowed — they are all authenticated (unauthenticated
 * requests redirect to /login), so this is a courtesy signal to crawlers and a
 * privacy-forward default, NOT an access control.
 */

import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/student/', '/teacher/', '/admin/', '/parent/', '/api/'],
    },
  }
}
