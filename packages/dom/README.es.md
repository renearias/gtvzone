# @arxis/gtvzone-dom

[English](https://github.com/renearias/gtvzone/blob/master/packages/dom/README.md) · **Español**

**Navegación con control remoto (D-pad) para apps web de Smart TV, con o sin framework.** Conecta
[`@arxis/gtvzone-core`](https://github.com/renearias/gtvzone/tree/master/packages/core) con el navegador:

- `createDomAdapter()`: mide con `getBoundingClientRect` (o tu polyfill vía `getRect`) y ordena por posición en el DOM.
- `bindKeys(nav)` / `keyMaps` / `detectPlatform()`: teclas del control remoto para Samsung Tizen, LG webOS, Hisense VIDAA y navegadores de escritorio.
- `bindZone(nav, container, { item })`: modo selectores para apps sin framework, sincronizado con un `MutationObserver`.
- `createDomNavigation()`: todo lo anterior en una llamada.

Funciona en apps web para Samsung, LG, Hisense, HbbTV, WebViews de Android TV / Google TV y Fire TV,
Vizio, Huawei, AOC y Movistar+: cualquier otra tecla Atrás se mapea con `keyMap`.

```sh
npm install @arxis/gtvzone-dom
```

```js
import { bindZone, createDomNavigation } from '@arxis/gtvzone-dom'

const nav = createDomNavigation()
bindZone(nav, '#row', { item: '.card', strategy: 'list' })
document.addEventListener('gtvzone:press', e => play(e.target))
```

El ítem enfocado recibe la clase `gtv-focused`. Documentación completa y preguntas frecuentes en
el [README principal](https://github.com/renearias/gtvzone/blob/master/README.es.md).
