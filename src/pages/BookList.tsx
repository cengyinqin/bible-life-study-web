import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { fetchBook, BookData } from '../hooks/useBook'
import { IconArrowLeft } from '../components/Icons'

export default function BookList() {
  const { bookId } = useParams<{ bookId: string }>()
  const navigate = useNavigate()
  const [book, setBook] = useState<BookData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!bookId) return
    setLoading(true)
    fetchBook(bookId).then(setBook).catch(console.error).finally(() => setLoading(false))
  }, [bookId])

  if (loading) return <div className="loading">加载中...</div>
  if (!book) return <div className="empty-state"><p>未找到该书</p></div>

  return (
    <div className="app-shell">
      <div className="app-header">
        <button className="btn-back" onClick={() => navigate('/')}><IconArrowLeft size={18} /></button>
        <h1>{book.bookName}</h1>
      </div>
      <div className="app-content">
        <div className="list-container" style={{ padding: 0 }}>
          <div className="section-title" style={{ padding: '0 16px', marginTop: 12 }}>
            {book.articles.length} 篇
          </div>
          {book.articles.map((a, i) => (
            <Link key={a.id} to={`/reader/${bookId}/${i}`} className="chapter-item">
              <span className="chapter-num">{i + 1}</span>
              <span className="chapter-title">{a.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
