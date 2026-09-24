# @arxis/gtvzone-core

Motor de navegación espacial para Smart TV: registro de elementos, zonas con estrategias
(`geometry`, `list`, `grid` o una propia), capas con prioridad y un store con `subscribe`.
No conoce el DOM ni ningún framework: la geometría llega por un adapter.

```js
import { createNavigation } from '@arxis/gtvzone-core'

const nav = createNavigation({ adapter: { measure: (id, node) => rectOf(node) } })
nav.registerZone({ id: 'row', strategy: 'list' })
nav.register({ id: 'a', zone: 'row', onPress: play })
nav.move('right')
nav.subscribe(() => render(nav.getState().focusedId))
```

En el navegador usá [`@arxis/gtvzone-dom`](../dom). Documentación completa en el
[README del repo](https://github.com/renearias/gtvzone#readme).
