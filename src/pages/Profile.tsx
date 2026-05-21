import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings, Theme, FontSize } from '../store/settings'
import { useReading, HistoryEntry } from '../store/reading'

export default function Profile() {
  const navigate = useNavigate()
  const theme = useSettings((s) => s.theme)
  const fontSize = useSettings((s) => s.fontSize)
  const setTheme = useSettings((s) => s.setTheme)
  const setFontSize = useSettings((s) => s.setFontSize)
  const history = useReading((s) => s.history)
  const totalMinutes = useReading((s) => s.totalMinutes)
  const getArticleReadCount = useReading((s) => s.getArticleReadCount)
  const getStreak = useReading((s) => s.getStreak)
  const getTodayMinutes = useReading((s) => s.getTodayMinutes)
  const clearHistory = useReading((s) => s.clearHistory)

  const [showAll, setShowAll] = useState(false)
  const hours = Math.floor(totalMinutes / 60)
  const mins = Math.round(totalMinutes % 60)
  const themeLabel: Record<Theme, string> = { light: '白', dark: '暗', sepia: '护' }
  const fontSizeLabel: Record<FontSize, string> = { small: '小', medium: '中', large: '大', xlarge: '特大' }

  const grouped = groupByDate(history)
  const display = showAll ? grouped : grouped.slice(0, 3)

  return (
    <div className="app-shell">
      <div className="app-header"><h1>我的</h1></div>
      <div className="app-content">
        <div className="profile-container">
          <div className="section-title">阅读统计</div>
          <div className="stats-grid">
            <div className="stat-card"><div className="stat-value">{hours > 0 ? `${hours}h` : ''}{mins.toFixed(0)}m</div><div className="stat-label">累计阅读</div></div>
            <div className="stat-card"><div className="stat-value">{getArticleReadCount()}</div><div className="stat-label">已读文章</div></div>
            <div className="stat-card"><div className="stat-value">{getStreak()}</div><div className="stat-label">连续天数</div></div>
            <div className="stat-card"><div className="stat-value">{getTodayMinutes()}m</div><div className="stat-label">今日阅读</div></div>
          </div>

          {history.length > 0 && (
            <>
              <div className="section-title" style={{ marginTop: 24 }}>阅读历史
                <button className="history-clear-btn" onClick={clearHistory}>清除</button>
              </div>
              <div className="history-list">
                {display.map((g, gi) => (
                  <div key={gi}>
                    <div className="history-date">{g.label}</div>
                    {g.items.slice(0, showAll ? 999 : 3).map((item, ii) => (
                      <button key={ii} className="history-item"
                        onClick={() => navigate(`/reader/${item.bookId}/${item.articleIdx}`)}>
                        <div className="history-item-book">{item.bookName}</div>
                        <div className="history-item-chapter">{item.articleTitle}</div>
                        <div className="history-item-time">{fmt(item.timestamp)}</div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              {grouped.length > 3 && !showAll && <button className="history-more-btn" onClick={() => setShowAll(true)}>查看全部 ({history.length} 条)</button>}
            </>
          )}
          {history.length === 0 && <div className="empty-state" style={{ padding: '30px 20px' }}><p style={{ fontSize: 14 }}>暂无阅读记录</p></div>}

          <div className="section-title" style={{ marginTop: 24 }}>阅读设置</div>
          <div className="settings-group">
            <div className="settings-row">
              <span className="settings-label">主题</span>
              <div className="theme-group">
                {(['light', 'sepia', 'dark'] as Theme[]).map(t => (
                  <button key={t} className={`theme-btn ${theme === t ? 'active' : ''}`} onClick={() => setTheme(t)}>{themeLabel[t]}</button>
                ))}
              </div>
            </div>
            <div className="settings-row">
              <span className="settings-label">字号</span>
              <div className="font-size-group">
                {(['small', 'medium', 'large', 'xlarge'] as FontSize[]).map(s => (
                  <button key={s} className={`font-size-btn ${fontSize === s ? 'active' : ''}`} onClick={() => setFontSize(s)}>{fontSizeLabel[s]}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface DateGroup { label: string; items: HistoryEntry[] }
function groupByDate(history: HistoryEntry[]): DateGroup[] {
  const g: DateGroup[] = []
  const now = new Date()
  const td = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`
  const yd = new Date(now); yd.setDate(yd.getDate()-1)
  const yds = `${yd.getFullYear()}-${pad(yd.getMonth()+1)}-${pad(yd.getDate())}`
  for (const item of history) {
    const d = new Date(item.timestamp)
    const ds = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
    let label: string
    if (ds === td) label = '今天'
    else if (ds === yds) label = '昨天'
    else if (d.getFullYear() === now.getFullYear()) label = `${d.getMonth()+1}月${d.getDate()}日`
    else label = `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`
    const last = g[g.length-1]
    if (last && last.label === label) last.items.push(item)
    else g.push({ label, items: [item] })
  }
  return g
}
function pad(n: number) { return String(n).padStart(2, '0') }
function fmt(ts: number) { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }
