/**
 * Assessment Grader — Pure Functions
 *
 * No database calls. No Next.js imports. 100% testable in isolation.
 *
 * SECURITY CONTRACT:
 *   - correctOptions and pointsMap come ONLY from the database (loaded by attempt.ts)
 *   - ResponseInput fields `isCorrect` and `pointsAwarded` are NEVER present here —
 *     Zod strips them before this function is called
 *   - This function determines correctness solely by comparing selectedOptionId
 *     to the server-authoritative correct optionId
 */

export interface ResponseInput {
  questionId: string
  selectedOptionId: string  // from client — only this field is used for grading
  confidence?: 0 | 1 | 2   // 0 = "Not sure", 1 = "Pretty sure", 2 = "Very sure"
  timeSeconds?: number
}

export interface GradeResult {
  questionId: string
  selectedOptionId: string
  isCorrect: boolean    // server-computed; never from client
  pointsAwarded: number // server-computed; never from client
  confidence: number | null
  timeSeconds: number | null
}

/**
 * Grade a set of student responses against server-authoritative correct answers.
 *
 * @param responses      - Client responses (Zod-stripped; no isCorrect/pointsAwarded)
 * @param correctOptions - Map<questionId → correct optionId> loaded from DB
 * @param pointsMap      - Map<questionId → points> from AssessmentQuestion.points
 */
export function gradeResponses(
  responses: ResponseInput[],
  correctOptions: Map<string, string>,
  pointsMap: Map<string, number>
): GradeResult[] {
  return responses.map((r) => {
    const correctOptionId = correctOptions.get(r.questionId)
    const points = pointsMap.get(r.questionId) ?? 1.0
    const isCorrect =
      correctOptionId !== undefined && r.selectedOptionId === correctOptionId

    return {
      questionId: r.questionId,
      selectedOptionId: r.selectedOptionId,
      isCorrect,
      pointsAwarded: isCorrect ? points : 0,
      confidence: r.confidence !== undefined ? r.confidence : null,
      timeSeconds: r.timeSeconds !== undefined ? r.timeSeconds : null,
    }
  })
}

/**
 * Compute the overall assessment score and pass/fail determination.
 *
 * Score = sum(pointsAwarded by graded responses) / sum(points for ALL questions)
 *
 * Partial submission: questions without a response count as 0 points awarded.
 * This means submitting fewer answers always reduces the score — it cannot
 * be exploited to inflate a score by submitting only correct answers.
 *
 * @param grades            - Result of gradeResponses()
 * @param allQuestionPoints - Map<questionId → points> for ALL questions in the assessment
 *                            (not just the submitted ones)
 * @param masteryThreshold  - e.g. 0.80 for 80% mastery
 */
export function computeScore(
  grades: GradeResult[],
  allQuestionPoints: Map<string, number>,
  masteryThreshold: number
): { score: number; passed: boolean } {
  const totalPossible = Array.from(allQuestionPoints.values()).reduce(
    (sum, pts) => sum + pts,
    0
  )

  if (totalPossible === 0) {
    return { score: 0, passed: false }
  }

  const totalEarned = grades.reduce((sum, g) => sum + g.pointsAwarded, 0)
  const score = totalEarned / totalPossible

  return {
    score,
    passed: score >= masteryThreshold,
  }
}
