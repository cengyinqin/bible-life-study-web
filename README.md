# 圣经生命读经 · 阅读器

跨平台阅读 App，收录圣经生命读经全部 66 卷书、2,058 篇文章。支持 H5、Android、iOS。

**技术栈**: React 18 + Vite + TypeScript + Capacitor 5

## 功能

**阅读**
- 沉浸式全屏阅读，点击屏幕切换控制栏
- 三种主题：白天 / 夜间 / 护眼（sepia），全局实时切换，同步状态栏颜色
- 四档字号：小(16px) · 中(18px) · 大(22px) · 特大(26px)
- 阅读进度自动保存（800ms 防抖），首页「继续阅读」快速接续
- 右侧垂直滚动进度指示器
- 计时器：页面可见时计时，后台自动暂停
- 全面屏适配：顶部状态栏 + 底部导航栏 + 左右安全区
- 扁平 SVG 图标，currentColor 跟随主题

**搜索**
- 全局全文搜索，覆盖 2,058 篇文章标题和内容
- 搜索索引懒加载（~9MB），首次使用后浏览器缓存
- 关键词高亮，?from=search 跳过阅读进度和历史
- 系统返回键完整拦截

**统计与历史**
- 阅读统计：累计时长、已读文章、连续天数、今日阅读
- 阅读历史：最近 50 条按日期分组（跨年区分），点击续读

**导航**
- 底部 Tab 栏：📚 圣经 / 🔍 搜索 / 👤 我的
- 阅读器全屏时自动隐藏 Tab
- 新旧约 Tab 切换 + 分类 + 4 列书卷网格
- 「我的」页面集成设置：主题 / 字号调整

## 内容

| 约 | 分类 | 卷数 | 文章 |
|----|------|------|------|
| 旧约 | 摩西五经 | 5 | 452 |
| 旧约 | 历史书 | 12 | 221 |
| 旧约 | 诗歌智慧书 | 5 | 103 |
| 旧约 | 先知书 | 17 | 173 |
| 新约 | 福音书 | 4 | 272 |
| 新约 | 教会历史 | 1 | 72 |
| 新约 | 保罗书信 | 14 | 640 |
| 新约 | 普通书信 | 7 | 58 |
| 新约 | 预言书 | 1 | 68 |
| **合计** | **9 分类** | **66 卷** | **2,058 篇** |

数据来源: [美地生命读经](https://mana.stmn1.com/smdj8/)

## 快速开始

```bash
npm install            # 安装依赖
npm run dev            # H5 开发 → http://localhost:5173
npm run build          # 生产构建 → dist/
npm run preview        # 预览 → http://localhost:4173
```

需要 Node.js >= 22。

## 构建 Android APK

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
# APK → android/app/build/outputs/apk/debug/app-debug.apk
```

## 项目结构

```
bible-life-study-web/
├── src/
│   ├── pages/
│   │   ├── Home.tsx              # 首页：新旧约Tab + 分类 + 书卷网格
│   │   ├── BookList.tsx          # 某书的文章列表
│   │   ├── Reader.tsx            # 全屏阅读器（计时/进度/历史）
│   │   ├── Search.tsx            # 全文搜索
│   │   └── Profile.tsx           # 我的（统计 + 历史 + 设置）
│   ├── store/
│   │   ├── settings.ts           # 主题/字号/进度（bookId 格式）
│   │   └── reading.ts            # 阅读统计/历史
│   ├── hooks/useBook.ts          # 数据加载与内存缓存
│   └── components/Icons.tsx      # SVG 图标库
├── public/data/
│   ├── index.json                # 目录索引
│   ├── search-index.json         # 搜索索引 (~9MB)
│   └── books/                    # 66 卷 JSON (~38MB)
├── android/                      # Capacitor Android
├── capacitor.config.ts
└── crawler.py                    # 爬虫脚本
```

## 数据更新

```bash
python3 crawler.py      # 重新爬取所有文章
# 自动生成 public/data/index.json + books/*.json + search-index.json
```

## License

内容版权归原作者所有。代码 MIT。
