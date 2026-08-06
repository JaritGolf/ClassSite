/**
 * Rendering tests for the dashboard's one dominant call-to-action.
 *
 * The defect being guarded against is not a wrong calculation — it is a wrong
 * SCREEN. The dashboard used to render four calls-to-action of near-identical
 * weight and let a 12-year-old guess, so the assertions here are about what the
 * student can actually act on: how many things are clickable, whether the label
 * names the real step, and whether a made-up duration ever appears.
 */

import { render, screen } from '@testing-library/react'
import { NextStepCard } from '@/components/student/dashboard/NextStepCard'
import { ThenList } from '@/components/student/dashboard/ThenList'
import type { NextStep } from '@/lib/student-next-step'

function step(overrides: Partial<NextStep> = {}): NextStep {
  return {
    kind: 'MISSION_RESUME',
    label: 'Mission 1.5: The Bill of Rights',
    subLabel: 'Pick up where you left off',
    href: '/student/mission/SS.7.CG.1.5',
    icon: 'sparkle',
    ctaLabel: 'Continue Mission',
    estimatedMinutes: 15,
    ...overrides,
  }
}

/** Every link the card offers. */
function links(): HTMLAnchorElement[] {
  return Array.from(document.querySelectorAll('a'))
}

describe('NextStepCard — one action, unambiguous', () => {
  it('offers exactly ONE link', () => {
    // This is the whole point of the redesign. If this number ever grows, the
    // dashboard has drifted back toward competing calls-to-action.
    render(<NextStepCard step={step()} studentName="Alex" />)
    expect(links()).toHaveLength(1)
  })

  it('points that link at the resolved step', () => {
    render(<NextStepCard step={step()} studentName="Alex" />)
    expect(links()[0]).toHaveAttribute('href', '/student/mission/SS.7.CG.1.5')
    expect(links()[0]).toHaveTextContent('Continue Mission')
  })

  it('names the specific step, not just "continue"', () => {
    render(<NextStepCard step={step()} studentName="Alex" />)
    expect(screen.getByText('Pick up where you left off')).toBeInTheDocument()
    expect(screen.getByText('Mission 1.5: The Bill of Rights')).toBeInTheDocument()
  })

  it('greets the student by name, and falls back rather than greeting nobody', () => {
    const { unmount } = render(<NextStepCard step={step()} studentName="Alex" />)
    expect(screen.getByText(/Welcome back, Alex/)).toBeInTheDocument()
    unmount()
    render(<NextStepCard step={step()} studentName={null} />)
    expect(screen.getByText(/Welcome back, Founder/)).toBeInTheDocument()
  })
})

describe('NextStepCard — eyebrow tells the student why this is here', () => {
  it('labels assigned remediation as assigned, not as a free choice', () => {
    render(
      <NextStepCard
        step={step({ kind: 'REMEDIATION', ctaLabel: 'Start Training Mission' })}
        studentName="Alex"
      />
    )
    expect(screen.getByText(/assigned for you/i)).toBeInTheDocument()
  })

  it('says "do this next" for ordinary work', () => {
    render(<NextStepCard step={step()} studentName="Alex" />)
    expect(screen.getByText(/do this next/i)).toBeInTheDocument()
  })

  it('celebrates rather than scolding when there is nothing left', () => {
    render(
      <NextStepCard
        step={step({
          kind: 'ALL_CAUGHT_UP',
          label: "You're all caught up",
          subLabel: 'Nothing is due right now',
          estimatedMinutes: null,
          ctaLabel: 'See the Mission Map',
          href: '/student/map',
        })}
        studentName="Alex"
      />
    )
    // Both the eyebrow and the step label say it — assert each exactly rather
    // than with a loose regex that legitimately matches twice.
    expect(screen.getByText('All caught up')).toBeInTheDocument()
    expect(screen.getByText("You're all caught up")).toBeInTheDocument()
    // Still a way forward — never a dead screen.
    expect(links()).toHaveLength(1)
  })
})

describe('NextStepCard — duration honesty', () => {
  it('renders an estimate approximately, never as an exact figure', () => {
    render(<NextStepCard step={step({ estimatedMinutes: 15 })} studentName="Alex" />)
    expect(screen.getByText('about 15 min')).toBeInTheDocument()
  })

  it('shows no duration at all when there is none to show', () => {
    render(<NextStepCard step={step({ estimatedMinutes: null })} studentName="Alex" />)
    expect(screen.queryByText(/min$/)).not.toBeInTheDocument()
  })
})

describe('ThenList', () => {
  const drill = step({
    kind: 'DRILL',
    label: 'Daily Republic Drill',
    subLabel: '4 questions ready for review',
    href: '/student/daily-drill',
    icon: 'bolt',
    ctaLabel: 'Start the Drill',
    estimatedMinutes: 3,
    count: 4,
  })

  it('renders nothing at all when there is nothing to queue', () => {
    const { container } = render(<ThenList steps={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('uses an ordered list, because the order IS the guidance', () => {
    render(<ThenList steps={[drill]} />)
    expect(document.querySelector('ol')).not.toBeNull()
  })

  it('numbers steps continuing from the primary card, which is step 1', () => {
    render(<ThenList steps={[drill, step({ kind: 'STRATEGY', href: '/student/strategy' })]} />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.queryByText('1')).not.toBeInTheDocument()
  })

  it('makes every queued step reachable', () => {
    render(<ThenList steps={[drill]} />)
    expect(links()[0]).toHaveAttribute('href', '/student/daily-drill')
  })
})
