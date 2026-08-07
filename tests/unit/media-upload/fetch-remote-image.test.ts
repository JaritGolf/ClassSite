/**
 * URL-level guards for the server-side image import (ADR 0023).
 *
 * Every case here is rejected BEFORE any socket or DNS work, so the suite is
 * hermetic — no network, no fixtures, no timing. The address-range rules are
 * covered separately in ip-guard.test.ts; the redirect and streaming guards
 * need a live server and are exercised in the browser verification pass.
 */

import { fetchRemoteImage, RemoteImageError } from '@/lib/media-upload/fetch-remote-image'

async function codeFor(url: string): Promise<string> {
  try {
    await fetchRemoteImage(url)
    return 'NO_ERROR'
  } catch (e) {
    if (e instanceof RemoteImageError) return e.code
    throw e
  }
}

describe('fetchRemoteImage — URL guards', () => {
  it('requires https', async () => {
    expect(await codeFor('http://example.com/cat.png')).toBe('INSECURE_SCHEME')
  })

  it('rejects non-web schemes outright', async () => {
    for (const url of [
      'file:///etc/passwd',
      'ftp://example.com/cat.png',
      'gopher://example.com/1',
      'data:image/png;base64,iVBORw0KGgo=',
    ]) {
      expect(await codeFor(url)).toBe('INSECURE_SCHEME')
    }
  })

  it('rejects a malformed URL', async () => {
    expect(await codeFor('not a url at all')).toBe('UNSUPPORTED_URL')
  })

  it('rejects embedded credentials (a redirect-laundering trick)', async () => {
    expect(await codeFor('https://user:pass@example.com/cat.png')).toBe('UNSUPPORTED_URL')
  })

  it('rejects any port but 443, which kills internal port probing', async () => {
    expect(await codeFor('https://example.com:6379/cat.png')).toBe('UNSUPPORTED_URL')
    expect(await codeFor('https://example.com:8080/cat.png')).toBe('UNSUPPORTED_URL')
  })

  it('rejects IP literals so the DNS validation can never be skipped', async () => {
    for (const url of [
      'https://169.254.169.254/latest/meta-data/',
      'https://127.0.0.1/cat.png',
      'https://[::1]/cat.png',
      'https://8.8.8.8/cat.png', // even a PUBLIC literal — no exceptions
    ]) {
      expect(await codeFor(url)).toBe('UNSUPPORTED_URL')
    }
  })

  it('rejects local and metadata hostnames by name', async () => {
    for (const url of [
      'https://localhost/cat.png',
      'https://metadata.google.internal/computeMetadata/v1/',
      'https://printer.local/cat.png',
      'https://db.internal/cat.png',
    ]) {
      expect(await codeFor(url)).toBe('BLOCKED_ADDRESS')
    }
  })

  it('never leaks upstream detail in the error', async () => {
    // The error carries a code and nothing else — a descriptive message would
    // make this route a port scanner.
    try {
      await fetchRemoteImage('https://127.0.0.1/cat.png')
      throw new Error('should have rejected')
    } catch (e) {
      expect(e).toBeInstanceOf(RemoteImageError)
      expect((e as RemoteImageError).message).toBe('UNSUPPORTED_URL')
    }
  })
})
