import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'sepia'
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge'

const FONT_SIZE_MAP: Record<FontSize, number> = {
  small: 16, medium: 18, large: 22, xlarge: 26,
}

export function getFontSizePx(size: FontSize): number { return FONT_SIZE_MAP[size] }

interface ReadingProgress {
  bookId: string
  articleIdx: number
  scrollPos: number
  updatedAt: number
}

interface SettingsState {
  theme: Theme
  fontSize: FontSize
  progress: Record<string, ReadingProgress>
  lastRead: { bookId: string; articleIdx: number; articleTitle?: string; bookName?: string } | null

  setTheme: (theme: Theme) => void
  setFontSize: (size: FontSize) => void
  saveProgress: (bookId: string, articleIdx: number, scrollPos: number) => void
  getProgress: (bookId: string) => ReadingProgress | null
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      fontSize: 'medium',
      progress: {},
      lastRead: null,

      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),

      saveProgress: (bookId, articleIdx, scrollPos) => {
        const entry: ReadingProgress = { bookId, articleIdx, scrollPos, updatedAt: Date.now() }
        set((s) => ({
          progress: { ...s.progress, [bookId]: entry },
          lastRead: { bookId, articleIdx },
        }))
      },

      getProgress: (bookId) => get().progress[bookId] || null,
    }),
    {
      name: 'bls-settings',
      partialize: (state) => ({
        theme: state.theme, fontSize: state.fontSize,
        progress: state.progress, lastRead: state.lastRead,
      }),
    }
  )
)
