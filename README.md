<div align="center">

# gtvzone

**Spatial navigation and focus management for Smart TV apps.**
D-pad / remote-control navigation for Samsung Tizen, LG webOS, Hisense VIDAA, HbbTV, Android TV,
Fire TV, Vizio, Huawei, AOC, Movistar+ and any TV web app, with a framework-agnostic core and
bindings for vanilla JS, React and Angular.

[![CI](https://github.com/renearias/gtvzone/actions/workflows/ci.yml/badge.svg)](https://github.com/renearias/gtvzone/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@arxis/gtvzone-core?label=npm&color=cb3837)](https://www.npmjs.com/package/@arxis/gtvzone-core)
[![License](https://img.shields.io/github/license/renearias/gtvzone)](LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-ready-3178c6)
![Zero dependencies](https://img.shields.io/badge/core-zero%20dependencies-2ea44f)

**English** · [Español](README.es.md)

</div>

---

Building an app for a TV means there is no mouse and no touch: users move with the **arrow keys
of a remote control** and press **OK / Enter** and **Back**. gtvzone decides where focus goes
next, remembers where the user was, keeps modals isolated and handles each vendor's key codes, so
you can focus on the UI.

- **Framework-agnostic core**: a tiny state machine with no DOM and no framework, zero dependencies.
- **Thin bindings**: [vanilla JS / DOM](packages/dom), [React](packages/react) (≥ 16.8) and [Angular](packages/angular) (≥ 16.1, signals).
- **Smart TV ready**: remote-control key maps for **Samsung Tizen**, **LG webOS**, **Hisense VIDAA** and desktop browsers, detected automatically, plus configurable keys for **HbbTV**, **Android TV / Google TV**, **Fire TV**, **Vizio**, **Huawei**, **Movistar+** and other web-based TVs. Output compiled for **Chromium 63** (Tizen 5.0) and up.
- **Fast on low-end TVs**: `list` and `grid` zones move without measuring the layout, and each React/Angular element re-renders only when *its* focus changes.
- **Zones, layers and overrides**: nested rows and grids, modals and menus that trap focus, remembered positions, forced or blocked directions.
- **Pluggable strategies**: geometric nearest neighbour, list, grid, or your own.
- **TypeScript first**: typed API, ESM + CJS builds.

## Packages

| Package | Use it for |
|---|---|
| [`@arxis/gtvzone-core`](packages/core) | The engine: registry, zones, strategies, layers and a store with `subscribe`. No DOM, zero dependencies. |
| [`@arxis/gtvzone-dom`](packages/dom) | Browser adapter (measuring, DOM order), per-platform remote keys and a **selector mode** for apps without a framework. |
| [`@arxis/gtvzone-react`](packages/react) | `useFocusable`, `<FocusZone>`, `<FocusLayer>`. React ≥ 16.8. |
| [`@arxis/gtvzone-angular`](packages/angular) | `gtvFocusable` / `gtvZone` / `gtvLayer` directives and a signals-based service. Angular ≥ 16.1. |

## Install

```sh
# Vanilla JS / any framework
npm install @arxis/gtvzone-dom

# React
npm install @arxis/gtvzone-react @arxis/gtvzone-dom

# Angular
npm install @arxis/gtvzone-angular
```

## Quick start

### Vanilla JS (selector mode)

```js
import { bindZone, createDomNavigation } from '@arxis/gtvzone-dom'

const nav = createDomNavigation() // DOM adapter + keys of the detected TV platform

bindZone(nav, '#menu', { item: '.item', strategy: 'list', orientation: 'vertical' })
bindZone(nav, '#content', { item: '.card' })
bindZone(nav, '#row-1', { item: '.card', strategy: 'list' }) // nested inside #content automatically

document.addEventListener('gtvzone:press', e => play(e.target))
```

The focused item gets the `gtv-focused` class. A `MutationObserver` registers and removes items
as the DOM changes. Bind the outer zone first, then the inner ones. See the full example in
[`examples/vanilla`](examples/vanilla/index.html).

### React

```jsx
import { createDomNavigation } from '@arxis/gtvzone-dom'
import { FocusLayer, FocusZone, NavigationProvider, useFocusable } from '@arxis/gtvzone-react'

const nav = createDomNavigation()

function Card ({ item }) {
  const { ref, focused } = useFocusable({ id: item.id, onPress: () => play(item) })
  return <div ref={ref} className={focused ? 'card focused' : 'card'}>{item.title}</div>
}

<NavigationProvider navigation={nav}>
  <FocusZone id="row-1" strategy="list">
    {items.map(item => <Card key={item.id} item={item} />)}
  </FocusZone>
  {open && (
    <FocusLayer id="modal">
      <FocusZone strategy="list" orientation="vertical">…</FocusZone>
    </FocusLayer>
  )}
</NavigationProvider>
```

Hooks use `useSyncExternalStore` (with a shim for React 17): each element re-renders only when
**its own** focus state changes. `FocusZone` forwards `ref`.

### Angular

```ts
bootstrapApplication(AppComponent, { providers: [provideGtvNavigation()] })
```

```html
<div gtvZone="row-1" gtvZoneStrategy="list">
  @for (item of items; track item.id) {
    <div [gtvFocusable]="item.id" (gtvPress)="play(item)" #card="gtvFocusable"
         [class.big]="card.focused()">{{ item.title }}</div>
  }
</div>

<div gtvLayer="modal" [gtvLayerActive]="open">…</div>
```

The key listener runs **outside the Angular zone**. Change detection only runs when focus
actually changes. State is exposed as signals (`focusedId`, `activeLayer`, `isFocused(id)`)
and as the `state$` observable.

## Core concepts

- **Focusable element**: anything that can receive focus, identified by a stable `id` you choose.
- **Zone**: groups elements and other zones. Each zone has a **strategy**:
  - `geometry` (default): nearest neighbour in the pressed direction, measuring rectangles.
  - `list`: a row or a column, by position. **Does not measure the layout** when moving inside the zone.
  - `grid`: rows and columns with `columns`. Does not measure either.
  - A custom strategy: any object with `rank()` and `enter()`.
- Leaving a zone through an edge bubbles the search up to the parent zone. Entering a zone
  prefers the last focused child (`saveLastFocused`), then `firstFocus`, then the one closest to
  where focus came from.
- **Layer**: isolates a set of zones (a modal, a side menu). Only the active layer, the one with
  the highest priority, can be navigated. When it closes, focus goes back to where it was.
- **Overrides**: `nextFocus` per element and `nextZone` per zone force a target or block a
  direction (`null`). `trap` keeps focus from leaving a zone with the arrow keys.

State (`focusedId`, `activeLayer`) lives **only in the core**. Bindings subscribe and render;
they never keep their own copy of the focus.

## Supported TV brands and platforms

gtvzone runs wherever your TV app is a web app (HTML5 + JavaScript) and the remote control sends
key events: Smart TV web runtimes, HbbTV browsers, operator set-top boxes and WebViews inside
native apps. Arrows (`37`–`40`) and Enter (`13`) work everywhere, plus the `KeyboardEvent.key`
names used by emulators. Only the **Back** key changes from one platform to another.

| Brand | Platform | Back key | Setup |
|---|---|---|---|
| **Samsung** | Tizen | `10009` | Built in, auto-detected (`tizen`) |
| **LG** | webOS / NetCast | `461` | Built in, auto-detected (`webos`) |
| **Hisense** | VIDAA | `8` | Built in, auto-detected (`hisense`) |
| Broadcasters on most European TVs | **HbbTV** (red button apps) | `461` (`VK_BACK`) | Add `461` to `keyMap` |
| **Sony, TCL, Philips, AOC, Xiaomi**, Nvidia Shield, Chromecast | **Android TV / Google TV** (WebView) | Received by the native app | Forward it to `nav.back()` |
| **Amazon** | **Fire TV** (WebView) | Received by the native app | Forward it to `nav.back()` |
| **Vizio** | SmartCast (HTML5 apps) | Varies by model | `browser` map, add the code to `keyMap` if needed |
| **Huawei** | Huawei Vision / smart screens and operator set-top boxes (WebView) | Varies by device | `browser` map, add the code to `keyMap` if needed |
| **Movistar+** (Spain) | Living Apps on the Movistar+ set-top box | Varies by device | `browser` map, add the code to `keyMap` if needed |
| Any | Desktop browser / emulator | `Esc`, `Backspace` | Built in (`browser`) |

Map a Back key that is not built in with `keyMap`:

```js
import { createDomNavigation, keyMaps } from '@arxis/gtvzone-dom'

// HbbTV: VK_BACK is 461
const nav = createDomNavigation({ keys: { keyMap: { ...keyMaps.browser, 461: 'back' } } })
```

In **Android TV, Google TV and Fire TV** apps built on a WebView, the Back button reaches the
native app, not the page. Forward it from your Android code (for example with
`webView.evaluateJavascript("gtvBack()", null)`) and call `nav.back()` from that function.

### Browser engines

- `core`, `dom` and `react` are compiled with target `chrome63` (Tizen 5.0). webOS 5 ships
  Chromium 68. No optional chaining or `??` in the output.
- `angular` is published in APF format (ES2022). Your app's Angular CLI downlevels it according
  to its `browserslist`.
- The DOM adapter accepts `getRect` to plug a measuring polyfill on TVs where
  `getBoundingClientRect` is wrong inside transformed containers.

## FAQ

<details>
<summary><b>How do I handle the Back button on Samsung Tizen or LG webOS?</b></summary>

`createDomNavigation()` detects the platform and maps Back (`10009` on Tizen, `461` on webOS).
Listen to it with `nav.on('back', ({ focusedId }) => …)`. If a layer is open, close it there
with `nav.closeLayer(id)` and focus returns to where it was before the layer opened.
</details>

<details>
<summary><b>Does it work in Android TV, Google TV or Fire TV apps with a WebView?</b></summary>

Yes. The WebView delivers the D-pad as arrow keys and the center button as Enter, so navigation
works with the default `browser` key map on Sony, TCL, Philips, AOC, Xiaomi, Nvidia Shield or
Fire TV devices. Back is handled by the native app: forward it to the page and call
`nav.back()` (see [Supported TV brands and platforms](#supported-tv-brands-and-platforms)).
</details>

<details>
<summary><b>Can I use it for HbbTV apps or operator set-top boxes like Movistar+ Living Apps?</b></summary>

Yes, as long as the app is HTML + JavaScript. Map the device's Back key with `keyMap` (`461` on
HbbTV). Some older HbbTV terminals and set-top boxes run engines older than Chromium 63: in that
case, transpile the packages in your app build.
</details>

<details>
<summary><b>How do I build a Netflix-style home with rows of cards?</b></summary>

Use a vertical `list` zone for the page and a horizontal `list` zone per row. With
`saveLastFocused` (on by default) each row remembers its position when you come back to it.
List and grid zones do not measure the layout while moving, which keeps scrolling smooth on
low-end TVs.
</details>

<details>
<summary><b>How do I keep focus inside a modal or a side menu?</b></summary>

Wrap it in a layer: `<FocusLayer>` in React, `gtvLayer` in Angular or `nav.openLayer(id)` in
vanilla JS. Only the active layer is navigable. For a zone that must never lose focus to the
arrow keys, use `trap: true`.
</details>

<details>
<summary><b>Can I use it with Vue, Svelte, Lightning or my own renderer?</b></summary>

Yes. With a DOM-based framework, use `@arxis/gtvzone-dom` (selector mode or `register` /
`registerZone` from your components). For a canvas or WebGL renderer, use
`@arxis/gtvzone-core` directly and pass an adapter whose `measure()` returns your rectangles.
</details>

<details>
<summary><b>Does it work on old TVs?</b></summary>

The output of `core`, `dom` and `react` runs on Chromium 63 (Samsung Tizen 5.0, 2019 models) and
later, which covers LG webOS 5 and later too. For older engines, transpile the packages in your
app build.
</details>

## Migrating from 0.x

0.x was the *Google TV jQuery UI Library* (2010) on jQuery 2. 1.0 is a rewrite:

| 0.x (`gtv.jq`) | 1.0 |
|---|---|
| `KeyBehaviorZone` + `containerSelector` / `navSelectors` | `bindZone(nav, container, { item })` or `registerZone` |
| `useGeometry: true` | `strategy: 'geometry'` (default) |
| rows with `itemRow` | `strategy: 'list'` or `'grid'` |
| `saveRowPosition` | `saveLastFocused` (default `true`) |
| `KeyZoneLayer`, `createLayer` / `setLayer` | `openLayer(id, { priority })` / `closeLayer(id)` |
| `selectionClasses.basic` | `focusedClass` (default `gtv-focused`) |
| `actions.click` | `onPress` / `gtvzone:press` event |
| `setGlobalKeyMapping` | `bindKeys(nav, { keyMap })` |

The 0.x releases remain on npm as `@arxis/gtvzone`.

## Development

```sh
pnpm install
pnpm test        # vitest: core (node), dom/react/angular (jsdom)
pnpm typecheck
pnpm build       # tsup for core/dom/react, ng-packagr for angular
```

Tests run against the sibling packages' sources (`src`), no build needed.

Issues and pull requests are welcome, in English or Spanish.

## License

MIT © renearias
