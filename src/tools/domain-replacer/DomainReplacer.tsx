import { useMemo, useState } from 'react'
import { useLocalStorage } from '../../lib/useLocalStorage'
import { useCopy } from '../../lib/useCopy'
import { formatToolIndex } from '../../lib/toolIndex'
import type { ToolProps } from '../registry'
import { normalizeDomain, replaceOriginInLines } from './transform'
import type { LineResult } from './transform'

type OkLine = Extract<LineResult, { kind: 'ok' }>

const EXAMPLE_INPUT = 'http://192.168.1.100:8800/s/example-path?viewToken=EXAMPLE_TOKEN_1234567890'

const STEPS = ['设置基准域名', '粘贴原始链接', '复制转换结果']

export default function DomainReplacer({ index }: ToolProps) {
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
  const resultMeta = results.length
    ? `${okResults.length} 条成功${errorCount ? ` · ${errorCount} 条异常` : ''}`
    : 'OUTPUT / 03'

  return (
    <>
      <section className="intro">
        <div data-reveal>
          <div className="eyebrow">实用程序 · Nº {formatToolIndex(index)}</div>
          <h1>
            把链接换个<em>入口</em>
            <span className="dot">.</span>
          </h1>
          <p>
            将链接中的 IP 与端口批量替换为指定域名，同时完整保留原始路径、查询参数和锚点。所有处理都在当前浏览器中完成。
          </p>
        </div>
        <aside className="folio" data-reveal aria-label="操作步骤">
          <div className="folio-head">
            <span>操作索引</span>
            <span>01—03</span>
          </div>
          <ol className="folio-list">
            {STEPS.map((step, stepIndex) => (
              <li key={step} className={stepIndex === 0 ? 'active' : undefined}>
                <span>{formatToolIndex(stepIndex)}</span>
                {step}
              </li>
            ))}
          </ol>
        </aside>
      </section>

      <section className="workbench">
        <div className="section-rule">
          <span className="roman">I.</span>
          <span>转换工作台</span>
          <span className="section-meta">路径 · Query · Hash 原样保留</span>
        </div>

        <article className="panel" data-reveal>
          <header className="panel-head">
            <div className="panel-title">
              <b>基准配置</b>
              <span>CONFIG / 01</span>
            </div>
          </header>
          <div className="panel-body">
            <label htmlFor="baseDomain" className="field-label">
              <span>基准域名</span>
              <small>自动移除协议与结尾斜杠</small>
            </label>
            <input
              id="baseDomain"
              className="input"
              type="text"
              value={baseDomain}
              onChange={(event) => setBaseDomain(event.target.value)}
              placeholder="foo.example.com"
              spellCheck={false}
              autoComplete="off"
              aria-invalid={Boolean(baseDomain.trim()) && !normalizedDomain}
            />
            <p className="normalized" aria-live="polite">
              {normalizedDomain && normalizedDomain !== baseDomain.trim()
                ? `将使用：${normalizedDomain}`
                : ''}
            </p>
            <div className="switch-row">
              <div className="switch-copy">
                <b>保留原链接协议</b>
                <small>关闭后，所有结果统一使用 http</small>
              </div>
              <label className="switch" aria-label="保留原链接协议">
                <input
                  id="keepScheme"
                  type="checkbox"
                  checked={keepScheme}
                  onChange={(event) => setKeepScheme(event.target.checked)}
                />
                <span />
              </label>
            </div>
          </div>
        </article>

        <article className="panel" data-reveal>
          <header className="panel-head">
            <div className="panel-title">
              <b>原始链接</b>
              <span>INPUT / 02</span>
            </div>
            <div className="actions">
              <button className="btn" type="button" onClick={() => setInput(EXAMPLE_INPUT)}>
                填入示例
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => setInput('')}
                disabled={!input}
              >
                清空
              </button>
            </div>
          </header>
          <div className="panel-body">
            <label htmlFor="sourceLinks" className="field-label">
              <span>每行一个链接</span>
              <small>{lineCount} 条待处理</small>
            </label>
            <textarea
              id="sourceLinks"
              className="textarea"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={'https://192.168.1.100:8800/path?view=detail\nhttp://10.0.0.8:3000/docs#intro'}
              spellCheck={false}
            />
          </div>
        </article>

        <article className="panel" data-reveal>
          <header className="panel-head">
            <div className="panel-title">
              <b>替换结果</b>
              <span>{resultMeta}</span>
            </div>
            <div className="actions">
              <button
                className="btn btn-primary"
                type="button"
                disabled={okResults.length === 0}
                onClick={() => copy(outputText, 'all')}
              >
                {copiedId === 'all' ? '已复制' : '复制全部'}
              </button>
            </div>
          </header>
          <div className="panel-body" aria-live="polite">
            {results.length === 0 ? (
              <div className="result-empty">
                <div>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 7V5a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-2M7 6H5a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3H7Z" />
                  </svg>
                  <p>粘贴链接后，转换结果会即时出现在这里。</p>
                </div>
              </div>
            ) : (
              <>
                <div className="result-list">
                  {results.map((line, lineIndex) => {
                    if (line.kind === 'empty') return null
                    if (line.kind === 'error') {
                      return (
                        <div key={lineIndex} className="result-item error">
                          <div className="result-source">{line.input}</div>
                          <div className="error-copy">{line.error}</div>
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
                            className="copy-one"
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
                {errorCount > 0 && (
                  <p className="status-note">部分链接无法转换，请检查格式后重试。</p>
                )}
              </>
            )}
          </div>
        </article>
      </section>
    </>
  )
}
