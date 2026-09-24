import { alignment, directionalScore, isInDirection } from './geometry'
import type { BuiltInStrategy, Direction, Rect, Strategy, StrategyContext, Unit } from './types'

const byOrder = (a: Unit, b: Unit) => a.order - b.order

interface Measured { unit: Unit, rect: Rect }

function measureAll (units: Unit[], ctx: StrategyContext): { measured: Measured[], unmeasured: Unit[] } {
  const measured: Measured[] = []
  const unmeasured: Unit[] = []
  for (const unit of units) {
    const rect = ctx.rect(unit)
    if (rect) measured.push({ unit, rect })
    else unmeasured.push(unit)
  }
  return { measured, unmeasured }
}

function sortByDirection (origin: Rect, items: Measured[], direction: Direction): Unit[] {
  return items
    .map(item => ({
      unit: item.unit,
      score: directionalScore(origin, item.rect, direction),
      tie: alignment(origin, item.rect, direction)
    }))
    .sort((a, b) => a.score - b.score || a.tie - b.tie)
    .map(item => item.unit)
}

const readingOrder = (a: Measured, b: Measured) => a.rect.y - b.rect.y || a.rect.x - b.rect.x

/** Picks the closest unit in the pressed direction using measured rects. */
export const geometryStrategy: Strategy = {
  rank (origin, units, direction, ctx) {
    const originRect = ctx.rect(origin)
    if (!originRect) return []
    const { measured } = measureAll(units.filter(unit => unit.id !== origin.id), ctx)
    const ahead = measured.filter(item => isInDirection(originRect, item.rect, direction))
    return sortByDirection(originRect, ahead, direction)
  },
  enter (units, direction, originRect, ctx) {
    const { measured, unmeasured } = measureAll(units, ctx)
    const sorted = originRect && direction
      ? sortByDirection(originRect, measured, direction)
      : measured.sort(readingOrder).map(item => item.unit)
    return sorted.concat(unmeasured.sort(byOrder))
  }
}

/** Walks from `index` in `step` increments, optionally continuing from the other end. */
function walk (units: Unit[], index: number, step: 1 | -1, wrap: boolean): Unit[] {
  const result: Unit[] = []
  for (let i = index + step; i >= 0 && i < units.length; i += step) result.push(units[i])
  if (wrap) {
    const start = step === 1 ? 0 : units.length - 1
    for (let i = start; i !== index; i += step) result.push(units[i])
  }
  return result
}

/** Moves by position in a single row or column. Never measures the layout. */
export const listStrategy: Strategy = {
  rank (origin, units, direction, ctx) {
    const sorted = units.slice().sort(byOrder)
    const index = sorted.findIndex(unit => unit.id === origin.id)
    const horizontal = (ctx.zone.orientation ?? 'horizontal') === 'horizontal'
    const forward = horizontal ? 'right' : 'down'
    const backward = horizontal ? 'left' : 'up'
    if (index === -1 || (direction !== forward && direction !== backward)) return []
    return walk(sorted, index, direction === forward ? 1 : -1, !!ctx.zone.wrap)
  },
  enter (units, direction, originRect, ctx) {
    const horizontal = (ctx.zone.orientation ?? 'horizontal') === 'horizontal'
    const alongAxis = direction === null || (direction === 'left' || direction === 'right') === horizontal
    // Coming from the side (e.g. from the row above): land on the aligned item.
    if (!alongAxis && originRect) return geometryStrategy.enter(units, direction, originRect, ctx)
    const sorted = units.slice().sort(byOrder)
    return direction === (horizontal ? 'left' : 'up') ? sorted.reverse() : sorted
  }
}

/** Moves by row/column index in a grid with `zone.columns` columns. Never measures inside the zone. */
export const gridStrategy: Strategy = {
  rank (origin, units, direction, ctx) {
    const sorted = units.slice().sort(byOrder)
    const index = sorted.findIndex(unit => unit.id === origin.id)
    if (index === -1) return []
    const columns = Math.max(1, ctx.zone.columns ?? sorted.length)
    const wrap = !!ctx.zone.wrap

    if (direction === 'left' || direction === 'right') {
      const rowStart = index - (index % columns)
      const row = sorted.slice(rowStart, rowStart + columns)
      return walk(row, index - rowStart, direction === 'right' ? 1 : -1, wrap)
    }

    const column = index % columns
    const columnUnits = sorted.filter((_, i) => i % columns === column)
    const result = walk(columnUnits, Math.floor(index / columns), direction === 'down' ? 1 : -1, wrap)
    // The last row may be shorter: moving down into it lands on its last item.
    const lastRowStart = Math.floor((sorted.length - 1) / columns) * columns
    if (direction === 'down' && result.length === 0 && index < lastRowStart) {
      result.push(sorted[sorted.length - 1])
    }
    return result
  },
  enter (units, direction, originRect, ctx) {
    return originRect ? geometryStrategy.enter(units, direction, originRect, ctx) : units.slice().sort(byOrder)
  }
}

const builtIn: Record<BuiltInStrategy, Strategy> = {
  geometry: geometryStrategy,
  list: listStrategy,
  grid: gridStrategy
}

export function resolveStrategy (strategy: BuiltInStrategy | Strategy | undefined): Strategy {
  if (!strategy) return geometryStrategy
  return typeof strategy === 'string' ? builtIn[strategy] : strategy
}
