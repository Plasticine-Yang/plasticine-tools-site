import type { ComponentType } from 'react'
import DomainReplacer from './domain-replacer/DomainReplacer'
import JsonEditorTool from './json-editor/JsonEditorTool'

export type ToolProps = {
  /** Position in the registry. */
  index: number
}

export type Tool = {
  id: string
  name: string
  description: string
  /** `workspace` fills the viewport below the top bar; `page` scrolls like a document. */
  layout: 'workspace' | 'page'
  component: ComponentType<ToolProps>
}

/**
 * Register new tools here. The top bar switch and routing are generated from
 * this list, in array order.
 */
export const tools: Tool[] = [
  {
    id: 'json-editor',
    name: 'JSON 编辑',
    description: '双栏编辑、转换与差异对比',
    layout: 'workspace',
    component: JsonEditorTool,
  },
  {
    id: 'domain-replacer',
    name: '域名替换',
    description: '批量替换链接来源，保留路径与参数',
    layout: 'page',
    component: DomainReplacer,
  },
]
