const MARGIN = 10

type Box = { top: number; left: number; right: number; bottom: number }

/**
 * The intersection of the viewport and every ancestor that clips overflow.
 * vanilla-jsoneditor anchors its popups inside the editor DOM, so a menu opened
 * near the bottom of a modal (or of the window) would otherwise be cut off.
 */
function clipBox(el: HTMLElement): Box {
  const box: Box = { top: 0, left: 0, right: window.innerWidth, bottom: window.innerHeight }
  let node = el.parentElement
  while (node) {
    const style = getComputedStyle(node)
    if (style.overflowX !== 'visible' || style.overflowY !== 'visible') {
      const rect = node.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        box.top = Math.max(box.top, rect.top)
        box.left = Math.max(box.left, rect.left)
        box.right = Math.min(box.right, rect.right)
        box.bottom = Math.min(box.bottom, rect.bottom)
      }
    }
    node = node.parentElement
  }
  return box
}

/** Nudge a context menu back inside the box that clips it. */
function fitMenu(content: HTMLElement) {
  // Reset any previous adjustment so the measurement starts from the library position.
  content.style.transform = ''
  content.style.maxHeight = ''
  content.style.overflowY = ''

  const rect = content.getBoundingClientRect()
  if (!rect.width || !rect.height) return

  const box = clipBox(content)
  const maxHeight = box.bottom - box.top - 2 * MARGIN
  let dx = 0
  let dy = 0

  if (rect.right > box.right - MARGIN) dx -= rect.right - (box.right - MARGIN)
  if (rect.left + dx < box.left + MARGIN) dx += box.left + MARGIN - (rect.left + dx)
  if (rect.bottom > box.bottom - MARGIN) dy -= rect.bottom - (box.bottom - MARGIN)
  if (rect.top + dy < box.top + MARGIN) dy += box.top + MARGIN - (rect.top + dy)

  // A menu taller than the available space scrolls instead of escaping the box.
  if (maxHeight > 0 && rect.height > maxHeight) {
    content.style.maxHeight = `${Math.round(maxHeight)}px`
    content.style.overflowY = 'auto'
    dy = box.top + MARGIN - rect.top
  }

  if (dx || dy) content.style.transform = `translate(${Math.round(dx)}px, ${Math.round(dy)}px)`
}

/** Keep editor context menus reachable when they open near a clipped edge. */
export function fitJsonEditorMenus(): () => void {
  let frame = 0

  const apply = () => {
    frame = 0
    document.querySelectorAll<HTMLElement>('.jse-contextmenu').forEach((menu) => {
      const content = menu.closest<HTMLElement>('.jse-absolute-popup-content')
      if (content) fitMenu(content)
    })
  }

  const schedule = () => {
    if (!frame) frame = window.requestAnimationFrame(apply)
  }

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        // The library mounts every menu inside a fresh `.jse-absolute-popup`.
        if (node instanceof Element && (node.classList.contains('jse-absolute-popup') || node.classList.contains('jse-contextmenu'))) {
          schedule()
          return
        }
      }
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })
  window.addEventListener('resize', schedule)

  return () => {
    observer.disconnect()
    window.removeEventListener('resize', schedule)
    if (frame) window.cancelAnimationFrame(frame)
  }
}
