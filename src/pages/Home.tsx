import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchIndex, IndexData } from '../hooks/useBook'
import { useSettings } from '../store/settings'

export default function Home() {
  const [index, setIndex] = useState<IndexData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'old' | 'new'>('new')
  const lastRead = useSettings((s) => s.lastRead)

  useEffect(() => {
    fetchIndex().then(setIndex).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">加载中...</div>
  if (!index) return <div className="empty-state"><p>无法加载数据</p></div>

  const testament = index.testaments.find((t) => t.id === tab)
  const continueInfo = lastRead ? lastRead : null

  return (
    <div className="app-shell">
      <div className="app-header">
        <h1>圣经生命读经</h1>
      </div>

      {/* Testament tabs */}
      <div className="testament-tabs">
        <button className={`testament-tab ${tab === 'new' ? 'active' : ''}`} onClick={() => setTab('new')}>
          新约
        </button>
        <button className={`testament-tab ${tab === 'old' ? 'active' : ''}`} onClick={() => setTab('old')}>
          旧约
        </button>
      </div>

      <div className="app-content">
        <div className="list-container">
          {continueInfo && (
            <Link to={`/reader/${continueInfo.bookId}/${continueInfo.articleIdx}`} className="continue-card">
              <div className="continue-body">
                <div className="continue-label">继续阅读</div>
                <div className="continue-book">{continueInfo.bookName || continueInfo.bookId}</div>
                <div className="continue-chapter">{continueInfo.articleTitle || `第${continueInfo.articleIdx + 1}篇`}</div>
              </div>
            </Link>
          )}

          {testament?.categories.map((cat) => (
            <div key={cat.name} className="category-section">
              <div className="section-title">{cat.name}</div>
              <div className="book-grid">
                {cat.books.map((book) => (
                  <Link key={book.id} to={`/book/${book.id}`} className="book-card">
                    <div className="book-card-name">{book.shortName}</div>
                    <div className="book-card-full">{book.name}</div>
                    <div className="book-card-count">{book.articleCount} 篇</div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

