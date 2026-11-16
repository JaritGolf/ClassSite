/**
 * Assessment Module — Public API (server side).
 *
 * Delivery and grading are stateless: see ./stateless.
 */

export {
  deliverAssessment,
  gradeSubmission,
  AssessmentError,
  ASSESSMENT_ERROR_STATUS,
} from './stateless'
export type {
  DeliveredAssessment,
  DeliveredQuestion,
  DeliveredOption,
  GradeOutcome,
  GradedItem,
  GradeInput,
} from './stateless'

export { gradeResponses, computeScore } from './grader'
export type { ResponseInput, GradeResult } from './grader'

export {
  CONFIDENCE_LEVELS,
  ConfidenceValueSchema,
  AssessmentStartSchema,
  AssessmentSubmitSchema,
  QuestionAnswerSchema,
  buildAssessmentStartBody,
  buildAssessmentSubmitBody,
  buildQuestionAnswerBody,
  SECURE_ASSESSMENT_TYPES,
  isSecureAssessmentType,
} from './wire'
export type {
  ConfidenceValue,
  AssessmentStartBody,
  AssessmentSubmitBody,
  AssessmentSubmitResponseEntry,
  AssessmentSubmitResult,
  QuestionAnswerBody,
  QuestionAnswerResult,
} from './wire'
