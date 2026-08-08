/**
 * Print rendering for a lesson packet and its answer key.
 *
 * This deliberately does NOT reuse the student mission components. Those are
 * built for a screen — read-aloud buttons, glossary popovers, reveal toggles,
 * chunking controls. On paper every one of them is either dead ink or a control
 * a student cannot press. What IS reused is everything above the rendering
 * layer: the same parsed step content, the same read-only assessment reader.
 *
 * Two documents from one source, chosen by `doc`:
 *   packet     — student-facing. Answer choices printed, no answers marked.
 *   answer-key — teacher-facing. Correct choice marked, authored feedback shown.
 *
 * The answer key is the reason `doc` is a server-rendered URL parameter rather
 * than client state: a student packet must not contain the answers in its markup
 * at all, hidden by CSS or otherwise. Nothing is sent that the document does not
 * show.
 */

import type {
  LessonPrintPacket,
  PrintDocKind,
  PrintStep,
} from '@/lib/lesson-print/packet'
import type { AssessmentPreview } from '@/lib/lesson-media/assessment-preview'

const CHOICE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

/** Step types that are screen-only and have no meaning on paper. */
const SKIP_ON_PAPER = new Set(['VIDEO'])

function StepBody({ step, doc }: { step: PrintStep; doc: PrintDocKind }) {
  const c = step.content

  switch (c.kind) {
    case 'text':
      return <Prose text={c.text} />

    case 'timeline':
      return (
        <div className="space-y-2">
          {c.intro && <Prose text={c.intro} />}
          <ol className="ml-5 list-decimal space-y-1.5">
            {c.events.map((e, i) => (
              <li key={i} className="text-[15px] leading-relaxed">
                <span className="font-semibold">{e.marker}</span> — {e.label}
                {e.detail && <span className="text-gray-700"> {e.detail}</span>}
              </li>
            ))}
          </ol>
        </div>
      )

    case 'worked-example':
      return (
        <div className="space-y-2">
          <p className="text-[15px] font-semibold">{c.problem}</p>
          <ol className="ml-5 list-decimal space-y-1 text-[15px] leading-relaxed">
            {c.thinkAloud.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ol>
          <p className="text-[15px]">
            <span className="font-semibold">Answer:</span> {c.answer}
          </p>
          <p className="text-[15px] text-gray-700">
            <span className="font-semibold">Why it works:</span> {c.whyItWorks}
          </p>
        </div>
      )

    case 'interactive-check':
      return (
        <QuestionBlock
          prompt={c.question}
          // Lesson-authored checks use `correct`; the question bank uses
          // `isCorrect`. Normalised here so QuestionBlock has one shape.
          options={c.options.map((o) => ({
            text: o.text,
            isCorrect: o.correct,
            feedback: o.feedback ?? null,
          }))}
          doc={doc}
        />
      )

    case 'source-analysis':
      return (
        <div className="space-y-3">
          <div className="border-l-4 border-gray-300 pl-3">
            <p className="text-[15px] font-semibold">{c.sourceTitle}</p>
            <p className="text-xs text-gray-600">{c.sourceAttribution}</p>
            <div className="mt-1.5">
              <Prose text={c.passage} />
            </div>
          </div>
          {c.guidingQuestions.map((q, i) => (
            <QuestionBlock
              key={i}
              prompt={q.question}
              options={q.options.map((o) => ({
                text: o.text,
                isCorrect: o.correct,
                feedback: o.feedback ?? null,
              }))}
              doc={doc}
            />
          ))}
        </div>
      )

    case 'image':
      // The image itself is skipped: lesson art is stored in the database and a
      // photocopy of a decorative portrait is not what makes the material work.
      // The caption and alt text carry the instructional content, and alt text
      // is written to stand alone for screen-reader users — which makes it
      // exactly right here too.
      return (
        <div className="space-y-1">
          {c.caption && <p className="text-[15px] leading-relaxed">{c.caption}</p>}
          <p className="text-sm text-gray-700">[Image: {c.alt}]</p>
          {c.credit && <p className="text-xs text-gray-500">{c.credit}</p>}
        </div>
      )

    case 'diagram':
    case 'infographic': {
      const inner = c.kind === 'diagram' ? c.diagram : c.infographic
      return (
        <pre className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed">
          {JSON.stringify(inner, null, 2)}
        </pre>
      )
    }

    case 'composite':
      return (
        <div className="space-y-3">
          {c.blocks.map((b, i) => (
            <StepBody
              key={i}
              step={{ ...step, content: blockToParsed(b) }}
              doc={doc}
            />
          ))}
        </div>
      )

    default:
      return null
  }
}

/** Lift a composite block into the same shape StepBody already renders. */
function blockToParsed(block: { type: string; data: unknown }): PrintStep['content'] {
  switch (block.type) {
    case 'text':
      return { kind: 'text', ...(block.data as { text: string }) }
    case 'timeline':
      return { kind: 'timeline', ...(block.data as any) }
    case 'image':
      return { kind: 'image', ...(block.data as any) }
    case 'video':
      return { kind: 'video', ...(block.data as any) }
    case 'worked-example':
      return { kind: 'worked-example', ...(block.data as any) }
    case 'diagram':
      return { kind: 'diagram', diagram: block.data as any }
    case 'infographic':
      return { kind: 'infographic', infographic: block.data as any }
    default:
      return { kind: 'text', text: '' }
  }
}

function Prose({ text }: { text: string }) {
  return (
    <div className="space-y-2">
      {text
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} className="text-[15px] leading-relaxed">
            {p}
          </p>
        ))}
    </div>
  )
}

