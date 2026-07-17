'use client'

/**
 * Lesson DIAGRAM step (ADR 0015): semantic-HTML concept diagrams — process
 * flow, repeating cycle, venn (rendered as an honest 3-column grid), and
 * 2-column comparison. HTML-not-SVG so 200% zoom, reflow, and high-contrast
 * mode work for free (same approach as TimelineView).
 *
 * The authored `summary` is the guaranteed accessible full-text equivalent —
 * always rendered, with read-aloud. The visual arrangement is enhancement.
 */

import { ReadAloudButton } from '@/components/ui/ReadAloudButton'
import type { DiagramContent } from '@/lib/lesson-content'

interface DiagramNode {
  label: string
  detail?: string
}

export function DiagramStepView({ diagram }: { diagram: DiagramContent }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-widest text-purple-700">
            Picture the idea
          </p>
          <h3 className="mt-0.5 font-display text-lg font-bold text-gray-900">{diagram.title}</h3>
        </div>
        <ReadAloudButton text={`${diagram.title}. ${diagram.summary}`} />
      </div>

      {diagram.variant === 'flow' && <FlowDiagram nodes={diagram.nodes} />}
      {diagram.variant === 'cycle' && <CycleDiagram nodes={diagram.nodes} />}
      {diagram.variant === 'venn' && (
        <VennDiagram left={diagram.left} right={diagram.right} shared={diagram.shared} />
      )}
      {diagram.variant === 'comparison' && <ComparisonDiagram columns={diagram.columns} />}

      <p className="max-w-prose rounded-2xl border-2 border-purple-100 bg-purple-50 px-4 py-3 text-base leading-7 text-purple-950">
        {diagram.summary}
      </p>
    </div>
  )
}

function NodeCard({ node, accent }: { node: DiagramNode; accent: string }) {
  return (
    <div className={`rounded-2xl border-2 bg-white px-4 py-3 shadow-card ${accent}`}>
      <p className="text-base font-bold leading-snug text-gray-900">{node.label}</p>
      {node.detail && <p className="mt-1 text-base leading-7 text-gray-600">{node.detail}</p>}
    </div>
  )
}

function FlowDiagram({ nodes }: { nodes: DiagramNode[] }) {
  return (
    <ol className="mx-auto max-w-md space-y-0">
      {nodes.map((node, i) => (
        <li key={i}>
          <NodeCard node={node} accent="border-purple-300" />
          {i < nodes.length - 1 && (
            <div className="flex justify-center py-1" aria-hidden="true">
              <span className="text-xl leading-none text-purple-400">▼</span>
            </div>
          )}
        </li>
      ))}
    </ol>
  )
}

function CycleDiagram({ nodes }: { nodes: DiagramNode[] }) {
  return (
    <div className="mx-auto max-w-md">
      <ol className="space-y-0">
        {nodes.map((node, i) => (
          <li key={i} className="flex gap-3">
            <div className="flex flex-col items-center" aria-hidden="true">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-600 font-display text-sm font-bold text-white">
                {i + 1}
              </span>
              {i < nodes.length - 1 && <span className="w-1 flex-1 rounded-full bg-purple-200" />}
            </div>
            <div className={`flex-1 ${i < nodes.length - 1 ? 'pb-3' : ''}`}>
              <NodeCard node={node} accent="border-purple-300" />
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-2 flex items-center gap-2 pl-11 font-display text-sm font-bold text-purple-700">
        <span aria-hidden="true" className="text-lg">
          ↺
        </span>
        …and the cycle starts again
      </p>
    </div>
  )
}

function VennDiagram({
  left,
  right,
  shared,
}: {
  left: { label: string; items: string[] }
  right: { label: string; items: string[] }
  shared: { label: string; items: string[] }
}) {
  const columns = [
    { heading: `Only ${left.label}`, items: left.items, tone: 'border-indigo-300 bg-indigo-50 text-indigo-950', chip: 'bg-indigo-600' },
    { heading: shared.label, items: shared.items, tone: 'border-purple-300 bg-purple-50 text-purple-950', chip: 'bg-purple-600' },
    { heading: `Only ${right.label}`, items: right.items, tone: 'border-rose-300 bg-rose-50 text-rose-950', chip: 'bg-rose-600' },
  ]
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {columns.map((col) => (
        <div key={col.heading} className={`rounded-2xl border-2 p-4 ${col.tone}`}>
          <p className={`inline-block rounded-full px-3 py-1 font-display text-sm font-bold text-white ${col.chip}`}>
            {col.heading}
          </p>
          <ul className="mt-2 space-y-1.5">
            {col.items.map((item) => (
              <li key={item} className="text-base leading-7">
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function ComparisonDiagram({ columns }: { columns: { heading: string; items: string[] }[] }) {
  const tones = [
    { tone: 'border-green-300 bg-green-50', chip: 'bg-green-600' },
    { tone: 'border-rose-300 bg-rose-50', chip: 'bg-rose-600' },
  ]
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {columns.map((col, i) => (
        <div key={col.heading} className={`rounded-2xl border-2 p-4 ${tones[i]?.tone ?? tones[0].tone}`}>
          <p
            className={`inline-block rounded-full px-3 py-1 font-display text-sm font-bold text-white ${
              tones[i]?.chip ?? tones[0].chip
            }`}
          >
            {col.heading}
          </p>
          <ul className="mt-2 space-y-1.5">
            {col.items.map((item) => (
              <li key={item} className="flex gap-2 text-base leading-7 text-gray-800">
                <span aria-hidden="true" className="mt-0.5 text-gray-400">
                  •
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
