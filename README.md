# gtvzone

Navegación espacial con control remoto para apps de Smart TV (Tizen, webOS, VIDAA, HbbTV).
Un **core sin DOM ni framework** decide a dónde va el foco; **bindings finos** lo conectan con
el navegador, React o Angular.

| Paquete | Para qué |
|---|---|
| [`@arxis/gtvzone-core`](packages/core) | Motor: registro, zonas, estrategias, capas y store con `subscribe`. Cero dependencias. |
| [`@arxis/gtvzone-dom`](packages/dom) | Adapter de navegador (medición, orden del DOM), teclas por plataforma y **modo selectores** para apps sin framework. |
| [`@arxis/gtvzone-react`](packages/react) | `useFocusable`, `<FocusZone>`, `<FocusLayer>`. React ≥ 16.8. |
| [`@arxis/gtvzone-angular`](packages/angular) | Directivas `gtvFocusable` / `gtvZone` / `gtvLayer` y servicio con signals. Angular ≥ 16.1. |

## Conceptos

- **Elemento enfocable:** algo que puede recibir el foco. Se identifica con un `id` estable elegido por vos.
- **Zona:** agrupa elementos y otras zonas. Cada zona tiene una **estrategia**:
  - `geometry` (default): el vecino más cercano en la dirección, midiendo rectángulos.
  - `list`: fila o columna por posición. **No mide el layout** al moverse dentro de la zona.
  - `grid`: filas y columnas con `columns`. Tampoco mide al moverse dentro.
  - Una estrategia propia: cualquier objeto con `rank()` y `enter()`.
- Al salir de una zona por un borde, la búsqueda sube a la zona padre. Al entrar a una zona se
  prioriza el último elemento enfocado (`saveLastFocused`), después `firstFocus`, después el más
  cercano al origen.
- **Capa:** aísla un conjunto de zonas (un modal, un menú). Solo la capa activa, la de mayor
  prioridad, es navegable. Al cerrarla, el foco vuelve a donde estaba.
- **Overrides:** `nextFocus` por elemento y `nextZone` por zona fuerzan un destino o bloquean
  una dirección (`null`). `trap` impide salir de una zona con las flechas.

El estado (`focusedId`, `activeLayer`) vive **solo en el core**. Los bindings se suscriben y
pintan; nunca guardan una copia propia del foco.

## Uso

### Sin framework (modo selectores)

```js
import { bindZone, createDomNavigation } from '@arxis/gtvzone-dom'

const nav = createDomNavigation() // adapter DOM + teclas de la plataforma detectada

bindZone(nav, '#menu', { item: '.item', strategy: 'list', orientation: 'vertical' })
bindZone(nav, '#content', { item: '.card' })
bindZone(nav, '#row-1', { item: '.card', strategy: 'list' }) // se anida en #content solo

document.addEventListener('gtvzone:press', e => play(e.target))
```

El ítem enfocado recibe la clase `gtv-focused`. Un `MutationObserver` registra y da de baja
los ítems cuando cambia el DOM. Enlazá primero la zona contenedora y después las internas.
Hay un ejemplo completo en [`examples/vanilla`](examples/vanilla/index.html).

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

Los hooks usan `useSyncExternalStore` (con shim para React 17): cada elemento se vuelve a
renderizar solo cuando cambia **su** estado de foco. `FocusZone` reenvía `ref`.

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

El listener de teclas corre **fuera de la zona de Angular**. Solo se entra a la zona (y corre
la detección de cambios) cuando el foco cambia de verdad. El estado está disponible como signals
(`focusedId`, `activeLayer`, `isFocused(id)`) y como `state$`.

## Compatibilidad con TVs

- `core`, `dom` y `react` se compilan con target `chrome63`, el de Tizen 5.0. webOS 5 trae
  Chromium 68. Sin optional chaining ni `??` en la salida.
- `angular` se publica en formato APF (ES2022). La CLI de Angular de la app lo baja según su
  `browserslist`.
- El adapter DOM acepta `getRect` para enchufar un polyfill de medición en TVs donde
  `getBoundingClientRect` falla dentro de contenedores transformados.
- Mapas de teclas incluidos: `tizen` (Back 10009), `webos` (461), `hisense` (8) y `browser`
  (Esc/Backspace). Se detectan por user agent y se pueden reemplazar con `keyMap`.

## Migración desde 0.x

La 0.x era el *Google TV jQuery UI Library* (2010) con jQuery 2. La 1.0 es una reescritura:

| 0.x (`gtv.jq`) | 1.0 |
|---|---|
| `KeyBehaviorZone` + `containerSelector` / `navSelectors` | `bindZone(nav, container, { item })` o `registerZone` |
| `useGeometry: true` | `strategy: 'geometry'` (default) |
| filas con `itemRow` | `strategy: 'list'` o `'grid'` |
| `saveRowPosition` | `saveLastFocused` (default `true`) |
| `KeyZoneLayer`, `createLayer` / `setLayer` | `openLayer(id, { priority })` / `closeLayer(id)` |
| `selectionClasses.basic` | `focusedClass` (default `gtv-focused`) |
| `actions.click` | `onPress` / evento `gtvzone:press` |
| `setGlobalKeyMapping` | `bindKeys(nav, { keyMap })` |

Las versiones 0.x siguen disponibles en npm como `@arxis/gtvzone`.

## Desarrollo

```sh
pnpm install
pnpm test        # vitest: core (node), dom/react/angular (jsdom)
pnpm typecheck
pnpm build       # tsup para core/dom/react, ng-packagr para angular
```

Los tests corren contra los fuentes (`src`) de los paquetes hermanos, sin build previo.

## Licencia

MIT © renearias
