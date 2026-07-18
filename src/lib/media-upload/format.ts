/**
 * Hand-rolled image format detection + dimension parsing (PNG/JPEG/WebP).
 *
 * No new dependency for this (consistent with this codebase's existing
 * preference — see the hand-rolled RFC-4180 CSV exporter). Format detection
 * sniffs real file BYTES rather than trusting a client-supplied MIME type
 * (spoofable) — this doubles as the upload route's security check and the
 * product's "auto-fill width/height" convenience.
 *
 * Any parse failure returns `null` rather than throwing: a missed dimension
 * read is a UX inconvenience (the human types width/height in manually), not
 * a failed upload.
 */

export type DetectedImageFormat = 'png' | 'jpeg' | 'webp'

export interface ImageDimensions {
  width: number
  height: number
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

export function detectImageFormat(buf: Buffer): DetectedImageFormat | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG_SIGNATURE)) return 'png'
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xd8) return 'jpeg'
  if (
    buf.length >= 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp'
  }
  return null
}

function readPngDimensions(buf: Buffer): ImageDimensions | null {
  // 8-byte signature, then the IHDR chunk is guaranteed first:
  // 4-byte chunk length, 4-byte "IHDR", 4-byte width (BE), 4-byte height (BE).
  if (buf.length < 24) return null
  const width = buf.readUInt32BE(16)
  const height = buf.readUInt32BE(20)
  if (width <= 0 || height <= 0) return null
  return { width, height }
}

function readJpegDimensions(buf: Buffer): ImageDimensions | null {
  let offset = 2 // skip the FF D8 (SOI) marker
  while (offset + 1 < buf.length) {
    if (buf[offset] !== 0xff) return null // malformed marker stream

    const marker = buf[offset + 1]
    // Standalone markers carry no length field: TEM (0x01), RSTn (0xD0-0xD7),
    // SOI (0xD8) — SOI shouldn't recur but skip defensively; EOI (0xD9) ends
    // the stream with no dimension info found.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      offset += 2
      continue
    }
    if (marker === 0xd9) return null

    if (offset + 4 > buf.length) return null
    const segmentLength = buf.readUInt16BE(offset + 2)

    // SOF0-SOF15 (0xC0-0xCF) except DHT(0xC4)/JPG(0xC8)/DAC(0xCC) carry the
    // frame dimensions: marker(2) + length(2) + precision(1) + height(2) + width(2).
    const isSofMarker =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
    if (isSofMarker) {
      if (offset + 9 > buf.length) return null
      const height = buf.readUInt16BE(offset + 5)
      const width = buf.readUInt16BE(offset + 7)
      if (width <= 0 || height <= 0) return null
      return { width, height }
    }

    offset += 2 + segmentLength
  }
  return null
}

/** VP8X (extended header) — most common when the file carries ICC/EXIF/XMP. */
function readWebpVp8xDimensions(buf: Buffer): ImageDimensions | null {
  // Chunk header (8 bytes: 4 FourCC + 4 length) starts at offset 12; VP8X's
  // fixed 10-byte payload starts at offset 20: 1 byte flags, 3 reserved,
  // then 24-bit-LE (canvas width - 1), then 24-bit-LE (canvas height - 1).
  if (buf.length < 30) return null
  const width = buf.readUIntLE(24, 3) + 1
  const height = buf.readUIntLE(27, 3) + 1
  if (width <= 0 || height <= 0) return null
  return { width, height }
}

/** VP8 (simple lossy) key frame header. */
function readWebpVp8Dimensions(buf: Buffer): ImageDimensions | null {
  // Payload starts at offset 20 (after the 8-byte chunk header): 3-byte frame
  // tag, then the 3-byte start code 9D 01 2A, then width/height as 2-byte-LE
  // each with the low 14 bits holding the dimension.
  if (buf.length < 30) return null
  if (buf[23] !== 0x9d || buf[24] !== 0x01 || buf[25] !== 0x2a) return null
  const width = buf.readUInt16LE(26) & 0x3fff
  const height = buf.readUInt16LE(28) & 0x3fff
  if (width <= 0 || height <= 0) return null
  return { width, height }
}

function readWebpDimensions(buf: Buffer): ImageDimensions | null {
  if (buf.length < 16) return null
  const fourCc = buf.toString('ascii', 12, 16)
  if (fourCc === 'VP8X') return readWebpVp8xDimensions(buf)
  if (fourCc === 'VP8 ') return readWebpVp8Dimensions(buf)
  // VP8L (lossless) is best-effort and not implemented — a parse miss here
  // just means the uploader types width/height in manually.
  return null
}

export function readImageDimensions(
  buf: Buffer,
  format: DetectedImageFormat
): ImageDimensions | null {
  switch (format) {
    case 'png':
      return readPngDimensions(buf)
    case 'jpeg':
      return readJpegDimensions(buf)
    case 'webp':
      return readWebpDimensions(buf)
  }
}

export const MIME_BY_FORMAT: Record<DetectedImageFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}
