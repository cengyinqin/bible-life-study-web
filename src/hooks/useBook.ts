// ── Types ──────────────────────────────────────────────
export interface ArticleMeta {
  id: string
  title: string
}

export interface BookMeta {
  id: string
  name: string
  shortName: string
  chapters: number
  articleCount: number
  articles: ArticleMeta[]
}

export interface CategoryMeta {
  name: string
  books: BookMeta[]
}

export interface TestamentMeta {
  id: string
  name: string
  categories: CategoryMeta[]
}

export interface IndexData {
  title: string
  testaments: TestamentMeta[]
}

export interface ArticleData {
  id: string
  bookId: string
  articleId: string
  title: string
  content: string
}

export interface BookData {
  bookId: string
  bookName: string
  articles: ArticleData[]
}

// ── Cache ──────────────────────────────────────────────
let indexCache: IndexData | null = null

export async function fetchIndex(): Promise<IndexData> {
  if (indexCache) return indexCache
  const resp = await fetch('/data/index.json')
  if (!resp.ok) throw new Error(`Failed to fetch index: ${resp.status}`)
  indexCache = await resp.json()
  return indexCache!
}

const bookCache = new Map<string, BookData>()

export async function fetchBook(bookId: string): Promise<BookData> {
  if (bookCache.has(bookId)) return bookCache.get(bookId)!
  const resp = await fetch(`/data/books/${bookId}.json`)
  if (!resp.ok) throw new Error(`Failed to fetch book: ${resp.status}`)
  const data: BookData = await resp.json()
  bookCache.set(bookId, data)
  return data
}
