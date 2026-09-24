# @arxis/gtvzone-core

**English** · [Español](https://github.com/renearias/gtvzone/blob/master/packages/core/README.es.md)

Framework-agnostic **spatial navigation engine for Smart TV apps**: element registry, zones with
strategies (`geometry`, `list`, `grid` or your own), prioritized layers for modals and menus,
and a store with `subscribe`. It knows nothing about the DOM or any framework: geometry comes
from an adapter. Zero dependencies.

Use it directly for canvas/WebGL renderers or to write your own binding. In the browser, use
[`@arxis/gtvzone-dom`](https://github.com/renearias/gtvzone/tree/master/packages/dom), [`@arxis/gtvzone-react`](https://github.com/renearias/gtvzone/tree/master/packages/react)
or [`@arxis/gtvzone-angular`](https://github.com/renearias/gtvzone/tree/master/packages/angular).

```sh
npm install @arxis/gtvzone-core
```

```js
import { createNavigation } from '@arxis/gtvzone-core'

const nav = createNavigation({ adapter: { measure: (id, node) => rectOf(node) } })
nav.registerZone({ id: 'row', strategy: 'list' })
nav.register({ id: 'a', zone: 'row', onPress: play })
nav.move('right')
nav.subscribe(() => render(nav.getState().focusedId))
nav.on('back', ({ focusedId }) => goBack())
```

Full documentation, platform support (Samsung Tizen, LG webOS, Hisense VIDAA, HbbTV, Android TV, Fire TV, Vizio, Huawei, AOC, Movistar+) and FAQ in the
[main README](https://github.com/renearias/gtvzone#readme).
