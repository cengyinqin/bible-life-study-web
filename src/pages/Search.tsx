import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchIndex, fetchBook, IndexData } from '../hooks/useBook'
import { IconFolder, IconSearch, IconX, IconArrowLeft, IconArrowRight, IconArrowUp, IconArrowDown } from '../components/Icons'
import { App } from '@capacitor/app'

// ── Canonical Bible book order (bookId → order number) ─
const BOOK_ORDER: Record<string, number> = {
  gen:1, exo:2, lev:3, num:4, deu:5, jos:6, jdg:7, rut:8, '1sa':9, '2sa':10,
  '1ki':11, '2ki':12, '1ch':13, '2ch':14, ezr:15, neh:16, est:17, job:18, psa:19,
  pro:20, ecc:21, sos:22, isa:23, jer:24, lam:25, eze:26, dan:27, hos:28, jol:29,
  amo:30, oba:31, jon:32, mic:33, nam:34, hab:35, zep:36, hag:37, zec:38, mal:39,
  mat:40, mrk:41, luk:42, jhn:43, act:44, rom:45, '1co':46, '2co':47, gal:48, eph:49,
  php:50, col:51, '1th':52, '2th':53, '1ti':54, '2ti':55, tit:56, phm:57, heb:58, jas:59,
  '1pe':60, '2pe':61, '1jn':62, '2jn':63, '3jn':64, jud:65, rev:66,
}

// ── Types ──────────────────────────────────────────────
interface SearchEntry { b: string; bn: string; a: number; at: string; t: string }
type Level = 'L1' | 'L2' | 'L3'
interface L2State { bookId: string; bookName: string }
interface L3State { bookId: string; articleIdx: number; articleTitle: string }
type PickerLevel = 'categories' | 'books'
interface PickerBook { bookId: string; name: string; articleCount: number }

// ── Highlight helpers ──────────────────────────────────
function splitHighlight(text: string, keyword: string): string[] {
  if (!keyword.trim()) return [text]
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.split(new RegExp(`(${escaped})`, 'gi'))
}
function isMatch(part: string, keyword: string): boolean { return part.toLowerCase() === keyword.toLowerCase() }
function flash(el: HTMLElement) {
  el.style.background = '#f0a040'; el.style.transition = 'background 0.3s'
  setTimeout(() => { el.style.background = '' }, 1500)
}

