import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchIndex, IndexData } from '../hooks/useBook'
import { IconSearch as SearchIcon, IconX } from '../components/Icons'

interface SearchEntry { b: string; bn: string; a: number; at: string; t: string }

export default function Search() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [searchData, setSearchData] = useState<SearchEntry[] | null>(null)
  const [index, setIndex] = useState<IndexData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchIndex().then(setIndex) }, [])

  const loadData = () => {
    if (!searchData && !loading) {
      setLoading(true)
      fetch('/data/search-index.json').then(r => r.json()).then(setSearchData).catch(console.error).finally(() => setLoading(false))
    }
  }

  const results = useMemo(() => {
    if (!query.trim() || !searchData) return []
    const q = query.trim().toLowerCase()
    return searchData.filter(e => e.at.toLowerCase().includes(q) || e.t.toLowerCase().includes(q)).slice(0, 100)
  }, [query, searchData])

  const q = query.trim()

  return (
    <div className="app-shell">
      <div className="app-header search-header">
        <div className="search-input-wrap">
          <span className="search-icon"><SearchIcon size={16} /></span>
          <input className="search-input" type="text" placeholder="搜索生命读经..." value={query}
            onChange={e => setQuery(e.target.value)} onFocus={loadData} autoFocus />
          {query && <button className="search-clear" onClick={() => setQuery('')}><IconX size={14} /></button>}
        </div>
      </div>
      <div className="app-content">
        {loading && <div className="loading">加载搜索数据...</div>}
        {!searchData && !loading && <div className="empty-state"><div className="icon"><SearchIcon size={36} /></div><p>输入关键词搜索文章标题和内容</p></div>}
        {searchData && q && results.length === 0 && !loading && <div className="empty-state"><p>未找到「{q}」</p></div>}
        {results.length > 0 && (
          <div className="search-results">
            <div className="search-result-count">找到 {results.length} 条</div>
            {results.map((r, i) => (
              <button key={i} className="search-result-item"
                onClick={() => navigate(`/reader/${r.b}/${r.a}?from=search`)}>
                <div className="search-chapter-title">
                  {splitHighlight(r.at, q).map((p, j) => isMatch(p, q) ? <mark key={j} className="search-highlight">{p}</mark> : p)}
                </div>
                <div className="search-book-count">{r.bn}</div>
                {r.t.toLowerCase().includes(q.toLowerCase()) && <Snippet text={r.t} keyword={q} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function splitHighlight(t: string, k: string) { return t.split(new RegExp(`(${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')) }
function isMatch(p: string, k: string) { return p.toLowerCase() === k.toLowerCase() }

function Snippet({ text, keyword }: { text: string; keyword: string }) {
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase())
  if (idx === -1) return null
  const s = Math.max(0, idx - 25); const e = Math.min(text.length, idx + keyword.length + 60)
  const snip = (s > 0 ? '…' : '') + text.slice(s, e) + (e < text.length ? '…' : '')
  return <div className="search-snippet">{splitHighlight(snip, keyword).map((p, i) => isMatch(p, keyword) ? <mark key={i} className="search-highlight">{p}</mark> : p)}</div>
}
