import type { ComponentType } from 'react'
import DomainReplacer from './domain-replacer/DomainReplacer'

export type Tool = {
  id: string
  name: string
  description: string
  icon: string
  component: ComponentType
}

/**
 * Register new tools here. The sidebar and routing are generated from this list.
 */
export const tools: Tool[] = [
  {
    id: 'domain-replacer',
    name: '域名替换',
    description: '把链接中的 IP:端口 批量替换为配置的基准域名',
    icon: '🔗',
    component: DomainReplacer,
  },
]
