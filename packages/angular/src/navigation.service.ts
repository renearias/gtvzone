import { computed, DestroyRef, inject, Injectable, InjectionToken, makeEnvironmentProviders, NgZone, signal } from '@angular/core'
import type { EnvironmentProviders, Signal } from '@angular/core'
import { Observable } from 'rxjs'
import { createNavigation } from '@arxis/gtvzone-core'
import type { Direction, EventName, Navigation, NavigationEvents, NavigationState } from '@arxis/gtvzone-core'
import { bindKeys, createDomAdapter } from '@arxis/gtvzone-dom'
import type { BindKeysOptions, DomAdapterOptions } from '@arxis/gtvzone-dom'

export const GTV_NAVIGATION = new InjectionToken<Navigation>('GTV_NAVIGATION')

export interface GtvNavigationConfig {
  /** Bring your own instance (e.g. shared with non-Angular code). Defaults to a DOM-backed one. */
  navigation?: Navigation | (() => Navigation)
  adapter?: DomAdapterOptions
  autoFocus?: boolean
  /** Key binding options, or `false` to wire input yourself. */
  keys?: BindKeysOptions | false
}

/**
 * Registers the navigation instance. Keys are listened to outside the Angular zone, so a
 * key press only triggers change detection when focus actually changes.
 */
export function provideGtvNavigation (config: GtvNavigationConfig = {}): EnvironmentProviders {
  return makeEnvironmentProviders([{
    provide: GTV_NAVIGATION,
    useFactory: () => {
      const { navigation, adapter, autoFocus, keys } = config
      const nav = typeof navigation === 'function'
        ? navigation()
        : navigation ?? createNavigation({ adapter: createDomAdapter(adapter), autoFocus })
      if (keys !== false) {
        const unbind = inject(NgZone).runOutsideAngular(() => bindKeys(nav, keys))
        inject(DestroyRef).onDestroy(unbind)
      }
      return nav
    }
  }])
}

@Injectable({ providedIn: 'root' })
export class GtvNavigationService {
  readonly navigation = inject(GTV_NAVIGATION)
  private readonly zone = inject(NgZone)
  private readonly stateSignal = signal<NavigationState>(this.navigation.getState())

  readonly state: Signal<NavigationState> = this.stateSignal.asReadonly()
  readonly focusedId = computed(() => this.stateSignal().focusedId)
  readonly activeLayer = computed(() => this.stateSignal().activeLayer)

  /** Same state as an Observable, for RxJS-based code. */
  readonly state$ = new Observable<NavigationState>(subscriber => {
    subscriber.next(this.navigation.getState())
    return this.navigation.subscribe(() => subscriber.next(this.navigation.getState()))
  })

  constructor () {
    const unsubscribe = this.navigation.subscribe(() => {
      this.zone.run(() => this.stateSignal.set(this.navigation.getState()))
    })
    inject(DestroyRef).onDestroy(unsubscribe)
  }

  isFocused (id: string): Signal<boolean> {
    return computed(() => this.stateSignal().focusedId === id)
  }

  /** Navigation events as an Observable; handlers run inside the Angular zone. */
  on<E extends EventName> (event: E): Observable<NavigationEvents[E]> {
    return new Observable(subscriber =>
      this.navigation.on(event, payload => this.zone.run(() => subscriber.next(payload)))
    )
  }

  move (direction: Direction) { return this.navigation.move(direction) }
  setFocus (id: string) { return this.navigation.setFocus(id) }
  press () { return this.navigation.press() }
  back () { this.navigation.back() }
}
