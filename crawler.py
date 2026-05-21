#!/usr/bin/env python3
"""
Crawler for 圣经生命读经 (Bible Life Study)
Source: https://mana.stmn1.com/smdj8/
Output: Structured JSON files
"""

import re
import json
import time
import os
import sys
import socket
from html.parser import HTMLParser
from urllib.request import urlopen, Request

BASE_URL = "https://mana.stmn1.com/smdj8/"
OUTPUT_DIR = "public/data"
BOOKS_DIR = os.path.join(OUTPUT_DIR, "books")
DELAY = 0.2

socket.setdefaulttimeout(20)

# Book index: bookId -> API index number
BOOK_INDEX_MAP = {
    'gen': '01', 'exo': '02', 'lev': '03', 'num': '04', 'deu': '05',
    'jos': '06', 'jdg': '07', 'rut': '08', '1sa': '09', '2sa': '10',
    '1ki': '11', '2ki': '12', '1ch': '13', '2ch': '14',
    'ezr': '15', 'neh': '16', 'est': '17', 'job': '18', 'psa': '19',
    'pro': '20', 'ecc': '21', 'sos': '22', 'isa': '23', 'jer': '24',
    'lam': '25', 'eze': '26', 'dan': '27', 'hos': '28', 'jol': '29',
    'amo': '30', 'oba': '31', 'jon': '32', 'mic': '33', 'nam': '34',
    'hab': '35', 'zep': '36', 'hag': '37', 'zec': '38', 'mal': '39',
    'mat': '40', 'mrk': '41', 'luk': '42', 'jhn': '43', 'act': '44',
    'rom': '45', '1co': '46', '2co': '47', 'gal': '48', 'eph': '49',
    'php': '50', 'col': '51', '1th': '52', '2th': '53', '1ti': '54',
    '2ti': '55', 'tit': '56', 'phm': '57', 'heb': '58', 'jas': '59',
    '1pe': '60', '2pe': '61', '1jn': '62', '2jn': '63', '3jn': '64',
    'jud': '65', 'rev': '66',
}

