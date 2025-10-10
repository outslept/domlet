export type TagName = keyof HTMLElementTagNameMap
export type Elem<K extends TagName> = HTMLElementTagNameMap[K]

type LoosePartial<T> = { [K in keyof T]?: T[K] | undefined }

export type DOMProps<E extends HTMLElement = HTMLElement> =
  LoosePartial<Omit<E, "style" | "dataset" | "classList">> & {
    style?: Partial<CSSStyleDeclaration>
    dataset?: Record<string, string | number | boolean>
    txt?: string
  }

export type VNode<K extends TagName = TagName> = (() => Elem<K>) & {
  tag: K
  props: DOMProps<HTMLElement>
  children: VNode[]
}

export type TypedVNode<K extends TagName> = VNode<K> & { props: DOMProps<Elem<K>> }

export type MaybeVNode = VNode | null | undefined | false

// tag("div")({ ... }, children...)
export const tag = <K extends TagName>(tagName: K) =>
  (p: DOMProps<Elem<K>> = {}, ...c: MaybeVNode[]): TypedVNode<K> => {
    const props = p && p.txt != null ? { ...p, textContent: p.txt } : p
    const { style = {}, dataset = {}, txt: _drop, ...rest } = props
    const children = c.filter(Boolean) as VNode[]

    const render = ((element?: Elem<K>) => () => {
      if (element) return element
      const el = document.createElement(tagName) as Elem<K>
      Object.assign(el, rest)
      Object.assign(el.style, style)
      for (const [k, v] of Object.entries(dataset)) el.dataset[k] = String(v)
      for (const child of children) el.append(child())
      return (element = el)
    })()

    return Object.assign(render, { tag: tagName, props, children })
  }

const dict = <T extends object>(o: T) => o as unknown as Record<string, unknown>

const patchProps = (prev: VNode, next: VNode): void => {
  const el = prev()
  const { style: ps = {}, dataset: pd = {}, txt: _ptxt, ...pp } = prev.props
  const { style: ns = {}, dataset: nd = {}, txt: _ntxt, ...np } = next.props

  // plain props
  {
    const tgt = dict(el)
    const p = dict(pp)
    const n = dict(np)
    for (const k in p) if (!(k in n)) tgt[k] = undefined
    for (const k in n) if (p[k] !== n[k]) tgt[k] = n[k]
  }

  // style
  {
    const st = dict(el.style)
    const p = dict(ps)
    const n = dict(ns)
    for (const k in p) if (!(k in n)) st[k] = ""
    for (const k in n) if (p[k] !== n[k]) st[k] = n[k]
  }

  // dataset
  for (const k in pd) if (!(k in nd)) delete el.dataset[k]
  for (const k in nd) if (pd[k] !== nd[k]) el.dataset[k] = String(nd[k])
}

export const reconcile = (prev: VNode, next: VNode): VNode => {
  if (prev.tag !== next.tag) {
    prev().replaceWith(next())
    return next
  }

  patchProps(prev, next)

  const el = prev()
  const a = prev.children
  const b = next.children
  const children: VNode[] = []
  const m = Math.max(a.length, b.length)

  for (let i = 0; i < m; i++) {
    const p = a[i], n = b[i]
    if (p && !n) {
      p().remove()
    } else if (!p && n) {
      el.append(n()); children.push(n)
    } else if (p!.tag !== n!.tag) {
      p!().replaceWith(n!()); children.push(n!)
    } else {
      children.push(reconcile(p!, n!))
    }
  }

  return Object.assign(prev, { props: next.props, children })
}

export const fromElement = <E extends HTMLElement>(
  element: E,
  props: DOMProps<E> = {},
  ...children: MaybeVNode[]
): VNode => Object.assign(
  () => element,
  {
    tag: element.tagName.toLowerCase() as TagName,
    props: props as DOMProps<HTMLElement>,
    children: children.filter(Boolean) as VNode[],
  }
)

export const mount = (root: HTMLElement) => {
  let prev = fromElement(root)
  return (...children: MaybeVNode[]) => {
    prev = reconcile(prev, fromElement(root, {}, ...children))
  }
}

export const h = <K extends TagName>(t: K, p?: DOMProps<Elem<K>>, ...c: MaybeVNode[]) =>
  tag(t)(p as any, ...c)