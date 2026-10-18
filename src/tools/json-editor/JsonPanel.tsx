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
}

export function contentToText(content: Content): string {
  if ('text' in content) return content.text
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
  { initialText, mode, label, onModeChange, onTextChange, onClassName },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<JsonEditor | null>(null)
  const callbacks = useRef({ onModeChange, onTextChange })
  callbacks.current = { onModeChange, onTextChange }

  useEffect(() => {
    if (!hostRef.current) return
    const editor = createJSONEditor({
      target: hostRef.current,
      props: {
        content: { text: initialText },
        mode,
        ariaLabel: label,
        indentation: 2,
        onRenderMenu: renderMenu,
        onChange: (content: Content) => callbacks.current.onTextChange(contentToText(content)),
        onChangeMode: (next: Mode) => callbacks.current.onModeChange(next),
      },
    })
    editorRef.current = editor
    return () => {
      editorRef.current = null
      void editor.destroy()
    }
    // The editor owns its content after mount; later props are pushed via updateProps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      getText: () => (editorRef.current ? contentToText(editorRef.current.get()) : ''),
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
