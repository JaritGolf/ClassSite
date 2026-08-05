/**
 * Rendering tests for the mission-map node.
 *
 * These exist because the original bug was a MISMATCH between logic and render,
 * and a pure test structurally cannot catch that. `computeAvailability` could
 * have been perfect and the map would still have drawn a padlock over an open
 * mission, because the component decided its own appearance from `status`.
 *
 * So the assertions here are deliberately about the two things a student
 * actually experiences: is there a link I can click, and does the label tell me
 * the truth about why not.
 */

import { render, screen } from '@testing-library/react'
import { BenchmarkNode } from '@/components/student/map/BenchmarkNode'
import type { MissionNodeState } from '@/lib/mastery'

function renderNode(overrides: Partial<Parameters<typeof BenchmarkNode>[0]> = {}) {
  return render(
    <BenchmarkNode
      id="b1"
      code="SS.7.CG.1.1"
      title="Foundations of Government"
      state="AVAILABLE"
      masteryScore={null}
      openable
      offsetX={0}
      {...overrides}
    />
  )
}

/** The mission link, or null when the node is not clickable. */
function missionLink(): HTMLAnchorElement | null {
  return document.querySelector('a[href^="/student/mission/"]')
}

describe('BenchmarkNode — clickability', () => {
  it('renders a link to the mission when the node is openable', () => {
    renderNode({ state: 'AVAILABLE', openable: true })
    expect(missionLink()).not.toBeNull()
    expect(missionLink()).toHaveAttribute('href', '/student/mission/SS.7.CG.1.1')
  })

  it('renders NO link when the node is locked', () => {
    renderNode({ state: 'LOCKED', openable: false })
    expect(missionLink()).toBeNull()
  })

  it('renders NO link when the mission has no content yet', () => {
    renderNode({ state: 'COMING_SOON', openable: false })
    expect(missionLink()).toBeNull()
  })

  it('links a mission the student is partway through', () => {
    renderNode({ state: 'IN_PROGRESS', openable: true })
    expect(missionLink()).not.toBeNull()
  })

  it('links a mastered mission so the student can revisit it', () => {
    renderNode({ state: 'MASTERED', openable: true, masteryScore: 0.9 })
    expect(missionLink()).not.toBeNull()
  })

  it('takes `openable` as the authority, not the state name', () => {
    // A mastered mission whose content was later pulled: the chip must still
    // say Mastered (history is not rewritten) but the link must be gone, or the
    // student navigates into a mission with nothing in it.
    renderNode({ state: 'MASTERED', openable: false, masteryScore: 0.9 })
    expect(screen.getByText('Mastered')).toBeInTheDocument()
    expect(missionLink()).toBeNull()
  })
})

describe('BenchmarkNode — the original bug', () => {
  it('does not render an available mission as Locked', () => {
    // The exact regression. A freshly unlocked mission is a NOT_STARTED row,
    // which this component used to draw as a grey padlock labelled "Locked"
    // with no link — telling a student who had just mastered the previous
    // mission to go master it again.
    renderNode({ state: 'AVAILABLE', openable: true })
    expect(screen.queryByText('Locked')).not.toBeInTheDocument()
    expect(screen.getByText('Ready to Start')).toBeInTheDocument()
    expect(missionLink()).not.toBeNull()
  })
})

describe('BenchmarkNode — labels', () => {
  it('labels an unbuilt mission "Coming Soon", never "Locked"', () => {
    // A padlock claims the student has not earned something. When the mission
    // does not exist yet, that is a lie about their effort.
    renderNode({ state: 'COMING_SOON', openable: false })
    expect(screen.getByText('Coming Soon')).toBeInTheDocument()
    expect(screen.queryByText('Locked')).not.toBeInTheDocument()
  })

  it('labels a genuinely locked mission "Locked"', () => {
    renderNode({ state: 'LOCKED', openable: false })
    expect(screen.getByText('Locked')).toBeInTheDocument()
  })

  it.each<[MissionNodeState, string]>([
    ['MASTERED', 'Mastered'],
    ['IN_PROGRESS', 'In Progress'],
    ['READY_FOR_MASTERY', 'Ready for Challenge'],
    ['NEEDS_REMEDIATION', 'Needs Remediation'],
    ['REMEDIATION_COMPLETE', 'Remediation Complete'],
    ['EXPOSURE_COMPLETE', 'Exposure Complete'],
    ['TEACHER_OVERRIDE', 'Override'],
    ['INTERVENTION_REQUIRED', 'Intervention Required'],
    ['AVAILABLE', 'Ready to Start'],
    ['LOCKED', 'Locked'],
    ['COMING_SOON', 'Coming Soon'],
  ])('renders a real label for %s', (state, label) => {
    // Guards the exhaustive lookup tables. The old loose Record<string,…> fell
    // through to a NOT_STARTED default, which is how a wrong state rendered as
    // a padlock instead of failing loudly.
    renderNode({ state, openable: state !== 'LOCKED' && state !== 'COMING_SOON' })
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('shows the mastery score only on a mastered mission', () => {
    renderNode({ state: 'MASTERED', openable: true, masteryScore: 0.86 })
    expect(screen.getByText('86%')).toBeInTheDocument()
  })

  it('does not show a score on a mission that is merely available', () => {
    renderNode({ state: 'AVAILABLE', openable: true, masteryScore: 0.86 })
    expect(screen.queryByText('86%')).not.toBeInTheDocument()
  })
})

describe('BenchmarkNode — checkpoint flag', () => {
  it('renders the nine-week checkpoint flag when one lands here', () => {
    renderNode({ checkpoint: { checkpointNumber: 2, level: 3 } })
    expect(screen.getByText(/Q2 · Level 3/)).toBeInTheDocument()
  })

  it('never lets a checkpoint change whether the mission opens', () => {
    // Levels describe progress; they must not gate it.
    renderNode({
      state: 'LOCKED',
      openable: false,
      checkpoint: { checkpointNumber: 1, level: 1 },
    })
    expect(missionLink()).toBeNull()
  })
})
