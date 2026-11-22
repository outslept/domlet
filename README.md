# domlet

Tiny typed VDOM runtime. Inspired by Noact. No JSX. Just functions.

# Quick start

```ts
import { mount } from "./src/index";
import { el } from "./src/el";

let count = 0;
const root = document.getElementById("app")!;
const mountApp = mount(root);

const inc = () => {
  count += 1;
  render();
};

const App = () =>
  el.div(
    { style: { display: "grid", placeItems: "center", gap: "16px", minHeight: "100svh" } },
    el.div({ style: { fontSize: "64px", fontWeight: "900" }, txt: String(count) }),
    el.button({ onclick: inc, txt: "+1" }),
  );

function render() {
  mountApp(App());
}
render();
```

# API

- el: typed Proxy of element factories, e.g. el.div({ ... }, ...children)
- tag(name): create a typed factory for a tag
- mount(root): returns a function to render a VNode into root
- Types: TagName, Elem<K>, DOMProps<E>, VNode<K>

# Notes

- nodes are plain objects; DOM is created/patched by the reconciler.
- Children can be VNode | string | number. txt adds a text child.
- Keyed diff: use props.key for stable reorders; falls back to index-based diff.
