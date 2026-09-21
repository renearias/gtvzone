import { forwardRef, useCallback, useContext, useEffect, useRef } from 'react'
import type { ElementType, HTMLAttributes } from 'react'
import type { ZoneOptions } from '@arxis/gtvzone-core'
import { LayerContext, useNavigation, ZoneContext } from './context'
import { assignRef, useLatest, useShallowStable, useStableId } from './utils'

type ZoneProps = Omit<ZoneOptions, 'id' | 'parent' | 'layer' | 'node'>

export interface FocusZoneProps extends ZoneProps, Omit<HTMLAttributes<HTMLElement>, keyof ZoneProps | 'id'> {
  /** Zone id, also set as the DOM id. Defaults to a generated id (not rendered). */
  id?: string
  /** Element or component to render. Defaults to `"div"`. */
  as?: ElementType
}

/** Groups focusable children into a zone. Zones nest: the closest `<FocusZone>` is the parent. */
export const FocusZone = forwardRef<HTMLElement, FocusZoneProps>(function FocusZone (props, forwardedRef) {
  const {
    id: idProp, as = 'div', strategy, orientation, columns, wrap, saveLastFocused, firstFocus,
    trap, disabled, order, nextZone, onEnter, onLeave, children, ...rest
  } = props
  const navigation = useNavigation()
  const parent = useContext(ZoneContext)
  const layer = useContext(LayerContext)
  const id = useStableId('gtvzone', idProp)
  const latest = useLatest({ onEnter, onLeave })
  const stableNextZone = useShallowStable(nextZone)
  const nodeRef = useRef<HTMLElement | null>(null)
  const registered = useRef(false)

  const options = { strategy, orientation, columns, wrap, saveLastFocused, firstFocus, trap, disabled, order, nextZone: stableNextZone }
  const latestOptions = useLatest(options)

  useEffect(() => {
    const unregister = navigation.registerZone({
      ...latestOptions.current,
      id,
      parent,
      layer,
      node: nodeRef.current,
      onEnter: zoneId => latest.current.onEnter?.(zoneId),
      onLeave: zoneId => latest.current.onLeave?.(zoneId)
    })
    registered.current = true
    return () => {
      registered.current = false
      unregister()
    }
  }, [navigation, id, parent, layer, latest, latestOptions])

  useEffect(() => {
    if (registered.current) navigation.updateZone(id, latestOptions.current)
  }, [navigation, id, latestOptions, strategy, orientation, columns, wrap, saveLastFocused, firstFocus, trap, disabled, order, stableNextZone])

  const ref = useCallback((node: HTMLElement | null) => {
    nodeRef.current = node
    assignRef(forwardedRef, node)
    if (registered.current) navigation.updateZone(id, { node })
  }, [navigation, id, forwardedRef])

  const Component = as
  return (
    <ZoneContext.Provider value={id}>
      <Component ref={ref} id={idProp} {...rest}>{children}</Component>
    </ZoneContext.Provider>
  )
})
