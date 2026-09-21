# @arxis/gtvzone-react

Bindings de React (≥ 16.8) para gtvzone: `NavigationProvider`, `useFocusable`, `<FocusZone>`,
`<FocusLayer>` y selectores de estado (`useFocusedId`, `useIsFocused`, `useActiveLayer`).

```jsx
const { ref, focused } = useFocusable({ id: 'play', onPress: play })
return <button ref={ref} className={focused ? 'focused' : ''}>Play</button>
```

Documentación completa en el [README del repo](https://github.com/renearias/gtvzone#readme).
