/**
 * Completion-code text handling — no cryptography, safe to run in a browser.
 *
 * Kept apart from ./code (which signs and verifies with Node's crypto) so the
 * teacher's "Check codes" page can pull codes out of pasted text locally
 * without shipping server code to the browser.
 */

/** Tidy a pasted code: trim, upper-case, and undo Crockford look-alikes in the signature. */
export function normalizeCode(raw: string): string {
  const cleaned = raw.trim().toUpperCase()
  const lastDash = cleaned.lastIndexOf('-')
  if (lastDash === -1) return cleaned
  const sig = cleaned
    .slice(lastDash + 1)
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0')
  return `${cleaned.slice(0, lastDash)}-${sig}`
}

/**
 * Pull completion codes out of pasted text. Runs IN THE TEACHER'S BROWSER, so
 * that whatever else was pasted alongside them — a student's name, a comment —
 * never leaves the page.
 */
export function extractCodes(text: string): string[] {
  const found = text.toUpperCase().match(/MCC-[0-9A-Z.]+(?:-[0-9A-Z]+){3}/g) ?? []
  return found.map(normalizeCode)
}

/** Shape a code must have to be accepted by the check endpoint at all. */
export const CODE_SHAPE = /^MCC-[0-9A-Z.]{1,8}-[0-9A-Z]{1,4}-[0-9A-Z]{1,10}-[0-9A-Z]{1,16}$/
