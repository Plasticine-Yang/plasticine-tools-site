export type DiffKind = 'changed' | 'removed' | 'added'

export type DiffResult = {
  /** Marks shown on the left document, keyed by serialized JSON path. */
  left: Map<string, DiffKind>
  /** Marks shown on the right document, keyed by serialized JSON path. */
  right: Map<string, DiffKind>
  /** Number of distinct places where the two documents differ. */
  count: number
}

export const pathKey = (path: readonly string[]) => JSON.stringify(path)

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Structural diff of two JSON values. Objects are compared by key, arrays by
 * index. A key or index that exists on one side only is marked on that side;
 * values that exist on both sides but differ are marked on both.
 */
export function diffJson(left: unknown, right: unknown): DiffResult {
  const result: DiffResult = { left: new Map(), right: new Map(), count: 0 }

  const walk = (a: unknown, b: unknown, path: string[]) => {
    if (isPlainObject(a) && isPlainObject(b)) {
      for (const key of Object.keys(a)) {
        if (Object.prototype.hasOwnProperty.call(b, key)) {
          walk(a[key], b[key], [...path, key])
        } else {
          result.left.set(pathKey([...path, key]), 'removed')
          result.count += 1
        }
      }
      for (const key of Object.keys(b)) {
        if (!Object.prototype.hasOwnProperty.call(a, key)) {
          result.right.set(pathKey([...path, key]), 'added')
          result.count += 1
        }
      }
      return
    }

    if (Array.isArray(a) && Array.isArray(b)) {
      const length = Math.max(a.length, b.length)
      for (let index = 0; index < length; index += 1) {
        const childPath = [...path, String(index)]
        if (index >= a.length) {
          result.right.set(pathKey(childPath), 'added')
          result.count += 1
        } else if (index >= b.length) {
          result.left.set(pathKey(childPath), 'removed')
          result.count += 1
        } else {
          walk(a[index], b[index], childPath)
        }
      }
      return
    }

    if (a !== b) {
      const key = pathKey(path)
      result.left.set(key, 'changed')
      result.right.set(key, 'changed')
      result.count += 1
    }
  }

  walk(left, right, [])
  return result
}
