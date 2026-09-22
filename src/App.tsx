import { useEffect, useState } from 'react'
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

  const selectTool = (id: string) => {
    window.location.hash = `/${id}`
    setActiveId(id)
  }

  const active = tools.find((tool) => tool.id === activeId) ?? tools[0]
  const ActiveComponent = active.component

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand__mark">🧰</span>
          <span className="brand__name">Plasticine Tools</span>
        </div>
        <nav className="nav">
          {tools.map((tool) => (
            <button
              key={tool.id}
              type="button"
              className={`nav__item${tool.id === active.id ? ' nav__item--active' : ''}`}
              onClick={() => selectTool(tool.id)}
            >
              <span className="nav__icon">{tool.icon}</span>
              <span className="nav__text">
                <span className="nav__name">{tool.name}</span>
                <span className="nav__desc">{tool.description}</span>
              </span>
            </button>
          ))}
        </nav>
        <div className="sidebar__foot">更多小工具持续添加中</div>
      </aside>

      <main className="content">
        <ActiveComponent />
      </main>
    </div>
  )
}
