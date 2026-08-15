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

export type VNode<K extends TagName = TagName> = {
  tag: K
  props: DOMProps<Elem<K>>
  children: VChild[]
}

type Instance = {
  dom: Node
  vnode: VChild
  children: Instance[]
}

export const tag = <K extends TagName>(tagName: K) =>
  (p: DOMProps<Elem<K>> = {}, ...c: MaybeChild[]): VNode<K> => {
    const { style, dataset, txt, key, ...rest } = p
    const children: VChild[] = []
    if (txt !== undefined && txt !== null) children.push(typeof txt === 'number' ? txt : String(txt))
    for (const ch of c) if (ch !== null && ch !== undefined && ch !== false) children.push(ch as VChild)
    return { tag: tagName, props: { ...(rest as any), style, dataset, key }, children }
  }

const isVNode = (x: VChild): x is VNode => typeof x === 'object' && x !== null && 'tag' in x
const dict = <T extends object>(o: T) => o as unknown as Record<string, unknown>

const patchProps = (el: HTMLElement, prev: DOMProps<HTMLElement> = {}, next: DOMProps<HTMLElement> = {}) => {
  const { style: ps = {}, dataset: pd = {}, txt: _pt, key: _pk, ...pp } = prev
  const { style: ns = {}, dataset: nd = {}, txt: _nt, key: _nk, ...np } = next

  {
    const tgt = dict(el); const p = dict(pp); const n = dict(np)
    for (const k in p) if (!(k in n)) tgt[k] = undefined
    for (const k in n) if (p[k] !== n[k]) tgt[k] = n[k]
  }
  {
    const st = dict(el.style); const p = dict(ps); const n = dict(ns)
    for (const k in p) if (!(k in n)) st[k] = ''
    for (const k in n) if (p[k] !== n[k]) st[k] = n[k]
  }
  for (const k in pd) if (!(k in nd)) delete el.dataset[k]
  for (const k in nd) if (pd[k] !== nd[k]) el.dataset[k] = String(nd[k] as any)
}

const createElement = (v: VNode) => {
  const el = document.createElement(v.tag)
  const { style = {}, dataset = {}, key: _k, ...rest } = v.props || {}
  Object.assign(el, rest)
  Object.assign(el.style, style)
  for (const [k, val] of Object.entries(dataset)) el.dataset[k] = String(val)
  return el
}

const commit = (parent: Node, prevInst: Instance | null, nextNode: VChild): Instance => {
  if (!isVNode(nextNode)) {
    if (prevInst && prevInst.dom.nodeType === Node.TEXT_NODE) {
      const t = prevInst.dom as Text
      const s = String(nextNode)
      if (t.nodeValue !== s) t.nodeValue = s
      prevInst.vnode = nextNode
      prevInst.children = []
      return prevInst
    }
    const dom = document.createTextNode(String(nextNode))
    return { dom, vnode: nextNode, children: [] }
  }

  if (!prevInst || prevInst.dom.nodeType === Node.TEXT_NODE || !isVNode(prevInst.vnode) || prevInst.vnode.tag !== nextNode.tag) {
    const el = createElement(nextNode)
    const childInstances = nextNode.children.map(ch => {
      const ci = commit(el, null, ch)
      el.appendChild(ci.dom)
      return ci
    })
    return { dom: el, vnode: nextNode, children: childInstances }
  }

  const el = prevInst.dom as HTMLElement
  patchProps(el, (prevInst.vnode as VNode).props as any, nextNode.props as any)
  prevInst.children = reconcileChildren(el, prevInst.children, nextNode.children)
  prevInst.vnode = nextNode
  return prevInst
}

const getKey = (c: VChild) => (isVNode(c) ? c.props?.key : undefined)
const keyOf = (i: Instance) => (isVNode(i.vnode) ? (i.vnode.props as any)?.key : undefined)

const reconcileChildren = (parent: HTMLElement, prev: Instance[], next: VChild[]): Instance[] => {
  const nextInsts: Instance[] = []
  const prevByKey = new Map<Key, number>()
  const used = new Set<number>()
  let cursor = 0

  for (let i = 0; i < prev.length; i++) {
    const k = keyOf(prev[i]!)
    if (k !== undefined) prevByKey.set(k, i)
  }

  let lastDom: Node | null = null

  for (let i = 0; i < next.length; i++) {
    const vch = next[i]!
    const k = getKey(vch)
    let matchIndex: number | undefined

    if (k !== undefined) {
      const idx = prevByKey.get(k)
      if (idx !== undefined && !used.has(idx)) matchIndex = idx
    } else {
      while (cursor < prev.length && used.has(cursor)) cursor++
      if (cursor < prev.length) matchIndex = cursor++
    }

    let matched: Instance | null = null
    if (matchIndex !== undefined && matchIndex >= 0 && matchIndex < prev.length) {
      const cand = prev[matchIndex]
      if (cand) { matched = cand; used.add(matchIndex) }
    }

    const inst = commit(parent, matched, vch)
    nextInsts.push(inst)

    const anchor: ChildNode | null = lastDom ? lastDom.nextSibling : parent.firstChild
    if (inst.dom !== anchor) parent.insertBefore(inst.dom, anchor)
    lastDom = inst.dom
  }

  for (let i = 0; i < prev.length; i++) {
    if (!used.has(i)) {
      const d = prev[i]!.dom
      if (d.parentNode === parent) parent.removeChild(d)
    }
  }

  return nextInsts
}

export const mount = (root: HTMLElement) => {
  let mounted = false
  let prevChildren: Instance[] = []
  return (v: VNode) => {
    if (!mounted) { root.textContent = ''; mounted = true }
    prevChildren = reconcileChildren(root, prevChildren, [v])
  }
}
