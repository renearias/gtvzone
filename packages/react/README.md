# @arxis/gtvzone-react

**English** · [Español](https://github.com/renearias/gtvzone/blob/master/packages/react/README.es.md)

**React spatial navigation for Smart TV apps** (Samsung Tizen, LG webOS, Hisense VIDAA, HbbTV, Android TV, Fire TV, Vizio, Huawei, AOC, Movistar+). Bindings
for React ≥ 16.8: `NavigationProvider`, `useFocusable`, `<FocusZone>`, `<FocusLayer>` and state
selectors (`useFocusedId`, `useIsFocused`, `useActiveLayer`). Each element re-renders only when
its own focus changes.

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

Full documentation and FAQ in the [main README](https://github.com/renearias/gtvzone#readme).
