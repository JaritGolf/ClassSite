import { detectImageFormat, readImageDimensions } from '@/lib/media-upload/format'

function buildPng(width: number, height: number): Buffer {
  const buf = Buffer.alloc(24)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0)
  buf.writeUInt32BE(13, 8) // IHDR chunk length (unchecked by the parser)
  buf.write('IHDR', 12, 'ascii')
  buf.writeUInt32BE(width, 16)
  buf.writeUInt32BE(height, 20)
  return buf
}

function buildJpeg(width: number, height: number): Buffer {
  const buf = Buffer.alloc(11)
  buf[0] = 0xff
  buf[1] = 0xd8 // SOI
  buf[2] = 0xff
  buf[3] = 0xc0 // SOF0
  buf.writeUInt16BE(17, 4) // segment length (unchecked beyond bounds)
  buf[6] = 8 // precision
  buf.writeUInt16BE(height, 7)
  buf.writeUInt16BE(width, 9)
  return buf
}

function buildWebpVp8x(width: number, height: number): Buffer {
  const buf = Buffer.alloc(30)
  buf.write('RIFF', 0, 'ascii')
  buf.writeUInt32LE(22, 4)
  buf.write('WEBP', 8, 'ascii')
  buf.write('VP8X', 12, 'ascii')
  buf.writeUInt32LE(10, 16)
  buf[20] = 0 // flags
  buf.writeUIntLE(width - 1, 24, 3)
  buf.writeUIntLE(height - 1, 27, 3)
  return buf
}

function buildWebpVp8Lossy(width: number, height: number): Buffer {
  const buf = Buffer.alloc(30)
  buf.write('RIFF', 0, 'ascii')
  buf.writeUInt32LE(22, 4)
  buf.write('WEBP', 8, 'ascii')
  buf.write('VP8 ', 12, 'ascii')
  buf.writeUInt32LE(10, 16)
  buf[23] = 0x9d
  buf[24] = 0x01
  buf[25] = 0x2a
  buf.writeUInt16LE(width & 0x3fff, 26)
  buf.writeUInt16LE(height & 0x3fff, 28)
  return buf
}

describe('detectImageFormat', () => {
  it('detects PNG by signature', () => {
    expect(detectImageFormat(buildPng(800, 600))).toBe('png')
  })
  it('detects JPEG by signature', () => {
    expect(detectImageFormat(buildJpeg(800, 600))).toBe('jpeg')
  })
  it('detects WebP by RIFF/WEBP signature', () => {
    expect(detectImageFormat(buildWebpVp8x(800, 600))).toBe('webp')
  })
  it('returns null for an unrecognized buffer', () => {
    expect(detectImageFormat(Buffer.from('not an image, just text'))).toBeNull()
  })
})

describe('readImageDimensions', () => {
  it('reads PNG width/height from the IHDR chunk', () => {
    expect(readImageDimensions(buildPng(800, 600), 'png')).toEqual({ width: 800, height: 600 })
  })
  it('reads JPEG width/height from the SOF0 segment', () => {
    expect(readImageDimensions(buildJpeg(800, 600), 'jpeg')).toEqual({ width: 800, height: 600 })
  })
  it('reads WebP VP8X (extended header) width/height', () => {
    expect(readImageDimensions(buildWebpVp8x(800, 600), 'webp')).toEqual({ width: 800, height: 600 })
  })
  it('reads WebP VP8 (simple lossy) width/height', () => {
    expect(readImageDimensions(buildWebpVp8Lossy(800, 600), 'webp')).toEqual({
      width: 800,
      height: 600,
    })
  })
  it('returns null (not throws) on a corrupt/truncated buffer', () => {
    expect(readImageDimensions(Buffer.alloc(4), 'png')).toBeNull()
    expect(readImageDimensions(Buffer.from([0xff, 0xd8]), 'jpeg')).toBeNull()
  })
  it('returns null for WebP lossless (VP8L) — best-effort, not implemented', () => {
    const buf = Buffer.alloc(30)
    buf.write('RIFF', 0, 'ascii')
    buf.write('WEBP', 8, 'ascii')
    buf.write('VP8L', 12, 'ascii')
    expect(readImageDimensions(buf, 'webp')).toBeNull()
  })
})
