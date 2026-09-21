import { useEffect, useRef } from 'react'
import type { MutableRefObject, Ref } from 'react'

let idCounter = 0

/** Stable generated id (React 17 has no `useId`). */
export function useStableId (prefix: string, explicit?: string): string {
  const generated = useRef<string | undefined>(undefined)
  if (!generated.current) generated.current = `${prefix}-${++idCounter}`
  return explicit ?? generated.current
}

/** Keeps the latest value in a ref so effects can call fresh callbacks without re-running. */
export function useLatest<T> (value: T): MutableRefObject<T> {
  const ref = useRef(value)
  useEffect(() => { ref.current = value })
  return ref
}

function shallowEqual (a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  return keysA.length === keysB.length &&
    keysA.every(key => Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]))
}

/** Returns the previous reference while the value is shallowly equal, so inline objects don't retrigger effects. */
export function useShallowStable<T> (value: T): T {
  const ref = useRef(value)
  if (!shallowEqual(ref.current, value)) ref.current = value
  return ref.current
}

export function assignRef<T> (ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value)
  else if (ref) (ref as MutableRefObject<T | null>).current = value
}
