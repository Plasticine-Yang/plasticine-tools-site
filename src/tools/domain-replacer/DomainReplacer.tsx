import { useMemo, useState } from 'react'
import { useLocalStorage } from '../../lib/useLocalStorage'
import { useCopy } from '../../lib/useCopy'
import type { ToolProps } from '../registry'
import { normalizeDomain, replaceOriginInLines } from './transform'
import type { LineResult } from './transform'

type OkLine = Extract<LineResult, { kind: 'ok' }>

const EXAMPLE_INPUT = 'http://192.168.1.100:8800/s/example-path?viewToken=EXAMPLE_TOKEN_1234567890'

export default function DomainReplacer(_props: ToolProps) {
  const [baseDomain, setBaseDomain] = useLocalStorage('domain-replacer:base-domain', '')
  const [keepScheme, setKeepScheme] = useLocalStorage('domain-replacer:keep-scheme', true)
  const [input, setInput] = useState('')
  const { copy, copiedId } = useCopy()

  const normalizedDomain = useMemo(() => normalizeDomain(baseDomain), [baseDomain])
  const results = useMemo(
    () => (input.trim() ? replaceOriginInLines(input, baseDomain, keepScheme) : []),
    [input, baseDomain, keepScheme],
  )

  const lineCount = useMemo(() => input.split('\n').filter((line) => line.trim()).length, [input])
  const okResults = results.filter((line): line is OkLine => line.kind === 'ok')
  const errorCount = results.filter((line) => line.kind === 'error').length
  const outputText = okResults.map((line) => line.output).join('\n')

  return (
    <div className="dr">
      <div className="dr-main">
        <section className="card">
          <header className="card-head">
            <div>
              <h1 className="card-title">域名替换</h1>
              <p className="card-sub">把链接里的 IP 与端口换成域名，路径、参数和锚点原样保留</p>
            </div>
            <span className="chip">{lineCount ? `${lineCount} 条链接` : '等待输入'}</span>
          </header>
          <div className="card-body">
            <textarea
              id="sourceLinks"
              className="field field-area"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={'每行一个链接，例如\nhttps://192.168.1.100:8800/path?view=detail'}
              spellCheck={false}
              aria-label="原始链接，每行一个"
            />
          </div>
          <footer className="card-foot">
            <button className="btn" type="button" onClick={() => setInput(EXAMPLE_INPUT)}>
              填入示例
            </button>
            <button className="btn btn-quiet" type="button" onClick={() => setInput('')} disabled={!input}>
              清空
            </button>
          </footer>
        </section>

        <section className="card">
          <header className="card-head">
            <div>
              <h2 className="card-title">替换结果</h2>
              <p className="card-sub">
                {results.length
                  ? `${okResults.length} 条成功${errorCount ? `，${errorCount} 条无法转换` : ''}`
                  : '粘贴链接后即时出现在这里'}
              </p>
            </div>
            <button
              className="btn btn-primary"
              type="button"
              disabled={okResults.length === 0}
              onClick={() => copy(outputText, 'all')}
            >
              {copiedId === 'all' ? '已复制' : '复制全部'}
            </button>
          </header>
          {results.length > 0 && (
            <div className="result-list" aria-live="polite">
              {results.map((line, lineIndex) => {
                if (line.kind === 'empty') return null
                if (line.kind === 'error') {
                  return (
                    <div key={lineIndex} className="result-item is-error">
                      <div className="result-source">{line.input}</div>
                      <div className="result-error">{line.error}</div>
                    </div>
                  )
                }
                const copyId = `line-${lineIndex}`
                return (
                  <div key={lineIndex} className="result-item">
                    <div className="result-source">{line.input}</div>
                    <div className="result-row">
                      <code className="result-output">{line.output}</code>
                      <button
                        className="btn btn-sm"
                        type="button"
                        aria-label={`复制第 ${lineIndex + 1} 条结果`}
                        onClick={() => copy(line.output, copyId)}
                      >
                        {copiedId === copyId ? '已复制' : '复制'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <aside className="dr-side">
        <section className="card">
          <header className="card-head">
            <h2 className="card-title">基准域名</h2>
          </header>
          <div className="card-body">
            <input
              id="baseDomain"
              className="field"
              type="text"
              value={baseDomain}
              onChange={(event) => setBaseDomain(event.target.value)}
              placeholder="foo.example.com"
              spellCheck={false}
              autoComplete="off"
              aria-label="基准域名"
              aria-invalid={Boolean(baseDomain.trim()) && !normalizedDomain}
            />
            <p className="hint" aria-live="polite">
              {normalizedDomain && normalizedDomain !== baseDomain.trim()
                ? `将使用 ${normalizedDomain}`
                : '协议和结尾斜杠会自动去掉，刷新后仍保留'}
            </p>
          </div>
        </section>

        <section className="card">
          <header className="card-head">
            <h2 className="card-title">设置</h2>
          </header>
          <div className="card-body">
            <label className="toggle-row">
              <span>
                保留原链接协议
                <small>关闭后统一使用 http</small>
              </span>
              <span className="toggle">
                <input
                  type="checkbox"
                  checked={keepScheme}
                  onChange={(event) => setKeepScheme(event.target.checked)}
                />
                <span />
              </span>
            </label>
          </div>
        </section>
      </aside>
    </div>
  )
}
