import type { Action, Navigation } from '@arxis/gtvzone-core'

export type Platform = 'tizen' | 'webos' | 'hisense' | 'browser'

/** keyCode → action. */
export type KeyMap = Record<number, Action>

const baseKeys: KeyMap = { 37: 'left', 38: 'up', 39: 'right', 40: 'down', 13: 'enter' }

export const keyMaps: Record<Platform, KeyMap> = {
  tizen: { ...baseKeys, 10009: 'back' },
  webos: { ...baseKeys, 461: 'back' },
  hisense: { ...baseKeys, 8: 'back' },
  browser: { ...baseKeys, 27: 'back', 8: 'back' }
}

/** Keys reported only through `KeyboardEvent.key` by some emulators and desktop browsers. */
const keyNames: Record<string, Action> = {
  ArrowLeft: 'left', ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', Enter: 'enter'
}

export function detectPlatform (userAgent: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''): Platform {
  if (/Tizen/i.test(userAgent)) return 'tizen'
  if (/Web0S|webOS|NetCast/i.test(userAgent)) return 'webos'
  if (/VIDAA|Hisense/i.test(userAgent)) return 'hisense'
  return 'browser'
}

export interface BindKeysOptions {
  /** Defaults to the key map of the detected platform. */
  keyMap?: KeyMap
  /** Defaults to `window`. */
  target?: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>
  /** Prevent the browser default (e.g. page scroll) for mapped keys. Defaults to `true`. */
  preventDefault?: boolean
}

const isArrow = (action: Action) => action !== 'enter' && action !== 'back'

/** Translates key presses into navigation actions. Returns a function that removes the listener. */
export function bindKeys (nav: Navigation, options: BindKeysOptions = {}): () => void {
  const keyMap = options.keyMap ?? keyMaps[detectPlatform()]
  const target = options.target ?? window
  const preventDefault = options.preventDefault !== false

  const onKeyDown = (event: Event) => {
    const { keyCode, key } = event as KeyboardEvent
    const action = keyMap[keyCode] ?? keyNames[key]
    if (!action) return
    const handled = nav.handleAction(action)
    // Arrows are always swallowed so a boundary never scrolls the page.
    if (preventDefault && (handled || isArrow(action))) event.preventDefault()
  }

  target.addEventListener('keydown', onKeyDown)
  return () => target.removeEventListener('keydown', onKeyDown)
}
