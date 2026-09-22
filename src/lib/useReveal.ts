import { useEffect } from 'react'

/**
 * Fade/slide in every `[data-reveal]` element inside the current page once it
 * scrolls into view. Re-runs whenever `key` changes so switching tools animates
 * the freshly mounted content.
 */
export function useReveal(key?: string) {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
    if (nodes.length === 0) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      nodes.forEach((node) => node.classList.add('is-visible'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        })
      },
      { threshold: 0.12 },
    )

    nodes.forEach((node, index) => {
      node.style.transitionDelay = `${Math.min(index * 55, 220)}ms`
      observer.observe(node)
    })

    return () => observer.disconnect()
  }, [key])
}
