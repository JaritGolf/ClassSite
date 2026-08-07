/**
 * Per-field error mapping for the content editors.
 *
 * The old convention keyed every zod issue by `path[0]` and kept the first
 * message per key. With composite modules that collapses every nested error in
 * every block onto the single key `blocks`, discarding all but one message and
 * never identifying which block was wrong.
 */

import {
  blockHasError,
  fieldErrorsFromIssues,
  firstBlockWithError,
  scopeErrorsToBlock,
} from '@/components/teacher/lessons/editors/blocks/field-errors'

describe('fieldErrorsFromIssues', () => {
  it('indexes by the full dotted path', () => {
    const errors = fieldErrorsFromIssues([
      { path: ['blocks', 2, 'data', 'alt'], message: 'Required' },
    ])
    expect(errors['blocks.2.data.alt']).toBe('Required')
  })

  it('ALSO indexes by the first segment, so existing editors keep working', () => {
    // The eight per-type editors all read flat keys (errors?.options), and
    // must not have to change.
    const errors = fieldErrorsFromIssues([
      { path: ['options', 2, 'feedback'], message: 'Required' },
    ])
    expect(errors['options.2.feedback']).toBe('Required')
    expect(errors.options).toBe('Required')
  })

  it('keeps distinct messages for distinct blocks — the whole point', () => {
    const errors = fieldErrorsFromIssues([
      { path: ['blocks', 0, 'data', 'alt'], message: 'Alt text is required' },
      { path: ['blocks', 3, 'data', 'description'], message: 'Too short' },
    ])
    expect(errors['blocks.0.data.alt']).toBe('Alt text is required')
    expect(errors['blocks.3.data.description']).toBe('Too short')
    // Under the old path[0] rule BOTH of these collapsed to `blocks` and only
    // the first survived.
    expect(errors.blocks).toBe('Alt text is required')
  })

  it('first message wins per key', () => {
    const errors = fieldErrorsFromIssues([
      { path: ['title'], message: 'first' },
      { path: ['title'], message: 'second' },
    ])
    expect(errors.title).toBe('first')
  })

  it('files a root-level issue under _root', () => {
    expect(fieldErrorsFromIssues([{ path: [], message: 'bad shape' }])._root).toBe('bad shape')
  })

  it('handles an empty issue list', () => {
    expect(fieldErrorsFromIssues([])).toEqual({})
  })
})

describe('scopeErrorsToBlock', () => {
  const errors = fieldErrorsFromIssues([
    { path: ['blocks', 0, 'data', 'alt'], message: 'Alt required' },
    { path: ['blocks', 1, 'data', 'description'], message: 'Too short' },
    { path: ['blocks', 1, 'data', 'options', 2, 'feedback'], message: 'Feedback required' },
  ])

  it('returns only that block’s errors', () => {
    expect(scopeErrorsToBlock(errors, 0)).toEqual({ alt: 'Alt required' })
  })

  it('strips the envelope’s `data.` segment, which no editor knows about', () => {
    const scoped = scopeErrorsToBlock(errors, 1)
    expect(scoped.description).toBe('Too short')
    expect(scoped['options.2.feedback']).toBe('Feedback required')
    // …and still publishes the flat group key the existing editor reads.
    expect(scoped.options).toBe('Feedback required')
  })

  it('is empty for a block with no errors', () => {
    expect(scopeErrorsToBlock(errors, 7)).toEqual({})
  })

  it('does not leak block 1 into block 10 on a prefix collision', () => {
    const many = fieldErrorsFromIssues([
      { path: ['blocks', 10, 'data', 'alt'], message: 'ten' },
    ])
    expect(scopeErrorsToBlock(many, 1)).toEqual({})
    expect(scopeErrorsToBlock(many, 10)).toEqual({ alt: 'ten' })
  })
})

describe('locating a bad block', () => {
  const errors = fieldErrorsFromIssues([
    { path: ['blocks', 2, 'data', 'summary'], message: 'Too short' },
  ])

  it('flags the block that has an error', () => {
    expect(blockHasError(errors, 2)).toBe(true)
    expect(blockHasError(errors, 0)).toBe(false)
  })

  it('finds the first bad block, so the UI can open and focus it', () => {
    expect(firstBlockWithError(errors, 5)).toBe(2)
    expect(firstBlockWithError({}, 5)).toBeNull()
  })
})
