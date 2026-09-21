import type { NavigationAdapter, NodeRef, Rect } from '@arxis/gtvzone-core'

export interface DomAdapterOptions {
  /**
   * Measures an element. Override it to plug a polyfill for TV browsers where
   * `getBoundingClientRect` is wrong inside transformed or scrolled containers.
   */
  getRect?: (element: Element) => Rect
  /** Document used to look up elements by id. Defaults to the global `document`. */
  document?: Document
}

const isElement = (node: unknown): node is Element =>
  typeof Element !== 'undefined' && node instanceof Element

const defaultGetRect = (element: Element): Rect => {
  const rect = element.getBoundingClientRect()
  return { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
}

/**
 * Browser adapter: measures registered nodes (or looks them up by id) and orders siblings
 * by document position. Elements with no size (e.g. `display: none`) are not measurable.
 */
export function createDomAdapter (options: DomAdapterOptions = {}): NavigationAdapter {
  const getRect = options.getRect ?? defaultGetRect

  const resolve = ({ id, node }: NodeRef): Element | null => {
    if (isElement(node)) return node
    const doc = options.document ?? (typeof document !== 'undefined' ? document : undefined)
    return doc?.getElementById(id) ?? null
  }

  return {
    measure (id, node) {
      const element = resolve({ id, node })
      if (!element) return null
      const rect = getRect(element)
      return rect.width === 0 && rect.height === 0 ? null : rect
    },
    compare (a, b) {
      const first = resolve(a)
      const second = resolve(b)
      if (!first || !second || first === second) return 0
      const position = first.compareDocumentPosition(second)
      if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1
      if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1
      return 0
    }
  }
}
