import { afterEach, describe, expect, it, vi } from 'vitest'
import { createNavigation } from '@arxis/gtvzone-core'
import type { Rect } from '@arxis/gtvzone-core'
import { bindKeys, bindZone, createDomAdapter, detectPlatform, keyMaps } from './index'

/** jsdom has no layout: rects come from `data-rect="x,y,w,h"`. */
const getRect = (element: Element): Rect => {
  const [x, y, width, height] = (element.getAttribute('data-rect') ?? '0,0,0,0').split(',').map(Number)
  return { x, y, width, height }
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

function createNav () {
  return createNavigation({ adapter: createDomAdapter({ getRect }) })
}

afterEach(() => { document.body.innerHTML = '' })

describe('createDomAdapter', () => {
  it('measures the registered node, falls back to the id and ignores hidden elements', () => {
    document.body.innerHTML = '<div id="a" data-rect="1,2,3,4"></div><div id="hidden"></div>'
    const adapter = createDomAdapter({ getRect })
    const a = document.getElementById('a')
    expect(adapter.measure('ignored', a)).toEqual({ x: 1, y: 2, width: 3, height: 4 })
    expect(adapter.measure('a', undefined)).toEqual({ x: 1, y: 2, width: 3, height: 4 })
    expect(adapter.measure('hidden', undefined)).toBeNull()
    expect(adapter.measure('missing', undefined)).toBeNull()
  })

  it('orders nodes by document position', () => {
    document.body.innerHTML = '<i id="first"></i><i id="second"></i>'
    const adapter = createDomAdapter()
    expect(adapter.compare!({ id: 'second', node: null }, { id: 'first', node: null })).toBe(1)
    expect(adapter.compare!({ id: 'first', node: null }, { id: 'second', node: null })).toBe(-1)
  })
})

describe('keys', () => {
  it('detects the platform from the user agent', () => {
    expect(detectPlatform('Mozilla/5.0 (SMART-TV; Linux; Tizen 5.0)')).toBe('tizen')
    expect(detectPlatform('Mozilla/5.0 (Web0S; Linux/SmartTV)')).toBe('webos')
    expect(detectPlatform('Mozilla/5.0 VIDAA/6.0')).toBe('hisense')
    expect(detectPlatform('Mozilla/5.0 (Macintosh)')).toBe('browser')
  })

  it('maps keys to actions, prevents default and can be unbound', () => {
    const nav = createNavigation()
    const move = vi.spyOn(nav, 'handleAction')
    const onBack = vi.fn()
    nav.on('back', onBack)
    const unbind = bindKeys(nav, { keyMap: keyMaps.tizen })

    const right = new KeyboardEvent('keydown', { keyCode: 39, cancelable: true })
    window.dispatchEvent(right)
    expect(move).toHaveBeenCalledWith('right')
    expect(right.defaultPrevented).toBe(true)

    window.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 10009 }))
    expect(onBack).toHaveBeenCalledTimes(1)

    unbind()
    window.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 39 }))
    expect(move).toHaveBeenCalledTimes(2)
  })
})

describe('bindZone', () => {
  function renderRow () {
    document.body.innerHTML = `
      <ul id="row">
        <li id="a" class="card" data-rect="0,0,100,100"></li>
        <li id="b" class="card" data-rect="120,0,100,100"></li>
      </ul>`
  }

  it('registers the items and toggles the focused class', async () => {
    renderRow()
    const nav = createNav()
    bindZone(nav, '#row', { item: '.card', strategy: 'list' })
    await flush()
    expect(nav.getFocusedId()).toBe('a')
    expect(document.getElementById('a')!.classList.contains('gtv-focused')).toBe(true)

    nav.move('right')
    expect(document.getElementById('a')!.classList.contains('gtv-focused')).toBe(false)
    expect(document.getElementById('b')!.classList.contains('gtv-focused')).toBe(true)
  })

  it('follows DOM mutations', async () => {
    renderRow()
    const nav = createNav()
    bindZone(nav, '#row', { item: '.card', strategy: 'list' })
    await flush()

    const extra = document.createElement('li')
    extra.className = 'card'
    document.getElementById('row')!.appendChild(extra)
    await flush()
    nav.move('right')
    nav.move('right')
    expect(nav.getFocusedId()).toBe(extra.id)

    extra.remove()
    await flush()
    expect(nav.getFocusedId()).not.toBe(extra.id)

    document.getElementById('b')!.setAttribute('disabled', '')
    await flush()
    nav.move('left')
    expect(nav.move('right')).toBe(false)
  })

  it('dispatches a press event on the focused item', async () => {
    renderRow()
    const nav = createNav()
    const onPress = vi.fn()
    bindZone(nav, '#row', { item: '.card', onPress })
    await flush()
    const listener = vi.fn()
    document.body.addEventListener('gtvzone:press', listener)
    nav.press()
    expect(onPress).toHaveBeenCalledWith(document.getElementById('a'))
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ id: 'a' })
  })

  it('nests zones bound inside other zones', async () => {
    document.body.innerHTML = `
      <div id="page">
        <button id="menu" class="item" data-rect="0,0,100,50"></button>
        <ul id="row">
          <li id="c1" class="item" data-rect="0,100,100,100"></li>
          <li id="c2" class="item" data-rect="120,100,100,100"></li>
        </ul>
      </div>`
    const nav = createNav()
    bindZone(nav, '#page', { item: '.item' })
    bindZone(nav, '#row', { item: '.item', strategy: 'list', trap: true })
    await flush()
    expect(nav.getFocusedId()).toBe('menu')
    nav.move('down')
    expect(nav.getFocusedId()).toBe('c1')
    expect(nav.move('up')).toBe(false)
  })

  it('cleans up on destroy', async () => {
    renderRow()
    const nav = createNav()
    const binding = bindZone(nav, '#row', { item: '.card' })
    await flush()
    binding.destroy()
    await flush()
    expect(nav.getFocusedId()).toBeNull()
    expect(document.querySelector('.gtv-focused')).toBeNull()
    expect(document.getElementById('row')!.hasAttribute('data-gtvzone')).toBe(false)
  })
})