// ── Component ──────────────────────────────────────────
export default function Search() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [searchData, setSearchData] = useState<SearchEntry[] | null>(null)
  const [index, setIndex] = useState<IndexData | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [level, setLevel] = useState<Level>('L1')
  const [l2, setL2] = useState<L2State | null>(null)
  const [l3, setL3] = useState<L3State | null>(null)
  const [l3Content, setL3Content] = useState('')
  const [l3Loading, setL3Loading] = useState(false)
  const levelRef = useRef(level); levelRef.current = level
  const l2Ref = useRef(l2); l2Ref.current = l2

  // Picker state
  const [showPicker, setShowPicker] = useState(false)
  const [pickerLevel, setPickerLevel] = useState<PickerLevel>('categories')
  const [pickerTestamentId, setPickerTestamentId] = useState('')
  const [pickerCategory, setPickerCategory] = useState('')
  const [pickerBooks, setPickerBooks] = useState<PickerBook[]>([])

  useEffect(() => { fetchIndex().then(setIndex) }, [])

  // ── System back ────────────────────────────────────────
  const pushedForLevel = useRef(false)
  useEffect(() => {
    if (level !== 'L1' && !pushedForLevel.current) { window.history.pushState({ searchLevel: level }, ''); pushedForLevel.current = true }
    if (level === 'L1') pushedForLevel.current = false
  }, [level])
  useEffect(() => {
    const handleBack = () => {
      const cur = levelRef.current
      if (cur === 'L3') { if (l2Ref.current) setLevel('L2'); else setLevel('L1') }
      else if (cur === 'L2') { setLevel('L1'); setL2(null) }
    }
    window.addEventListener('popstate', handleBack)
    let bl: any = null
    try { bl = App.addListener('backButton', ({ canGoBack }) => { if (levelRef.current !== 'L1') handleBack(); else if (!canGoBack) App.exitApp() }) } catch {}
    return () => { window.removeEventListener('popstate', handleBack); if (bl?.remove) bl.remove() }
  }, [])

  const loadSearchData = useCallback(() => {
    if (!searchData && !searchLoading) { setSearchLoading(true); fetch('/data/search-index.json').then(r => r.json()).then(setSearchData).catch(console.error).finally(() => setSearchLoading(false)) }
  }, [searchData, searchLoading])

  const q = query.trim()

  const allResults = useMemo(() => {
    if (!q || !searchData) return []
    const lower = q.toLowerCase(); const r: SearchEntry[] = []
    for (const e of searchData) { if (e.at.toLowerCase().includes(lower) || e.t.toLowerCase().includes(lower)) { r.push(e); if (r.length >= 200) break } }
    return r
  }, [q, searchData])

  // Group by book, sorted by canonical Bible order
  const grouped = useMemo(() => {
    const map = new Map<string, { bookId: string; bookName: string; entries: SearchEntry[] }>()
    for (const r of allResults) {
      if (!map.has(r.b)) map.set(r.b, { bookId: r.b, bookName: r.bn, entries: [] })
      map.get(r.b)!.entries.push(r)
    }
    return Array.from(map.values()).sort((a, b) => (BOOK_ORDER[a.bookId] || 99) - (BOOK_ORDER[b.bookId] || 99))
  }, [allResults])

  const l2Results = useMemo(() => {
    if (!l2 || !searchData) return []
    if (q) { const lower = q.toLowerCase(); return searchData.filter(e => e.b === l2.bookId && (e.at.toLowerCase().includes(lower) || e.t.toLowerCase().includes(lower))) }
    return searchData.filter(e => e.b === l2.bookId)
  }, [l2, searchData, q])

  const resultBooks = useMemo(() => {
    if (!q || !searchData) return new Set<string>()
    const s = new Set<string>(); for (const r of allResults) s.add(r.b); return s
  }, [allResults, q, searchData])

  // ── Handlers ─────────────────────────────────────────
  const goL2 = (bookId: string, bookName: string) => { setL2({ bookId, bookName }); setLevel('L2') }
  const goL3ReqId = useRef(0)
  const goL3 = async (bookId: string, articleIdx: number, articleTitle: string) => {
    const reqId = ++goL3ReqId.current; setL3({ bookId, articleIdx, articleTitle }); setL3Loading(true); setL3Content(''); setLevel('L3')
    try { const book = await fetchBook(bookId); if (reqId !== goL3ReqId.current) return; setL3Content(book.articles[articleIdx]?.content || ''); setL3Loading(false) }
    catch { if (reqId === goL3ReqId.current) { setL3Content(''); setL3Loading(false) } }
  }
  const goBack = () => {
    if (level === 'L3') { if (l2) setLevel('L2'); else setLevel('L1') }
    else if (level === 'L2') { setLevel('L1'); setL2(null) }
  }

  // ── Picker handlers ──────────────────────────────────
  const openPicker = () => { if (index) { setPickerTestamentId('new'); setPickerLevel('categories'); setShowPicker(true) } }
  const switchPickerTestament = (tid: string) => { setPickerTestamentId(tid) }
  const pickerSelectCategory = (catName: string) => {
    if (!index) return
    const testament = index.testaments.find(t => t.id === pickerTestamentId)
    const category = testament?.categories.find(c => c.name === catName)
    if (category) {
      setPickerBooks(category.books.map(b => ({ bookId: b.id, name: b.name, articleCount: b.articleCount })))
      setPickerCategory(catName); setPickerLevel('books')
    }
  }
  const pickerSelectBook = (book: PickerBook) => { goL2(book.bookId, book.name); setShowPicker(false) }
  const pickerBack = () => { if (pickerLevel === 'books') setPickerLevel('categories') }

  // ── Render ───────────────────────────────────────────
  return (
    <div className="app-shell">
      {level === 'L1' && (
        <div className="app-header search-header">
          <button className="picker-btn" onClick={openPicker}><IconFolder size={18} /></button>
          <div className="search-input-wrap">
            <span className="search-icon"><IconSearch size={16} /></span>
            <input className="search-input" type="text" placeholder="搜索生命读经..." value={query}
              onChange={e => setQuery(e.target.value)} onFocus={loadSearchData} autoFocus />
            {query && <button className="search-clear" onClick={() => setQuery('')}><IconX size={14} /></button>}
          </div>
        </div>
      )}
      {(level === 'L2' || level === 'L3') && (
        <div className="app-header">
          <button className="btn-back" onClick={goBack}><IconArrowLeft size={18} /></button>
          <h1>{level === 'L3' ? l3?.articleTitle : l2?.bookName}</h1>
        </div>
      )}
      <div className="app-content">
        {level === 'L1' && (
          <>
            {searchLoading && <div className="loading">加载搜索数据...</div>}
            {!searchData && !searchLoading && <div className="empty-state"><div className="icon"><IconSearch size={36} /></div><p>输入关键词搜索文章标题和内容</p></div>}
            {searchData && q && allResults.length === 0 && !searchLoading && <div className="empty-state"><p>未找到「{q}」</p></div>}
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
        {level === 'L2' && l2 && (
          <div className="search-results">
            <div className="search-result-count">{l2Results.length} 条匹配</div>
            {l2Results.map((e, i) => (
              <button key={i} className="search-result-item" onClick={() => goL3(e.b, e.a, e.at)}>
                <div className="search-chapter-title">{splitHighlight(e.at, q).map((p, j) => isMatch(p, q) ? <mark key={j} className="search-highlight">{p}</mark> : p)}</div>
                {e.t.toLowerCase().includes(q.toLowerCase()) && <Snippet text={e.t} keyword={q} />}
              </button>
            ))}
          </div>
        )}
        {level === 'L3' && l3 && <TextLocator content={l3Content} keyword={q} loading={l3Loading} />}
      </div>

      {/* ── Book Picker Panel ──────────────────── */}
      {showPicker && index && (
        <PickerPanel index={index} pickerLevel={pickerLevel}
          pickerTestamentId={pickerTestamentId} pickerCategory={pickerCategory}
          pickerBooks={pickerBooks}
          onClose={() => setShowPicker(false)}
          onSwitchTestament={switchPickerTestament}
          onSelectCategory={pickerSelectCategory}
          onSelectBook={pickerSelectBook}
          onBack={pickerBack} />
      )}
    </div>
  )
}

// ── Snippet ─────────────────────────────────────────────
function Snippet({ text, keyword }: { text: string; keyword: string }) {
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase()); if (idx === -1) return null
  const s = Math.max(0, idx - 25), e = Math.min(text.length, idx + keyword.length + 60)
  const snip = (s > 0 ? '…' : '') + text.slice(s, e) + (e < text.length ? '…' : '')
  return <div className="search-snippet">{splitHighlight(snip, keyword).map((p, i) => isMatch(p, keyword) ? <mark key={i} className="search-highlight">{p}</mark> : p)}</div>
}