function QuestionBlock({
  prompt,
  options,
  doc,
  number,
}: {
  prompt: string
  options: { text: string; isCorrect: boolean; feedback: string | null }[]
  doc: PrintDocKind
  number?: number
}) {
  const isKey = doc === 'answer-key'
  return (
    <div className="break-inside-avoid space-y-1.5">
      <p className="text-[15px] font-medium leading-relaxed">
        {number != null && <span className="mr-1 font-bold">{number}.</span>}
        {prompt}
      </p>
      <ol className="ml-1 space-y-1">
        {options.map((o, i) => (
          <li key={i} className="flex gap-2 text-[15px] leading-relaxed">
            <span
              // whitespace-nowrap: without it the marker and its letter wrap
              // onto separate lines as soon as the row is bold, which is exactly
              // the correct answer on the key — the one row that must stay
              // readable.
              className={`w-9 shrink-0 whitespace-nowrap ${
                isKey && o.isCorrect ? 'font-bold' : 'text-gray-800'
              }`}
            >
              {/* An outlined box on the student copy is somewhere to mark an
                  answer. On the key it becomes a filled marker. Never colour
                  alone — this is printed, often in greyscale. */}
              {isKey ? (o.isCorrect ? '■' : '□') : '□'}{' '}
              {CHOICE_LETTERS[i] ?? '•'}.
            </span>
            <span className={isKey && o.isCorrect ? 'font-bold' : ''}>
              {o.text}
              {isKey && o.feedback && (
                <span className="block text-sm italic text-gray-600">{o.feedback}</span>
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function QuestionSet({
  set,
  doc,
}: {
  set: AssessmentPreview
  doc: PrintDocKind
}) {
  return (
    <section className="break-inside-avoid space-y-3">
      <h3 className="border-b border-gray-300 pb-1 text-lg font-bold">{set.title}</h3>
      <div className="space-y-4">
        {set.questions.map((q, i) => (
          <QuestionBlock
            key={i}
            number={i + 1}
            prompt={q.prompt}
            options={q.options}
            doc={doc}
          />
        ))}
      </div>
    </section>
  )
}

export function LessonPrintDocument({
  packet,
  doc,
}: {
  packet: LessonPrintPacket
  doc: PrintDocKind
}) {
  const steps = packet.steps.filter((s) => !SKIP_ON_PAPER.has(s.stepType))
  const isKey = doc === 'answer-key'

  return (
    <article className="mx-auto max-w-3xl space-y-6 text-gray-900 print:max-w-none">
      <header className="space-y-1 border-b-2 border-gray-800 pb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
          {packet.benchmarkCode} · {isKey ? 'Teacher Answer Key' : 'Student Packet'}
        </p>
        <h1 className="text-2xl font-bold">{packet.lessonTitle}</h1>
        <p className="text-sm text-gray-700">{packet.benchmarkTitle}</p>
        {!isKey && (
          <div className="flex gap-6 pt-2 text-sm">
            <span>Name: ______________________________</span>
            <span>Date: ______________</span>
          </div>
        )}
      </header>

      {packet.studentFriendlyTarget && (
        <section className="break-inside-avoid rounded border border-gray-400 p-3">
          <h2 className="text-sm font-bold uppercase tracking-wide">What you will learn</h2>
          <p className="mt-1 text-[15px] leading-relaxed">{packet.studentFriendlyTarget}</p>
        </section>
      )}

      {packet.terms.length > 0 && (
        <section className="break-inside-avoid space-y-2">
          <h2 className="border-b border-gray-300 pb-1 text-lg font-bold">Key Terms</h2>
          <dl className="space-y-1.5">
            {packet.terms.map((t) => (
              <div key={t.term} className="text-[15px] leading-relaxed">
                <dt className="inline font-semibold">{t.term}: </dt>
                <dd className="inline">{t.definition}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="space-y-5">
        <h2 className="border-b border-gray-300 pb-1 text-lg font-bold">Lesson</h2>
        {steps.map((s, i) => (
          <div key={s.id} className="break-inside-avoid space-y-1.5">
            {s.title && (
              <h3 className="text-base font-bold">
                {i + 1}. {s.title}
              </h3>
            )}
            <StepBody step={s} doc={doc} />
          </div>
        ))}
      </section>

      {packet.questionSets.map((set) => (
        <div key={set.id} className="break-before-page">
          <QuestionSet set={set} doc={doc} />
        </div>
      ))}

      <footer className="border-t border-gray-300 pt-2 text-xs text-gray-600">
        My Civics Class · {packet.benchmarkCode}
        {isKey && ' · Answer key — not for student distribution'}
      </footer>
    </article>
  )
}
