import { useEffect, useRef, useState } from 'react'
import { tools } from './tools/registry'
import { formatToolIndex } from './lib/toolIndex'
import { useReveal } from './lib/useReveal'
import { SAVED_EVENT } from './lib/useLocalStorage'

function getToolIdFromHash(): string {
  const id = window.location.hash.replace(/^#\/?/, '')
  return tools.some((tool) => tool.id === id) ? id : tools[0].id
}

/** "设置已在本地保存" — pulses whenever a tool persists a setting. */
function SavedState() {
  const ref = useRef<HTMLDivElement>(null)
  const [pulse, setPulse] = useState(0)

  useEffect(() => {
    const onSaved = () => setPulse((count) => count + 1)
    window.addEventListener(SAVED_EVENT, onSaved)
    return () => window.removeEventListener(SAVED_EVENT, onSaved)
  }, [])

  useEffect(() => {
    if (pulse === 0) return
    ref.current?.animate([{ opacity: 0.45 }, { opacity: 1 }], { duration: 320 })
  }, [pulse])

  return (
    <div className="saved" ref={ref}>
      设置已在本地保存
    </div>
  )
}

export default function App() {
  const [activeId, setActiveId] = useState(getToolIdFromHash)

  useEffect(() => {
    const onHashChange = () => setActiveId(getToolIdFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const activeIndex = Math.max(
    0,
    tools.findIndex((tool) => tool.id === activeId),
  )
  const active = tools[activeIndex] ?? tools[0]
  const ActiveComponent = active.component

  useReveal(activeId)

  const selectTool = (id: string) => {
    window.location.hash = `/${id}`
    setActiveId(id)
  }

  return (
    <div className="app">
      <div className="masthead">
        <span>
          <strong>Plasticine Tools</strong> · Vol. 01
        </span>
        <span className="edition">
          归档于 <strong>个人效率 / 浏览器工具</strong>
        </span>
        <span className="live">本地运行 · 数据不离开浏览器</span>
      </div>

      <div className="shell">
        <aside className="sidebar">
          <div className="sidebar-head">
            <a className="brand" href="#/" aria-label="Plasticine Tools 首页">
              <span className="brand-mark">P</span>
              <span>
                <span className="brand-name">Plasticine Tools</span>
                <span className="brand-caption">个人工具集合网站</span>
              </span>
            </a>
          </div>

          <div className="side-label">工具索引 · Index</div>
          <nav className="tool-nav" aria-label="工具列表">
            {tools.map((tool, index) => (
              <button
                key={tool.id}
                type="button"
                className="tool-item"
                aria-current={tool.id === active.id ? 'page' : undefined}
                onClick={() => selectTool(tool.id)}
              >
                <span className="tool-num">{formatToolIndex(index)}</span>
                <span>
                  <span className="tool-name">{tool.name}</span>
                  <span className="tool-desc">{tool.description}</span>
                </span>
                <span className="tool-arrow" aria-hidden="true">
                  ↗
                </span>
              </button>
            ))}
          </nav>

          <div className="side-note">
            <b>持续收录中</b>轻量工具，专注解决一件小事。
          </div>
        </aside>

        <main>
          <div className="workspace">
            <header className="workspace-top">
              <div className="crumb">
                工具 / <b>{active.name}</b>
              </div>
              <SavedState />
            </header>

            <ActiveComponent index={activeIndex} />

            <footer className="footer">
              <span>Plasticine Tools · 个人工具集合</span>
              <span>Browser-local · No upload</span>
            </footer>
          </div>
        </main>
      </div>
    </div>
  )
}
