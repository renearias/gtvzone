# @arxis/gtvzone-dom

Conecta `@arxis/gtvzone-core` con el navegador:

- `createDomAdapter()`: mide con `getBoundingClientRect` (o tu polyfill vía `getRect`) y ordena por posición en el DOM.
- `bindKeys(nav)` / `keyMaps` / `detectPlatform()`: teclas del control remoto para Tizen, webOS, VIDAA y navegador.
- `bindZone(nav, container, { item })`: modo selectores para apps sin framework, con `MutationObserver`.
- `createDomNavigation()`: todo lo anterior en una llamada.

```js
import { bindZone, createDomNavigation } from '@arxis/gtvzone-dom'

const nav = createDomNavigation()
bindZone(nav, '#row', { item: '.card', strategy: 'list' })
```

Documentación completa en el [README del repo](https://github.com/renearias/gtvzone#readme).
