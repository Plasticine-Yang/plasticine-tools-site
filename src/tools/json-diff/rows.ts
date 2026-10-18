import type { DiffNode, Status } from './engine'

export type Tone = 'changed' | 'added' | 'removed'

export type LabelKind = 'key' | 'index' | 'hint'

export type Cell = {
  indent: number
  label?: string
  labelKind?: LabelKind
  text: string
  /** Muted summary text such as "3 项", rendered after `text`. */
  note?: string
  tone?: Tone
}

export type Row =
  | {
      kind: 'line'
      key: string
      status: Status
      /** `null` means this side has nothing here (padding for an added/removed block). */
      left: Cell | null
      right: Cell | null
      /** Set on the first row of a node that is listed in the change list. */
      entryId?: string
      /** Set on rows that open or summarise a container, to fold/unfold it. */
      togglePath?: string
      open?: boolean
    }
  | {
      kind: 'fold'
      key: string
      foldKey: string
      count: number
      indent: number
    }

export type ViewState = {
  /** Container paths whose open/closed state differs from the default. */
  toggled: ReadonlySet<string>
  /** Runs of identical siblings the user has expanded. */
  openFolds: ReadonlySet<string>
  onlyDiff: boolean
}

const CHANGE: ReadonlySet<Status> = new Set(['changed', 'added', 'removed'])

export function isOpenByDefault(node: DiffNode) {
  return node.status === 'modified'
}

function labelOf(node: DiffNode): Pick<Cell, 'label' | 'labelKind'> {
  if (node.label !== null) return { label: node.label, labelKind: 'key' }
  if (node.hint) return { label: node.hint, labelKind: 'hint' }
  const index = /\[(\d+)\]$/.exec(node.path)
  return index ? { label: index[1], labelKind: 'index' } : {}
}

const countOf = (value: unknown) =>
  Array.isArray(value) ? value.length : value && typeof value === 'object' ? Object.keys(value).length : 0

function summary(value: unknown): Pick<Cell, 'text' | 'note'> {
  if (Array.isArray(value)) return { text: '[…]', note: `${value.length} 项` }
  return { text: '{…}', note: `${countOf(value)} 个字段` }
}

/** Pretty-print a value into one cell per line, label on the first line. */
function blockCells(value: unknown, indent: number, label: Pick<Cell, 'label' | 'labelKind'>, tone: Tone): Cell[] {
  const lines = (JSON.stringify(value, null, 2) ?? 'undefined').split('\n')
  return lines.map((line, index) => {
    const spaces = line.length - line.trimStart().length
    return {
      indent: indent + spaces / 2,
      text: line.trim(),
      tone,
      ...(index === 0 ? label : {}),
    }
  })
}

const isContainer = (value: unknown) => typeof value === 'object' && value !== null

export function buildRows(root: DiffNode, view: ViewState): Row[] {
  const rows: Row[] = []

  const visit = (node: DiffNode, depth: number) => {
    const label = labelOf(node)

    if (node.container) {
      const defaultOpen = isOpenByDefault(node)
      const open = view.toggled.has(node.path) ? !defaultOpen : defaultOpen
      const bracket = node.container === 'array' ? ['[', ']'] : ['{', '}']

      if (!open) {
        rows.push({
          kind: 'line',
          key: `${node.id}:c`,
          status: node.status,
          left: { indent: depth, ...label, ...summary(node.left) },
          right: { indent: depth, ...label, ...summary(node.right) },
          togglePath: node.path,
          open: false,
        })
        return
      }

      rows.push({
        kind: 'line',
        key: `${node.id}:o`,
        status: node.status,
        left: { indent: depth, ...label, text: bracket[0] },
        right: { indent: depth, ...label, text: bracket[0] },
        togglePath: node.path,
        open: true,
      })

      const children = node.children ?? []
      let index = 0
      while (index < children.length) {
        const child = children[index]
        if (view.onlyDiff && child.status === 'equal') {
          let end = index
          while (end < children.length && children[end].status === 'equal') end += 1
          const foldKey = `${node.path}#${index}`
          if (!view.openFolds.has(foldKey)) {
            rows.push({ kind: 'fold', key: `${node.id}:f${index}`, foldKey, count: end - index, indent: depth + 1 })
            index = end
            continue
          }
          for (let i = index; i < end; i += 1) visit(children[i], depth + 1)
          index = end
          continue
        }
        visit(child, depth + 1)
        index += 1
      }

      rows.push({
        kind: 'line',
        key: `${node.id}:e`,
        status: node.status,
        left: { indent: depth, text: bracket[1] },
        right: { indent: depth, text: bracket[1] },
      })
      return
    }

    const entryId = CHANGE.has(node.status) ? node.id : undefined

    if (node.status === 'equal') {
      const text = JSON.stringify(node.left)
      rows.push({
        kind: 'line',
        key: node.id,
        status: 'equal',
        left: { indent: depth, ...label, text },
        right: { indent: depth, ...label, text },
      })
      return
    }

    if (node.status === 'changed' && !isContainer(node.left) && !isContainer(node.right)) {
      rows.push({
        kind: 'line',
        key: node.id,
        status: 'changed',
        entryId,
        left: { indent: depth, ...label, text: JSON.stringify(node.left), tone: 'changed' },
        right: { indent: depth, ...label, text: JSON.stringify(node.right), tone: 'changed' },
      })
      return
    }

    // Blocks: added / removed values, or a change between different container kinds.
    const leftCells =
      node.status === 'added' ? [] : blockCells(node.left, depth, label, node.status === 'removed' ? 'removed' : 'changed')
    const rightCells =
      node.status === 'removed' ? [] : blockCells(node.right, depth, label, node.status === 'added' ? 'added' : 'changed')
    const height = Math.max(leftCells.length, rightCells.length)
    for (let line = 0; line < height; line += 1) {
      rows.push({
        kind: 'line',
        key: `${node.id}:${line}`,
        status: node.status,
        entryId: line === 0 ? entryId : undefined,
        left: leftCells[line] ?? null,
        right: rightCells[line] ?? null,
      })
    }
  }

  visit(root, 0)
  return rows
}

/** For each changed node id, the container paths that must be open to show it. */
export function ancestorPaths(root: DiffNode): Map<string, string[]> {
  const result = new Map<string, string[]>()
  const walk = (node: DiffNode, trail: string[]) => {
    if (CHANGE.has(node.status)) result.set(node.id, trail)
    if (node.children) node.children.forEach((child) => walk(child, [...trail, node.path]))
  }
  walk(root, [])
  return result
}
