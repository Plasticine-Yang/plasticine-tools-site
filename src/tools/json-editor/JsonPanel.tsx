import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { createJSONEditor, Mode } from 'vanilla-jsoneditor'
import type { Content, JsonEditor, MenuItem, OnClassName } from 'vanilla-jsoneditor'

export { Mode }

export type JsonPanelHandle = {
  /** Current document as text (pretty-printed when the editor holds parsed JSON). */
  getText: () => string
  /** Parsed document, or `undefined` when the text is not valid JSON. */
  getJson: () => unknown | undefined
  setText: (text: string) => void
  setJson: (json: unknown) => void
  /** Open the transform dialog on this document and hand the result to `onResult`. */
  transformTo: (onResult: (json: unknown) => void) => void
  focus: () => void
}

type Props = {
  initialText: string
  mode: Mode
  label: string
  onModeChange: (mode: Mode) => void
  onTextChange: (text: string) => void
  onClassName?: OnClassName
  /** Hide the built-in toolbar, navigation bar and status bar for a bare text input. */
  bare?: boolean
}

/**
 * The editor reports `{ json: undefined }` while an insertion is being
 * committed (the value does not exist yet). That is not a document, so give
 * callers `undefined` instead of letting `JSON.stringify` return it.
 */
export function contentToText(content: Content): string | undefined {
  if ('text' in content) return content.text
  if (content.json === undefined) return undefined
  return JSON.stringify(content.json, null, 2)
}

export function contentToJson(content: Content): unknown | undefined {
  if ('json' in content) return content.json
  try {
    return JSON.parse(content.text)
  } catch {
    return undefined
  }
}

/**
 * vanilla-jsoneditor has no i18n hook and hard-codes its banner copy in
 * English. The green success banner is the only transient message this panel
 * shows, so translate it in place and re-apply whenever Svelte re-renders it.
 */
const SUCCESS_TEXT: Record<string, string> = {
  'Do you want to format the JSON?': '要格式化这段 JSON 吗？',
  'The loaded JSON document was invalid but is successfully repaired.':
    '这段 JSON 原本不合法，已自动修复。',
  Format: '格式化',
  'No thanks': '不用了',
  Ok: '确定',
  'Repair manually instead': '改为手动修复',
}

const SUCCESS_TITLES: Record<string, string> = {
  'Format JSON: add proper indentation and new lines (Ctrl+I)':
    '格式化 JSON：补齐缩进与换行（Ctrl+I）',
  'Close this message': '关闭提示',
  'Accept the repaired document': '接受修复后的文档',
  'Leave the document unchanged and repair it manually instead': '保留原文档，改为手动修复',
}

function localizeSuccessBanner(root: HTMLElement) {
  for (const banner of root.querySelectorAll<HTMLElement>('.jse-message.jse-success')) {
    const walker = document.createTreeWalker(banner, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const value = node.nodeValue ?? ''
      const trimmed = value.trim()
      const translated = SUCCESS_TEXT[trimmed]
      if (translated && translated !== trimmed) node.nodeValue = value.replace(trimmed, translated)
    }
    for (const element of banner.querySelectorAll<HTMLElement>('[title]')) {
      const title = element.getAttribute('title') ?? ''
      const translated = SUCCESS_TITLES[title]
      if (translated) element.setAttribute('title', translated)
    }
  }
}

/** Skip the many mutations CodeMirror makes outside the banner. */
function touchesBanner(record: MutationRecord): boolean {
  const target = record.target
  const element = target instanceof Element ? target : target.parentElement
  if (element?.closest('.jse-message')) return true
  if (record.type !== 'childList') return false
  return [...record.addedNodes].some(
    (node) =>
      node instanceof Element &&
      (node.matches('.jse-message') || node.querySelector('.jse-message') !== null),
  )
}

