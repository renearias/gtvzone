export type Direction = 'up' | 'down' | 'left' | 'right'

/** Abstract input actions. Platform key codes are translated to these by an input binding. */
export type Action = Direction | 'enter' | 'back'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** Per-direction override: an element or zone id to jump to, or `null` to block the move. */
export type DirectionMap = Partial<Record<Direction, string | null>>

/**
 * Port to the rendering environment. The core never touches the DOM: it asks the adapter
 * for geometry and lets it decide how to schedule deferred work.
 */
export interface NavigationAdapter {
  /** Returns the rect of an element or zone, or `null` when it cannot be measured. */
  measure(id: string, node: unknown): Rect | null
  /**
   * Orders two siblings that have no explicit `order` (negative when `a` comes first, 0 when
   * unknown). The DOM adapter uses document order; otherwise registration order is used.
   */
  compare?(a: NodeRef, b: NodeRef): number
  /** Runs `task` after the current synchronous work (defaults to a microtask). */
  schedule?(task: () => void): void
}

export interface NodeRef {
  id: string
  node: unknown
}

export interface FocusableOptions {
  id: string
  /** Zone that contains the element. Omit to place it in the root of `layer`. */
  zone?: string
  /** Layer used only when the element has no zone. Defaults to `"default"`. */
  layer?: string
  disabled?: boolean
  /** Position inside `list`/`grid` zones. Defaults to registration order. */
  order?: number
  nextFocus?: DirectionMap
  /** Opaque handle passed back to `adapter.measure` (e.g. the DOM element). */
  node?: unknown
  onFocus?: (id: string) => void
  onBlur?: (id: string) => void
  onPress?: (id: string) => void
}

export type BuiltInStrategy = 'geometry' | 'list' | 'grid'

export interface ZoneOptions {
  id: string
  /** Parent zone. Omit to attach the zone to the root of `layer`. */
  parent?: string
  /** Layer used only when the zone has no parent. Defaults to `"default"`. */
  layer?: string
  strategy?: BuiltInStrategy | Strategy
  /** Axis for `list` zones. Defaults to `"horizontal"`. */
  orientation?: 'horizontal' | 'vertical'
  /** Column count for `grid` zones. */
  columns?: number
  /** Cycle inside the zone instead of leaving it at the edges. */
  wrap?: boolean
  /** Re-focus the last focused child when the zone is entered again. Defaults to `true`. */
  saveLastFocused?: boolean
  /** Child (element or zone) to focus when entering and there is no remembered child. */
  firstFocus?: string
  /** Never let focus leave the zone with arrow keys. */
  trap?: boolean
  disabled?: boolean
  order?: number
  nextZone?: DirectionMap
  node?: unknown
  onEnter?: (id: string) => void
  onLeave?: (id: string) => void
}

export interface LayerOptions {
  /** Higher priority wins. The `"default"` layer has priority 0. Defaults to 1. */
  priority?: number
}

/** A child of a zone as seen by strategies: either a focusable element or a nested zone. */
export interface Unit {
  kind: 'element' | 'zone'
  id: string
  order: number
}

export interface StrategyContext {
  zone: Readonly<ZoneOptions>
  rect(unit: Unit): Rect | null
}

/**
 * Decides where focus goes inside one zone. `rank` returns candidates in preference order;
 * the core takes the first one that can actually receive focus (so disabled or empty zones
 * are skipped without the strategy knowing about them).
 */
export interface Strategy {
  rank(origin: Unit, units: Unit[], direction: Direction, ctx: StrategyContext): Unit[]
  /** Candidates when focus enters the zone from outside. `originRect` is where it came from. */
  enter(units: Unit[], direction: Direction | null, originRect: Rect | null, ctx: StrategyContext): Unit[]
}

export interface NavigationState {
  focusedId: string | null
  activeLayer: string
}

export interface NavigationEvents {
  focus: { id: string, previousId: string | null }
  blur: { id: string, nextId: string | null }
  enterZone: { id: string }
  leaveZone: { id: string }
  press: { id: string }
  back: { focusedId: string | null }
  /** Emitted when a move finds nowhere to go. */
  boundary: { direction: Direction, focusedId: string | null }
  layerChange: { activeLayer: string, previousLayer: string }
}

export type EventName = keyof NavigationEvents

export interface NavigationOptions {
  adapter?: NavigationAdapter
  /** Focus the first reachable element automatically when nothing is focused. Defaults to `true`. */
  autoFocus?: boolean
}