// ── Text Locator (L3) ───────────────────────────────────
function TextLocator({ content, keyword, loading }: { content: string; keyword: string; loading: boolean }) {
  const markRefs = useRef<(HTMLElement | null)[]>([]); const currentRef = useRef(0)
  const [currentMatch, setCurrentMatch] = useState(0); const renderId = useRef(0)
  const { paragraphs, matchCount } = useMemo(() => {
    if (!content) return { paragraphs: [] as string[], matchCount: 0 }
    const lines = content.split('\n').filter(Boolean)
    if (!keyword.trim()) return { paragraphs: lines, matchCount: 0 }
    const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'); let c = 0
    for (const l of lines) { const m = l.match(regex); if (m) c += m.length }
    return { paragraphs: lines, matchCount: c }
  }, [content, keyword])
  useEffect(() => { renderId.current++; currentRef.current = 0; setCurrentMatch(0) }, [content, keyword])
  useEffect(() => {
    if (matchCount === 0) return; const id = renderId.current
    requestAnimationFrame(() => { requestAnimationFrame(() => { if (id !== renderId.current) return; const el = markRefs.current[0]; if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); flash(el) } }) })
  }, [content, keyword, matchCount])
  const scrollToMatch = (i: number) => { const el = markRefs.current[i]; if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); flash(el); currentRef.current = i; setCurrentMatch(i) } }
  if (loading) return <div className="loading">加载中...</div>
  if (!content) return <div className="empty-state"><p>暂无内容</p></div>
  return (
    <div className="locator-container">
      {matchCount > 0 && (
        <div className="locator-bar">
          <button className="locator-nav-btn" onClick={() => scrollToMatch((currentRef.current - 1 + matchCount) % matchCount)}><IconArrowUp size={14} /></button>
          <span className="locator-counter">{currentMatch + 1} / {matchCount}</span>
          <button className="locator-nav-btn" onClick={() => scrollToMatch((currentRef.current + 1) % matchCount)}><IconArrowDown size={14} /> 下一处</button>
        </div>
      )}
      <div className="locator-content">
        {matchCount === 0 && !keyword.trim() && paragraphs.map((p, i) => <p key={i} className="locator-p">{p}</p>)}
        {matchCount === 0 && keyword.trim() && <div className="empty-state"><p>本章未找到「{keyword}」</p></div>}
        {matchCount > 0 && <HighlightedText key={renderId.current} paragraphs={paragraphs} keyword={keyword} markRefs={markRefs} />}
      </div>
      {matchCount > 1 && (
        <div className="locator-fab">
          <button className="locator-fab-btn" onClick={() => scrollToMatch((currentRef.current - 1 + matchCount) % matchCount)}><IconArrowUp size={14} /></button>
          <span className="locator-fab-count">{currentMatch + 1}/{matchCount}</span>
          <button className="locator-fab-btn" onClick={() => scrollToMatch((currentRef.current + 1) % matchCount)}><IconArrowDown size={14} /></button>
        </div>
      )}
    </div>
  )
}

