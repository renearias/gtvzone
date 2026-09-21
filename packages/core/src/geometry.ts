import type { Direction, Rect } from './types'

const ORTHOGONAL_WEIGHT = 2

const isHorizontal = (direction: Direction) => direction === 'left' || direction === 'right'

const center = (rect: Rect) => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 })

/** Gap between two 1-D ranges, 0 when they overlap. */
const rangeGap = (startA: number, endA: number, startB: number, endB: number) =>
  Math.max(0, startB - endA, startA - endB)

export function unionRects (rects: Rect[]): Rect | null {
  if (rects.length === 0) return null
  let left = Infinity
  let top = Infinity
  let right = -Infinity
  let bottom = -Infinity
  for (const rect of rects) {
    left = Math.min(left, rect.x)
    top = Math.min(top, rect.y)
    right = Math.max(right, rect.x + rect.width)
    bottom = Math.max(bottom, rect.y + rect.height)
  }
  return { x: left, y: top, width: right - left, height: bottom - top }
}

/** True when `candidate` lies in `direction` from `origin` (judged by centers). */
export function isInDirection (origin: Rect, candidate: Rect, direction: Direction): boolean {
  const from = center(origin)
  const to = center(candidate)
  switch (direction) {
    case 'right': return to.x > from.x
    case 'left': return to.x < from.x
    case 'down': return to.y > from.y
    case 'up': return to.y < from.y
  }
}

/**
 * Lower is better. Distance along the movement axis plus a weighted penalty for being out of
 * line on the other axis, so a slightly farther item in the same row beats a closer one in
 * another row.
 */
export function directionalScore (origin: Rect, candidate: Rect, direction: Direction): number {
  let primary: number
  let orthogonal: number
  if (isHorizontal(direction)) {
    primary = direction === 'right'
      ? candidate.x - (origin.x + origin.width)
      : origin.x - (candidate.x + candidate.width)
    orthogonal = rangeGap(origin.y, origin.y + origin.height, candidate.y, candidate.y + candidate.height)
  } else {
    primary = direction === 'down'
      ? candidate.y - (origin.y + origin.height)
      : origin.y - (candidate.y + candidate.height)
    orthogonal = rangeGap(origin.x, origin.x + origin.width, candidate.x, candidate.x + candidate.width)
  }
  return Math.max(0, primary) + orthogonal * ORTHOGONAL_WEIGHT
}

/** Distance between centers on the axis orthogonal to `direction`, used to break ties. */
export function alignment (origin: Rect, candidate: Rect, direction: Direction): number {
  const from = center(origin)
  const to = center(candidate)
  return isHorizontal(direction) ? Math.abs(to.y - from.y) : Math.abs(to.x - from.x)
}