# Book metadata
BOOKS = [
    {'id': 'gen', 'name': '创世记', 'shortName': '创', 'number': 1, 'testament': 'old', 'category': '摩西五经', 'chapters': 50},
    {'id': 'exo', 'name': '出埃及记', 'shortName': '出', 'number': 2, 'testament': 'old', 'category': '摩西五经', 'chapters': 40},
    {'id': 'lev', 'name': '利未记', 'shortName': '利', 'number': 3, 'testament': 'old', 'category': '摩西五经', 'chapters': 27},
    {'id': 'num', 'name': '民数记', 'shortName': '民', 'number': 4, 'testament': 'old', 'category': '摩西五经', 'chapters': 36},
    {'id': 'deu', 'name': '申命记', 'shortName': '申', 'number': 5, 'testament': 'old', 'category': '摩西五经', 'chapters': 34},
    {'id': 'jos', 'name': '约书亚记', 'shortName': '书', 'number': 6, 'testament': 'old', 'category': '历史书', 'chapters': 24},
    {'id': 'jdg', 'name': '士师记', 'shortName': '士', 'number': 7, 'testament': 'old', 'category': '历史书', 'chapters': 21},
    {'id': 'rut', 'name': '路得记', 'shortName': '得', 'number': 8, 'testament': 'old', 'category': '历史书', 'chapters': 4},
    {'id': '1sa', 'name': '撒母耳记上', 'shortName': '撒上', 'number': 9, 'testament': 'old', 'category': '历史书', 'chapters': 31},
    {'id': '2sa', 'name': '撒母耳记下', 'shortName': '撒下', 'number': 10, 'testament': 'old', 'category': '历史书', 'chapters': 24},
    {'id': '1ki', 'name': '列王纪上', 'shortName': '王上', 'number': 11, 'testament': 'old', 'category': '历史书', 'chapters': 22},
    {'id': '2ki', 'name': '列王纪下', 'shortName': '王下', 'number': 12, 'testament': 'old', 'category': '历史书', 'chapters': 25},
    {'id': '1ch', 'name': '历代志上', 'shortName': '代上', 'number': 13, 'testament': 'old', 'category': '历史书', 'chapters': 29},
    {'id': '2ch', 'name': '历代志下', 'shortName': '代下', 'number': 14, 'testament': 'old', 'category': '历史书', 'chapters': 36},
    {'id': 'ezr', 'name': '以斯拉记', 'shortName': '拉', 'number': 15, 'testament': 'old', 'category': '历史书', 'chapters': 10},
    {'id': 'neh', 'name': '尼希米记', 'shortName': '尼', 'number': 16, 'testament': 'old', 'category': '历史书', 'chapters': 13},
    {'id': 'est', 'name': '以斯帖记', 'shortName': '斯', 'number': 17, 'testament': 'old', 'category': '历史书', 'chapters': 10},
    {'id': 'job', 'name': '约伯记', 'shortName': '伯', 'number': 18, 'testament': 'old', 'category': '诗歌智慧书', 'chapters': 42},
    {'id': 'psa', 'name': '诗篇', 'shortName': '诗', 'number': 19, 'testament': 'old', 'category': '诗歌智慧书', 'chapters': 150},
    {'id': 'pro', 'name': '箴言', 'shortName': '箴', 'number': 20, 'testament': 'old', 'category': '诗歌智慧书', 'chapters': 31},
    {'id': 'ecc', 'name': '传道书', 'shortName': '传', 'number': 21, 'testament': 'old', 'category': '诗歌智慧书', 'chapters': 12},
    {'id': 'sos', 'name': '雅歌', 'shortName': '歌', 'number': 22, 'testament': 'old', 'category': '诗歌智慧书', 'chapters': 8},
    {'id': 'isa', 'name': '以赛亚书', 'shortName': '赛', 'number': 23, 'testament': 'old', 'category': '先知书', 'chapters': 66},
    {'id': 'jer', 'name': '耶利米书', 'shortName': '耶', 'number': 24, 'testament': 'old', 'category': '先知书', 'chapters': 52},
    {'id': 'lam', 'name': '耶利米哀歌', 'shortName': '哀', 'number': 25, 'testament': 'old', 'category': '先知书', 'chapters': 5},
    {'id': 'eze', 'name': '以西结书', 'shortName': '结', 'number': 26, 'testament': 'old', 'category': '先知书', 'chapters': 48},
    {'id': 'dan', 'name': '但以理书', 'shortName': '但', 'number': 27, 'testament': 'old', 'category': '先知书', 'chapters': 12},
    {'id': 'hos', 'name': '何西阿书', 'shortName': '何', 'number': 28, 'testament': 'old', 'category': '先知书', 'chapters': 14},
    {'id': 'jol', 'name': '约珥书', 'shortName': '珥', 'number': 29, 'testament': 'old', 'category': '先知书', 'chapters': 3},
    {'id': 'amo', 'name': '阿摩司书', 'shortName': '摩', 'number': 30, 'testament': 'old', 'category': '先知书', 'chapters': 9},
    {'id': 'oba', 'name': '俄巴底亚书', 'shortName': '俄', 'number': 31, 'testament': 'old', 'category': '先知书', 'chapters': 1},
    {'id': 'jon', 'name': '约拿书', 'shortName': '拿', 'number': 32, 'testament': 'old', 'category': '先知书', 'chapters': 4},
    {'id': 'mic', 'name': '弥迦书', 'shortName': '弥', 'number': 33, 'testament': 'old', 'category': '先知书', 'chapters': 7},
    {'id': 'nam', 'name': '那鸿书', 'shortName': '鸿', 'number': 34, 'testament': 'old', 'category': '先知书', 'chapters': 3},
    {'id': 'hab', 'name': '哈巴谷书', 'shortName': '哈', 'number': 35, 'testament': 'old', 'category': '先知书', 'chapters': 3},
    {'id': 'zep', 'name': '西番雅书', 'shortName': '番', 'number': 36, 'testament': 'old', 'category': '先知书', 'chapters': 3},
    {'id': 'hag', 'name': '哈该书', 'shortName': '该', 'number': 37, 'testament': 'old', 'category': '先知书', 'chapters': 2},
    {'id': 'zec', 'name': '撒迦利亚书', 'shortName': '亚', 'number': 38, 'testament': 'old', 'category': '先知书', 'chapters': 14},
    {'id': 'mal', 'name': '玛拉基书', 'shortName': '玛', 'number': 39, 'testament': 'old', 'category': '先知书', 'chapters': 4},
    {'id': 'mat', 'name': '马太福音', 'shortName': '太', 'number': 40, 'testament': 'new', 'category': '福音书', 'chapters': 28},
    {'id': 'mrk', 'name': '马可福音', 'shortName': '可', 'number': 41, 'testament': 'new', 'category': '福音书', 'chapters': 16},
    {'id': 'luk', 'name': '路加福音', 'shortName': '路', 'number': 42, 'testament': 'new', 'category': '福音书', 'chapters': 24},
    {'id': 'jhn', 'name': '约翰福音', 'shortName': '约', 'number': 43, 'testament': 'new', 'category': '福音书', 'chapters': 21},
    {'id': 'act', 'name': '使徒行传', 'shortName': '徒', 'number': 44, 'testament': 'new', 'category': '教会历史', 'chapters': 28},
    {'id': 'rom', 'name': '罗马书', 'shortName': '罗', 'number': 45, 'testament': 'new', 'category': '保罗书信', 'chapters': 16},
    {'id': '1co', 'name': '哥林多前书', 'shortName': '林前', 'number': 46, 'testament': 'new', 'category': '保罗书信', 'chapters': 16},
    {'id': '2co', 'name': '哥林多后书', 'shortName': '林后', 'number': 47, 'testament': 'new', 'category': '保罗书信', 'chapters': 13},
    {'id': 'gal', 'name': '加拉太书', 'shortName': '加', 'number': 48, 'testament': 'new', 'category': '保罗书信', 'chapters': 6},
    {'id': 'eph', 'name': '以弗所书', 'shortName': '弗', 'number': 49, 'testament': 'new', 'category': '保罗书信', 'chapters': 6},
    {'id': 'php', 'name': '腓立比书', 'shortName': '腓', 'number': 50, 'testament': 'new', 'category': '保罗书信', 'chapters': 4},
    {'id': 'col', 'name': '歌罗西书', 'shortName': '西', 'number': 51, 'testament': 'new', 'category': '保罗书信', 'chapters': 4},
    {'id': '1th', 'name': '帖撒罗尼迦前书', 'shortName': '帖前', 'number': 52, 'testament': 'new', 'category': '保罗书信', 'chapters': 5},
    {'id': '2th', 'name': '帖撒罗尼迦后书', 'shortName': '帖后', 'number': 53, 'testament': 'new', 'category': '保罗书信', 'chapters': 3},
    {'id': '1ti', 'name': '提摩太前书', 'shortName': '提前', 'number': 54, 'testament': 'new', 'category': '保罗书信', 'chapters': 6},
    {'id': '2ti', 'name': '提摩太后书', 'shortName': '提后', 'number': 55, 'testament': 'new', 'category': '保罗书信', 'chapters': 4},
    {'id': 'tit', 'name': '提多书', 'shortName': '多', 'number': 56, 'testament': 'new', 'category': '保罗书信', 'chapters': 3},
    {'id': 'phm', 'name': '腓利门书', 'shortName': '门', 'number': 57, 'testament': 'new', 'category': '保罗书信', 'chapters': 1},
    {'id': 'heb', 'name': '希伯来书', 'shortName': '来', 'number': 58, 'testament': 'new', 'category': '普通书信', 'chapters': 13},
    {'id': 'jas', 'name': '雅各书', 'shortName': '雅', 'number': 59, 'testament': 'new', 'category': '普通书信', 'chapters': 5},
    {'id': '1pe', 'name': '彼得前书', 'shortName': '彼前', 'number': 60, 'testament': 'new', 'category': '普通书信', 'chapters': 5},
    {'id': '2pe', 'name': '彼得后书', 'shortName': '彼后', 'number': 61, 'testament': 'new', 'category': '普通书信', 'chapters': 3},
    {'id': '1jn', 'name': '约翰一书', 'shortName': '约一', 'number': 62, 'testament': 'new', 'category': '普通书信', 'chapters': 5},
    {'id': '2jn', 'name': '约翰二书', 'shortName': '约二', 'number': 63, 'testament': 'new', 'category': '普通书信', 'chapters': 1},
    {'id': '3jn', 'name': '约翰三书', 'shortName': '约三', 'number': 64, 'testament': 'new', 'category': '普通书信', 'chapters': 1},
    {'id': 'jud', 'name': '犹大书', 'shortName': '犹', 'number': 65, 'testament': 'new', 'category': '普通书信', 'chapters': 1},
    {'id': 'rev', 'name': '启示录', 'shortName': '启', 'number': 66, 'testament': 'new', 'category': '预言书', 'chapters': 22},
]

