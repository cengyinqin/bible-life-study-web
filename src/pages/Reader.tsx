import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { fetchBook, BookData } from '../hooks/useBook'
import { useSettings, getFontSizePx, Theme, FontSize } from '../store/settings'
import { useReading } from '../store/reading'
import { IconArrowLeft, IconArrowRight, IconList } from '../components/Icons'

export default function Reader() {
  const { bookId, articleIdx } = useParams<{ bookId: string; articleIdx: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fromSearch = searchParams.get('from') === 'search'
  const aidx = parseInt(articleIdx || '0', 10)

  const theme = useSettings((s) => s.theme)
  const fontSize = useSettings((s) => s.fontSize)
  const setTheme = useSettings((s) => s.setTheme)
  const setFontSize = useSettings((s) => s.setFontSize)
  const saveProgress = useSettings((s) => s.saveProgress)
  const addReadingTime = useReading((s) => s.addReadingTime)
  const markArticleRead = useReading((s) => s.markArticleRead)
  const addToHistory = useReading((s) => s.addToHistory)

  const [book, setBook] = useState<BookData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [article, setArticle] = useState<{ title: string; content: string } | null>(null)
  const [showControls, setShowControls] = useState(false)
  const [scrollPct, setScrollPct] = useState(0)
  const [showScrollbar, setShowScrollbar] = useState(false)
  const scrollbarTimer = useRef<ReturnType<typeof setTimeout>>()
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => { return () => { if (scrollbarTimer.current) clearTimeout(scrollbarTimer.current) } }, [])

  // Fetch book
  useEffect(() => {
    if (!bookId) return
    setLoading(true); setError(null)
    fetchBook(bookId)
      .then((data) => {
        setBook(data)
        if (aidx >= 0 && aidx < data.articles.length) {
          setArticle(data.articles[aidx])
        } else { setError('文章不存在') }
      })
      .catch((e) => { console.error(e); setError('加载失败，请检查网络后重试') })
      .finally(() => setLoading(false))
  }, [bookId, aidx])

  // Scroll to top
  useEffect(() => { if (contentRef.current) contentRef.current.scrollTop = 0; setScrollPct(0) }, [aidx])

  // Save progress (debounced)
  useEffect(() => {
    if (!article || loading || !bookId) return
    const timer = setTimeout(() => saveProgress(bookId, aidx, scrollPct), 800)
    return () => clearTimeout(timer)
  }, [bookId, aidx, scrollPct, article, loading, saveProgress])

  // Mark read + history
  useEffect(() => {
    if (article && !loading && book && !fromSearch) {
      markArticleRead(bookId!, aidx)
      addToHistory({
        bookId: bookId!, articleIdx: aidx,
        articleTitle: article.title, bookName: book.bookName,
        timestamp: Date.now(),
      })
    }
  }, [bookId, aidx, article, loading, fromSearch])

  // Reading timer
  useEffect(() => {
    if (loading || fromSearch) return
    let seconds = 0
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        seconds++
        if (seconds % 30 === 0) addReadingTime(30)
      }
    }, 1000)
    return () => {
      const remaining = seconds % 30
      if (remaining > 0) addReadingTime(remaining)
      clearInterval(interval)
    }
  }, [bookId, aidx, loading, fromSearch, addReadingTime])

  const handleScroll = useCallback(() => {
    const el = contentRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    setScrollPct(scrollHeight <= clientHeight ? 1 : Math.min(scrollTop / (scrollHeight - clientHeight), 1))
    if (showControls) setShowControls(false)
    setShowScrollbar(true)
    if (scrollbarTimer.current) clearTimeout(scrollbarTimer.current)
    scrollbarTimer.current = setTimeout(() => setShowScrollbar(false), 1200)
  }, [showControls])

  const handleContentClick = useCallback(() => { setShowControls((v) => !v) }, [])

  const themeLabel: Record<Theme, string> = { light: '白', dark: '暗', sepia: '护' }
  const fontSizeLabel: Record<FontSize, string> = { small: '小', medium: '中', large: '大', xlarge: '特大' }

  if (loading) return <div className="reader-container"><div className="loading">加载中...</div></div>
  if (error) return <div className="reader-container"><div className="empty-state"><p>{error}</p><button className="btn-back" onClick={() => navigate(-1)} style={{ marginTop: 16 }}>返回</button></div></div>
  if (!article) return <div className="reader-container"><div className="empty-state"><p>文章不存在</p></div></div>

  const paragraphs = article.content.split('\n').map((p) => p.trim()).filter(Boolean)
  const hasPrev = aidx > 0
  const hasNext = book ? aidx < book.articles.length - 1 : false

  return (
    <div className="reader-container">
      <div className={`reader-overlay ${showControls ? 'visible' : ''}`} onClick={() => setShowControls(false)}>
        <div className="reader-top-bar" onClick={(e) => e.stopPropagation()}>
          <button className="btn-back" onClick={() => navigate(`/book/${bookId}`)}><IconArrowLeft size={18} /></button>
          <span className="reader-book-title">{book?.bookName || ''}</span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>{aidx + 1}/{book?.articles.length || 0}</span>
        </div>
        <div className="reader-bottom-bar" onClick={(e) => e.stopPropagation()}>
          <div className="theme-group">
            {(['light', 'sepia', 'dark'] as Theme[]).map((t) => (
              <button key={t} className={`theme-btn ${theme === t ? 'active' : ''}`} onClick={() => setTheme(t)}>{themeLabel[t]}</button>
            ))}
          </div>
          <button className="reader-control-btn" onClick={() => { const s: FontSize[] = ['small', 'medium', 'large', 'xlarge']; setFontSize(s[(s.indexOf(fontSize) + 1) % 4]) }}><span className="font-label">{fontSizeLabel[fontSize]}</span></button>
          <Link to={`/book/${bookId}`} className="reader-control-btn" style={{ textDecoration: 'none' }}><IconList size={18} /></Link>
        </div>
      </div>

      <div className="reader-progress" style={{ width: `${scrollPct * 100}%` }} />
      <div className={`reader-scrollbar ${showScrollbar ? 'visible' : ''}`}><div className="reader-scrollbar-thumb" style={{ height: `${Math.max(scrollPct * 100, 2)}%` }} /></div>

      <div ref={contentRef} className="reader-content" onScroll={handleScroll} onClick={handleContentClick}>
        <div className="reader-text" style={{ fontSize: getFontSizePx(fontSize) }}>
          <h2>{article.title}</h2>
          {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
        </div>
        <div className="chapter-nav">
          {hasPrev ? <Link to={`/reader/${bookId}/${aidx - 1}`} className="chapter-nav-btn"><IconArrowLeft size={14} /> 上一篇</Link> : <span />}
          {hasNext ? <Link to={`/reader/${bookId}/${aidx + 1}`} className="chapter-nav-btn">下一篇 <IconArrowRight size={14} /></Link> : <span />}
        </div>
      </div>
    </div>
  )
}
