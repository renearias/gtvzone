<div align="center">

# gtvzone

**Navegación espacial y manejo del foco para apps de Smart TV.**
Navegación con el control remoto (flechas / D-pad) para Samsung Tizen, LG webOS, Hisense VIDAA,
HbbTV, Android TV, Fire TV, Vizio, Huawei, AOC, Movistar+ y cualquier app web de TV, con un core
agnóstico al framework y bindings para JavaScript, React y Angular.

[![CI](https://github.com/renearias/gtvzone/actions/workflows/ci.yml/badge.svg)](https://github.com/renearias/gtvzone/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@arxis/gtvzone-core?label=npm&color=cb3837)](https://www.npmjs.com/package/@arxis/gtvzone-core)
[![Licencia](https://img.shields.io/github/license/renearias/gtvzone?label=licencia)](LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-listo-3178c6)
![Sin dependencias](https://img.shields.io/badge/core-sin%20dependencias-2ea44f)

[English](README.md) · **Español**

</div>

---

En una app para televisor no hay mouse ni pantalla táctil: el usuario se mueve con las **flechas
del control remoto** y presiona **OK / Enter** y **Atrás**. gtvzone decide a dónde va el foco,
recuerda dónde estaba el usuario, aísla los modales y traduce los códigos de tecla de cada
fabricante, para que te concentres en la interfaz.

- **Core agnóstico**: una máquina de estados pequeña, sin DOM ni framework y sin dependencias.
- **Bindings finos**: [JavaScript sin framework / DOM](packages/dom), [React](packages/react) (≥ 16.8) y [Angular](packages/angular) (≥ 16.1, signals).
- **Listo para Smart TV**: mapas de teclas del control remoto para **Samsung Tizen**, **LG webOS**, **Hisense VIDAA** y navegadores de escritorio, con detección automática, y teclas configurables para **HbbTV**, **Android TV / Google TV**, **Fire TV**, **Vizio**, **Huawei**, **Movistar+** y otros televisores basados en web. Compilado para **Chromium 63** (Tizen 5.0) en adelante.
- **Rápido en TVs de gama baja**: las zonas `list` y `grid` se mueven sin medir el layout, y cada elemento de React/Angular se vuelve a renderizar solo cuando cambia *su* foco.
- **Zonas, capas y overrides**: filas y grillas anidadas, modales y menús que retienen el foco, posiciones recordadas, direcciones forzadas o bloqueadas.
- **Estrategias intercambiables**: vecino geométrico más cercano, lista, grilla o una propia.
- **Pensado para TypeScript**: API tipada, builds ESM + CJS.

## Paquetes

| Paquete | Para qué |
|---|---|
| [`@arxis/gtvzone-core`](packages/core) | El motor: registro, zonas, estrategias, capas y store con `subscribe`. Sin DOM, sin dependencias. |
| [`@arxis/gtvzone-dom`](packages/dom) | Adapter de navegador (medición, orden del DOM), teclas del control por plataforma y **modo selectores** para apps sin framework. |
| [`@arxis/gtvzone-react`](packages/react) | `useFocusable`, `<FocusZone>`, `<FocusLayer>`. React ≥ 16.8. |
| [`@arxis/gtvzone-angular`](packages/angular) | Directivas `gtvFocusable` / `gtvZone` / `gtvLayer` y servicio con signals. Angular ≥ 16.1. |

## Instalación

```sh
# JavaScript sin framework / cualquier framework
npm install @arxis/gtvzone-dom

# React
npm install @arxis/gtvzone-react @arxis/gtvzone-dom

# Angular
npm install @arxis/gtvzone-angular
```

## Inicio rápido

### Sin framework (modo selectores)

```js
import { bindZone, createDomNavigation } from '@arxis/gtvzone-dom'

const nav = createDomNavigation() // adapter DOM + teclas de la plataforma de TV detectada

bindZone(nav, '#menu', { item: '.item', strategy: 'list', orientation: 'vertical' })
bindZone(nav, '#content', { item: '.card' })
bindZone(nav, '#row-1', { item: '.card', strategy: 'list' }) // se anida dentro de #content automáticamente

document.addEventListener('gtvzone:press', e => play(e.target))
```

El ítem enfocado recibe la clase `gtv-focused`. Un `MutationObserver` registra y da de baja los
ítems cuando cambia el DOM. Enlaza primero la zona contenedora y después las internas. Hay un
ejemplo completo en [`examples/vanilla`](examples/vanilla/index.html).

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
renderizar solo cuando cambia **su propio** estado de foco. `FocusZone` reenvía `ref`.

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

El listener de teclas corre **fuera de la zona de Angular**. Solo se entra a la zona (y corre la
detección de cambios) cuando el foco cambia de verdad. El estado está disponible como signals
(`focusedId`, `activeLayer`, `isFocused(id)`) y como el observable `state$`.

## Conceptos

- **Elemento enfocable**: algo que puede recibir el foco. Se identifica con un `id` estable que eliges tú.
- **Zona**: agrupa elementos y otras zonas. Cada zona tiene una **estrategia**:
  - `geometry` (default): el vecino más cercano en la dirección presionada, midiendo rectángulos.
  - `list`: una fila o una columna, por posición. **No mide el layout** al moverse dentro de la zona.
  - `grid`: filas y columnas con `columns`. Tampoco mide.
  - Una estrategia propia: cualquier objeto con `rank()` y `enter()`.
- Al salir de una zona por un borde, la búsqueda sube a la zona padre. Al entrar a una zona se
  prioriza el último elemento enfocado (`saveLastFocused`), después `firstFocus`, después el más
  cercano al lugar de donde venía el foco.
- **Capa**: aísla un conjunto de zonas (un modal, un menú lateral). Solo la capa activa, la de
  mayor prioridad, es navegable. Al cerrarla, el foco vuelve a donde estaba.
- **Overrides**: `nextFocus` por elemento y `nextZone` por zona fuerzan un destino o bloquean una
  dirección (`null`). `trap` impide salir de una zona con las flechas.

El estado (`focusedId`, `activeLayer`) vive **solo en el core**. Los bindings se suscriben y
pintan; nunca guardan una copia propia del foco.

## Marcas y plataformas de TV compatibles

gtvzone funciona en cualquier lugar donde tu app de TV sea una app web (HTML5 + JavaScript) y el
control remoto envíe eventos de teclado: entornos web de Smart TV, navegadores HbbTV,
decodificadores de operadores y WebViews dentro de apps nativas. Las flechas (`37`–`40`) y Enter
(`13`) funcionan en todos, además de los nombres de `KeyboardEvent.key` que usan los emuladores.
Lo único que cambia entre plataformas es la tecla **Atrás**.

| Marca | Plataforma | Tecla Atrás | Configuración |
|---|---|---|---|
| **Samsung** | Tizen | `10009` | Integrada, detección automática (`tizen`) |
| **LG** | webOS / NetCast | `461` | Integrada, detección automática (`webos`) |
| **Hisense** | VIDAA | `8` | Integrada, detección automática (`hisense`) |
| Canales de TV en la mayoría de televisores europeos | **HbbTV** (apps del botón rojo) | `461` (`VK_BACK`) | Agrega `461` a `keyMap` |
| **Sony, TCL, Philips, AOC, Xiaomi**, Nvidia Shield, Chromecast | **Android TV / Google TV** (WebView) | La recibe la app nativa | Reenvíala a `nav.back()` |
| **Amazon** | **Fire TV** (WebView) | La recibe la app nativa | Reenvíala a `nav.back()` |
| **Vizio** | SmartCast (apps HTML5) | Depende del modelo | Mapa `browser`, agrega el código a `keyMap` si hace falta |
| **Huawei** | Huawei Vision / smart screens y decodificadores de operadores (WebView) | Depende del equipo | Mapa `browser`, agrega el código a `keyMap` si hace falta |
| **Movistar+** (España) | Living Apps del decodificador Movistar+ | Depende del equipo | Mapa `browser`, agrega el código a `keyMap` si hace falta |
| Cualquiera | Navegador de escritorio / emulador | `Esc`, `Backspace` | Integrada (`browser`) |

Para mapear una tecla Atrás que no viene integrada, usa `keyMap`:

```js
import { createDomNavigation, keyMaps } from '@arxis/gtvzone-dom'

// HbbTV: VK_BACK es 461
const nav = createDomNavigation({ keys: { keyMap: { ...keyMaps.browser, 461: 'back' } } })
```

En las apps de **Android TV, Google TV y Fire TV** hechas con un WebView, el botón Atrás llega a la
app nativa, no a la página. Reenvíalo desde tu código Android (por ejemplo con
`webView.evaluateJavascript("gtvBack()", null)`) y llama a `nav.back()` desde esa función.

### Motores de navegador

- `core`, `dom` y `react` se compilan con target `chrome63` (Tizen 5.0). webOS 5 trae Chromium 68.
  Sin optional chaining ni `??` en la salida.
- `angular` se publica en formato APF (ES2022). La CLI de Angular de tu app lo transpila según su
  `browserslist`.
- El adapter DOM acepta `getRect` para enchufar un polyfill de medición en TVs donde
  `getBoundingClientRect` falla dentro de contenedores transformados.

## Preguntas frecuentes

<details>
<summary><b>¿Cómo manejo el botón Atrás (Back) en Samsung Tizen o LG webOS?</b></summary>

`createDomNavigation()` detecta la plataforma y mapea Atrás (`10009` en Tizen, `461` en webOS).
Escúchalo con `nav.on('back', ({ focusedId }) => …)`. Si hay una capa abierta, ciérrala ahí con
`nav.closeLayer(id)` y el foco vuelve a donde estaba antes de abrirla.
</details>

<details>
<summary><b>¿Funciona en apps de Android TV, Google TV o Fire TV con WebView?</b></summary>

Sí. El WebView entrega el D-pad como flechas y el botón central como Enter, así que la navegación
funciona con el mapa `browser` por defecto en equipos Sony, TCL, Philips, AOC, Xiaomi, Nvidia
Shield o Fire TV. La tecla Atrás la maneja la app nativa: reenvíala a la página y llama a
`nav.back()` (ver [Marcas y plataformas de TV compatibles](#marcas-y-plataformas-de-tv-compatibles)).
</details>

<details>
<summary><b>¿Puedo usarlo en apps HbbTV o en decodificadores de operadores como las Living Apps de Movistar+?</b></summary>

Sí, siempre que la app sea HTML + JavaScript. Mapea la tecla Atrás del equipo con `keyMap` (`461`
en HbbTV). Algunos terminales HbbTV y decodificadores antiguos usan motores anteriores a
Chromium 63: en ese caso, transpila los paquetes en el build de tu app.
</details>

<details>
<summary><b>¿Cómo armo un home estilo Netflix con filas de tarjetas?</b></summary>

Usa una zona `list` vertical para la página y una zona `list` horizontal por fila. Con
`saveLastFocused` (activo por defecto) cada fila recuerda su posición cuando vuelves a ella. Las
zonas `list` y `grid` no miden el layout al moverse, lo que mantiene el scroll fluido en TVs de
gama baja.
</details>

<details>
<summary><b>¿Cómo retengo el foco dentro de un modal o un menú lateral?</b></summary>

Envuélvelo en una capa: `<FocusLayer>` en React, `gtvLayer` en Angular o `nav.openLayer(id)` sin
framework. Solo la capa activa es navegable. Para una zona de la que las flechas nunca deben
sacar el foco, usa `trap: true`.
</details>

<details>
<summary><b>¿Puedo usarlo con Vue, Svelte, Lightning o mi propio renderer?</b></summary>

Sí. Con un framework basado en el DOM, usa `@arxis/gtvzone-dom` (modo selectores o `register` /
`registerZone` desde tus componentes). Con un renderer de canvas o WebGL, usa
`@arxis/gtvzone-core` directamente y pasa un adapter cuyo `measure()` devuelva tus rectángulos.
</details>

<details>
<summary><b>¿Funciona en televisores viejos?</b></summary>

La salida de `core`, `dom` y `react` corre en Chromium 63 (Samsung Tizen 5.0, modelos 2019) en
adelante, lo que también cubre LG webOS 5 y posteriores. Para motores más antiguos, transpila los
paquetes en el build de tu app.
</details>

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

Los issues y pull requests son bienvenidos, en español o en inglés.

## Licencia

MIT © renearias
