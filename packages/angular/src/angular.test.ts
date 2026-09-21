import { Component, provideZonelessChangeDetection, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { afterEach, describe, expect, it } from 'vitest'
import { createNavigation } from '@arxis/gtvzone-core'
import type { Navigation, Rect } from '@arxis/gtvzone-core'
import { createDomAdapter } from '@arxis/gtvzone-dom'
import { GTV_NAVIGATION_DIRECTIVES, GtvNavigationService, provideGtvNavigation } from './public-api'

const getRect = (element: Element): Rect => {
  const [x, y, width, height] = (element.getAttribute('data-rect') ?? '0,0,0,0').split(',').map(Number)
  return { x, y, width, height }
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

@Component({
  standalone: true,
  imports: [...GTV_NAVIGATION_DIRECTIVES],
  template: `
    <div gtvZone="row1" gtvZoneStrategy="list">
      <div gtvFocusable="a1" data-rect="0,0,100,100" (gtvPress)="pressed.set($event)"></div>
      <div gtvFocusable="a2" data-rect="120,0,100,100" #a2="gtvFocusable" [attr.data-focused]="a2.focused()"></div>
    </div>
    <div gtvZone="row2" gtvZoneStrategy="list">
      <div gtvFocusable="b1" data-rect="0,200,100,100"></div>
    </div>
    @if (modal()) {
      <div gtvLayer="modal">
        <div gtvZone="dialog" gtvZoneStrategy="list" gtvZoneOrientation="vertical">
          <button gtvFocusable="ok" data-rect="500,500,100,40"></button>
          <button gtvFocusable="cancel" data-rect="500,560,100,40"></button>
        </div>
      </div>
    }
  `
})
class HostComponent {
  readonly modal = signal(false)
  readonly pressed = signal<string | null>(null)
}

async function setup () {
  const nav = createNavigation({ adapter: createDomAdapter({ getRect }) })
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideGtvNavigation({ navigation: nav, keys: false })]
  })
  const fixture = TestBed.createComponent(HostComponent)
  await fixture.whenStable()
  await flush()
  return { fixture, nav, el: (id: string) => fixture.nativeElement.querySelector(`#${id}, [gtvFocusable="${id}"]`) as HTMLElement }
}

const focusedIds = (root: HTMLElement) =>
  Array.from(root.querySelectorAll('.gtv-focused')).map(node => node.getAttribute('gtvFocusable'))

afterEach(() => TestBed.resetTestingModule())

describe('Angular bindings', () => {
  it('registers zones and elements and toggles the focused class', async () => {
    const { fixture, nav } = await setup()
    expect(nav.getFocusedId()).toBe('a1')
    expect(focusedIds(fixture.nativeElement)).toEqual(['a1'])
    nav.move('right')
    expect(focusedIds(fixture.nativeElement)).toEqual(['a2'])
    nav.move('down')
    expect(nav.getFocusedId()).toBe('b1')
  })

  it('exposes focused() as a signal for templates', async () => {
    const { fixture, nav } = await setup()
    const a2 = () => fixture.nativeElement.querySelector('[gtvFocusable="a2"]').getAttribute('data-focused')
    expect(a2()).toBe('false')
    nav.move('right')
    await fixture.whenStable()
    expect(a2()).toBe('true')
  })

  it('emits gtvPress inside Angular', async () => {
    const { fixture, nav } = await setup()
    nav.press()
    expect(fixture.componentInstance.pressed()).toBe('a1')
  })

  it('opens a layer, traps navigation in it and restores focus when it closes', async () => {
    const { fixture, nav } = await setup()
    nav.move('down')
    fixture.componentInstance.modal.set(true)
    await fixture.whenStable()
    await flush()
    expect(nav.getState()).toEqual({ focusedId: 'ok', activeLayer: 'modal' })
    nav.move('down')
    expect(nav.getFocusedId()).toBe('cancel')
    expect(nav.move('left')).toBe(false)

    fixture.componentInstance.modal.set(false)
    await fixture.whenStable()
    await flush()
    expect(nav.getState()).toEqual({ focusedId: 'b1', activeLayer: 'default' })
  })

  it('mirrors the state in the service signals', async () => {
    const { nav } = await setup()
    const service = TestBed.inject(GtvNavigationService)
    expect(service.focusedId()).toBe('a1')
    nav.move('right')
    expect(service.focusedId()).toBe('a2')
    expect(service.isFocused('a2')()).toBe(true)
  })
})

describe('provideGtvNavigation', () => {
  it('creates a DOM-backed instance and binds keys by default', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideGtvNavigation()] })
    const service = TestBed.inject(GtvNavigationService)
    const nav: Navigation = service.navigation
    const moves: string[] = []
    const original = nav.handleAction
    nav.handleAction = action => { moves.push(action); return original(action) }
    window.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 40 }))
    expect(moves).toEqual(['down'])
  })
})
