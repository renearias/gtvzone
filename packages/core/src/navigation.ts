import { unionRects } from './geometry'
import { resolveStrategy } from './strategies'
import type {
  Action,
  Direction,
  EventName,
  FocusableOptions,
  LayerOptions,
  NavigationAdapter,
  NavigationEvents,
  NavigationOptions,
  NavigationState,
  Rect,
  StrategyContext,
  Unit,
  ZoneOptions
} from './types'

export const DEFAULT_LAYER = 'default'
const ROOT_PREFIX = '@root:'

const rootId = (layer: string) => ROOT_PREFIX + layer
const isRoot = (zoneId: string) => zoneId.indexOf(ROOT_PREFIX) === 0
const layerOfRoot = (zoneId: string) => zoneId.slice(ROOT_PREFIX.length)

interface ElementRecord extends FocusableOptions { seq: number }
interface ZoneRecord extends ZoneOptions { seq: number, lastFocused: string | null }
interface LayerRecord { id: string, priority: number, seq: number }

type Listener = () => void
type EventHandler<E extends EventName> = (payload: NavigationEvents[E]) => void

export interface Navigation {
  register(options: FocusableOptions): () => void
  unregister(id: string): void
  update(id: string, patch: Partial<Omit<FocusableOptions, 'id'>>): void
  registerZone(options: ZoneOptions): () => void
  unregisterZone(id: string): void
  updateZone(id: string, patch: Partial<Omit<ZoneOptions, 'id'>>): void
  openLayer(id: string, options?: LayerOptions): void
  closeLayer(id: string): void
  /** Moves focus in `direction`. Returns `false` when there was nowhere to go. */
  move(direction: Direction): boolean
  /** Triggers `onPress` of the focused element. */
  press(): boolean
  back(): void
  /** Dispatches an abstract input action. Returns `true` when it was handled. */
  handleAction(action: Action): boolean
  /** Focuses an element, or enters a zone. Returns `false` if the target is not reachable. */
  setFocus(id: string): boolean
  getState(): NavigationState
  getFocusedId(): string | null
  isFocused(id: string): boolean
  subscribe(listener: Listener): () => void
  on<E extends EventName>(event: E, handler: EventHandler<E>): () => void
  destroy(): void
}

const defaultSchedule = (task: () => void) => {
  // queueMicrotask is missing on older TV browsers (Chromium < 71).
  Promise.resolve().then(task)
}

const nullAdapter: NavigationAdapter = { measure: () => null }

