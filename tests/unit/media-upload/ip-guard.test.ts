/**
 * SSRF address guards for the server-side image import (ADR 0023).
 *
 * This is the whole bypass surface for "the server fetches a URL the user
 * pasted", so it is tested exhaustively and in isolation — no network, no DNS.
 */

import {
  isBlockedHostname,
  isIpLiteral,
  isPublicIpAddress,
} from '@/lib/media-upload/ip-guard'

describe('isPublicIpAddress — IPv4', () => {
  it('allows ordinary public addresses', () => {
    for (const ip of ['8.8.8.8', '1.1.1.1', '140.82.121.4', '93.184.216.34', '172.15.0.1', '172.32.0.1']) {
      expect(isPublicIpAddress(ip)).toBe(true)
    }
  })

  it('blocks cloud instance metadata', () => {
    // The single most valuable SSRF target: hands out credentials on most
    // providers.
    expect(isPublicIpAddress('169.254.169.254')).toBe(false)
    expect(isPublicIpAddress('169.254.0.1')).toBe(false)
  })

  it('blocks loopback', () => {
    for (const ip of ['127.0.0.1', '127.1.2.3', '127.255.255.254']) {
      expect(isPublicIpAddress(ip)).toBe(false)
    }
  })

  it('blocks RFC1918 private space', () => {
    for (const ip of ['10.0.0.1', '10.255.255.255', '172.16.0.1', '172.31.255.255', '192.168.0.1']) {
      expect(isPublicIpAddress(ip)).toBe(false)
    }
  })

  it('blocks the rest of the reserved ranges', () => {
    for (const ip of [
      '0.0.0.0',
      '100.64.0.1', // carrier-grade NAT
      '192.0.0.1',
      '192.0.2.1', // TEST-NET-1
      '192.88.99.1', // 6to4 anycast
      '198.18.0.1', // benchmarking
      '198.51.100.1', // TEST-NET-2
      '203.0.113.1', // TEST-NET-3
      '224.0.0.1', // multicast
      '240.0.0.1', // reserved
      '255.255.255.255', // broadcast
    ]) {
      expect(isPublicIpAddress(ip)).toBe(false)
    }
  })

  it('rejects malformed input rather than guessing', () => {
    for (const bad of ['', '999.1.1.1', '1.2.3', '1.2.3.4.5', 'not-an-ip', '01.02.03.04.05']) {
      expect(isPublicIpAddress(bad)).toBe(false)
    }
  })
})

describe('isPublicIpAddress — IPv6', () => {
  it('allows ordinary public addresses', () => {
    for (const ip of ['2606:4700:4700::1111', '2a00:1450:4009:81f::200e']) {
      expect(isPublicIpAddress(ip)).toBe(true)
    }
  })

  it('blocks loopback and unspecified', () => {
    expect(isPublicIpAddress('::1')).toBe(false)
    expect(isPublicIpAddress('::')).toBe(false)
  })

  it('blocks unique-local, link-local and multicast', () => {
    for (const ip of ['fc00::1', 'fd12:3456::1', 'fe80::1', 'ff02::1']) {
      expect(isPublicIpAddress(ip)).toBe(false)
    }
  })

  it('blocks documentation and 6to4 prefixes', () => {
    expect(isPublicIpAddress('2001:db8::1')).toBe(false)
    expect(isPublicIpAddress('2002::1')).toBe(false)
  })

  it('UNWRAPS IPv4-mapped addresses and applies the IPv4 rules', () => {
    // The classic bypass. A v6-only rule set would wave these straight through
    // to loopback and cloud metadata.
    expect(isPublicIpAddress('::ffff:127.0.0.1')).toBe(false)
    expect(isPublicIpAddress('::ffff:169.254.169.254')).toBe(false)
    expect(isPublicIpAddress('::ffff:10.0.0.1')).toBe(false)
    expect(isPublicIpAddress('::ffff:192.168.1.1')).toBe(false)
    // …and still allows a mapped PUBLIC address.
    expect(isPublicIpAddress('::ffff:8.8.8.8')).toBe(true)
  })

  it('unwraps the deprecated IPv4-compatible form too', () => {
    expect(isPublicIpAddress('::127.0.0.1')).toBe(false)
    expect(isPublicIpAddress('::169.254.169.254')).toBe(false)
  })

  it('unwraps NAT64, which can also encode an internal IPv4 destination', () => {
    expect(isPublicIpAddress('64:ff9b::169.254.169.254')).toBe(false)
    expect(isPublicIpAddress('64:ff9b::127.0.0.1')).toBe(false)
    expect(isPublicIpAddress('64:ff9b::8.8.8.8')).toBe(true)
  })

  it('ignores a zone index, which never makes an address more public', () => {
    expect(isPublicIpAddress('fe80::1%eth0')).toBe(false)
  })

  it('handles bracketed literals', () => {
    expect(isPublicIpAddress('[::1]')).toBe(false)
    expect(isPublicIpAddress('[2606:4700:4700::1111]')).toBe(true)
  })

  it('rejects malformed input rather than guessing', () => {
    for (const bad of ['gggg::1', '2001:db8:::1', '1:2:3:4:5:6:7:8:9']) {
      expect(isPublicIpAddress(bad)).toBe(false)
    }
  })
})

describe('isIpLiteral', () => {
  it('recognises both families', () => {
    expect(isIpLiteral('8.8.8.8')).toBe(true)
    expect(isIpLiteral('::1')).toBe(true)
    expect(isIpLiteral('[2606:4700::1111]')).toBe(true)
  })

  it('does not mistake a DNS name for a literal', () => {
    for (const host of ['example.com', 'commons.wikimedia.org', 'loc.gov']) {
      expect(isIpLiteral(host)).toBe(false)
    }
  })
})

describe('isBlockedHostname', () => {
  it('blocks local and metadata names', () => {
    for (const host of [
      'localhost',
      'LOCALHOST',
      'metadata.google.internal',
      'printer.local',
      'db.internal',
      'box.localdomain',
      'thing.home.arpa',
      'foo.localhost',
    ]) {
      expect(isBlockedHostname(host)).toBe(true)
    }
  })

  it('ignores a trailing dot (a fully-qualified name is the same name)', () => {
    expect(isBlockedHostname('localhost.')).toBe(true)
  })

  it('allows ordinary public names', () => {
    for (const host of ['example.com', 'commons.wikimedia.org', 'www.loc.gov']) {
      expect(isBlockedHostname(host)).toBe(false)
    }
  })
})
