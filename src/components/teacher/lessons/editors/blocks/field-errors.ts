/**
 * Mapping zod issues onto per-field error messages.
 *
 * Deliberately free of component imports so it can be unit-tested on its own.
 *
 * The original convention keyed every issue by `path[0]` and kept the first
 * message per key. That was survivable while a single editor owned the whole
 * form — `options[2].feedback` landed under `options`, which at least put the
 * message next to the right group. It stops working the moment a module holds
 * several content blocks: every nested error in every block would key to the
 * literal string `blocks`, first-wins would discard all but one, and nothing
 * would say which block was wrong.
 */

export interface FieldIssue {
  path: (string | number)[]
  message: string
}

/**
 * Index issues by their FULL dotted path, and ALSO by their first segment.
 *
 * Publishing both keys is what makes this backwards compatible: the eight
 * per-type editors read flat keys (`errors?.title`, `errors?.options`) and keep
 * working untouched, while a block list can address `blocks.2.data.alt`
 * precisely.
 */
export function fieldErrorsFromIssues(
  issues: readonly FieldIssue[]
): Record<string, string> {
  const fieldErrors: Record<string, string> = {}
  for (const issue of issues) {
    const full = issue.path.map(String).join('.') || '_root'
    if (!fieldErrors[full]) fieldErrors[full] = issue.message
    const head = issue.path[0]?.toString() ?? '_root'
    if (!fieldErrors[head]) fieldErrors[head] = issue.message
  }
  return fieldErrors
}

/**
 * Narrow a bag of dotted-path errors to one block, so the per-type editor
 * inside it sees exactly the flat keys it has always seen.
 *
 * `blocks.2.data.alt` → `alt`. The `data.` segment is an implementation detail
 * of the block envelope (each block is `{type, data}`) and no editor knows
 * about it.
 */
export function scopeErrorsToBlock(
  fieldErrors: Record<string, string>,
  index: number
): Record<string, string> {
  const prefix = `blocks.${index}.`
  const scoped: Record<string, string> = {}
  for (const [key, message] of Object.entries(fieldErrors)) {
    if (!key.startsWith(prefix)) continue
    const rest = key.slice(prefix.length)
    const withoutData = rest.startsWith('data.') ? rest.slice('data.'.length) : rest
    if (!withoutData) continue
    if (!scoped[withoutData]) scoped[withoutData] = message
    const head = withoutData.split('.')[0]
    if (!scoped[head]) scoped[head] = message
  }
  return scoped
}

/**
 * Whether a block has any error at all — drives the "needs attention" chip on
 * a collapsed block, so a problem inside a closed block is still discoverable.
 */
export function blockHasError(fieldErrors: Record<string, string>, index: number): boolean {
  const prefix = `blocks.${index}.`
  return Object.keys(fieldErrors).some((key) => key.startsWith(prefix))
}

/** The index of the first block carrying an error, or null. */
export function firstBlockWithError(
  fieldErrors: Record<string, string>,
  blockCount: number
): number | null {
  for (let i = 0; i < blockCount; i++) {
    if (blockHasError(fieldErrors, i)) return i
  }
  return null
}
