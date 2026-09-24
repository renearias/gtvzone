import { describe, expect, it, vi } from 'vitest'
import { createNavigation } from './navigation'
import type { NavigationAdapter, Rect } from './types'

type Box = [x: number, y: number, width: number, height: number]

/** Fake adapter: rects come from a table and deferred work runs when the test calls `flush`. */
function setup (boxes: Record<string, Box> = {}, options: { autoFocus?: boolean } = {}) {
  const queue: Array<() => void> = []
  const measure = vi.fn((id: string): Rect | null => {
    const box = boxes[id]
    return box ? { x: box[0], y: box[1], width: box[2], height: box[3] } : null
  })
  const adapter: NavigationAdapter = { measure, schedule: task => { queue.push(task) } }
  const nav = createNavigation({ adapter, ...options })
  const flush = () => { while (queue.length) queue.shift()!() }
  return { nav, flush, measure }
}

describe('geometry navigation', () => {
  const grid: Record<string, Box> = {
    a: [0, 0, 100, 100], b: [120, 0, 100, 100],
    c: [0, 120, 100, 100], d: [120, 120, 100, 100]
  }

  it('moves to the closest element in each direction', () => {
    const { nav, flush } = setup(grid)
    Object.keys(grid).forEach(id => nav.register({ id }))
    flush()
    expect(nav.getFocusedId()).toBe('a')
    expect(nav.move('right')).toBe(true)
    expect(nav.getFocusedId()).toBe('b')
    nav.move('down')
    expect(nav.getFocusedId()).toBe('d')
    nav.move('left')
    expect(nav.getFocusedId()).toBe('c')
    nav.move('up')
    expect(nav.getFocusedId()).toBe('a')
  })

  it('emits boundary and keeps focus when there is nowhere to go', () => {
    const { nav, flush } = setup(grid)
    Object.keys(grid).forEach(id => nav.register({ id }))
    flush()
    const onBoundary = vi.fn()
    nav.on('boundary', onBoundary)
    expect(nav.move('left')).toBe(false)
    expect(nav.getFocusedId()).toBe('a')
    expect(onBoundary).toHaveBeenCalledWith({ direction: 'left', focusedId: 'a' })
  })

  it('prefers an aligned element over a closer one in another row', () => {
    const { nav, flush } = setup({
      origin: [0, 0, 100, 100],
      aligned: [400, 0, 100, 100],
      offRow: [150, 300, 100, 100]
    })
    ;['origin', 'aligned', 'offRow'].forEach(id => nav.register({ id }))
    flush()
    nav.move('right')
    expect(nav.getFocusedId()).toBe('aligned')
  })

  it('does not auto focus when autoFocus is false', () => {
    const { nav, flush } = setup(grid, { autoFocus: false })
    nav.register({ id: 'a' })
    flush()
    expect(nav.getFocusedId()).toBeNull()
    expect(nav.setFocus('a')).toBe(true)
  })
})

describe('zones', () => {
  function rows () {
    const env = setup({
      r1a: [0, 0, 100, 100], r1b: [120, 0, 100, 100], r1c: [240, 0, 100, 100],
      r2a: [0, 200, 100, 100], r2b: [120, 200, 100, 100], r2c: [240, 200, 100, 100]
    })
    env.nav.registerZone({ id: 'row1', strategy: 'list' })
    env.nav.registerZone({ id: 'row2', strategy: 'list' })
    ;['r1a', 'r1b', 'r1c'].forEach(id => env.nav.register({ id, zone: 'row1' }))
    ;['r2a', 'r2b', 'r2c'].forEach(id => env.nav.register({ id, zone: 'row2' }))
    env.flush()
    return env
  }

  it('moves inside a list zone without measuring', () => {
    const { nav, measure } = rows()
    measure.mockClear()
    nav.move('right')
    nav.move('right')
    expect(nav.getFocusedId()).toBe('r1c')
    expect(measure).not.toHaveBeenCalled()
  })

  it('enters the next zone at the closest element and remembers the last one', () => {
    const { nav } = rows()
    nav.move('right')
    nav.move('right')
    nav.move('down')
    expect(nav.getFocusedId()).toBe('r2c')
    nav.move('left')
    nav.move('up')
    expect(nav.getFocusedId()).toBe('r1c')
    nav.move('down')
    expect(nav.getFocusedId()).toBe('r2b')
  })

  it('wraps inside a list zone', () => {
    const { nav } = rows()
    nav.updateZone('row1', { wrap: true })
    nav.move('left')
    expect(nav.getFocusedId()).toBe('r1c')
  })

  it('keeps focus inside a trapped zone', () => {
    const { nav } = rows()
    nav.updateZone('row1', { trap: true })
    expect(nav.move('down')).toBe(false)
    expect(nav.getFocusedId()).toBe('r1a')
  })

  it('follows nextZone and nextFocus overrides', () => {
    const { nav } = rows()
    nav.updateZone('row1', { nextZone: { down: null } })
    expect(nav.move('down')).toBe(false)
    nav.update('r1a', { nextFocus: { right: 'r2c' } })
    nav.move('right')
    expect(nav.getFocusedId()).toBe('r2c')
  })

  it('skips disabled elements and empty zones', () => {
    const { nav } = rows()
    nav.update('r1b', { disabled: true })
    nav.move('right')
    expect(nav.getFocusedId()).toBe('r1c')
    nav.updateZone('row2', { disabled: true })
    expect(nav.move('down')).toBe(false)
  })

  it('enters a zone through setFocus using firstFocus', () => {
    const { nav } = rows()
    nav.updateZone('row2', { firstFocus: 'r2b' })
    expect(nav.setFocus('row2')).toBe(true)
    expect(nav.getFocusedId()).toBe('r2b')
  })

  it('fires zone callbacks and events in order', () => {
    const { nav } = rows()
    const log: string[] = []
    nav.updateZone('row1', { onLeave: id => log.push('leave:' + id) })
    nav.updateZone('row2', { onEnter: id => log.push('enter:' + id) })
    nav.update('r1a', { onBlur: id => log.push('blur:' + id) })
    nav.update('r2a', { onFocus: id => log.push('focus:' + id) })
    nav.move('down')
    expect(log).toEqual(['blur:r1a', 'leave:row1', 'enter:row2', 'focus:r2a'])
  })

  it('refocuses inside the same zone when the focused element is removed', () => {
    const { nav, flush } = rows()
    nav.move('down')
    nav.move('right')
    nav.unregister('r2b')
    flush()
    expect(nav.getFocusedId()).toBe('r2a')
  })
})

