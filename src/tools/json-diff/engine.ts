/**
 * Structural JSON diff.
 *
 * Objects are always compared key by key, so key order never counts as a
 * difference. Arrays are compared according to `arrayMode`.
 */

export type ArrayMode = 'index' | 'key' | 'unordered'

export type DiffOptions = {
  /** `index`: pair items by position. `key`: pair object items by a field. `unordered`: ignore order. */
  arrayMode: ArrayMode
  /** Fields tried in order to pair array items in `key` mode. Empty means detect automatically. */
  matchKeys: string[]
  /** Treat 1 / "1" and true / "true" as the same value. */
  loose: boolean
}

export type Status = 'equal' | 'changed' | 'added' | 'removed' | 'modified'
export type ContainerKind = 'object' | 'array'

export type DiffNode = {
  id: string
  /** Object key; `null` for array items and the root. */
  label: string | null
  /** Human readable path, e.g. `measures[uniqKey="x"].alias`. Empty for the root. */
  path: string
  status: Status
  left?: unknown
  right?: unknown
  /** Set when both sides are the same kind of container; `children` is then filled. */
  container?: ContainerKind
  children?: DiffNode[]
  /** Field used to pair the items of this array. */
  matchedBy?: string
  /** Short description of a paired array item, e.g. `uniqKey: "x"`. */
  hint?: string
}

export type DiffEntry = {
  id: string
  path: string
  status: 'changed' | 'added' | 'removed'
  left?: unknown
  right?: unknown
}

export type DiffSummary = {
  root: DiffNode
  entries: DiffEntry[]
  counts: { changed: number; added: number; removed: number }
  /** Fields actually used to pair array items, in first-use order. */
  matchedKeys: string[]
  /** Number of scalar values compared on both sides. */
  compared: number
}

type Plain = Record<string, unknown>

export const isPlainObject = (value: unknown): value is Plain =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const hasOwn = (object: Plain, key: string) => Object.prototype.hasOwnProperty.call(object, key)

const kindOf = (value: unknown): ContainerKind | 'value' =>
  Array.isArray(value) ? 'array' : isPlainObject(value) ? 'object' : 'value'

/** Normalised token for loose comparison: numbers and numeric strings meet, so do booleans. */
function looseToken(value: unknown): string {
  if (typeof value === 'number') return `n:${value}`
  if (typeof value === 'boolean') return `b:${value}`
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed !== '' && Number.isFinite(Number(trimmed))) return `n:${Number(trimmed)}`
    if (trimmed === 'true' || trimmed === 'false') return `b:${trimmed}`
    return `s:${value}`
  }
  return `j:${JSON.stringify(value)}`
}

const scalarEqual = (a: unknown, b: unknown, loose: boolean) =>
  a === b || (loose && looseToken(a) === looseToken(b))

/** Order-insensitive fingerprint, used to find identical items in `unordered` arrays. */
function fingerprint(value: unknown, loose: boolean): string {
  if (Array.isArray(value)) {
    return `[${value
      .map((item) => fingerprint(item, loose))
      .sort()
      .join(',')}]`
  }
  if (isPlainObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${fingerprint(value[key], loose)}`)
      .join(',')}}`
  }
  return loose ? looseToken(value) : `j:${JSON.stringify(value)}`
}

