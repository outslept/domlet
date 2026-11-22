import { tag, type TagName } from "./index.js";

export const el = new Proxy({} as { [K in TagName]: ReturnType<typeof tag<K>> }, {
  get: (cache: Record<string, any>, t: TagName) => (cache[t] ??= tag(t)),
});