function HighlightedText({ paragraphs, keyword, markRefs }: { paragraphs: string[]; keyword: string; markRefs: React.MutableRefObject<(HTMLElement | null)[]> }) {
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'); let mi = 0
  return <>{paragraphs.map((p, pi) => {
    const parts = p.split(regex)
    return <p key={pi} className="locator-p">{parts.map((part, i) => {
      if (part.toLowerCase() === keyword.toLowerCase()) { const idx = mi++; return <mark key={i} className="locator-mark" ref={el => { markRefs.current[idx] = el }}>{part}</mark> }
      return part
    })}</p>
  })}</>
}

// ── Book Picker Panel (bottom sheet) ────────────────────
function PickerPanel({ index, pickerLevel, pickerTestamentId, pickerCategory, pickerBooks, onClose, onSwitchTestament, onSelectCategory, onSelectBook, onBack }: {
  index: IndexData; pickerLevel: string; pickerTestamentId: string; pickerCategory: string
  pickerBooks: PickerBook[]; onClose: () => void
  onSwitchTestament: (id: string) => void; onSelectCategory: (name: string) => void
  onSelectBook: (b: PickerBook) => void; onBack: () => void
}) {
  const testament = index.testaments.find(t => t.id === pickerTestamentId)
  return (
    <div className="picker-overlay" onClick={onClose}>
      <div className="picker-sheet" onClick={e => e.stopPropagation()}>
        <div className="picker-handle" />
        <div className="picker-header">
          {pickerLevel === 'books' && <button className="btn-back" onClick={onBack}><IconArrowLeft size={18} /></button>}
          <h2>{pickerLevel === 'books' ? pickerCategory : '选择书卷'}</h2>
          <button className="picker-close" onClick={onClose}><IconX size={16} /></button>
        </div>

        {/* Testament tabs (only on categories level) */}
        {pickerLevel === 'categories' && (
          <div className="testament-tabs" style={{ padding: '8px 16px 0' }}>
            <button
              className={`testament-tab ${pickerTestamentId === 'new' ? 'active' : ''}`}
              onClick={() => onSwitchTestament('new')}
            >新约</button>
            <button
              className={`testament-tab ${pickerTestamentId === 'old' ? 'active' : ''}`}
              onClick={() => onSwitchTestament('old')}
            >旧约</button>
          </div>
        )}

        <div className="picker-body">
          {pickerLevel === 'categories' && testament?.categories.map(c => (
            <button key={c.name} className="picker-series-card" onClick={() => onSelectCategory(c.name)}>
              <div className="picker-series-title">{c.name}</div>
              <div className="picker-series-count">{c.books.length} 卷</div>
            </button>
          ))}
          {pickerLevel === 'books' && pickerBooks.map(b => (
            <button key={b.bookId} className="picker-book-item" onClick={() => onSelectBook(b)}>
              <span className="picker-book-title">{b.name}</span>
              <span className="picker-book-count">{b.articleCount} 篇</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
