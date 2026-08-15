export type TagName = keyof HTMLElementTagNameMap
export type Elem<K extends TagName> = HTMLElementTagNameMap[K]
export type Key = string | number

type LoosePartial<T> = { [K in keyof T]?: T[K] | undefined }

export type DOMProps<E extends HTMLElement = HTMLElement> =
  LoosePartial<Omit<E, 'style' | 'dataset' | 'classList' | 'children'>> & {
    style?: Partial<CSSStyleDeclaration>
    dataset?: Record<string, string | number | boolean>
    txt?: string | number
    key?: Key
  }

export type VChild = VNode | string | number
export type MaybeChild = VChild | null | undefined | false
export type VNode<K extends TagName = TagName> = { tag: K; props: DOMProps<Elem<K>>; children: VChild[] }
type Instance = { dom: Node; vnode: VChild; children: Instance[] }

export const tag = <K extends TagName>(t: K) =>
  (p: DOMProps<Elem<K>> = {}, ...c: MaybeChild[]): VNode<K> => {
    const { style, dataset, txt, key, ...rest } = p
    const children: VChild[] = txt != null ? [txt] : []
    for (const ch of c) if (ch != null && ch !== false) children.push(ch)
    return { tag: t, props: { ...(rest as any), style, dataset, key }, children }
  }

const isVNode = (x: VChild): x is VNode => typeof x === 'object'

const diff = (prev: any = {}, next: any = {}, set: (k: string, v: any) => void) => {
  for (const k in prev) if (!(k in next)) set(k, undefined)
  for (const k in next) if (prev[k] !== next[k]) set(k, next[k])
}

const applyProps = (el: HTMLElement, prev: DOMProps = {}, next: DOMProps = {}) => {
  const { style: ps, dataset: pd, txt: _pt, key: _pk, ...pp } = prev
  const { style: ns, dataset: nd, txt: _nt, key: _nk, ...np } = next
  diff(pp, np, (k, v) => ((el as any)[k] = v))
  diff(ps, ns, (k, v) => ((el.style as any)[k] = v ?? ''))
  diff(pd, nd, (k, v) => (v === undefined ? delete el.dataset[k] : (el.dataset[k] = String(v))))
}

const createElement = (v: VNode): HTMLElement => {
  const el = document.createElement(v.tag)
  applyProps(el, {}, v.props)
  return el
}

const commit = (prevInst: Instance | null, next: VChild): Instance => {
  if (!isVNode(next)) {
    if (prevInst && prevInst.dom.nodeType === Node.TEXT_NODE) {
      const t = prevInst.dom as Text
      const s = String(next)
      if (t.nodeValue !== s) t.nodeValue = s
      return { dom: t, vnode: next, children: [] }
    }
    return { dom: document.createTextNode(String(next)), vnode: next, children: [] }
  }

  if (!prevInst || !isVNode(prevInst.vnode) || prevInst.vnode.tag !== next.tag) {
    const el = createElement(next)
    const children = next.children.map(ch => {
      const ci = commit(null, ch)
      el.appendChild(ci.dom)
      return ci
    })
    return { dom: el, vnode: next, children }
  }

  const el = prevInst.dom as HTMLElement
  applyProps(el, (prevInst.vnode as VNode).props as any, next.props as any)
  return { dom: el, vnode: next, children: reconcileChildren(el, prevInst.children, next.children) }
}

const getKey = (c: VChild) => (isVNode(c) ? c.props?.key : undefined)

const reconcileChildren = (parent: HTMLElement, prev: Instance[], next: VChild[]): Instance[] => {
  const byKey = new Map<Key, number>()
  prev.forEach((p, i) => { const k = getKey(p.vnode); if (k !== undefined) byKey.set(k, i) })

  const used = new Set<number>()
  const result: Instance[] = []
  let cursor = 0
  let lastDom: Node | null = null

  for (const vch of next) {
    const k = getKey(vch)
    let idx: number | undefined
    if (k !== undefined) {
      const found = byKey.get(k)
      if (found !== undefined && !used.has(found)) idx = found
    } else {
      while (cursor < prev.length && used.has(cursor)) cursor++
      if (cursor < prev.length) idx = cursor++
    }
    if (idx !== undefined) used.add(idx)

    const inst = commit(idx !== undefined ? prev[idx]! : null, vch)
    result.push(inst)

    const anchor: ChildNode | null = lastDom ? lastDom.nextSibling : parent.firstChild
    if (inst.dom !== anchor) parent.insertBefore(inst.dom, anchor)
    lastDom = inst.dom
  }

  prev.forEach((p, i) => { if (!used.has(i) && p.dom.parentNode === parent) parent.removeChild(p.dom) })

  return result
}

export const mount = (root: HTMLElement) => {
  let prev: Instance[] = []
  let first = true
  return (v: VNode) => {
    if (first) { root.textContent = ''; first = false }
    prev = reconcileChildren(root, prev, [v])
  }
}
