# @arxis/gtvzone-core

[English](https://github.com/renearias/gtvzone/blob/master/packages/core/README.md) · **Español**

**Motor de navegación espacial para apps de Smart TV**, agnóstico al framework: registro de
elementos, zonas con estrategias (`geometry`, `list`, `grid` o una propia), capas con prioridad
para modales y menús, y un store con `subscribe`. No conoce el DOM ni ningún framework: la
geometría llega por un adapter. Sin dependencias.

Úsalo directamente con renderers de canvas/WebGL o para escribir tu propio binding. En el
navegador, usa [`@arxis/gtvzone-dom`](https://github.com/renearias/gtvzone/tree/master/packages/dom), [`@arxis/gtvzone-react`](https://github.com/renearias/gtvzone/tree/master/packages/react)
o [`@arxis/gtvzone-angular`](https://github.com/renearias/gtvzone/tree/master/packages/angular).

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

Documentación completa, compatibilidad con plataformas (Samsung Tizen, LG webOS, Hisense VIDAA, HbbTV, Android TV, Fire TV, Vizio, Huawei, AOC, Movistar+) y
preguntas frecuentes en el [README principal](https://github.com/renearias/gtvzone/blob/master/README.es.md).

## Licencia

[AGPL-3.0-only](https://github.com/renearias/gtvzone/blob/master/LICENSE) © 2026 Rene Arias. Para apps de código cerrado hay una
[licencia comercial](https://github.com/renearias/gtvzone/blob/master/README.es.md#licencia-comercial) disponible.
