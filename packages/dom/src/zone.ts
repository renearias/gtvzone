import type { Navigation, ZoneOptions } from '@arxis/gtvzone-core'

const ZONE_ATTRIBUTE = 'data-gtvzone'
// Marks which zone owns an item, so a parent zone never unregisters items a nested zone claimed.
const OWNER_ATTRIBUTE = 'data-gtvzone-item'
const PRESS_EVENT = 'gtvzone:press'

let idCounter = 0
const nextId = (prefix: string) => `${prefix}-${++idCounter}`

export interface BindZoneOptions extends Omit<ZoneOptions, 'id' | 'node'> {
  /** Zone id. Defaults to the container id, or a generated one. */
  id?: string
  /** Selector of the focusable items inside the container. */
  item: string
  /** Class toggled on the focused item. Defaults to `"gtv-focused"`. */
  focusedClass?: string
  /** Also move the browser focus (useful for screen readers). Defaults to `false`. */
  nativeFocus?: boolean
  onPress?: (element: Element) => void
}

export interface ZoneBinding {
  id: string
  /** Re-scans the container. Mutations are picked up automatically; call it after changes the observer cannot see. */
  refresh(): void
  destroy(): void
}

const isDisabled = (element: Element) =>
  element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true'

/**
 * Selector mode for apps without a framework: turns a container into a zone and keeps its
 * items registered as the DOM changes. Nested bound containers become child zones.
 */
export function bindZone (nav: Navigation, container: Element | string, options: BindZoneOptions): ZoneBinding {
  const root = typeof container === 'string' ? document.querySelector(container) : container
  if (!root) throw new Error(`gtvzone: container not found: ${String(container)}`)

  const { item, focusedClass = 'gtv-focused', nativeFocus = false, onPress, id, ...zoneOptions } = options
  if (!root.id) root.id = id ?? nextId('gtvzone')
  const zoneId = id ?? root.id
  root.setAttribute(ZONE_ATTRIBUTE, zoneId)

  const parentZone = root.parentElement?.closest(`[${ZONE_ATTRIBUTE}]`)?.getAttribute(ZONE_ATTRIBUTE) ?? undefined
  nav.registerZone({ parent: parentZone, ...zoneOptions, id: zoneId, node: root })

  const registered = new Map<Element, string>()

  const ownItems = () => Array.prototype.filter.call(
    root.querySelectorAll(item),
    (element: Element) => element.parentElement?.closest(`[${ZONE_ATTRIBUTE}]`) === root
  ) as Element[]

  function registerItem (element: Element) {
    if (!element.id) element.id = nextId('gtvzone-item')
    const itemId = element.id
    registered.set(element, itemId)
    element.setAttribute(OWNER_ATTRIBUTE, zoneId)
    nav.register({
      id: itemId,
      zone: zoneId,
      node: element,
      disabled: isDisabled(element),
      onFocus: () => {
        element.classList.add(focusedClass)
        if (nativeFocus && element instanceof HTMLElement) element.focus()
      },
      onBlur: () => element.classList.remove(focusedClass),
      onPress: () => {
        element.dispatchEvent(new CustomEvent(PRESS_EVENT, { bubbles: true, detail: { id: itemId } }))
        onPress?.(element)
      }
    })
  }

  function release (element: Element, itemId: string) {
    registered.delete(element)
    if (element.getAttribute(OWNER_ATTRIBUTE) !== zoneId) return
    element.removeAttribute(OWNER_ATTRIBUTE)
    element.classList.remove(focusedClass)
    nav.unregister(itemId)
  }

  function refresh () {
    const current = ownItems()
    registered.forEach((itemId, element) => {
      if (current.indexOf(element) === -1) release(element, itemId)
    })
    current.forEach(element => {
      const itemId = registered.get(element)
      if (itemId === undefined) registerItem(element)
      else nav.update(itemId, { disabled: isDisabled(element) })
    })
  }

  refresh()
  const observer = new MutationObserver(refresh)
  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['disabled', 'aria-disabled', ZONE_ATTRIBUTE]
  })

  return {
    id: zoneId,
    refresh,
    destroy () {
      observer.disconnect()
      registered.forEach((itemId, element) => release(element, itemId))
      nav.unregisterZone(zoneId)
      root.removeAttribute(ZONE_ATTRIBUTE)
    }
  }
}
