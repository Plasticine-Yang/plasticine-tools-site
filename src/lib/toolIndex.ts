/** Two-digit folio number shared by the sidebar index and each tool's eyebrow. */
export function formatToolIndex(index: number): string {
  return String(index + 1).padStart(2, '0')
}