CATEGORIES_OLD = ['摩西五经', '历史书', '诗歌智慧书', '先知书']
CATEGORIES_NEW = ['福音书', '教会历史', '保罗书信', '普通书信', '预言书']


class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text = []
        self.skip = False

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'head'):
            self.skip = True
        elif tag in ('br', 'p'):
            self.text.append('\n')

    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'head'):
            self.skip = False
        elif tag in ('p', 'div', 'h1', 'h2', 'h3'):
            self.text.append('\n')

    def handle_data(self, data):
        if not self.skip:
            self.text.append(data)

    def get_text(self):
        raw = ''.join(self.text)
        raw = re.sub(r'[ \t]+', ' ', raw)
        raw = re.sub(r'\n{3,}', '\n\n', raw)
        raw = re.sub(r' *\n *', '\n', raw)
        return raw.strip()


def fetch(url, retries=2):
    for attempt in range(retries + 1):
        time.sleep(DELAY)
        req = Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        try:
            with urlopen(req, timeout=20) as resp:
                raw = resp.read()
            for enc in ('utf-8', 'gbk', 'gb2312'):
                try:
                    return raw.decode(enc)
                except (UnicodeDecodeError, LookupError):
                    continue
            return raw.decode('utf-8', errors='replace')
        except Exception as e:
            if attempt < retries:
                time.sleep(3)
                continue
            print(f"  SKIP {url}: {e}", file=sys.stderr)
            return None
    return None


