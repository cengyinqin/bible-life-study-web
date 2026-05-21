# CLAUDE.md — 圣经生命读经阅读器

## 项目架构

- **框架**: React 18 + Vite + TypeScript
- **路由**: HashRouter（5 条路由）/reader 可带 `?from=search`
- **状态**: Zustand 5 + persist（settings / reading 两个独立 store）
- **跨平台**: Capacitor 5（Android 已配置）
- **图标**: 内联 SVG 组件 `src/components/Icons.tsx`（currentColor）
- **样式**: CSS Variables 三级主题 `[data-theme='light|dark|sepia']`

## 关键命令

```bash
cd /home/ai/文档/bible-life-study-web
export PATH="$HOME/.n/bin:$PATH"  # Node 22
npm run dev       # H5 开发
npm run build     # 生产构建
```

## 数据架构

与 niwj-reader 不同，Bible 数据按 约→分类→书卷→文章 组织。

```
public/data/
├── index.json       # 目录：testaments → categories → books → articles
├── search-index.json # 搜索索引：[{b: bookId, bn: bookName, a: articleIdx, at: title, t: snippet}]
└── books/{bookId}.json  # 66 卷：{bookId, bookName, articles: [{id, bookId, articleId, title, content}]}
```

- `fetchIndex()` → 加载 index.json → 内存缓存
- `fetchBook(bookId)` → 加载 books/{bookId}.json → Map 缓存
- 搜索索引首次搜索时懒加载

## 状态管理

**settings store** (`bls-settings`):
- theme, fontSize, progress (keyed by bookId), lastRead

**reading store** (`bls-reading`):
- totalMinutes, articlesRead, dailyActivity, history (MAX 50)

## 路由

```
/                               → Home（新旧约Tab + 分类 + 书卷网格）
/book/:bookId                   → BookList（文章列表）
/reader/:bookId/:articleIdx     → Reader（全屏阅读）
/search                         → Search
/profile                        → Profile
```

## 主题系统

- `ThemeSync` 组件（App 层）：监听 theme → 更新 `<html data-theme>` + `<meta name="theme-color">`
- `index.html` 内联脚本：挂载前读取 localStorage 防闪烁
- CSS Variables：`:root` / `[data-theme='dark']` / `[data-theme='sepia']`

## 全面屏

- CSS Variables: `--safe-top/bottom/left/right` = `env(safe-area-inset-*)`
- `.app-shell` 四边安全区 padding
- `.reader-top/bottom-bar` 安全区 padding

## 数据爬取

`crawler.py` — stdlib only，从 `https://mana.stmn1.com/smdj8/` 抓取。
66 卷 × ~31 篇文章/卷 = 2,058 篇文章，首次运行约 10-15 分钟。

## Git

- 仓库: `cengyinqin/bible-life-study-web`
- Co-Authored-By: zengyinqin <zengyinqin@gmail.com>
