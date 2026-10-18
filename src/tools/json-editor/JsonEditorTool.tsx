import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { OnClassName } from 'vanilla-jsoneditor'
import Icon from '../../components/Icon'
import Segmented from '../../components/Segmented'
import { useCopy } from '../../lib/useCopy'
import { useLocalStorage } from '../../lib/useLocalStorage'
import JsonPanel, { Mode } from './JsonPanel'
import type { JsonPanelHandle } from './JsonPanel'
import { diffJson, pathKey } from './diff'
import { SAMPLE_LEFT, SAMPLE_RIGHT } from './samples'

type Side = 'left' | 'right'

type DocMeta = { name: string; mode: Mode }

const MODE_OPTIONS = [
  { value: Mode.text, label: '文本' },
  { value: Mode.tree, label: '树' },
  { value: Mode.table, label: '表格' },
]

const TEXT_KEY: Record<Side, string> = {
  left: 'plasticine-tools:json-editor:left-text',
  right: 'plasticine-tools:json-editor:right-text',
}

// 旧版本首次访问会写入一份示例。这里只用来识别并清掉那份副本，
// 新装/清空缓存后打开的是一张真正的空文档。
const LEGACY_SAMPLES = new Set([SAMPLE_LEFT, SAMPLE_RIGHT])

function readText(side: Side, fallback = '') {
  try {
    const stored = window.localStorage.getItem(TEXT_KEY[side])
    if (!stored) return fallback
    if (LEGACY_SAMPLES.has(stored)) {
      window.localStorage.removeItem(TEXT_KEY[side])
      return ''
    }
    return stored
  } catch {
    return fallback
  }
}

type Validity = { state: 'empty' } | { state: 'ok'; size: string } | { state: 'error' }

function describe(text: string): Validity {
  if (!text.trim()) return { state: 'empty' }
  try {
    JSON.parse(text)
  } catch {
    return { state: 'error' }
  }
  const bytes = new Blob([text]).size
  const size = bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
  return { state: 'ok', size }
}

function safeFileName(name: string) {
  const base = name.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'document'
  return base.toLowerCase().endsWith('.json') ? base : `${base}.json`
}

