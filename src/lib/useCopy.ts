import { useCallback, useState } from 'react'

/**
 * Copy text to the clipboard with a short-lived "copied" flag.
 */
export function useCopy(resetDelay = 1600) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copy = useCallback(
    async (text: string, id = 'default') => {
      if (!text) return
      try {
        await navigator.clipboard.writeText(text)
      } catch {
        // Fallback for insecure contexts where the Clipboard API is blocked.
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedId(id)
      window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), resetDelay)
    },
    [resetDelay],
  )

  return { copy, copiedId }
}
