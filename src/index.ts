export type TagName = keyof HTMLElementTagNameMap;
export type Elem<K extends TagName> = HTMLElementTagNameMap[K];
export type Key = string | number;
type LoosePartial<T> = { [K in keyof T]?: T[K] | undefined };
export type DOMProps<E extends HTMLElement = HTMLElement> = LoosePartial<
  Omit<E, "style" | "dataset" | "classList" | "children">
> & {
  style?: Partial<CSSStyleDeclaration>;
  dataset?: Record<string, string | number | boolean>;
  txt?: string | number;
  key?: Key;
};
export type VChild = VNode | string | number;
export type MaybeChild = VChild | null | undefined | false;
export type VNode<K extends TagName = TagName> = {
  tag: K;
  props: DOMProps<Elem<K>>;
  children: VChild[];
};
type Instance = { dom: Node; vnode: VChild; children: Instance[] };

export const tag =
  <K extends TagName>(t: K) =>
  (props: DOMProps<Elem<K>> = {}, ...c: MaybeChild[]): VNode<K> => ({
    tag: t,
    props,
    children: [props.txt, ...c].filter((x): x is VChild => x != null && x !== false),
  });

const isVNode = (x: VChild): x is VNode => typeof x === "object";
const getKey = (c: VChild) => (isVNode(c) ? c.props.key : undefined);

const diff = (prev: any, next: any, set: (k: string, v: any) => void) => {
  if (prev === next) return;
  for (const k in prev) if (!next || !(k in next)) set(k, undefined);
  for (const k in next) if (!prev || prev[k] !== next[k]) set(k, next[k]);
};

const applyProps = (el: HTMLElement, prev?: DOMProps, next?: DOMProps) => {
  diff(prev, next, (k, v) => {
    if (k === "style" || k === "dataset" || k === "txt" || k === "key") return;
    (el as any)[k] = v === undefined && typeof (el as any)[k] === "string" ? "" : v;
  });
  diff(prev?.style, next?.style, (k, v) => ((el.style as any)[k] = v ?? ""));
  diff(prev?.dataset, next?.dataset, (k, v) =>
    v === undefined ? delete el.dataset[k] : (el.dataset[k] = String(v)),
  );
};

const commit = (prev: Instance | undefined, next: VChild): Instance => {
  if (!isVNode(next)) {
    const s = String(next);
    if (prev && prev.dom.nodeType === 3) {
      if (prev.dom.nodeValue !== s) prev.dom.nodeValue = s;
      return { dom: prev.dom, vnode: next, children: [] };
    }
    return { dom: document.createTextNode(s), vnode: next, children: [] };
  }
  const same = prev && isVNode(prev.vnode) && prev.vnode.tag === next.tag;
  const dom = same ? (prev.dom as HTMLElement) : document.createElement(next.tag);
  applyProps(dom, same ? (prev.vnode as VNode).props : undefined, next.props);
  return {
    dom,
    vnode: next,
    children: reconcileChildren(dom, same ? prev.children : [], next.children),
  };
};

const reconcileChildren = (parent: HTMLElement, prev: Instance[], next: VChild[]): Instance[] => {
  const pool: (Instance | undefined)[] = [...prev];
  const byKey = new Map<Key, number>();
  pool.forEach((p, i) => {
    const k = getKey(p!.vnode);
    if (k !== undefined) byKey.set(k, i);
  });
  let cursor = 0;
  let lastDom: Node | null = null;
  const result = next.map((vch) => {
    const k = getKey(vch);
    let idx = k !== undefined ? byKey.get(k) : undefined;
    if (k === undefined) {
      while (cursor < pool.length && (!pool[cursor] || getKey(pool[cursor]!.vnode) !== undefined))
        cursor++;
      idx = cursor++;
    }
    const match = idx !== undefined ? pool[idx] : undefined;
    if (idx !== undefined) pool[idx] = undefined;
    const inst = commit(match, vch);
    const anchor = lastDom ? lastDom.nextSibling : parent.firstChild;
    if (inst.dom !== anchor) parent.insertBefore(inst.dom, anchor);
    lastDom = inst.dom;
    return inst;
  });
  for (const p of pool) if (p && p.dom.parentNode === parent) parent.removeChild(p.dom);
  return result;
};

export const mount = (root: HTMLElement) => {
  let prev: Instance[] | undefined;
  return (v: VNode) => {
    if (!prev) root.textContent = "";
    prev = reconcileChildren(root, prev ?? [], [v]);
  };
};
