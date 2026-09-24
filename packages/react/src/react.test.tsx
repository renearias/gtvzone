import { StrictMode, useState } from 'react'
import type { ReactNode } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createNavigation } from '@arxis/gtvzone-core'
import type { Navigation, Rect } from '@arxis/gtvzone-core'
import { createDomAdapter } from '@arxis/gtvzone-dom'
import { FocusLayer, FocusZone, NavigationProvider, useFocusable } from './index'

// Tell React this is an act() environment so state updates are flushed synchronously.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const getRect = (element: Element): Rect => {
  const [x, y, width, height] = (element.getAttribute('data-rect') ?? '0,0,0,0').split(',').map(Number)
  return { x, y, width, height }
}

function Card ({ id, rect, onPress }: { id: string, rect: string, onPress?: () => void }) {
  const { ref, focused } = useFocusable<HTMLDivElement>({ id, onPress })
  return <div ref={ref} data-rect={rect} data-testid={id} className={focused ? 'focused' : ''} />
}

async function mount (ui: ReactNode, { strict = false } = {}) {
  const nav = createNavigation({ adapter: createDomAdapter({ getRect }) })
  const tree = <NavigationProvider navigation={nav}>{ui}</NavigationProvider>
  await act(async () => { render(strict ? <StrictMode>{tree}</StrictMode> : tree) })
  return nav
}

const focusedTestId = () => document.querySelector('.focused')?.getAttribute('data-testid') ?? null
const press = (nav: Navigation, action: Parameters<Navigation['handleAction']>[0]) =>
  act(() => { nav.handleAction(action) })

afterEach(cleanup)

function Rows () {
  return (
    <>
      <FocusZone id="row1" strategy="list">
        <Card id="a1" rect="0,0,100,100" />
        <Card id="a2" rect="120,0,100,100" />
      </FocusZone>
      <FocusZone id="row2" strategy="list">
        <Card id="b1" rect="0,200,100,100" />
        <Card id="b2" rect="120,200,100,100" />
      </FocusZone>
    </>
  )
}

describe('React bindings', () => {
  it('auto focuses and re-renders only from navigation state', async () => {
    const nav = await mount(<Rows />)
    expect(focusedTestId()).toBe('a1')
    await press(nav, 'right')
    expect(focusedTestId()).toBe('a2')
    await press(nav, 'down')
    expect(focusedTestId()).toBe('b2')
  })

  it('renders zones as DOM elements with the given id and forwards refs', async () => {
    const ref = { current: null as HTMLElement | null }
    await mount(<FocusZone id="grid" as="section" ref={ref} strategy="grid" columns={2} />)
    expect(ref.current?.tagName).toBe('SECTION')
    expect(ref.current?.id).toBe('grid')
  })

  it('works under StrictMode double effects without losing order', async () => {
    const nav = await mount(<Rows />, { strict: true })
    expect(focusedTestId()).toBe('a1')
    await press(nav, 'right')
    expect(focusedTestId()).toBe('a2')
  })

  it('calls the latest onPress', async () => {
    const onPress = vi.fn()
    const nav = await mount(<Card id="only" rect="0,0,10,10" onPress={onPress} />)
    await press(nav, 'enter')
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('moves focus into a layer and back when it closes', async () => {
    let setOpen: (open: boolean) => void = () => {}
    function App () {
      const [open, set] = useState(false)
      setOpen = set
      return (
        <>
          <Rows />
          {open && (
            <FocusLayer id="modal">
              <FocusZone id="dialog" strategy="list" orientation="vertical">
                <Card id="ok" rect="500,500,100,40" />
                <Card id="cancel" rect="500,560,100,40" />
              </FocusZone>
            </FocusLayer>
          )}
        </>
      )
    }
    const nav = await mount(<App />)
    await press(nav, 'down')
    expect(focusedTestId()).toBe('b1')

    await act(async () => { setOpen(true) })
    expect(focusedTestId()).toBe('ok')
    await press(nav, 'down')
    expect(focusedTestId()).toBe('cancel')
    await press(nav, 'left')
    expect(focusedTestId()).toBe('cancel')

    await act(async () => { setOpen(false) })
    expect(focusedTestId()).toBe('b1')
  })

  it('refocuses when the focused element unmounts', async () => {
    let remove: () => void = () => {}
    function List () {
      const [items, setItems] = useState(['x1', 'x2', 'x3'])
      remove = () => setItems(['x1', 'x3'])
      return (
        <FocusZone id="list" strategy="list">
          {items.map((id, i) => <Card key={id} id={id} rect={`${i * 120},0,100,100`} />)}
        </FocusZone>
      )
    }
    const nav = await mount(<List />)
    await press(nav, 'right')
    expect(focusedTestId()).toBe('x2')
    await act(async () => { remove() })
    expect(focusedTestId()).toBe('x1')
  })

  it('throws a helpful error without a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Card id="lonely" rect="0,0,1,1" />)).toThrow(/NavigationProvider/)
  })
})

it('keeps a stable DOM id only when one is given', async () => {
  await mount(<FocusZone data-testid="anon" />)
  expect(screen.getByTestId('anon').id).toBe('')
})
