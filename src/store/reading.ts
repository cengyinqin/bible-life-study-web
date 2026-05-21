import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface HistoryEntry {
  bookId: string
  articleIdx: number
  articleTitle: string
  bookName: string
  timestamp: number
}

interface DailyActivity { date: string; minutes: number }

interface ReadingState {
  totalMinutes: number
  articlesRead: Record<string, boolean>
  dailyActivity: DailyActivity[]
  history: HistoryEntry[]

  addReadingTime: (seconds: number) => void
  markArticleRead: (bookId: string, articleIdx: number) => void
  addToHistory: (entry: HistoryEntry) => void
  clearHistory: () => void
  getArticleReadCount: () => number
  getStreak: () => number
  getTodayMinutes: () => number
}

const MAX_HISTORY = 50

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const useReading = create<ReadingState>()(
  persist(
    (set, get) => ({
      totalMinutes: 0,
      articlesRead: {},
      dailyActivity: [],
      history: [],

      addReadingTime: (seconds) => {
        if (seconds <= 0) return
        const key = todayKey()
        set((s) => {
          const act = [...s.dailyActivity]
          const today = act.find((a) => a.date === key)
          if (today) { today.minutes += seconds / 60 }
          else { act.push({ date: key, minutes: seconds / 60 }); if (act.length > 90) act.shift() }
          return { totalMinutes: s.totalMinutes + seconds / 60, dailyActivity: act }
        })
      },

      markArticleRead: (bookId, articleIdx) => {
        set((s) => ({ articlesRead: { ...s.articlesRead, [`${bookId}-${articleIdx}`]: true } }))
      },

      addToHistory: (entry) => {
        set((s) => {
          const h = [entry, ...s.history]
            .filter((e, i, arr) => arr.findIndex((x) => x.bookId === e.bookId && x.articleIdx === e.articleIdx) === i)
            .slice(0, MAX_HISTORY)
          return { history: h }
        })
      },

      clearHistory: () => set({ history: [] }),
      getArticleReadCount: () => Object.keys(get().articlesRead).length,

      getStreak: () => {
        const act = get().dailyActivity
        if (!act.length) return 0
        const sorted = [...act].sort((a, b) => b.date.localeCompare(a.date))
        const today = todayKey()
        let streak = 0
        const check = new Date(today)
        if (!sorted.some((a) => a.date === today)) check.setDate(check.getDate() - 1)
        for (let i = 0; i < 365; i++) {
          const ds = `${check.getFullYear()}-${String(check.getMonth() + 1).padStart(2, '0')}-${String(check.getDate()).padStart(2, '0')}`
          if (sorted.find((a) => a.date === ds && a.minutes > 0)) { streak++; check.setDate(check.getDate() - 1) }
          else break
        }
        return streak
      },

      getTodayMinutes: () => {
        const today = get().dailyActivity.find((a) => a.date === todayKey())
        return today ? Math.round(today.minutes) : 0
      },
    }),
    { name: 'bls-reading', partialize: (s) => ({ totalMinutes: s.totalMinutes, articlesRead: s.articlesRead, dailyActivity: s.dailyActivity, history: s.history }) }
  )
)
