# @arxis/gtvzone-dom

**English** · [Español](https://github.com/renearias/gtvzone/blob/master/packages/dom/README.es.md)

**Remote-control (D-pad) navigation for Smart TV web apps, with or without a framework.** Connects
[`@arxis/gtvzone-core`](https://github.com/renearias/gtvzone/tree/master/packages/core) to the browser:

- `createDomAdapter()`: measures with `getBoundingClientRect` (or your polyfill via `getRect`) and orders by DOM position.
- `bindKeys(nav)` / `keyMaps` / `detectPlatform()`: remote-control keys for Samsung Tizen, LG webOS, Hisense VIDAA and desktop browsers.
- `bindZone(nav, container, { item })`: selector mode for apps without a framework, kept in sync with a `MutationObserver`.
- `createDomNavigation()`: all of the above in one call.

Works on Samsung, LG, Hisense, HbbTV, Android TV / Google TV and Fire TV WebViews, Vizio, Huawei,
AOC and Movistar+ web apps: map any other Back key with `keyMap`.

```sh
npm install @arxis/gtvzone-dom
```

```js
import { bindZone, createDomNavigation } from '@arxis/gtvzone-dom'

const nav = createDomNavigation()
bindZone(nav, '#row', { item: '.card', strategy: 'list' })
document.addEventListener('gtvzone:press', e => play(e.target))
```

The focused item gets the `gtv-focused` class. Full documentation and FAQ in the
[main README](https://github.com/renearias/gtvzone#readme).
