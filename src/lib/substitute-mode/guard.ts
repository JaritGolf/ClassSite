/**
 * Substitute Mode — Write Guard
 *
 * assertNotSubMode() is called at the top of every mutating teacher route.
 * It throws SubModeError when substitute mode is on, which the route handler
 * converts to a 403 response.
 *
 * The sub-mode toggle endpoint itself bypasses this guard (it must always work).
 */

import { getSubMode } from './cookie'

export class SubModeError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'SubModeError'
  }
}

/**
 * Throws SubModeError if substitute mode is currently on.
 * Call at the top of every mutating teacher API route handler.
 */
export async function assertNotSubMode(): Promise<void> {
  if (await getSubMode()) {
    throw new SubModeError('SUB_MODE_READ_ONLY', 'Substitute mode is on — write actions are blocked')
  }
}
