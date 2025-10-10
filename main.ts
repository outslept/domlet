import { mount } from "./src/index.js"
import { el } from "./src/el.js"

let count = 0
const root = document.getElementById("app")!
const mountApp = mount(root)

const inc = () => { count += 1; render() }

const App = () =>
  el.div(
    { className: "wrap" },
    el.div({ className: "value", txt: String(count) }),
    el.button({ className: "btn", onclick: inc, txt: "+1" }),
  )

function render() { mountApp(App()) }
render()