export default function JsonEditorTool() {
  const [meta, setMeta] = useLocalStorage<Record<Side, DocMeta>>('json-editor:docs', {
    left: { name: '原始数据', mode: Mode.text },
    right: { name: '对照数据', mode: Mode.tree },
  })
  const [texts, setTexts] = useState<Record<Side, string>>(() => ({
    left: readText('left'),
    right: readText('right'),
  }))
  const [comparing, setComparing] = useState(false)
  const [maximized, setMaximized] = useState<Side | null>(null)
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const { copy } = useCopy()

  const panels = { left: useRef<JsonPanelHandle>(null), right: useRef<JsonPanelHandle>(null) }
  const fileInputs = { left: useRef<HTMLInputElement>(null), right: useRef<HTMLInputElement>(null) }

  // Persist documents a moment after typing stops, so large files don't thrash storage.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(TEXT_KEY.left, texts.left)
        window.localStorage.setItem(TEXT_KEY.right, texts.right)
      } catch {
        // storage full or unavailable — editing still works in memory
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

  const updateMeta = (side: Side, patch: Partial<DocMeta>) =>
    setMeta((current) => ({ ...current, [side]: { ...current[side], ...patch } }))

  const setText = useCallback((side: Side, text: string) => {
    setTexts((current) => (current[side] === text ? current : { ...current, [side]: text }))
  }, [])
  const onLeftText = useCallback((text: string) => setText('left', text), [setText])
  const onRightText = useCallback((text: string) => setText('right', text), [setText])

  const validity = useMemo(
    () => ({ left: describe(texts.left), right: describe(texts.right) }),
    [texts],
  )

  const diff = useMemo(() => {
    if (!comparing) return null
    if (validity.left.state !== 'ok' || validity.right.state !== 'ok') return null
    return diffJson(JSON.parse(texts.left), JSON.parse(texts.right))
  }, [comparing, texts, validity])

  const classNames = useMemo(() => {
    if (!diff) return { left: undefined, right: undefined }
    const build =
      (marks: Map<string, string>): OnClassName =>
      (path) => {
        const kind = marks.get(pathKey(path))
        return kind ? `diff-${kind}` : undefined
      }
    return { left: build(diff.left), right: build(diff.right) }
  }, [diff])

  const toggleCompare = () => {
    if (comparing) {
      setComparing(false)
      return
    }
    if (validity.left.state !== 'ok' || validity.right.state !== 'ok') {
      say('两侧都需要是合法 JSON 才能对比')
      return
    }
    setComparing(true)
    setMaximized(null)
    // Differences are drawn on tree nodes, so bring both sides into tree view.
    setMeta((current) => ({
      left: { ...current.left, mode: Mode.tree },
      right: { ...current.right, mode: Mode.tree },
    }))
  }

  const copyAcross = (from: Side) => {
    const to: Side = from === 'left' ? 'right' : 'left'
    panels[to].current?.setText(panels[from].current?.getText() ?? '')
    say(`已复制到「${meta[to].name}」`)
  }

  const transformAcross = (from: Side) => {
    const to: Side = from === 'left' ? 'right' : 'left'
    if (validity[from].state !== 'ok') {
      say(`「${meta[from].name}」不是合法 JSON，无法转换`)
      return
    }
    panels[from].current?.transformTo((json) => {
      panels[to].current?.setJson(json)
      say(`转换结果已写入「${meta[to].name}」`)
    })
  }

  const newDoc = (side: Side) => {
    panels[side].current?.setText('')
    updateMeta(side, { name: side === 'left' ? '新文档 1' : '新文档 2' })
    panels[side].current?.focus()
  }

  const openFile = async (side: Side, file: File | undefined) => {
    if (!file) return
    const text = await file.text()
    panels[side].current?.setText(text)
    updateMeta(side, { name: file.name.replace(/\.json$/i, '') })
    say(`已打开 ${file.name}`)
  }

  const download = (side: Side) => {
    const text = panels[side].current?.getText() ?? ''
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = safeFileName(meta[side].name)
    link.click()
    URL.revokeObjectURL(url)
  }

  const copyDoc = (side: Side) => {
    void copy(panels[side].current?.getText() ?? '', side)
    say(`已复制「${meta[side].name}」全文`)
  }

  const renderStatus = (side: Side) => {
    const value = validity[side]
    if (comparing && diff) {
      const marks = side === 'left' ? diff.left.size : diff.right.size
      return (
        <span className={`status ${marks ? 'status-diff' : 'status-ok'}`}>
          {marks ? `${marks} 处标记` : '无差异'}
        </span>
      )
    }
    if (value.state === 'ok') return <span className="status status-ok">合法 · {value.size}</span>
    if (value.state === 'error') return <span className="status status-error">解析错误</span>
    return <span className="status">空文档</span>
  }

  const renderPanel = (side: Side) => (
    <section
      className="doc-card"
      aria-label={meta[side].name}
      data-hidden={maximized !== null && maximized !== side ? true : undefined}
    >
      <header className="doc-head">
        <div className="doc-title">
          <input
            className="doc-name"
            value={meta[side].name}
            onChange={(event) => updateMeta(side, { name: event.target.value })}
            aria-label="文档名称"
            spellCheck={false}
          />
          {renderStatus(side)}
        </div>
        <div className="doc-tools">
          <Segmented
            size="sm"
            ariaLabel="视图"
            options={MODE_OPTIONS}
            value={meta[side].mode}
            onChange={(mode) => updateMeta(side, { mode })}
          />
          <span className="doc-tools-gap" />
          <button className="icon-btn" type="button" title="新建" aria-label="新建文档" onClick={() => newDoc(side)}>
            <Icon name="file" />
          </button>
          <button
            className="icon-btn"
            type="button"
            title="打开文件"
            aria-label="打开文件"
            onClick={() => fileInputs[side].current?.click()}
          >
            <Icon name="open" />
          </button>
          <input
            ref={fileInputs[side]}
            type="file"
            accept=".json,application/json,text/plain"
            hidden
            onChange={(event) => {
              void openFile(side, event.target.files?.[0])
              event.target.value = ''
            }}
          />
          <button className="icon-btn" type="button" title="下载" aria-label="下载为文件" onClick={() => download(side)}>
            <Icon name="download" />
          </button>
          <button className="icon-btn" type="button" title="复制全文" aria-label="复制全文" onClick={() => copyDoc(side)}>
            <Icon name="copy" />
          </button>
          <button
            className="icon-btn"
            type="button"
            title={maximized === side ? '还原' : '最大化'}
            aria-label={maximized === side ? '还原布局' : '最大化此面板'}
            aria-pressed={maximized === side}
            onClick={() => setMaximized((current) => (current === side ? null : side))}
          >
            <Icon name={maximized === side ? 'collapse' : 'expand'} />
          </button>
        </div>
      </header>
      <div className="doc-body">
        <JsonPanel
          ref={panels[side]}
          initialText={texts[side]}
          mode={meta[side].mode}
          label={meta[side].name}
          onModeChange={(mode) => updateMeta(side, { mode })}
          onTextChange={side === 'left' ? onLeftText : onRightText}
          onClassName={classNames[side]}
        />
      </div>
    </section>
  )

  return (
    <div className={`json-tool${maximized ? ' is-maximized' : ''}`}>
      {renderPanel('left')}

      <nav className="rail" aria-label="两侧文档操作" data-hidden={maximized ? true : undefined}>
        <div className="rail-group">
          <span className="rail-label">复制</span>
          <div className="rail-pair">
            <button className="rail-btn" type="button" title="复制到左侧" aria-label="把右侧复制到左侧" onClick={() => copyAcross('right')}>
              <Icon name="arrowLeft" />
            </button>
            <button className="rail-btn" type="button" title="复制到右侧" aria-label="把左侧复制到右侧" onClick={() => copyAcross('left')}>
              <Icon name="arrowRight" />
            </button>
          </div>
        </div>
        <div className="rail-group">
          <span className="rail-label">转换</span>
          <div className="rail-pair">
            <button className="rail-btn" type="button" title="转换右侧，写入左侧" aria-label="转换右侧并写入左侧" onClick={() => transformAcross('right')}>
              <Icon name="arrowLeft" />
            </button>
            <button className="rail-btn" type="button" title="转换左侧，写入右侧" aria-label="转换左侧并写入右侧" onClick={() => transformAcross('left')}>
              <Icon name="arrowRight" />
            </button>
          </div>
        </div>
        <div className="rail-group">
          <span className="rail-label">差异</span>
          <button
            className="rail-compare"
            type="button"
            aria-pressed={comparing}
            onClick={toggleCompare}
          >
            <Icon name={comparing ? 'check' : 'compare'} size={16} />
            {comparing ? '对比中' : '对比'}
          </button>
          {comparing && diff && (
            <span className="rail-count" key={diff.count}>
              {diff.count ? (
                <>
                  <b>{diff.count}</b>处不同
                </>
              ) : (
                '完全一致'
              )}
            </span>
          )}
        </div>
      </nav>

      {renderPanel('right')}

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