def fetch_articles(book_index):
    """Fetch article list from book index page."""
    url = f"{BASE_URL}{book_index}index.html"
    html = fetch(url)
    if not html:
        return []

    items = []
    pattern = re.compile(
        r'<p\s+class="UU"[^>]*>[\s\S]*?<a\s+href="(\d+\.html)"[^>]*>([\s\S]*?)</a>[\s\S]*?</p>',
        re.IGNORECASE
    )
    for m in pattern.finditer(html):
        article_id = m.group(1).replace('.html', '')
        title = re.sub(r'<[^>]+>', '', m.group(2)).strip()
        title = re.sub(r'\s+', ' ', title)
        if article_id and title:
            items.append({'id': article_id, 'title': title})
    return items


def fetch_article_content(article_id):
    """Fetch and clean article content."""
    url = f"{BASE_URL}{article_id}.html"
    html = fetch(url)
    if not html:
        return ''

    # Clean HTML
    html = re.sub(r'<script[^>]*>[\s\S]*?</script>', '', html, flags=re.I)
    html = re.sub(r'<style[^>]*>[\s\S]*?</style>', '', html, flags=re.I)
    html = re.sub(r'<h1[^>]*>[\s\S]*?</h1>', '', html, flags=re.I)
    html = re.sub(r'<h2[^>]*>[\s\S]*?</h2>', '', html, flags=re.I)
    html = re.sub(r'<br\s*/?>', '\n', html, flags=re.I)
    html = re.sub(r'<p[^>]*>', '\n', html, flags=re.I)
    html = re.sub(r'<a[^>]*>|</a>', '', html, flags=re.I)
    html = re.sub(r'<[^>]+>', '', html)
    html = html.replace('&nbsp;', ' ')
    html = html.replace('&amp;', '&')
    html = html.replace('&lt;', '<')
    html = html.replace('&gt;', '>')
    html = html.replace('&quot;', '"')
    html = html.replace('&#39;', "'")

    lines = [l.strip() for l in html.split('\n')]
    return '\n\n'.join(l for l in lines if l)


