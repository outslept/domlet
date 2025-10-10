import { tag, type VNode, type DOMProps, type MaybeChild, type TagName, type Elem } from './index.js'

type Factory<K extends TagName> = (p?: DOMProps<Elem<K>>, ...c: MaybeChild[]) => VNode<K>
type HTMLFactories = { [K in TagName]: Factory<K> }

export const el = new Proxy({} as HTMLFactories, {
  get: (_: unknown, t: string) => tag(t as TagName) as any,
}) as HTMLFactories
