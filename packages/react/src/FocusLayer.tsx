import { useEffect } from 'react'
import type { ReactNode } from 'react'
import type { LayerOptions } from '@arxis/gtvzone-core'
import { LayerContext, useNavigation } from './context'

/** Opens `id` as the active layer while `active` is true; focus returns where it was when it closes. */
export function useFocusLayer (id: string, active = true, options: LayerOptions = {}) {
  const navigation = useNavigation()
  const { priority } = options
  useEffect(() => {
    if (!active) return
    navigation.openLayer(id, { priority })
    return () => navigation.closeLayer(id)
  }, [navigation, id, active, priority])
}

export interface FocusLayerProps extends LayerOptions {
  id: string
  active?: boolean
  children?: ReactNode
}

/** Isolates its children (e.g. a modal): arrows cannot reach other layers while it is open. */
export function FocusLayer ({ id, active = true, priority, children }: FocusLayerProps) {
  useFocusLayer(id, active, { priority })
  return <LayerContext.Provider value={id}>{children}</LayerContext.Provider>
}
