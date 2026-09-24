import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { useSyncExternalStore } from 'use-sync-external-store/shim'
import type { Navigation, NavigationState } from '@arxis/gtvzone-core'

const NavigationContext = createContext<Navigation | null>(null)
/** Id of the closest enclosing zone. */
export const ZoneContext = createContext<string | undefined>(undefined)
/** Id of the closest enclosing layer. */
export const LayerContext = createContext<string | undefined>(undefined)

export interface NavigationProviderProps {
  navigation: Navigation
  children?: ReactNode
}

export function NavigationProvider ({ navigation, children }: NavigationProviderProps) {
  return <NavigationContext.Provider value={navigation}>{children}</NavigationContext.Provider>
}

export function useNavigation (): Navigation {
  const navigation = useContext(NavigationContext)
  if (!navigation) throw new Error('gtvzone: wrap your app in <NavigationProvider navigation={...}>')
  return navigation
}

/**
 * Subscribes to a slice of the navigation state. Return a primitive from `selector` so the
 * component only re-renders when that slice changes.
 */
export function useNavigationState<T> (selector: (state: NavigationState) => T): T {
  const navigation = useNavigation()
  const getSnapshot = () => selector(navigation.getState())
  return useSyncExternalStore(navigation.subscribe, getSnapshot, getSnapshot)
}

export const useFocusedId = () => useNavigationState(state => state.focusedId)
export const useIsFocused = (id: string) => useNavigationState(state => state.focusedId === id)
export const useActiveLayer = () => useNavigationState(state => state.activeLayer)