/** The mode switch lives in our own panel header, so drop the built-in one. */
function renderMenu(items: MenuItem[]): MenuItem[] {
  const withoutModes = items.filter(
    (item) => !(item.type === 'button' && item.className?.includes('jse-group-button')),
  )
  // Remove a separator left dangling at the very start.
  while (withoutModes[0]?.type === 'separator') withoutModes.shift()
  return withoutModes
}

const JsonPanel = forwardRef<JsonPanelHandle, Props>(function JsonPanel(
  { initialText, mode, label, onModeChange, onTextChange, onClassName, bare = false },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<JsonEditor | null>(null)
  const callbacks = useRef({ onModeChange, onTextChange })
  callbacks.current = { onModeChange, onTextChange }

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const editor = createJSONEditor({
      target: host,
      props: {
        content: { text: initialText },
        mode,
        ariaLabel: label,
        indentation: 2,
        onRenderMenu: renderMenu,
        mainMenuBar: !bare,
        navigationBar: !bare,
        statusBar: !bare,
        askToFormat: !bare,
        onChange: (content: Content) => {
          const text = contentToText(content)
          // Insertion can report an undefined document for a tick; keep the
          // last valid text instead of blanking the panel.
          if (text !== undefined) callbacks.current.onTextChange(text)
        },
        onChangeMode: (next: Mode) => callbacks.current.onModeChange(next),
      },
    })
    editorRef.current = editor

    // The insert line is a visual indicator in vanilla-jsoneditor; only the
    // caret at its end can open the insert menu. We keep that caret as the
    // click anchor but hide it visually, so the hover line itself is the
    // affordance: clicking the line behaves exactly like clicking the caret.
    const insertArea = (event: MouseEvent): Element | null => {
      const target = event.target as Element | null
      const area = target?.closest('.jse-insert-area') ?? null
      if (!area) return null
      // The caret has its own handler; let it through untouched.
      if (target?.closest('.jse-context-menu-pointer')) return null
      return area
    }
    const onInsertMouseDown = (event: MouseEvent) => {
      if (event.button !== 0 || !insertArea(event)) return
      event.preventDefault()
      event.stopPropagation()
    }
    const onInsertClick = (event: MouseEvent) => {
      const area = insertArea(event)
      if (!area) return
      event.preventDefault()
      event.stopPropagation()
      area.querySelector<HTMLButtonElement>('.jse-context-menu-pointer')?.click()
    }
    host.addEventListener('mousedown', onInsertMouseDown, true)
    host.addEventListener('click', onInsertClick, true)

    return () => {
      host.removeEventListener('mousedown', onInsertMouseDown, true)
      host.removeEventListener('click', onInsertClick, true)
      editorRef.current = null
      void editor.destroy()
    }
    // The editor owns its content after mount; later props are pushed via updateProps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let queued = false
    const translate = () => {
      queued = false
      localizeSuccessBanner(host)
    }
    const observer = new MutationObserver((records) => {
      if (queued || !records.some(touchesBanner)) return
      queued = true
      queueMicrotask(translate)
    })
    observer.observe(host, { subtree: true, childList: true, characterData: true })
    translate()
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    editorRef.current?.updateProps({ mode })
  }, [mode])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    editor.updateProps({ onClassName: onClassName ?? (() => undefined) })
    void editor.refresh()
  }, [onClassName])

  useImperativeHandle(
    ref,
    () => ({
      getText: () => (editorRef.current ? (contentToText(editorRef.current.get()) ?? '') : ''),
      getJson: () => (editorRef.current ? contentToJson(editorRef.current.get()) : undefined),
      setText: (text) => {
        editorRef.current?.set({ text })
        callbacks.current.onTextChange(text)
      },
      setJson: (json) => {
        editorRef.current?.set({ json })
        callbacks.current.onTextChange(JSON.stringify(json, null, 2))
      },
      transformTo: (onResult) => {
        editorRef.current?.transform({
          onTransform: ({ transformedJson }) => onResult(transformedJson),
        })
      },
      focus: () => editorRef.current?.focus(),
    }),
    [],
  )

  return <div className="json-panel-editor" ref={hostRef} />
})

export default JsonPanel
