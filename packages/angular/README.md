# @arxis/gtvzone-angular

**English** · [Español](https://github.com/renearias/gtvzone/blob/master/packages/angular/README.es.md)

**Angular spatial navigation for Smart TV apps** (Samsung Tizen, LG webOS, Hisense VIDAA, HbbTV, Android TV, Fire TV, Vizio, Huawei, AOC, Movistar+). Bindings
for Angular ≥ 16.1: `provideGtvNavigation()`, `GtvNavigationService` (signals and `state$`) and
the standalone directives `gtvFocusable`, `gtvZone` and `gtvLayer`. Remote-control keys are
handled outside the Angular zone, so change detection only runs when focus actually changes.

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

Full documentation and FAQ in the [main README](https://github.com/renearias/gtvzone#readme).

## License

[AGPL-3.0-only](https://github.com/renearias/gtvzone/blob/master/LICENSE) © 2026 Rene Arias. For closed-source apps, a
[commercial license](https://github.com/renearias/gtvzone#commercial-license) is available.
