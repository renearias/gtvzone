# @arxis/gtvzone-react

[English](https://github.com/renearias/gtvzone/blob/master/packages/react/README.md) · **Español**

**Navegación espacial con React para apps de Smart TV** (Samsung Tizen, LG webOS, Hisense VIDAA, HbbTV, Android TV, Fire TV, Vizio, Huawei, AOC, Movistar+).
Bindings para React ≥ 16.8: `NavigationProvider`, `useFocusable`, `<FocusZone>`, `<FocusLayer>` y
selectores de estado (`useFocusedId`, `useIsFocused`, `useActiveLayer`). Cada elemento se vuelve
a renderizar solo cuando cambia su propio foco.

```sh
npm install @arxis/gtvzone-react @arxis/gtvzone-dom
```

```jsx
import { createDomNavigation } from '@arxis/gtvzone-dom'
import { FocusZone, NavigationProvider, useFocusable } from '@arxis/gtvzone-react'

function PlayButton () {
  const { ref, focused } = useFocusable({ id: 'play', onPress: play })
  return <button ref={ref} className={focused ? 'focused' : ''}>Play</button>
}

<NavigationProvider navigation={createDomNavigation()}>
  <FocusZone strategy="list"><PlayButton /></FocusZone>
</NavigationProvider>
```

Documentación completa y preguntas frecuentes en el [README principal](https://github.com/renearias/gtvzone/blob/master/README.es.md).
