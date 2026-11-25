// 실시간 공지 · 군산대 신문 · eclass 남은 과제 · 즐겨찾기 빠른 정보
// 서버(server.js)가 없으면 저장해 둔 목록을 기준 날짜와 함께 보여줍니다.
(() => {
  const VIEW = 'https://www.kunsan.ac.kr/board/view.kunsan?boardId=BBS_0000009&menuCd=DOM_000000105001002000&dataSid=';
  const PRESS = 'https://press.kunsan.ac.kr/';
  const IMG = 'https://cdn.media.bluedot.so/bluedot.kunsan-univ-press/';
  const FALLBACK = {
    asOf: '11.18',
    notices: [
      ['2026학년도 2학기 가족장학금 신청 안내', '학생지원과', '2026-11-17', 1389791],
      ['[교직과정] 2026학년도 제4차 교직 적성 및 인성 검사 실시 안내', '교무과', '2026-11-17', 1389737],
      ['[학사공지] 2026.2학기 군입대,질병 등 휴학자의 성적인정 신청 안내', '교무과', '2026-11-16', 1389729],
      ['[교내장학] 2026학년도 2학기 외국어능력우수장학금 신청 안내', '학생지원과', '2026-11-11', 1389464],
      ['[교내장학] 2026학년도 2학기 마일리지 장학금 신청 안내', '학생지원과', '2026-11-10', 1389379]
    ].map(([title, dept, date, sid]) => ({ title, dept, date, link: VIEW + sid })),
    news: [
      ['우연으로 시작해, 열정으로 이어가는 기자의 길', 'uyeoneuro-sijaghae-yeoljeongeuro-ieoganeun-gijayi-gil', '2026/11/edt3vd_202611061421.jpg'],
      ['군산시, 대표 미식 축제 ‘2026 군산 짬뽕페스티벌’ 개최', 'gunsansi-daepyo-misig-cugje-2026-gunsan-jjambbongpeseutibeol-gaecoe', '2026/11/hh21fk_202611061414.jpg'],
      ['SNS 낙서에서 극장판까지… 치이카와 열풍', 'jemogeobs', '2026/10/6qy1a4_202610300756.webp'],
      ['중앙도서관, ‘슬기로운 AI 생활’ 북큐레이션 운영', 'jungangdoseogwan-seulgiroun-ai-saenghwal-bugkyureisyeon-unyeong', '2026/10/zd68nq_202610300742.jpg'],
      ['읽는 책에서 즐기는 책으로, 달라지는 독서 문화', 'ilgneun-caegeseo-jeulgineun-caegeuro-dalrajineun-dogseo-munhwa', '2026/10/xecpad_202610291239.jpg']
    ].map(([title, slug, img]) => ({ title, date: '2026-10-29', link: `${PRESS}${slug}/`, image: IMG + img }))
  };
  const state = {};
  const clock = iso => new Date(iso).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false });

  async function load(name, path) {
    try {
      const res = await fetch(path, { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      if (!Array.isArray(data.items) || !data.items.length) throw new Error('empty');
      state[name] = { items: data.items, label: `실시간 · ${clock(data.fetchedAt)} 기준`, live: true };
    } catch {
      state[name] = { items: FALLBACK[name], label: `저장된 목록 · ${FALLBACK.asOf} 기준` };
    }
  }
  function renderNotices() {
    const { items, label, live } = state.notices;
    $('#notice-list').replaceChildren(...items.slice(0, 4).map(n => h('a', { class: 'notice', href: n.link, target: '_blank', rel: 'noopener noreferrer' },
      h('strong', {}, n.title), h('small', {}, [n.dept, n.date.slice(5).replace('-', '.')].filter(Boolean).join(' · ')))));
    $('#notice-status').textContent = label;
    $('#notice-status').classList.toggle('is-live', !!live);
  }
  async function refresh() {
    await Promise.all([load('notices', '/api/notices'), load('news', '/api/news')]);
    renderNotices();
  }

  // eclass 남은 과제(예시): 로그인이 필요해 실제 연동은 하지 않습니다. 마감일은 오늘 기준으로 만듭니다.
  const sampleTasks = () => [['웹 프로그래밍', '기말 프로젝트 제출', 1], ['데이터베이스', 'ER 다이어그램 과제', 4], ['알고리즘', '7주차 실습 보고서', 9]]
    .map(([course, title, days]) => ({ course, title, ms: Date.parse(new Date(Date.now() + days * 864e5).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }) + 'T23:59:00+09:00') }))
    .sort((a, b) => a.ms - b.ms);
  const note = (box, text, cls = 'quick-note') => box.append(h('p', { class: cls }, text));

  window.quickInfo = {
    portal(box) {
      note(box, '(모)통합정보에서 즐겨찾기한 메뉴');
      if (!portal.favs.length) return note(box, '아직 즐겨찾기한 메뉴가 없어요. 통합정보 메뉴의 ☆를 눌러 추가하세요.', 'quick-empty');
      box.append(h('div', { class: 'quick-list' }, ...portal.favs.map(name => h('button', {
        type: 'button', class: 'quick-item', onclick: () => { $('#modal').close(); portal.open('favorites'); }
      }, h('strong', {}, name), h('small', {}, portalMenus.find(g => g.items.includes(name))?.name || '')))));
    },
    eclass(box) {
      const tasks = sampleTasks();
      note(box, `남은 과제 ${tasks.length}개 · 마감 임박 순`);
      box.append(h('div', { class: 'quick-list' }, ...tasks.map(t => {
        const left = t.ms - Date.now();
        const label = left < 864e5 ? `${Math.max(1, Math.ceil(left / 36e5))}시간 남음` : `D-${Math.floor(left / 864e5)}`;
        return h('div', { class: 'quick-item' }, h('div', {}, h('strong', {}, t.title), h('small', {}, t.course)),
          h('span', { class: 'dday-badge' + (left < 2 * 864e5 ? ' urgent' : '') }, label));
      })));
      note(box, '예시 데이터예요. 실제 eclass 과제는 로그인이 필요해 연동하지 않았어요.', 'quick-foot');
    },
    news(box) {
      const news = state.news || { items: FALLBACK.news, label: `저장된 목록 · ${FALLBACK.asOf} 기준` };
      note(box, `군산대 신문 최신 기사 · ${news.label}`);
      box.append(h('div', { class: 'quick-list' }, ...news.items.slice(0, 5).map(n => h('a', { class: 'quick-item news', href: n.link, target: '_blank', rel: 'noopener noreferrer' },
        ...(n.image ? [h('img', { src: n.image, alt: '', loading: 'lazy', width: 56, height: 42, onerror: e => e.target.remove() })] : []),
        h('div', {}, h('strong', {}, n.title), h('small', {}, n.date))))),
      h('a', { class: 'quick-more', href: PRESS, target: '_blank', rel: 'noopener noreferrer' }, '군산대 신문에서 더 보기 ↗'));
    }
  };

  refresh();
  setInterval(refresh, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
})();
