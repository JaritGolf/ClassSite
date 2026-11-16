/**
 * Teacher — Check completion codes.
 *
 * Paste what students turned in on Google Classroom; each code is checked on
 * the spot. Nothing is saved, and only the codes themselves are sent.
 */

import { requireAuth } from '@/lib/auth'
import { CheckCodesForm } from '@/components/teacher/check-codes/CheckCodesForm'

export const metadata = { title: 'Check completion codes' }

export default async function CheckCodesPage() {
  await requireAuth(['TEACHER', 'ADMIN'])

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Check completion codes</h1>
        <p className="mt-1 text-sm text-gray-600">
          When a student masters a mission, the site gives them a code to paste into your Google
          Classroom assignment. Paste those codes here to confirm each one is genuine.
        </p>
      </div>

      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-950">
        <p className="font-semibold">What a code tells you — and what it does not</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>
            A genuine code proves that mission&rsquo;s Mastery Challenge was passed, with the score
            and date shown.
          </li>
          <li>
            A code does <strong>not</strong> say who earned it. This site does not know who your
            students are. Google Classroom tells you who turned the code in.
          </li>
          <li>
            Two students who master the same mission with the same score on the same day get the
            same code, so a repeated code is not proof of copying — but it is worth a look.
          </li>
          <li>
            Nothing you paste is saved. Only the codes are sent for checking; anything else on the
            line, such as a name, stays in this browser tab.
          </li>
        </ul>
      </div>

      <CheckCodesForm />
    </div>
  )
}