export function shortValue(value: unknown, max = 32): string {
  const text = value === undefined ? '' : JSON.stringify(value)
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/
const joinKey = (path: string, key: string) =>
  IDENTIFIER.test(key) ? (path ? `${path}.${key}` : key) : `${path}[${JSON.stringify(key)}]`

/** Which field names are trusted for automatic pairing, best first. -1 = never auto-pick. */
function keyRank(key: string): number {
  if (/^(id|_id|uuid|key|uniqKey|uniq_key)$/i.test(key)) return 0
  if (/(?:[a-z0-9](?:Id|ID|Key|KEY|Code|Uuid|UUID)|_(?:id|key|code|uuid))$/.test(key)) return 1
  if (/^(name|code|slug)$/i.test(key)) return 2
  return -1
}

const pairToken = (value: unknown, loose: boolean) =>
  loose ? looseToken(value) : `${typeof value}:${String(value)}`

/**
 * Pick a field that identifies every item on both sides: all items are objects,
 * the field holds a string or number, and its values are unique within each side.
 */
function pickKey(a: unknown[], b: unknown[], preferred: string[], loose: boolean): string | undefined {
  const items = [...a, ...b]
  if (items.length === 0 || !items.every(isPlainObject)) return undefined

  const identifies = (key: string) =>
    [a as Plain[], b as Plain[]].every((side) => {
      const seen = new Set<string>()
      for (const item of side) {
        const value = item[key]
        if (typeof value !== 'string' && typeof value !== 'number') return false
        const token = pairToken(value, loose)
        if (seen.has(token)) return false
        seen.add(token)
      }
      return true
    })

  if (preferred.length > 0) return preferred.find(identifies)

  const first = items[0] as Plain
  return Object.keys(first)
    .filter((key) => keyRank(key) >= 0 && (items as Plain[]).every((item) => hasOwn(item, key)))
    .sort((x, y) => keyRank(x) - keyRank(y))
    .find(identifies)
}

type Pair = { l?: number; r?: number }

export function compareJson(left: unknown, right: unknown, options: DiffOptions): DiffSummary {
  let sequence = 0
  let compared = 0
  const matchedKeys: string[] = []
  const nextId = () => `d${sequence++}`

  const single = (
    status: Status,
    label: string | null,
    path: string,
    l: unknown,
    r: unknown,
    hint?: string,
  ): DiffNode => ({ id: nextId(), label, path, status, left: l, right: r, hint })

  const pairArrays = (a: unknown[], b: unknown[]): { pairs: Pair[]; key?: string } => {
    if (options.arrayMode === 'key') {
      const key = pickKey(a, b, options.matchKeys, options.loose)
      if (key) {
        const rightIndex = new Map<string, number>()
        b.forEach((item, index) => rightIndex.set(pairToken((item as Plain)[key], options.loose), index))
        const used = new Set<number>()
        const pairs: Pair[] = a.map((item, index) => {
          const match = rightIndex.get(pairToken((item as Plain)[key], options.loose))
          if (match === undefined) return { l: index }
          used.add(match)
          return { l: index, r: match }
        })
        b.forEach((_, index) => {
          if (!used.has(index)) pairs.push({ r: index })
        })
        return { pairs, key }
      }
    }

    if (options.arrayMode === 'unordered') {
      const buckets = new Map<string, number[]>()
      b.forEach((item, index) => {
        const print = fingerprint(item, options.loose)
        buckets.set(print, [...(buckets.get(print) ?? []), index])
      })
      const used = new Set<number>()
      const pairs: Pair[] = a.map((item, index) => {
        const match = buckets.get(fingerprint(item, options.loose))?.shift()
        if (match === undefined) return { l: index }
        used.add(match)
        return { l: index, r: match }
      })
      // Items without an identical partner are paired up in order, so a single
      // edited element reads as "changed" instead of "removed + added".
      const spare = b.map((_, index) => index).filter((index) => !used.has(index))
      for (const pair of pairs) {
        if (pair.r === undefined && spare.length > 0) pair.r = spare.shift()
      }
      spare.forEach((index) => pairs.push({ r: index }))
      return { pairs }
    }

    const length = Math.max(a.length, b.length)
    return {
      pairs: Array.from({ length }, (_, index) => ({
        l: index < a.length ? index : undefined,
        r: index < b.length ? index : undefined,
      })),
    }
  }

  const finish = (node: DiffNode): DiffNode => {
    node.status = node.children!.some((child) => child.status !== 'equal') ? 'modified' : 'equal'
    return node
  }

  const walk = (a: unknown, b: unknown, label: string | null, path: string, hint?: string): DiffNode => {
    const kindA = kindOf(a)
    const kindB = kindOf(b)

    if (kindA === 'object' && kindB === 'object') {
      const objA = a as Plain
      const objB = b as Plain
      const node: DiffNode = { id: nextId(), label, path, status: 'equal', left: a, right: b, container: 'object', children: [], hint }
      for (const key of Object.keys(objA)) {
        const childPath = joinKey(path, key)
        node.children!.push(
          hasOwn(objB, key)
            ? walk(objA[key], objB[key], key, childPath)
            : single('removed', key, childPath, objA[key], undefined),
        )
      }
      for (const key of Object.keys(objB)) {
        if (!hasOwn(objA, key)) node.children!.push(single('added', key, joinKey(path, key), undefined, objB[key]))
      }
      return finish(node)
    }

    if (kindA === 'array' && kindB === 'array') {
      const arrA = a as unknown[]
      const arrB = b as unknown[]
      const { pairs, key } = pairArrays(arrA, arrB)
      if (key && !matchedKeys.includes(key)) matchedKeys.push(key)
      const node: DiffNode = { id: nextId(), label, path, status: 'equal', left: a, right: b, container: 'array', children: [], matchedBy: key, hint }
      for (const pair of pairs) {
        const item = pair.l !== undefined ? arrA[pair.l] : arrB[pair.r!]
        let segment: string
        let itemHint: string | undefined
        if (key) {
          const id = (item as Plain)[key]
          segment = `[${key}=${JSON.stringify(id)}]`
          itemHint = `${key} = ${shortValue(id, 40)}`
        } else {
          segment = `[${pair.l ?? pair.r}]`
        }
        const childPath = `${path}${segment}`
        if (pair.l !== undefined && pair.r !== undefined) {
          node.children!.push(walk(arrA[pair.l], arrB[pair.r], null, childPath, itemHint))
        } else if (pair.l !== undefined) {
          node.children!.push(single('removed', null, childPath, arrA[pair.l], undefined, itemHint))
        } else {
          node.children!.push(single('added', null, childPath, undefined, arrB[pair.r!], itemHint))
        }
      }
      return finish(node)
    }

    compared += 1
    const same = kindA === 'value' && kindB === 'value' && scalarEqual(a, b, options.loose)
    return single(same ? 'equal' : 'changed', label, path, a, b, hint)
  }

  const root = walk(left, right, null, '')

  const entries: DiffEntry[] = []
  const collect = (node: DiffNode) => {
    if (node.status === 'changed' || node.status === 'added' || node.status === 'removed') {
      entries.push({ id: node.id, path: node.path, status: node.status, left: node.left, right: node.right })
      return
    }
    node.children?.forEach(collect)
  }
  collect(root)

  const counts = { changed: 0, added: 0, removed: 0 }
  entries.forEach((entry) => {
    counts[entry.status] += 1
  })

  return { root, entries, counts, matchedKeys, compared }
}
