import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../../components/Icon'
import Segmented from '../../components/Segmented'
import { useLocalStorage } from '../../lib/useLocalStorage'
import JsonPanel, { Mode } from '../json-editor/JsonPanel'
import type { JsonPanelHandle } from '../json-editor/JsonPanel'
import { compareJson, shortValue } from './engine'
import type { ArrayMode, DiffEntry, DiffOptions } from './engine'
import { ancestorPaths, buildRows } from './rows'
import type { Cell, Row } from './rows'
import { DIFF_SAMPLE_LEFT, DIFF_SAMPLE_RIGHT } from './samples'

type Side = 'left' | 'right'

const TEXT_KEY: Record<Side, string> = {
  left: 'plasticine-tools:json-diff:left-text',
  right: 'plasticine-tools:json-diff:right-text',
}

const EDITOR_KEY: Record<Side, string> = {
  left: 'plasticine-tools:json-editor:left-text',
  right: 'plasticine-tools:json-editor:right-text',
}

const SIDE_NAME: Record<Side, string> = { left: '旧版本', right: '新版本' }

const ARRAY_OPTIONS: { value: ArrayMode; label: string }[] = [
  { value: 'key', label: '按字段配对' },
  { value: 'index', label: '按位置' },
  { value: 'unordered', label: '忽略顺序' },
]

const STATUS_LABEL: Record<DiffEntry['status'], string> = {
  changed: '修改',
  added: '新增',
  removed: '删除',
}

