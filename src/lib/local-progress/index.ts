/**
 * Device-local student progress — public API.
 *
 * Everything a student's browser remembers lives here. Nothing in this module
 * talks to the server.
 */

export * from './types'
export * from './engine'
export { buildLocalPlan, buildRankInputs, type PlanContext } from './plan'
export { parseProgress, LocalProgressSchema } from './schema'
export {
  PROGRESS_STORAGE_KEY,
  getProgress,
  setProgress,
  updateProgress,
  clearProgress,
  subscribeProgress,
} from './store'
export {
  PROGRESS_FILE_KIND,
  progressFileName,
  serializeProgress,
  parseProgressFile,
  type ImportResult,
} from './file'
