import {
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  NgZone,
  Output,
  Renderer2,
  signal
} from '@angular/core'
import type { OnChanges, OnDestroy, OnInit, Signal } from '@angular/core'
import type { BuiltInStrategy, DirectionMap, Strategy, ZoneOptions } from '@arxis/gtvzone-core'
import { GtvNavigationService } from './navigation.service'

let idCounter = 0
const nextId = (prefix: string) => `${prefix}-${++idCounter}`

/** Isolates its content as a layer (e.g. a modal) while `gtvLayerActive` is true. */
@Directive({ selector: '[gtvLayer]', standalone: true })
export class GtvLayerDirective implements OnChanges, OnDestroy {
  @Input({ required: true }) gtvLayer!: string
  @Input({ transform: booleanAttribute }) gtvLayerActive = true
  @Input() gtvLayerPriority?: number

  private readonly service = inject(GtvNavigationService)
  private openedId: string | null = null

  ngOnChanges () {
    this.close()
    if (this.gtvLayerActive) {
      this.service.navigation.openLayer(this.gtvLayer, { priority: this.gtvLayerPriority })
      this.openedId = this.gtvLayer
    }
  }

  ngOnDestroy () {
    this.close()
  }

  private close () {
    if (this.openedId !== null) this.service.navigation.closeLayer(this.openedId)
    this.openedId = null
  }
}

/** Groups focusable children into a zone. The closest `[gtvZone]` ancestor is the parent. */
@Directive({ selector: '[gtvZone]', standalone: true, exportAs: 'gtvZone' })
export class GtvZoneDirective implements OnInit, OnChanges, OnDestroy {
  /** Zone id. Leave empty to generate one. */
  @Input() gtvZone = ''
  @Input() gtvZoneStrategy?: BuiltInStrategy | Strategy
  @Input() gtvZoneOrientation?: 'horizontal' | 'vertical'
  @Input() gtvZoneColumns?: number
  @Input({ transform: booleanAttribute }) gtvZoneWrap = false
  @Input({ transform: booleanAttribute }) gtvZoneTrap = false
  @Input({ transform: booleanAttribute }) gtvZoneDisabled = false
  @Input() gtvZoneSaveLastFocused?: boolean
  @Input() gtvZoneFirstFocus?: string
  @Input() gtvZoneOrder?: number
  @Input() gtvZoneNext?: DirectionMap
  @Output() readonly gtvZoneEnter = new EventEmitter<string>()
  @Output() readonly gtvZoneLeave = new EventEmitter<string>()

  private readonly service = inject(GtvNavigationService)
  private readonly zone = inject(NgZone)
  private readonly host = inject(ElementRef)
  private readonly parent = inject(GtvZoneDirective, { optional: true, skipSelf: true })
  private readonly layer = inject(GtvLayerDirective, { optional: true })
  private readonly generatedId = nextId('gtvzone')
  private registeredId: string | null = null

  get id (): string {
    return this.gtvZone || this.generatedId
  }

  ngOnInit () {
    this.registeredId = this.id
    this.service.navigation.registerZone({
      ...this.options(),
      id: this.id,
      parent: this.parent?.id,
      layer: this.parent ? undefined : this.layer?.gtvLayer,
      node: this.host.nativeElement,
      onEnter: id => this.zone.run(() => this.gtvZoneEnter.emit(id)),
      onLeave: id => this.zone.run(() => this.gtvZoneLeave.emit(id))
    })
  }

  ngOnChanges () {
    if (this.registeredId !== null) this.service.navigation.updateZone(this.registeredId, this.options())
  }

  ngOnDestroy () {
    if (this.registeredId !== null) this.service.navigation.unregisterZone(this.registeredId)
  }

  private options (): Omit<ZoneOptions, 'id'> {
    return {
      strategy: this.gtvZoneStrategy,
      orientation: this.gtvZoneOrientation,
      columns: this.gtvZoneColumns,
      wrap: this.gtvZoneWrap,
      trap: this.gtvZoneTrap,
      disabled: this.gtvZoneDisabled,
      saveLastFocused: this.gtvZoneSaveLastFocused,
      firstFocus: this.gtvZoneFirstFocus,
      order: this.gtvZoneOrder,
      nextZone: this.gtvZoneNext
    }
  }
}

/**
 * Registers the host element for remote-control navigation and toggles `gtvFocusedClass`
 * on it. Use `#ref="gtvFocusable"` and `ref.focused()` for custom styling.
 */
@Directive({ selector: '[gtvFocusable]', standalone: true, exportAs: 'gtvFocusable' })
export class GtvFocusableDirective implements OnInit, OnChanges, OnDestroy {
  /** Element id. Leave empty to generate one. */
  @Input() gtvFocusable = ''
  @Input({ transform: booleanAttribute }) gtvFocusableDisabled = false
  @Input() gtvFocusableOrder?: number
  @Input() gtvFocusableNext?: DirectionMap
  /** Class added while focused. Set to `''` to style with `focused()` only. */
  @Input() gtvFocusedClass = 'gtv-focused'
  @Output() readonly gtvFocus = new EventEmitter<string>()
  @Output() readonly gtvBlur = new EventEmitter<string>()
  @Output() readonly gtvPress = new EventEmitter<string>()

  private readonly service = inject(GtvNavigationService)
  private readonly zone = inject(NgZone)
  private readonly renderer = inject(Renderer2)
  private readonly host = inject(ElementRef)
  private readonly parent = inject(GtvZoneDirective, { optional: true })
  private readonly layer = inject(GtvLayerDirective, { optional: true })
  private readonly generatedId = nextId('gtvzone-item')
  private readonly registered = signal<string | null>(null)

  /** Whether this element has the focus. */
  readonly focused: Signal<boolean> = computed(() => {
    const id = this.registered()
    return id !== null && this.service.focusedId() === id
  })

  private get registeredId (): string | null {
    return this.registered()
  }

  get id (): string {
    return this.gtvFocusable || this.generatedId
  }

  ngOnInit () {
    const id = this.id
    this.registered.set(id)
    this.service.navigation.register({
      id,
      zone: this.parent?.id,
      layer: this.parent ? undefined : this.layer?.gtvLayer,
      node: this.host.nativeElement,
      disabled: this.gtvFocusableDisabled,
      order: this.gtvFocusableOrder,
      nextFocus: this.gtvFocusableNext,
      onFocus: () => {
        this.toggleClass(true)
        this.zone.run(() => this.gtvFocus.emit(id))
      },
      onBlur: () => {
        this.toggleClass(false)
        this.zone.run(() => this.gtvBlur.emit(id))
      },
      onPress: () => this.zone.run(() => this.gtvPress.emit(id))
    })
  }

  ngOnChanges () {
    if (this.registeredId === null) return
    this.service.navigation.update(this.registeredId, {
      disabled: this.gtvFocusableDisabled,
      order: this.gtvFocusableOrder,
      nextFocus: this.gtvFocusableNext
    })
  }

  ngOnDestroy () {
    if (this.registeredId === null) return
    this.toggleClass(false)
    this.service.navigation.unregister(this.registeredId)
  }

  focus (): boolean {
    return this.service.setFocus(this.id)
  }

  private toggleClass (on: boolean) {
    if (!this.gtvFocusedClass) return
    if (on) this.renderer.addClass(this.host.nativeElement, this.gtvFocusedClass)
    else this.renderer.removeClass(this.host.nativeElement, this.gtvFocusedClass)
  }
}

export const GTV_NAVIGATION_DIRECTIVES = [GtvLayerDirective, GtvZoneDirective, GtvFocusableDirective] as const