function readStorage(key: string, fallback: string) {
  try {
    return window.localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

type Parsed = { state: 'empty' } | { state: 'ok'; value: unknown } | { state: 'error'; message: string }

function parse(text: string): Parsed {
  if (!text.trim()) return { state: 'empty' }
  try {
    return { state: 'ok', value: JSON.parse(text) }
  } catch (error) {
    return { state: 'error', message: error instanceof Error ? error.message : '无法解析' }
  }
}

function CellView({ cell, side }: { cell: Cell | null; side: Side }) {
  if (!cell) return <div className={`dv-cell dv-${side} is-void`} />
  return (
    <div
      className={`dv-cell dv-${side}${cell.tone ? ` tone-${cell.tone}` : ''}`}
      style={{ paddingLeft: `calc(${cell.indent} * 18px + 30px)` }}
    >
      {cell.label !== undefined &&
        (cell.labelKind === 'hint' ? (
          <span className="dv-label dv-label-hint">{cell.label}</span>
        ) : (
          <>
            <span className={`dv-label dv-label-${cell.labelKind}`}>{cell.label}</span>
            <span className="dv-colon">:</span>
          </>
        ))}
      <span className="dv-text">{cell.text}</span>
      {cell.note && <span className="dv-note">{cell.note}</span>}
    </div>
  )
}

/** Keep the end of long paths visible — the leaf is what tells changes apart. */
function tailPath(path: string, max = 36) {
  if (!path) return '(根)'
  return path.length > max ? `…${path.slice(path.length - max + 1)}` : path
}

const MARK: Record<string, string> = { changed: '~', added: '+', removed: '−' }

export default function JsonDiffTool() {
  const [texts, setTexts] = useState<Record<Side, string>>(() => ({
    left: readStorage(TEXT_KEY.left, DIFF_SAMPLE_LEFT),
    right: readStorage(TEXT_KEY.right, DIFF_SAMPLE_RIGHT),
  }))
  const [options, setOptions] = useLocalStorage<DiffOptions>('json-diff:options', {
    arrayMode: 'key',
    matchKeys: [],
    loose: false,
  })
  const [onlyDiff, setOnlyDiff] = useLocalStorage('json-diff:only-diff', true)
  const [inputsOpen, setInputsOpen] = useLocalStorage('json-diff:inputs-open', true)
  const [keyDraft, setKeyDraft] = useState(options.matchKeys.join(', '))
  const [toggled, setToggled] = useState<Set<string>>(() => new Set())
  const [openFolds, setOpenFolds] = useState<Set<string>>(() => new Set())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)

  const panels = { left: useRef<JsonPanelHandle>(null), right: useRef<JsonPanelHandle>(null) }
  const viewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(TEXT_KEY.left, texts.left)
        window.localStorage.setItem(TEXT_KEY.right, texts.right)
      } catch {
        // storage unavailable — comparison still works in memory
      }
    }, 400)
    return () => window.clearTimeout(timer)
  }, [texts])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const say = (text: string) => setToast({ id: Date.now(), text })

  const onLeftText = useCallback((text: string) => setTexts((t) => (t.left === text ? t : { ...t, left: text })), [])
  const onRightText = useCallback((text: string) => setTexts((t) => (t.right === text ? t : { ...t, right: text })), [])

  const deferredTexts = useDeferredValue(texts)
  const parsed = useMemo(
    () => ({ left: parse(deferredTexts.left), right: parse(deferredTexts.right) }),
    [deferredTexts],
  )

  const result = useMemo(() => {
    if (parsed.left.state !== 'ok' || parsed.right.state !== 'ok') return null
    return compareJson(parsed.left.value, parsed.right.value, options)
  }, [parsed, options])

  // A new comparison invalidates folds keyed by the old tree.
  useEffect(() => {
    setToggled(new Set())
    setOpenFolds(new Set())
    setActiveId(null)
  }, [result])

  const rows: Row[] = useMemo(
    () => (result ? buildRows(result.root, { toggled, openFolds, onlyDiff }) : []),
    [result, toggled, openFolds, onlyDiff],
  )

  const ancestors = useMemo(() => (result ? ancestorPaths(result.root) : new Map<string, string[]>()), [result])

  const entries = result?.entries ?? []
  const activeIndex = activeId ? entries.findIndex((entry) => entry.id === activeId) : -1

  const reveal = (id: string) => {
    const trail = ancestors.get(id) ?? []
    // Ancestors of a change are open by default, so un-toggle any the user closed.
    setToggled((current) => {
      if (!trail.some((path) => current.has(path))) return current
      const next = new Set(current)
      trail.forEach((path) => next.delete(path))
      return next
    })
    setActiveId(id)
  }

  useEffect(() => {
    if (!activeId) return
    const frame = requestAnimationFrame(() => {
      viewRef.current
        ?.querySelector(`[data-entry="${activeId}"]`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(frame)
  }, [activeId, rows])

  const step = (delta: number) => {
    if (entries.length === 0) return
    const base = activeIndex === -1 ? (delta > 0 ? -1 : 0) : activeIndex
    const next = (base + delta + entries.length) % entries.length
    reveal(entries[next].id)
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.closest('input, textarea, .cm-editor, [contenteditable="true"]')) return
      if (event.key === 'j' || event.key === 'n') step(1)
      if (event.key === 'k' || event.key === 'p') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const toggleNode = (path: string) =>
    setToggled((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })

  const openFold = (key: string) => setOpenFolds((current) => new Set(current).add(key))

  const commitKeys = () => {
    const keys = keyDraft
      .split(/[,，\s]+/)
      .map((key) => key.trim())
      .filter(Boolean)
    setKeyDraft(keys.join(', '))
    if (keys.join() !== options.matchKeys.join()) setOptions({ ...options, matchKeys: keys })
  }

  const swap = () => {
    const { left, right } = texts
    panels.left.current?.setText(right)
    panels.right.current?.setText(left)
  }

  const format = (side: Side) => {
    const value = parse(texts[side])
    if (value.state === 'ok') panels[side].current?.setText(JSON.stringify(value.value, null, 2))
  }

  const importFromEditor = () => {
    const left = readStorage(EDITOR_KEY.left, '')
    const right = readStorage(EDITOR_KEY.right, '')
    if (!left.trim() && !right.trim()) {
      say('JSON 编辑器里还没有内容')
      return
    }
    panels.left.current?.setText(left)
    panels.right.current?.setText(right)
    say('已带入 JSON 编辑器的左右两份文档')
  }

  const renderInput = (side: Side) => {
    const state = parse(texts[side]).state
    return (
      <section className="dd-input" aria-label={SIDE_NAME[side]}>
        <header className="dd-input-head">
          <span className="dd-input-name">{SIDE_NAME[side]}</span>
          {state === 'error' && <span className="status status-error">解析错误</span>}
          {state === 'empty' && <span className="status">空</span>}
          <span className="dd-flex" />
          <button className="icon-btn" type="button" title="格式化" aria-label={`格式化${SIDE_NAME[side]}`} onClick={() => format(side)}>
            <Icon name="format" />
          </button>
          <button
            className="icon-btn"
            type="button"
            title="清空"
            aria-label={`清空${SIDE_NAME[side]}`}
            onClick={() => panels[side].current?.setText('')}
          >
            <Icon name="trash" />
          </button>
        </header>
        <div className="dd-input-body">
          <JsonPanel
            ref={panels[side]}
            bare
            initialText={texts[side]}
            mode={Mode.text}
            label={SIDE_NAME[side]}
            onModeChange={() => undefined}
            onTextChange={side === 'left' ? onLeftText : onRightText}
          />
        </div>
      </section>
    )
  }

  const blocked = (['left', 'right'] as Side[]).find((side) => parsed[side].state !== 'ok')

  const renderResult = () => {
    if (blocked) {
      const state = parsed[blocked]
      return (
        <div className="dd-empty">
          <p className="dd-empty-title">
            {state.state === 'empty' ? `在「${SIDE_NAME[blocked]}」里粘贴 JSON` : `「${SIDE_NAME[blocked]}」不是合法 JSON`}
          </p>
          {state.state === 'error' && <p className="dd-empty-sub">{state.message}</p>}
        </div>
      )
    }
    if (!result) return null

    if (entries.length === 0) {
      return (
        <div className="dd-same">
          <span className="dd-same-mark" aria-hidden="true">
            <Icon name="check" size={28} />
          </span>
          <p className="dd-same-title">两份 JSON 完全一致</p>
          <p className="dd-same-sub">
            比较了 {result.compared.toLocaleString()} 个值；键的先后顺序不算差异
            {options.arrayMode === 'unordered' ? '，数组也忽略了顺序' : ''}
            {options.loose ? '，1 与 "1" 视为相同' : ''}
          </p>
        </div>
      )
    }

    return (
      <div className="dd-split">
        <div className="dv" ref={viewRef} role="table" aria-label="差异对照">
          <div className="dv-head" role="row">
            <span>{SIDE_NAME.left}</span>
            <span>{SIDE_NAME.right}</span>
          </div>
          {rows.map((row) => {
            if (row.kind === 'fold') {
              return (
                <button
                  key={row.key}
                  type="button"
                  className="dv-fold"
                  style={{ paddingLeft: `calc(${row.indent} * 18px + 30px)` }}
                  onClick={() => openFold(row.foldKey)}
                >
                  ⋯ {row.count} 项相同
                </button>
              )
            }
            const toggle = row.togglePath !== undefined
            return (
              <div
                key={row.key}
                role="row"
                className={`dv-row is-${row.status}${toggle ? ' is-toggle' : ''}${row.entryId && row.entryId === activeId ? ' is-active' : ''}`}
                data-entry={row.entryId}
                onClick={toggle ? () => toggleNode(row.togglePath!) : row.entryId ? () => setActiveId(row.entryId!) : undefined}
              >
                {toggle && (
                  <span className={`dv-caret${row.open ? ' is-open' : ''}`} aria-hidden="true">
                    <Icon name="caret" size={12} />
                  </span>
                )}
                {(['left', 'right'] as Side[]).map((side) => {
                  const cell = row[side]
                  return (
                    <div key={side} className="dv-side">
                      <span className="dv-mark" aria-hidden="true">
                        {cell?.tone ? MARK[cell.tone] : ''}
                      </span>
                      <CellView cell={cell} side={side} />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        <aside className="dd-list" aria-label="差异清单">
          <div className="dd-list-head">
            <span>差异清单</span>
            <span className="dd-list-count">{entries.length}</span>
          </div>
          <ol className="dd-list-items">
            {entries.map((entry, index) => (
              <li key={entry.id}>
                <button
                  type="button"
                  className={`dd-item${entry.id === activeId ? ' is-active' : ''}`}
                  onClick={() => reveal(entry.id)}
                >
                  <span className={`dd-badge badge-${entry.status}`}>{STATUS_LABEL[entry.status]}</span>
                  <span className="dd-item-path" title={entry.path}>
                    {tailPath(entry.path)}
                  </span>
                  <span className="dd-item-values">
                    {entry.status !== 'added' && <del>{shortValue(entry.left, 28)}</del>}
                    {entry.status === 'changed' && <span className="dd-arrow">→</span>}
                    {entry.status !== 'removed' && <ins>{shortValue(entry.right, 28)}</ins>}
                  </span>
                  <span className="dd-item-index">{index + 1}</span>
                </button>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    )
  }

  return (
    <div className={`dd${inputsOpen ? '' : ' inputs-closed'}`}>
      <div className="dd-inputs card">
        <div className="dd-inputs-bar">
          <h1 className="dd-title">JSON 对比</h1>
          <span className="dd-subtle">按结构比较，键的顺序不影响结果</span>
          <span className="dd-flex" />
          <button className="btn btn-sm btn-quiet" type="button" onClick={importFromEditor}>
            <Icon name="import" size={16} />
            从编辑器带入
          </button>
          <button className="btn btn-sm btn-quiet" type="button" onClick={swap}>
            <Icon name="swap" size={16} />
            交换左右
          </button>
          <button
            className="btn btn-sm"
            type="button"
            aria-expanded={inputsOpen}
            onClick={() => setInputsOpen(!inputsOpen)}
          >
            <Icon name={inputsOpen ? 'chevronUp' : 'chevronDown'} size={16} />
            {inputsOpen ? '收起输入' : '编辑输入'}
          </button>
        </div>
        <div className="dd-inputs-grid">
          {renderInput('left')}
          {renderInput('right')}
        </div>
      </div>

      <section className="dd-result card" aria-label="对比结果">
        <header className="dd-toolbar">
          <div className="dd-counts" aria-live="polite">
            {result && entries.length > 0 ? (
              <>
                <span className="dd-total">
                  <b>{entries.length}</b> 处差异
                </span>
                {result.counts.changed > 0 && <span className="dd-count count-changed">修改 {result.counts.changed}</span>}
                {result.counts.added > 0 && <span className="dd-count count-added">新增 {result.counts.added}</span>}
                {result.counts.removed > 0 && <span className="dd-count count-removed">删除 {result.counts.removed}</span>}
              </>
            ) : (
              <span className="dd-total">{result ? '无差异' : '等待输入'}</span>
            )}
          </div>

          <div className="dd-options">
            <span className="dd-option-label">数组</span>
            <Segmented
              size="sm"
              ariaLabel="数组比较方式"
              options={ARRAY_OPTIONS}
              value={options.arrayMode}
              onChange={(arrayMode) => setOptions({ ...options, arrayMode })}
            />
            {options.arrayMode === 'key' && (
              <input
                className="dd-key-input"
                value={keyDraft}
                onChange={(event) => setKeyDraft(event.target.value)}
                onBlur={commitKeys}
                onKeyDown={(event) => event.key === 'Enter' && commitKeys()}
                placeholder={result?.matchedKeys.length ? `自动：${result.matchedKeys.join(', ')}` : '自动识别字段'}
                aria-label="用于配对数组项的字段，多个用逗号分隔"
                title="用于配对数组项的字段，多个用逗号分隔；留空时自动识别 id、uniqKey、name 等"
                spellCheck={false}
              />
            )}
            <label className="dd-check">
              <input
                type="checkbox"
                checked={options.loose}
                onChange={(event) => setOptions({ ...options, loose: event.target.checked })}
              />
              1 与 "1" 视为相同
            </label>
            <label className="dd-check">
              <input type="checkbox" checked={onlyDiff} onChange={(event) => setOnlyDiff(event.target.checked)} />
              折叠相同内容
            </label>
          </div>

          <div className="dd-nav">
            <span className="dd-nav-pos">
              {entries.length ? `${activeIndex === -1 ? '–' : activeIndex + 1} / ${entries.length}` : ''}
            </span>
            <button className="icon-btn" type="button" title="上一处 (K)" aria-label="上一处差异" disabled={!entries.length} onClick={() => step(-1)}>
              <Icon name="chevronUp" />
            </button>
            <button className="icon-btn" type="button" title="下一处 (J)" aria-label="下一处差异" disabled={!entries.length} onClick={() => step(1)}>
              <Icon name="chevronDown" />
            </button>
          </div>
        </header>
        <div className="dd-result-body">{renderResult()}</div>
      </section>

      <div className="toast-layer" aria-live="polite">
        {toast && (
          <div className="toast" key={toast.id}>
            {toast.text}
          </div>
        )}
      </div>
    </div>
  )
}
