import { useMemo, useState } from 'react'
import { useLocalStorage } from '../../lib/useLocalStorage'
import { useCopy } from '../../lib/useCopy'
import { normalizeDomain, replaceOriginInLines } from './transform'

const EXAMPLE_INPUT =
  'http://192.168.1.100:8800/s/example-path?viewToken=EXAMPLE_TOKEN_1234567890'

export default function DomainReplacer() {
  const [baseDomain, setBaseDomain] = useLocalStorage('domain-replacer:base-domain', '')
  const [keepScheme, setKeepScheme] = useLocalStorage('domain-replacer:keep-scheme', true)
  const [input, setInput] = useState('')
  const { copy, copiedId } = useCopy()

  const normalizedDomain = useMemo(() => normalizeDomain(baseDomain), [baseDomain])
  const results = useMemo(
    () => (input.trim() ? replaceOriginInLines(input, baseDomain, keepScheme) : []),
    [input, baseDomain, keepScheme],
  )

  const outputText = useMemo(
    () =>
      results
        .map((line) => (line.kind === 'ok' ? line.output : line.kind === 'error' ? '' : ''))
        .join('\n'),
    [results],
  )
  const hasOutput = results.some((line) => line.kind === 'ok')
  const hasError = results.some((line) => line.kind === 'error')

  return (
    <div className="tool">
      <header className="tool__header">
        <h1>域名替换</h1>
        <p>把链接里的 IP:端口 换成你配置的基准域名，路径、query 和 hash 原样保留。</p>
      </header>

      <section className="card">
        <label className="field">
          <span className="field__label">
            基准域名
            <span className="field__hint">会保存在本地，刷新不丢</span>
          </span>
          <input
            className="input"
            value={baseDomain}
            onChange={(event) => setBaseDomain(event.target.value)}
            placeholder="foo.example.com"
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        {normalizedDomain && normalizedDomain !== baseDomain.trim() && (
          <p className="note">将使用规范化后的域名：{normalizedDomain}</p>
        )}
        <label className="checkbox">
          <input
            type="checkbox"
            checked={keepScheme}
            onChange={(event) => setKeepScheme(event.target.checked)}
          />
          <span>保留原链接协议（关闭时统一使用 http）</span>
        </label>
      </section>

      <section className="card">
        <div className="card__head">
          <span className="field__label">原始链接</span>
          <div className="actions">
            <button className="btn btn--ghost" type="button" onClick={() => setInput(EXAMPLE_INPUT)}>
              填入示例
            </button>
            <button className="btn btn--ghost" type="button" onClick={() => setInput('')} disabled={!input}>
              清空
            </button>
          </div>
        </div>
        <textarea
          className="textarea"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={'每行一个链接，可批量转换\n' + EXAMPLE_INPUT}
          spellCheck={false}
        />
      </section>

      <section className="card">
        <div className="card__head">
          <span className="field__label">替换结果</span>
          <div className="actions">
            <button
              className="btn"
              type="button"
              disabled={!hasOutput}
              onClick={() => copy(outputText, 'all')}
            >
              {copiedId === 'all' ? '已复制' : '复制全部'}
            </button>
          </div>
        </div>

        {results.length === 0 && <p className="empty">粘贴链接后在这里查看结果</p>}

        {results.map((line, index) => {
          if (line.kind === 'empty') return <div key={index} className="result result--empty" />
          if (line.kind === 'error') {
            return (
              <div key={index} className="result result--error">
                <div className="result__input">{line.input}</div>
                <div className="result__error">{line.error}</div>
              </div>
            )
          }
          return (
            <div key={index} className="result">
              <div className="result__input">{line.input}</div>
              <div className="result__row">
                <code className="result__output">{line.output}</code>
                <button
                  className="btn btn--small"
                  type="button"
                  onClick={() => copy(line.output, `line-${index}`)}
                >
                  {copiedId === `line-${index}` ? '已复制' : '复制'}
                </button>
              </div>
            </div>
          )
        })}

        {hasError && <p className="note note--warn">部分链接无法转换，请检查是否为合法的 http/https 链接。</p>}
      </section>
    </div>
  )
}
