import { createNavigation } from '@arxis/gtvzone-core'
import type { Navigation, NavigationOptions } from '@arxis/gtvzone-core'
import { createDomAdapter } from './adapter'
import type { DomAdapterOptions } from './adapter'
import { bindKeys } from './keys'
import type { BindKeysOptions } from './keys'

export { createDomAdapter } from './adapter'
export type { DomAdapterOptions } from './adapter'
export { bindKeys, detectPlatform, keyMaps } from './keys'
export type { BindKeysOptions, KeyMap, Platform } from './keys'
export { bindZone } from './zone'
export type { BindZoneOptions, ZoneBinding } from './zone'

export interface DomNavigationOptions extends Omit<NavigationOptions, 'adapter'> {
  adapter?: DomAdapterOptions
  /** Key binding options, or `false` to wire input yourself. */
  keys?: BindKeysOptions | false
}

/** Navigation instance wired to the browser: DOM adapter plus remote-control keys. */
export function createDomNavigation (options: DomNavigationOptions = {}): Navigation {
  const { adapter, keys, ...navigationOptions } = options
  const nav = createNavigation({ ...navigationOptions, adapter: createDomAdapter(adapter) })
  const unbindKeys = keys === false ? undefined : bindKeys(nav, keys)
  const destroy = nav.destroy
  nav.destroy = () => {
    unbindKeys?.()
    destroy()
  }
  return nav
}
