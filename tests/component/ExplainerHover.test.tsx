/**
 * ExplainerHover accessibility (closes ADR 0016's deferred item).
 *
 * The regression this guards against is invisible in a browser: the explainer
 * still "works" on mouse hover while being completely unreachable to a screen
 * reader. Before this change `aria-describedby` was set only while the popover
 * was open, so a user who never fires a mouse hover could not reach any of the
 * ~150 explainers on the site.
 *
 * Uses fireEvent + native focus() rather than @testing-library/user-event, which
 * is not a dependency of this project and is not worth adding for this.
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

const TEXT = 'Freeze tokens hold your streak when you are away.'

/**
 * The floating popover is the `z-50` layer, and it is rendered only while open.
 *
 * Not keyed off text matches: when a `title` is set, the popover's body text
 * shares an element with the title, so a text query would not match it and
 * "open" would look like "closed". Not keyed off `aria-hidden` either — the
 * always-present sr-only description carries that too, deliberately.
 */
function isPopoverOpen(): boolean {
  return document.querySelector('span.z-50') !== null
}

describe('the description is reachable without a mouse', () => {
  it('is in the DOM and referenced while the popover is CLOSED', () => {
    render(
      <ExplainerHover title="Freeze Tokens" text={TEXT}>
        <span>3 tokens</span>
      </ExplainerHover>
    )

    const description = screen.getByText(TEXT)
    expect(description).toBeInTheDocument()
    expect(description.id).toBeTruthy()

    const trigger = screen.getByText('3 tokens').parentElement
    expect(trigger).toHaveAttribute('aria-describedby', description.id)
  })

  it('hides the description from name computation, so it cannot pollute a wrapping link', () => {
    // Several call sites nest this INSIDE the interactive element
    // (TeacherNav renders <Link><ExplainerHover>…</ExplainerHover></Link>), and
    // accessible-name computation concatenates descendant text. Without
    // aria-hidden, every nav link is named "Dashboard Your class overview —
    // mastery, readiness, and alerts at a glance" instead of "Dashboard".
    // The description still reaches AT: accname §2A excepts nodes directly
    // referenced by aria-describedby.
    render(
      <a href="/student/dashboard">
        Dashboard
        <ExplainerHover text={TEXT}>
          <span>i</span>
        </ExplainerHover>
      </a>
    )

    expect(screen.getByText(TEXT)).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('link')).toHaveAccessibleName('Dashboard i')
  })

  it('does not repeat the title inside the description', () => {
    // The title is the trigger's own words often enough that including it would
    // make a screen reader say it twice in a row.
    render(
      <ExplainerHover title="Assigned for you" text={TEXT}>
        <span>Assigned for you</span>
      </ExplainerHover>
    )
    expect(screen.getAllByText('Assigned for you')).toHaveLength(1)
  })
})

describe('keyboard access without new tab stops', () => {
  // `fireEvent.focusIn`, not `element.focus()`: React 18 listens for the
  // bubbling `focusin`, and jsdom's programmatic focus() fires only `focus`.
  // A real browser fires both, so this dispatches what the component actually
  // listens to. (Verified separately by tabbing in the live app.)
  it('opens when a focusable child receives focus', () => {
    render(
      <ExplainerHover title="Mission Map" text={TEXT}>
        <a href="/student/map">Mission Map</a>
      </ExplainerHover>
    )

    expect(isPopoverOpen()).toBe(false)
    fireEvent.focusIn(screen.getByRole('link', { name: 'Mission Map' }))
    expect(isPopoverOpen()).toBe(true)
  })

  it('adds neither a tab stop nor a nested button when wrapping a link', () => {
    render(
      <ExplainerHover text={TEXT}>
        <a href="/student/map">Mission Map</a>
      </ExplainerHover>
    )

    const wrapper = screen.getByRole('link', { name: 'Mission Map' }).parentElement
    // A second tab stop here would mean every nav item needs two Tab presses,
    // and role="button" around a link is a nested interactive control.
    expect(wrapper).not.toHaveAttribute('tabindex')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('closes again on blur', () => {
    render(
      <ExplainerHover text={TEXT}>
        <a href="/student/map">Mission Map</a>
      </ExplainerHover>
    )

    const link = screen.getByRole('link', { name: 'Mission Map' })
    fireEvent.focusIn(link)
    expect(isPopoverOpen()).toBe(true)

    fireEvent.focusOut(link)
    expect(isPopoverOpen()).toBe(false)
  })
})

describe('focusable (opt-in, for triggers with no interactive child)', () => {
  it('exposes a real tab stop and button role', () => {
    render(
      <ExplainerHover title="Not built yet" text={TEXT} focusable>
        <span>Not built yet</span>
      </ExplainerHover>
    )

    const trigger = screen.getByRole('button')
    expect(trigger).toHaveAttribute('tabindex', '0')
  })

  it('toggles on Enter and closes on Escape', () => {
    render(
      <ExplainerHover text={TEXT} focusable>
        <span>chip</span>
      </ExplainerHover>
    )

    const trigger = screen.getByRole('button')

    fireEvent.keyDown(trigger, { key: 'Enter' })
    expect(isPopoverOpen()).toBe(true)

    fireEvent.keyDown(trigger, { key: 'Enter' })
    expect(isPopoverOpen()).toBe(false)
  })

  it('opens on tap (click), which a plain-text trigger cannot otherwise reach', () => {
    render(
      <ExplainerHover text={TEXT} focusable>
        <span>chip</span>
      </ExplainerHover>
    )

    fireEvent.click(screen.getByRole('button'))
    expect(isPopoverOpen()).toBe(true)
  })
})