describe('grid strategy', () => {
  it('moves by rows and columns and lands on the short last row', () => {
    const { nav, flush } = setup()
    nav.registerZone({ id: 'grid', strategy: 'grid', columns: 3 })
    for (let i = 0; i < 7; i++) nav.register({ id: 'i' + i, zone: 'grid' })
    flush()
    nav.move('down')
    expect(nav.getFocusedId()).toBe('i3')
    nav.move('right')
    expect(nav.getFocusedId()).toBe('i4')
    nav.move('down')
    expect(nav.getFocusedId()).toBe('i6')
    nav.move('up')
    expect(nav.getFocusedId()).toBe('i3')
  })
})

describe('layers', () => {
  it('isolates the top layer and restores focus when it closes', () => {
    const { nav, flush } = setup({ a: [0, 0, 10, 10], b: [20, 0, 10, 10], m1: [0, 0, 10, 10], m2: [0, 20, 10, 10] })
    nav.register({ id: 'a' })
    nav.register({ id: 'b' })
    flush()
    nav.move('right')
    expect(nav.getFocusedId()).toBe('b')

    nav.register({ id: 'm1', layer: 'modal' })
    nav.register({ id: 'm2', layer: 'modal' })
    nav.openLayer('modal')
    expect(nav.getState()).toEqual({ focusedId: 'm1', activeLayer: 'modal' })
    nav.move('down')
    expect(nav.getFocusedId()).toBe('m2')
    expect(nav.move('right')).toBe(false)
    expect(nav.setFocus('a')).toBe(false)

    nav.closeLayer('modal')
    expect(nav.getState()).toEqual({ focusedId: 'b', activeLayer: 'default' })
  })

  it('clears focus while a layer has nothing focusable yet, then focuses its first element', () => {
    const { nav, flush } = setup({ a: [0, 0, 10, 10], m1: [0, 0, 10, 10] })
    nav.register({ id: 'a' })
    flush()
    nav.openLayer('modal')
    expect(nav.getFocusedId()).toBeNull()
    nav.register({ id: 'm1', layer: 'modal' })
    flush()
    expect(nav.getFocusedId()).toBe('m1')
  })
})

describe('store contract', () => {
  it('notifies subscribers only on change and keeps the snapshot stable', () => {
    const { nav, flush } = setup({ a: [0, 0, 10, 10], b: [20, 0, 10, 10] })
    nav.register({ id: 'a' })
    nav.register({ id: 'b' })
    flush()
    const listener = vi.fn()
    const unsubscribe = nav.subscribe(listener)
    const snapshot = nav.getState()
    nav.move('left')
    expect(listener).not.toHaveBeenCalled()
    expect(nav.getState()).toBe(snapshot)
    nav.move('right')
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    nav.move('left')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('dispatches enter to onPress and back to the back event', () => {
    const { nav, flush } = setup()
    const onPress = vi.fn()
    const onBack = vi.fn()
    nav.register({ id: 'a', onPress })
    nav.on('back', onBack)
    flush()
    expect(nav.handleAction('enter')).toBe(true)
    expect(onPress).toHaveBeenCalledWith('a')
    nav.handleAction('back')
    expect(onBack).toHaveBeenCalledWith({ focusedId: 'a' })
  })

  it('keeps registration order stable when an element re-registers (React StrictMode)', () => {
    const { nav, flush } = setup()
    nav.registerZone({ id: 'row', strategy: 'list' })
    ;['a', 'b', 'c'].forEach(id => nav.register({ id, zone: 'row' }))
    nav.unregister('a')
    nav.register({ id: 'a', zone: 'row' })
    flush()
    expect(nav.getFocusedId()).toBe('a')
    nav.move('right')
    expect(nav.getFocusedId()).toBe('b')
  })

  it('orders siblings with adapter.compare when there is no explicit order', () => {
    const position: Record<string, number> = { a: 2, b: 1 }
    const queue: Array<() => void> = []
    const nav = createNavigation({
      adapter: {
        measure: () => null,
        compare: (x, y) => position[x.id] - position[y.id],
        schedule: task => { queue.push(task) }
      }
    })
    nav.registerZone({ id: 'row', strategy: 'list' })
    nav.register({ id: 'a', zone: 'row' })
    nav.register({ id: 'b', zone: 'row' })
    queue.shift()!()
    expect(nav.getFocusedId()).toBe('b')
  })
})