def main():
    os.makedirs(BOOKS_DIR, exist_ok=True)

    print("=" * 60)
    print("圣经生命读经 爬虫")
    print("=" * 60)

    # Build index
    index = {
        'title': '圣经生命读经',
        'testaments': [
            {'id': 'old', 'name': '旧约', 'categories': []},
            {'id': 'new', 'name': '新约', 'categories': []},
        ]
    }

    # Organize books by testament and category
    for testament_id, testament_name, categories in [
        ('old', '旧约', CATEGORIES_OLD),
        ('new', '新约', CATEGORIES_NEW),
    ]:
        testament_entry = index['testaments'][0 if testament_id == 'old' else 1]
        for cat in categories:
            cat_books = [b for b in BOOKS if b['testament'] == testament_id and b['category'] == cat]
            cat_entry = {'name': cat, 'books': []}
            for book in cat_books:
                cat_entry['books'].append({
                    'id': book['id'],
                    'name': book['name'],
                    'shortName': book['shortName'],
                    'chapters': book['chapters'],
                    'articleCount': 0,
                    'articles': [],
                })
            testament_entry['categories'].append(cat_entry)

    total_articles = 0
    total_errors = 0

    for i, book in enumerate(BOOKS):
        book_id = book['id']
        book_idx = BOOK_INDEX_MAP[book_id]
        progress = f"[{i + 1}/{len(BOOKS)}]"
        print(f"\n{progress} {book['name']} ({book_id})")

        # Fetch article list
        articles = fetch_articles(book_idx)
        if not articles:
            print(f"  No articles found, skipping")
            total_errors += 1
            continue

        print(f"  {len(articles)} articles")

        # Fetch each article content
        book_articles = []
        for j, article in enumerate(articles):
            content_id = f"{book_id}_{article['id']}"
            content = fetch_article_content(article['id'])
            if content:
                book_articles.append({
                    'id': content_id,
                    'bookId': book_id,
                    'articleId': article['id'],
                    'title': article['title'],
                    'content': content,
                })
                total_articles += 1
            else:
                total_errors += 1

            if (j + 1) % 5 == 0:
                print(f"    {j + 1}/{len(articles)}")

        # Update index article count
        for testament in index['testaments']:
            for cat in testament['categories']:
                for b in cat['books']:
                    if b['id'] == book_id:
                        b['articleCount'] = len(book_articles)
                        b['articles'] = [{'id': a['id'], 'title': a['title']} for a in book_articles]

        # Save book JSON
        book_file = os.path.join(BOOKS_DIR, f"{book_id}.json")
        with open(book_file, 'w', encoding='utf-8') as f:
            json.dump({
                'bookId': book_id,
                'bookName': book['name'],
                'articles': book_articles,
            }, f, ensure_ascii=False, indent=2)
        print(f"  Saved {len(book_articles)} articles → {book_file}")

    # Save index
    index_path = os.path.join(OUTPUT_DIR, 'index.json')
    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    print(f"\nIndex saved: {index_path}")

    # Summary
    print(f"\n{'=' * 60}")
    print(f"完成! 书卷: {len(BOOKS)}, 文章: {total_articles}, 错误: {total_errors}")
    print(f"输出: {os.path.abspath(OUTPUT_DIR)}/")
    print(f"{'=' * 60}")


if __name__ == '__main__':
    main()
