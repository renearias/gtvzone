# @arxis/gtvzone-angular

[English](https://github.com/renearias/gtvzone/blob/master/packages/angular/README.md) · **Español**

**Navegación espacial con Angular para apps de Smart TV** (Samsung Tizen, LG webOS, Hisense
VIDAA, HbbTV, Android TV, Fire TV, Vizio, Huawei, AOC, Movistar+). Bindings para Angular ≥ 16.1: `provideGtvNavigation()`, `GtvNavigationService` (signals y
`state$`) y las directivas standalone `gtvFocusable`, `gtvZone` y `gtvLayer`. Las teclas del
control remoto se procesan fuera de la zona de Angular, así que la detección de cambios solo corre
cuando el foco cambia de verdad.

```sh
npm install @arxis/gtvzone-angular
```

```ts
bootstrapApplication(AppComponent, { providers: [provideGtvNavigation()] })
```

```html
<div gtvZone="row" gtvZoneStrategy="list">
  <div gtvFocusable="play" (gtvPress)="play()">Play</div>
</div>
```

Documentación completa y preguntas frecuentes en el [README principal](https://github.com/renearias/gtvzone/blob/master/README.es.md).
