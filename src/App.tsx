import { useEffect, useState } from 'react'
import Segmented from './components/Segmented'
import { tools } from './tools/registry'

function getToolIdFromHash(): string {
  const id = window.location.hash.replace(/^#\/?/, '')
  return tools.some((tool) => tool.id === id) ? id : tools[0].id
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
  const active = tools[activeIndex]
  const ActiveComponent = active.component

  useEffect(() => {
    document.title = `${active.name} · Plasticine Tools`
  }, [active.name])

  const selectTool = (id: string) => {
    window.location.hash = `/${id}`
    setActiveId(id)
  }

  return (
    <div className={`app app-${active.layout}`}>
      <header className="topbar">
        <a className="brand" href="#/" aria-label="Plasticine Tools 首页">
          <span className="brand-mark" aria-hidden="true">
            P
          </span>
          <span className="brand-name">Plasticine Tools</span>
        </a>

        <Segmented
          ariaLabel="切换工具"
          options={tools.map((tool) => ({ value: tool.id, label: tool.name }))}
          value={active.id}
          onChange={selectTool}
        />

        <span className="topbar-note">数据只在本机浏览器处理</span>
      </header>

      <main className="stage" key={active.id}>
        <ActiveComponent index={activeIndex} />
      </main>
    </div>
  )
}