export function createNavigation (options: NavigationOptions = {}): Navigation {
  const adapter = options.adapter ?? nullAdapter
  const schedule = adapter.schedule ?? defaultSchedule
  const autoFocus = options.autoFocus !== false

  const elements = new Map<string, ElementRecord>()
  const zones = new Map<string, ZoneRecord>()
  const roots = new Map<string, ZoneRecord>()
  const layers = new Map<string, LayerRecord>([[DEFAULT_LAYER, { id: DEFAULT_LAYER, priority: 0, seq: 0 }]])
  const savedFocus = new Map<string, string>()
  const listeners = new Set<Listener>()
  const handlers = new Map<EventName, Set<EventHandler<any>>>()

  let seq = 0
  // Survives unregister so a re-mount (e.g. React StrictMode) keeps its place in the order.
  const seqById = new Map<string, number>()
  const seqFor = (key: string) => {
    let value = seqById.get(key)
    if (value === undefined) seqById.set(key, value = ++seq)
    return value
  }
  let state: NavigationState = { focusedId: null, activeLayer: DEFAULT_LAYER }
  let focusedChain: string[] = []
  let lostZone: string | null = null
  let repairPending = false
  let rectCache: Map<string, Rect | null> | null = null

  // ---------------------------------------------------------------- state & events

  function setState (patch: Partial<NavigationState>) {
    state = { ...state, ...patch }
    listeners.forEach(listener => listener())
  }

  function emit<E extends EventName> (event: E, payload: NavigationEvents[E]) {
    handlers.get(event)?.forEach(handler => handler(payload))
  }

  // ---------------------------------------------------------------- tree resolution

  const elementZone = (el: FocusableOptions) => el.zone ?? rootId(el.layer ?? DEFAULT_LAYER)
  const zoneParent = (zone: ZoneOptions) => zone.parent ?? rootId(zone.layer ?? DEFAULT_LAYER)

  function getZone (zoneId: string): ZoneRecord | undefined {
    if (!isRoot(zoneId)) return zones.get(zoneId)
    let root = roots.get(zoneId)
    if (!root) {
      root = { id: zoneId, strategy: 'geometry', seq: 0, lastFocused: null }
      roots.set(zoneId, root)
    }
    return root
  }

  /** Zone ids from `zoneId` up to its layer root, or `null` if a link is missing or disabled. */
  function chainOf (zoneId: string): string[] | null {
    const chain: string[] = []
    let current = zoneId
    while (!isRoot(current)) {
      const zone = zones.get(current)
      if (!zone || zone.disabled || chain.indexOf(current) !== -1) return null
      chain.push(current)
      current = zoneParent(zone)
    }
    chain.push(current)
    return chain
  }

  const inActiveLayer = (chain: string[] | null): chain is string[] =>
    !!chain && layerOfRoot(chain[chain.length - 1]) === state.activeLayer

  function isReachableElement (id: string | null): id is string {
    if (id === null) return false
    const el = elements.get(id)
    return !!el && !el.disabled && inActiveLayer(chainOf(elementZone(el)))
  }

  const isReachableZone = (id: string) => zones.has(id) && inActiveLayer(chainOf(id))

  function compareUnits (a: ElementRecord | ZoneRecord, b: ElementRecord | ZoneRecord): number {
    if (a.order !== undefined && b.order !== undefined) return a.order - b.order
    const byAdapter = adapter.compare?.({ id: a.id, node: a.node }, { id: b.id, node: b.node }) ?? 0
    return byAdapter || a.seq - b.seq
  }

  /** Direct, enabled children of a zone, in navigation order. */
  function childrenOf (zoneId: string): Unit[] {
    const records: Array<{ kind: Unit['kind'], record: ElementRecord | ZoneRecord }> = []
    elements.forEach(el => { if (!el.disabled && elementZone(el) === zoneId) records.push({ kind: 'element', record: el }) })
    zones.forEach(zone => { if (!zone.disabled && zoneParent(zone) === zoneId) records.push({ kind: 'zone', record: zone }) })
    return records
      .sort((a, b) => compareUnits(a.record, b.record))
      .map((item, index) => ({ kind: item.kind, id: item.record.id, order: index }))
  }

  // ---------------------------------------------------------------- measuring

  function rectOf (unit: Unit): Rect | null {
    const key = unit.kind + ':' + unit.id
    if (rectCache?.has(key)) return rectCache.get(key)!
    let rect: Rect | null
    if (unit.kind === 'element') {
      rect = adapter.measure(unit.id, elements.get(unit.id)?.node)
    } else {
      rect = adapter.measure(unit.id, zones.get(unit.id)?.node) ??
        unionRects(childrenOf(unit.id).map(rectOf).filter((r): r is Rect => r !== null))
    }
    rectCache?.set(key, rect)
    return rect
  }

  /** Runs `fn` with a per-operation rect cache so each node is measured at most once. */
  function measuring<T> (fn: () => T): T {
    if (rectCache) return fn()
    rectCache = new Map()
    try {
      return fn()
    } finally {
      rectCache = null
    }
  }

  const contextFor = (zone: ZoneRecord): StrategyContext => ({ zone, rect: rectOf })

  // ---------------------------------------------------------------- resolving targets

  /** `originRect` is lazy so moving between plain elements never measures the layout. */
  function resolveUnit (unit: Unit, direction: Direction | null, originRect: () => Rect | null): string | null {
    return unit.kind === 'element' ? unit.id : enterZone(unit.id, direction, originRect())
  }

  /** Finds the element that should receive focus when entering `zoneId`. */
  function enterZone (zoneId: string, direction: Direction | null, originRect: Rect | null): string | null {
    const zone = getZone(zoneId)
    if (!zone) return null
    const units = childrenOf(zoneId)
    if (units.length === 0) return null

    const preferred: Unit[] = []
    const pick = (id: string | null | undefined) => {
      const unit = id ? units.find(u => u.id === id) : undefined
      if (unit) preferred.push(unit)
    }
    if (zone.saveLastFocused !== false) pick(zone.lastFocused)
    pick(zone.firstFocus)

    const candidates = preferred.concat(resolveStrategy(zone.strategy).enter(units, direction, originRect, contextFor(zone)))
    const tried = new Set<string>()
    for (const candidate of candidates) {
      if (tried.has(candidate.id)) continue
      tried.add(candidate.id)
      const target = resolveUnit(candidate, direction, () => originRect)
      if (target) return target
    }
    return null
  }

  function resolveTarget (id: string, direction: Direction | null, originRect: Rect | null): string | null {
    if (isReachableElement(id)) return id
    if (isReachableZone(id)) return enterZone(id, direction, originRect)
    return null
  }

  // ---------------------------------------------------------------- focusing

  function focusElement (id: string) {
    const previousId = state.focusedId
    if (previousId === id) return
    const el = elements.get(id)!
    const chain = chainOf(elementZone(el)) ?? []

    // Remember, for every ancestor, which direct child leads to the new focus.
    let child = id
    for (const zoneId of chain) {
      getZone(zoneId)!.lastFocused = child
      child = zoneId
    }

    const userChain = chain.filter(zoneId => !isRoot(zoneId))
    const left = focusedChain.filter(zoneId => userChain.indexOf(zoneId) === -1)
    const entered = userChain.filter(zoneId => focusedChain.indexOf(zoneId) === -1).reverse()

    if (previousId !== null) {
      elements.get(previousId)?.onBlur?.(previousId)
      emit('blur', { id: previousId, nextId: id })
    }
    left.forEach(zoneId => {
      zones.get(zoneId)?.onLeave?.(zoneId)
      emit('leaveZone', { id: zoneId })
    })

    focusedChain = userChain
    lostZone = null
    setState({ focusedId: id })

    entered.forEach(zoneId => {
      zones.get(zoneId)?.onEnter?.(zoneId)
      emit('enterZone', { id: zoneId })
    })
    el.onFocus?.(id)
    emit('focus', { id, previousId })
  }

  function clearFocus () {
    const previousId = state.focusedId
    if (previousId === null) return
    elements.get(previousId)?.onBlur?.(previousId)
    emit('blur', { id: previousId, nextId: null })
    focusedChain.forEach(zoneId => {
      zones.get(zoneId)?.onLeave?.(zoneId)
      emit('leaveZone', { id: zoneId })
    })
    focusedChain = []
    setState({ focusedId: null })
  }

  /** Makes sure focus sits on a reachable element, moving or clearing it otherwise. */
  function repair () {
    if (isReachableElement(state.focusedId)) return
    measuring(() => {
      const fromLostZone = lostZone && isReachableZone(lostZone) ? enterZone(lostZone, null, null) : null
      const target = fromLostZone ?? (autoFocus ? enterZone(rootId(state.activeLayer), null, null) : null)
      if (target) focusElement(target)
      else clearFocus()
    })
  }

  function scheduleRepair () {
    if (repairPending) return
    repairPending = true
    schedule(() => {
      repairPending = false
      repair()
    })
  }

  // ---------------------------------------------------------------- movement

  function move (direction: Direction): boolean {
    return measuring(() => {
      const focusedId = state.focusedId
      if (!isReachableElement(focusedId)) {
        repair()
        return state.focusedId !== null
      }
      const el = elements.get(focusedId)!
      const elementUnit: Unit = { kind: 'element', id: focusedId, order: 0 }
      const originRect = () => rectOf(elementUnit)

      const jump = (target: string | null): boolean => {
        const id = target === null ? null : resolveTarget(target, direction, originRect())
        if (id) focusElement(id)
        return !!id
      }

      const override = el.nextFocus?.[direction]
      if (override !== undefined) return jump(override) || boundary(direction)

      let origin = elementUnit
      let zoneId = elementZone(el)
      while (true) {
        const zone = getZone(zoneId)!
        const ranked = resolveStrategy(zone.strategy).rank(origin, childrenOf(zoneId), direction, contextFor(zone))
        for (const candidate of ranked) {
          const target = resolveUnit(candidate, direction, originRect)
          if (target) {
            focusElement(target)
            return true
          }
        }
        if (isRoot(zoneId) || zone.trap) return boundary(direction)
        const exit = zone.nextZone?.[direction]
        if (exit !== undefined) return jump(exit) || boundary(direction)
        origin = { kind: 'zone', id: zoneId, order: 0 }
        zoneId = zoneParent(zone)
      }
    })
  }

  function boundary (direction: Direction): false {
    emit('boundary', { direction, focusedId: state.focusedId })
    return false
  }

  // ---------------------------------------------------------------- layers

  function computeActiveLayer (): string {
    let active: LayerRecord | null = null
    layers.forEach(layer => {
      if (!active || layer.priority > active.priority || (layer.priority === active.priority && layer.seq > active.seq)) {
        active = layer
      }
    })
    return (active as LayerRecord | null)?.id ?? DEFAULT_LAYER
  }

  function refreshActiveLayer () {
    const previousLayer = state.activeLayer
    const activeLayer = computeActiveLayer()
    if (activeLayer === previousLayer) return
    if (state.focusedId !== null) savedFocus.set(previousLayer, state.focusedId)
    setState({ activeLayer })
    emit('layerChange', { activeLayer, previousLayer })

    const restore = savedFocus.get(activeLayer)
    savedFocus.delete(activeLayer)
    if (restore && isReachableElement(restore)) focusElement(restore)
    else repair()
  }

  // ---------------------------------------------------------------- public API

  const api: Navigation = {
    register (focusable) {
      elements.set(focusable.id, { ...focusable, seq: seqFor('element:' + focusable.id) })
      scheduleRepair()
      return () => api.unregister(focusable.id)
    },

    unregister (id) {
      const el = elements.get(id)
      if (!el) return
      if (state.focusedId === id) lostZone = elementZone(el)
      elements.delete(id)
      scheduleRepair()
    },

    update (id, patch) {
      const el = elements.get(id)
      if (!el) return
      elements.set(id, { ...el, ...patch })
      scheduleRepair()
    },

    registerZone (zone) {
      const previous = zones.get(zone.id)
      zones.set(zone.id, { ...zone, seq: seqFor('zone:' + zone.id), lastFocused: previous?.lastFocused ?? null })
      scheduleRepair()
      return () => api.unregisterZone(zone.id)
    },

    unregisterZone (id) {
      if (!zones.delete(id)) return
      focusedChain = focusedChain.filter(zoneId => zoneId !== id)
      scheduleRepair()
    },

    updateZone (id, patch) {
      const zone = zones.get(id)
      if (!zone) return
      zones.set(id, { ...zone, ...patch })
      scheduleRepair()
    },

    openLayer (id, layerOptions = {}) {
      const previous = layers.get(id)
      layers.set(id, { id, priority: layerOptions.priority ?? previous?.priority ?? 1, seq: previous?.seq ?? ++seq })
      refreshActiveLayer()
    },

    closeLayer (id) {
      if (id === DEFAULT_LAYER || !layers.delete(id)) return
      savedFocus.delete(id)
      refreshActiveLayer()
    },

    move,

    press () {
      const id = state.focusedId
      if (!isReachableElement(id)) return false
      elements.get(id)!.onPress?.(id)
      emit('press', { id })
      return true
    },

    back () {
      emit('back', { focusedId: state.focusedId })
    },

    handleAction (action) {
      switch (action) {
        case 'enter': return api.press()
        case 'back': api.back(); return true
        default: return api.move(action)
      }
    },

    setFocus (id) {
      const target = measuring(() => resolveTarget(id, null, null))
      if (target) focusElement(target)
      return !!target
    },

    getState: () => state,
    getFocusedId: () => state.focusedId,
    isFocused: id => state.focusedId === id,

    subscribe (listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },

    on (event, handler) {
      let set = handlers.get(event)
      if (!set) handlers.set(event, set = new Set())
      set.add(handler)
      return () => { set!.delete(handler) }
    },

    destroy () {
      elements.clear()
      zones.clear()
      roots.clear()
      listeners.clear()
      handlers.clear()
      savedFocus.clear()
      seqById.clear()
      focusedChain = []
      state = { focusedId: null, activeLayer: DEFAULT_LAYER }
    }
  }

  return api
}
