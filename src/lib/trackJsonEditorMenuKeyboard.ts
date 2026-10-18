const NAVIGATION_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'Tab',
  'Enter',
  ' ',
])

/**
 * vanilla-jsoneditor focuses the first item of a context menu as soon as it
 * opens, so mouse users see a "hovered" first row they never touched. Track
 * whether the menu is actually being driven by the keyboard and let CSS decide
 * when to paint the focus state.
 */
export function trackJsonEditorMenuKeyboard(): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    if (!NAVIGATION_KEYS.has(event.key)) return
    const target = document.activeElement
    if (!(target instanceof Element)) return
    target.closest('.jse-contextmenu[role="menu"]')?.classList.add('is-keyboard')
  }

  const onPointerMove = (event: PointerEvent) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const menu = target.closest('.jse-contextmenu[role="menu"]')
    if (menu?.classList.contains('is-keyboard')) menu.classList.remove('is-keyboard')
  }

  document.addEventListener('keydown', onKeyDown, true)
  document.addEventListener('pointermove', onPointerMove, true)

  return () => {
    document.removeEventListener('keydown', onKeyDown, true)
    document.removeEventListener('pointermove', onPointerMove, true)
  }
}
