import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchIndex, fetchBook, IndexData } from '../hooks/useBook'
import { IconFolder, IconSearch, IconX, IconArrowLeft, IconArrowRight, IconArrowUp, IconArrowDown } from '../components/Icons'
import { App } from '@capacitor/app'

// ── Types ──────────────────────────────────────────────
interface SearchEntry { b: string; bn: string; a: number; at: string; t: string }

type Level = 'L1' | 'L2' | 'L3'

interface L2State { bookId: string; bookName: string }
interface L3State { bookId: string; articleIdx: number; articleTitle: string }

// ── Highlight helpers ──────────────────────────────────
function splitHighlight(text: string, keyword: string): string[] {
  if (!keyword.trim()) return [text]
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.split(new RegExp(`(${escaped})`, 'gi'))
}
function isMatch(part: string, keyword: string): boolean {
  return part.toLowerCase() === keyword.toLowerCase()
}
function flash(el: HTMLElement) {
  el.style.background = '#f0a040'
  el.style.transition = 'background 0.3s'
  setTimeout(() => { el.style.background = '' }, 1500)
}

// ── Component ──────────────────────────────────────────
export default function Search() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [searchData, setSearchData] = useState<SearchEntry[] | null>(null)
  const [index, setIndex] = useState<IndexData | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)

  // Internal navigation
  const [level, setLevel] = useState<Level>('L1')
  const [l2, setL2] = useState<L2State | null>(null)
  const [l3, setL3] = useState<L3State | null>(null)
  const [l3Content, setL3Content] = useState('')
  const [l3Loading, setL3Loading] = useState(false)
  const levelRef = useRef(level); levelRef.current = level
  const l2Ref = useRef(l2); l2Ref.current = l2

  // ── Load index ────────────────────────────────────────
  useEffect(() => { fetchIndex().then(setIndex) }, [])

  // ── System back button ────────────────────────────────
  const pushedForLevel = useRef(false)
  useEffect(() => {
    if (level !== 'L1' && !pushedForLevel.current) {
      window.history.pushState({ searchLevel: level }, '')
      pushedForLevel.current = true
    }
    if (level === 'L1') pushedForLevel.current = false
  }, [level])

  useEffect(() => {
    const handleBack = () => {
      const cur = levelRef.current
      if (cur === 'L3') {
        if (l2Ref.current) setLevel('L2')
        else setLevel('L1')
      } else if (cur === 'L2') {
        setLevel('L1'); setL2(null)
      }
    }
    window.addEventListener('popstate', handleBack)
    let backListener: any = null
    try {
      backListener = App.addListener('backButton', ({ canGoBack }) => {
        if (levelRef.current !== 'L1') handleBack()
        else if (!canGoBack) App.exitApp()
      })
    } catch {}
    return () => {
      window.removeEventListener('popstate', handleBack)
      if (backListener?.remove) backListener.remove()
    }
  }, [])

  const loadSearchData = useCallback(() => {
    if (!searchData && !searchLoading) {
      setSearchLoading(true)
      fetch('/data/search-index.json').then(r => r.json()).then(setSearchData)
        .catch(console.error).finally(() => setSearchLoading(false))
    }
  }, [searchData, searchLoading])

  const q = query.trim()

  // ── Search results ───────────────────────────────────
  const allResults = useMemo(() => {
    if (!q || !searchData) return []
    const lower = q.toLowerCase()
    const results: SearchEntry[] = []
    for (const e of searchData) {
      if (e.at.toLowerCase().includes(lower) || e.t.toLowerCase().includes(lower)) {
        results.push(e)
        if (results.length >= 200) break
      }
    }
    return results
  }, [q, searchData])

  // Group by book
  const grouped = useMemo(() => {
    const map = new Map<string, { bookId: string; bookName: string; entries: SearchEntry[] }>()
    for (const r of allResults) {
      if (!map.has(r.b)) map.set(r.b, { bookId: r.b, bookName: r.bn, entries: [] })
      map.get(r.b)!.entries.push(r)
    }
    return Array.from(map.values())
  }, [allResults])

  // L2 filtered
  const l2Results = useMemo(() => {
    if (!l2 || !searchData) return []
    if (q) {
      const lower = q.toLowerCase()
      return searchData.filter(e => e.b === l2.bookId &&
        (e.at.toLowerCase().includes(lower) || e.t.toLowerCase().includes(lower)))
    }
    return searchData.filter(e => e.b === l2.bookId)
  }, [l2, searchData, q])

  // Results books for picker filtering
  const resultBooks = useMemo(() => {
    if (!q || !searchData) return new Set<string>()
    const set = new Set<string>()
    for (const r of allResults) set.add(r.b)
    return set
  }, [allResults, q, searchData])

  // ── Handlers ─────────────────────────────────────────
  const goL2 = (bookId: string, bookName: string) => {
    setL2({ bookId, bookName })
    setLevel('L2')
  }

  const goL3ReqId = useRef(0)
  const goL3 = async (bookId: string, articleIdx: number, articleTitle: string) => {
    const reqId = ++goL3ReqId.current
    setL3({ bookId, articleIdx, articleTitle })
    setL3Loading(true); setL3Content(''); setLevel('L3')
    try {
      const book = await fetchBook(bookId)
      if (reqId !== goL3ReqId.current) return
      const article = book.articles[articleIdx]
      setL3Content(article?.content || '')
      setL3Loading(false)
    } catch {
      if (reqId === goL3ReqId.current) { setL3Content(''); setL3Loading(false) }
    }
  }

  const goBack = () => {
    if (level === 'L3') {
      if (l2) setLevel('L2')
      else setLevel('L1')
    } else if (level === 'L2') {
      setLevel('L1'); setL2(null)
    }
  }

  // ── Render ───────────────────────────────────────────
  return (
    <div className="app-shell">
      {/* L1 Header */}
      {level === 'L1' && (
        <div className="app-header search-header">
          <div className="search-input-wrap">
            <span className="search-icon"><IconSearch size={16} /></span>
            <input className="search-input" type="text" placeholder="搜索生命读经..."
              value={query} onChange={e => setQuery(e.target.value)}
              onFocus={loadSearchData} autoFocus />
            {query && <button className="search-clear" onClick={() => setQuery('')}><IconX size={14} /></button>}
          </div>
        </div>
      )}

      {/* L2/L3 Header */}
      {(level === 'L2' || level === 'L3') && (
        <div className="app-header">
          <button className="btn-back" onClick={goBack}><IconArrowLeft size={18} /></button>
          <h1>{level === 'L3' ? l3?.articleTitle : l2?.bookName}</h1>
        </div>
      )}

      <div className="app-content">
        {/* === L1 === */}
        {level === 'L1' && (
          <>
            {searchLoading && <div className="loading">加载搜索数据...</div>}
            {!searchData && !searchLoading && (
              <div className="empty-state">
                <div className="icon"><IconSearch size={36} /></div>
                <p>输入关键词搜索文章标题和内容</p>
              </div>
            )}
            {searchData && q && allResults.length === 0 && !searchLoading && (
              <div className="empty-state"><p>未找到「{q}」</p></div>
            )}
            {allResults.length > 0 && (
              <div className="search-results">
                <div className="search-result-count">找到 {allResults.length} 条</div>
                {grouped.map(g => (
                  <div key={g.bookId} className="search-group">
                    <div className="search-group-header">
                      <span className="search-book">{g.bookName}</span>
                      <span className="search-book-count">({g.entries.length}条)</span>
                    </div>
                    {g.entries.slice(0, 5).map((e, i) => (
                      <button key={i} className="search-result-item" onClick={() => goL3(e.b, e.a, e.at)}>
                        <div className="search-chapter-title">
                          {splitHighlight(e.at, q).map((p, j) => isMatch(p, q) ? <mark key={j} className="search-highlight">{p}</mark> : p)}
                        </div>
                        {e.t.toLowerCase().includes(q.toLowerCase()) && <Snippet text={e.t} keyword={q} />}
                      </button>
                    ))}
                    {g.entries.length > 5 && (
                      <button className="search-more-btn" onClick={() => goL2(g.bookId, g.bookName)}>
                        查看全部 {g.entries.length} 条 <IconArrowRight size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* === L2 === */}
        {level === 'L2' && l2 && (
          <div className="search-results">
            <div className="search-result-count">{l2Results.length} 条匹配</div>
            {l2Results.map((e, i) => (
              <button key={i} className="search-result-item" onClick={() => goL3(e.b, e.a, e.at)}>
                <div className="search-chapter-title">
                  {splitHighlight(e.at, q).map((p, j) => isMatch(p, q) ? <mark key={j} className="search-highlight">{p}</mark> : p)}
                </div>
                {e.t.toLowerCase().includes(q.toLowerCase()) && <Snippet text={e.t} keyword={q} />}
              </button>
            ))}
          </div>
        )}

        {/* === L3 === */}
        {level === 'L3' && l3 && (
          <TextLocator content={l3Content} keyword={q} loading={l3Loading} />
        )}
      </div>
    </div>
  )
}

// ── Snippet ─────────────────────────────────────────────
function Snippet({ text, keyword }: { text: string; keyword: string }) {
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase())
  if (idx === -1) return null
  const start = Math.max(0, idx - 25); const end = Math.min(text.length, idx + keyword.length + 60)
  const snippet = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
  return <div className="search-snippet">{splitHighlight(snippet, keyword).map((p, i) => isMatch(p, keyword) ? <mark key={i} className="search-highlight">{p}</mark> : p)}</div>
}

// ── Text Locator (L3) ───────────────────────────────────
function TextLocator({ content, keyword, loading }: { content: string; keyword: string; loading: boolean }) {
  const markRefs = useRef<(HTMLElement | null)[]>([])
  const currentRef = useRef(0)
  const [currentMatch, setCurrentMatch] = useState(0)
  const renderId = useRef(0)

  const { paragraphs, matchCount } = useMemo(() => {
    if (!content) return { paragraphs: [] as string[], matchCount: 0 }
    const lines = content.split('\n').filter(Boolean)
    if (!keyword.trim()) return { paragraphs: lines, matchCount: 0 }
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escaped, 'gi')
    let count = 0
    for (const line of lines) { const m = line.match(regex); if (m) count += m.length }
    return { paragraphs: lines, matchCount: count }
  }, [content, keyword])

  // Reset on content change
  useEffect(() => {
    renderId.current++
    currentRef.current = 0
    setCurrentMatch(0)
  }, [content, keyword])

  // Auto-scroll to first match after paint
  useEffect(() => {
    if (matchCount === 0) return
    const id = renderId.current
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (id !== renderId.current) return
        const el = markRefs.current[0]
        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); flash(el) }
      })
    })
  }, [content, keyword, matchCount])

  const scrollToMatch = (index: number) => {
    const el = markRefs.current[index]
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); flash(el); currentRef.current = index; setCurrentMatch(index) }
  }

  const goNext = () => { scrollToMatch((currentRef.current + 1) % matchCount) }
  const goPrev = () => { scrollToMatch((currentRef.current - 1 + matchCount) % matchCount) }

  if (loading) return <div className="loading">加载中...</div>
  if (!content) return <div className="empty-state"><p>暂无内容</p></div>

  return (
    <div className="locator-container">
      {matchCount > 0 && (
        <div className="locator-bar">
          <button className="locator-nav-btn" onClick={goPrev}><IconArrowUp size={14} /></button>
          <span className="locator-counter">{currentMatch + 1} / {matchCount}</span>
          <button className="locator-nav-btn" onClick={goNext}><IconArrowDown size={14} /> 下一处</button>
        </div>
      )}
      <div className="locator-content">
        {matchCount === 0 && !keyword.trim() && paragraphs.map((p, i) => <p key={i} className="locator-p">{p}</p>)}
        {matchCount === 0 && keyword.trim() && <div className="empty-state"><p>本章未找到「{keyword}」</p></div>}
        {matchCount > 0 && <HighlightedText key={renderId.current} paragraphs={paragraphs} keyword={keyword} markRefs={markRefs} />}
      </div>
      {matchCount > 1 && (
        <div className="locator-fab">
          <button className="locator-fab-btn" onClick={goPrev}><IconArrowUp size={14} /></button>
          <span className="locator-fab-count">{currentMatch + 1}/{matchCount}</span>
          <button className="locator-fab-btn" onClick={goNext}><IconArrowDown size={14} /></button>
        </div>
      )}
    </div>
  )
}

// ── Highlighted Text ────────────────────────────────────
function HighlightedText({ paragraphs, keyword, markRefs }: {
  paragraphs: string[]; keyword: string; markRefs: React.MutableRefObject<(HTMLElement | null)[]>
}) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  let matchIdx = 0
  return (
    <>
      {paragraphs.map((p, pi) => {
        const parts = p.split(regex)
        return (
          <p key={pi} className="locator-p">
            {parts.map((part, i) => {
              if (part.toLowerCase() === keyword.toLowerCase()) {
                const idx = matchIdx++
                return <mark key={i} className="locator-mark" ref={el => { markRefs.current[idx] = el }} data-match={idx}>{part}</mark>
              }
              return part
            })}
          </p>
        )
      })}
    </>
  )
}
