# domlet

Tiny typed DOM runtime. Inspired by noact. No JSX required. No VDOM. Just functions.

# Quick start

```ts
import { mount } from "./src/index"
import { el } from "./src/el"

let count = 0
const root = document.getElementById("app")!
const mountApp = mount(root)

const inc = () => { count += 1; render() }

const App = () =>
  el.div(
    { style: { display: "grid", placeItems: "center", gap: "16px", minHeight: "100svh" } },
    el.div({ style: { fontSize: "64px", fontWeight: "900" }, txt: String(count) }),
    el.button({ onclick: inc, txt: "+1" }),
  )

function render() { mountApp(App()) }
render()
```

# API

- `el`: `Proxy` of typed factories `(el.div({ ... }, ...children))`
- `tag(name)`: returns a typed factory for a specific tag
- `mount(root)`: creates a function that reconciles into root
- `fromElement(el, props?, ...children)`: wraps an existing `HTMLElement`
- Types: `TagName`, `Elem<K>`, `DOMProps<E>`, `VNode<K>`

# Notes

- Children are `VNodes`; for text use txt: "..." (sugars to `textContent`).
- Reconciliation is unkeyed (`append`/`remove`/`replace`). Reorders aren’t optimized.