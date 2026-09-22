/**
 * Normalize a user-entered base domain: strip any scheme and trailing slashes.
 * e.g. "https://workspace-example.example.com/" -> "workspace-example.example.com"
 */
export function normalizeDomain(input: string): string {
  return input
    .trim()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
    .replace(/\/+$/, '')
}

export type TransformResult =
  | { ok: true; value: string }
  | { ok: false; error: string }

/**
 * Replace the origin (scheme + host + port) of `raw` with the configured base
 * domain while keeping the path, query string and hash untouched.
 */
export function replaceOrigin(raw: string, baseDomain: string, keepScheme = true): TransformResult {
  const source = raw.trim()
  if (!source) return { ok: false, error: '链接为空' }

  const domain = normalizeDomain(baseDomain)
  if (!domain) return { ok: false, error: '请先配置基准域名' }

  let url: URL
  try {
    url = new URL(source)
  } catch {
    return { ok: false, error: '不是合法的 URL（需要包含 http:// 或 https://）' }
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, error: '只支持 http / https 链接' }
  }

  const scheme = keepScheme ? url.protocol.replace(':', '') : 'http'
  return { ok: true, value: `${scheme}://${domain}${url.pathname}${url.search}${url.hash}` }
}

export type LineResult =
  | { kind: 'empty' }
  | { kind: 'ok'; input: string; output: string }
  | { kind: 'error'; input: string; error: string }

/**
 * Transform every non-empty line of a multi-line input, preserving blank lines
 * so the output keeps the same shape as the input.
 */
export function replaceOriginInLines(
  input: string,
  baseDomain: string,
  keepScheme = true,
): LineResult[] {
  return input.split('\n').map((line) => {
    const trimmed = line.trim()
    if (!trimmed) return { kind: 'empty' }
    const result = replaceOrigin(trimmed, baseDomain, keepScheme)
    return result.ok
      ? { kind: 'ok', input: trimmed, output: result.value }
      : { kind: 'error', input: trimmed, error: result.error }
  })
}
