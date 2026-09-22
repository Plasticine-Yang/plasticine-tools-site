import type { ComponentType } from 'react'
import DomainReplacer from './domain-replacer/DomainReplacer'

export type ToolProps = {
  /** Position in the registry, used for the 01/02/... folio numbering. */
  index: number
}

export type Tool = {
  id: string
  name: string
  description: string
  component: ComponentType<ToolProps>
}

/**
 * Register new tools here. The sidebar and routing are generated from this list,
 * and the sidebar index (01, 02, ...) follows the array order.
 */
export const tools: Tool[] = [
  {
    id: 'domain-replacer',
    name: '域名替换',
    description: '批量替换链接来源，保留路径与参数',
    component: DomainReplacer,
  },
]
