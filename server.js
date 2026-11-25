// 실행: node server.js  →  http://localhost:3000  (Node.js 18 이상, 추가 설치 없음)
// 학교 공지·군산대 신문을 대신 가져와 브라우저에 전달합니다. (브라우저에서 직접 호출하면 보안 규칙으로 막힘)
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = process.env.PORT || 3000, ROOT = __dirname, TTL = 5 * 60 * 1000;
const BASE = 'https://www.kunsan.ac.kr';
const NOTICE_URL = BASE + '/board/list.kunsan?boardId=BBS_0000009&menuCd=DOM_000000105001002000&startPage=1';
const NEWS_URL = 'https://press.kunsan.ac.kr/rss/';

const strip = s => (s || '').replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
  .replace(/\s+/g, ' ').trim();

function parseNotices(html) {
  const items = [];
  for (const row of html.split(/<tr[\s>]/i)) {
    const tag = row.match(/<a\b[^>]*board\/view\.kunsan[^>]*>/i);
    if (!tag) continue;
    const href = (tag[0].match(/href="([^"]*)"/) || [])[1];
    const title = strip((tag[0].match(/title="([^"]*)"/) || [])[1] ||
      (row.match(/<a\b[^>]*board\/view\.kunsan[^>]*>([\s\S]*?)<\/a>/i) || [])[1]);
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => strip(m[1]));
    const date = (row.match(/\d{4}-\d{2}-\d{2}/) || [])[0];
    if (href && title && date) items.push({ title, dept: cells[2] || '', date,
      link: new URL(href.replace(/&amp;/g, '&'), BASE).href });
  }
  return items;
}

function parseNews(xml) {
  const pick = (s, t) => ((s.match(new RegExp('<' + t + '[^>]*>([\\s\\S]*?)</' + t + '>')) || [])[1] || '');
  return xml.split('<item>').slice(1).map(s => {
    const d = new Date(strip(pick(s, 'pubDate')));
    return {
      title: strip(pick(s, 'title')), link: strip(pick(s, 'link')),
      date: isNaN(d) ? '' : d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }),
      image: ((s.match(/<media:content[^>]*url="([^"]+)"/) || [])[1] || '')
    };
  }).filter(x => x.title && x.link);
}

const cache = {};
async function cached(key, url, parse, limit) {
  const hit = cache[key];
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 campus-app' }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const items = parse(await res.text()).slice(0, limit);
    if (!items.length) throw new Error('파싱 결과 없음');
    const data = { items, fetchedAt: new Date().toISOString() };
    cache[key] = { at: Date.now(), data };
    return data;
  } catch (error) {
    console.error('[' + key + ']', error.message);
    if (hit) return hit.data;      // 실패하면 직전 성공 결과를 사용
    throw error;
  }
}

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const json = (code, body) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
  if (url.pathname === '/api/notices' || url.pathname === '/api/news') {
    try {
      json(200, url.pathname === '/api/news'
        ? await cached('news', NEWS_URL, parseNews, 5)
        : await cached('notices', NOTICE_URL, parseNotices, 8));
    } catch (error) { json(502, { error: error.message }); }
    return;
  }
  const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT + path.sep) || !TYPES[path.extname(file)] || path.basename(file) === 'server.js') { res.writeHead(404); return res.end('Not found'); }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] + '; charset=utf-8' });
    res.end(data);
  });
}).listen(PORT, () => console.log('http://localhost:' + PORT));
