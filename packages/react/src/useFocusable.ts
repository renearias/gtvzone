import { useCallback, useContext, useEffect, useRef } from 'react'
import type { FocusableOptions } from '@arxis/gtvzone-core'
import { LayerContext, useIsFocused, useNavigation, ZoneContext } from './context'
import { useLatest, useShallowStable, useStableId } from './utils'

export interface UseFocusableOptions extends Omit<FocusableOptions, 'id' | 'zone' | 'layer' | 'node'> {
  /** Defaults to a generated id. */
  id?: string
}

export interface UseFocusableResult<T extends Element> {
  id: string
  /** Attach to the element so it can be measured. */
  ref: (node: T | null) => void
  focused: boolean
  focus: () => boolean
}

/**
 * Registers an element for remote-control navigation inside the closest `<FocusZone>` /
 * `<FocusLayer>`. The hook never touches the DOM: style the element from `focused`.
 */
export function useFocusable<T extends Element = HTMLElement> (options: UseFocusableOptions = {}): UseFocusableResult<T> {
  const navigation = useNavigation()
  const zone = useContext(ZoneContext)
  const layer = useContext(LayerContext)
  const id = useStableId('gtvzone-item', options.id)
  const latest = useLatest(options)
  const nextFocus = useShallowStable(options.nextFocus)
  const nodeRef = useRef<T | null>(null)
  const registered = useRef(false)
  const { disabled, order } = options

  useEffect(() => {
    const { disabled, order, nextFocus } = latest.current
    const unregister = navigation.register({
      id,
      zone,
      layer,
      node: nodeRef.current,
      disabled,
      order,
      nextFocus,
      onFocus: focusedId => latest.current.onFocus?.(focusedId),
      onBlur: blurredId => latest.current.onBlur?.(blurredId),
      onPress: pressedId => latest.current.onPress?.(pressedId)
    })
    registered.current = true
    return () => {
      registered.current = false
      unregister()
    }
  }, [navigation, id, zone, layer, latest])

  useEffect(() => {
    if (registered.current) navigation.update(id, { disabled, order, nextFocus })
  }, [navigation, id, disabled, order, nextFocus])

  const ref = useCallback((node: T | null) => {
    nodeRef.current = node
    if (registered.current) navigation.update(id, { node })
  }, [navigation, id])

  const focus = useCallback(() => navigation.setFocus(id), [navigation, id])

  return { id, ref, focused: useIsFocused(id), focus }
}
