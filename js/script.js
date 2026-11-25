// 화면 동작: 서비스 목록 · 빠른 정보 · 통합정보 메뉴 · 식단 · 서비스 설정
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
// 요소 만들기: h('button', {class:'x', onclick: fn}, '글자')
const h = (tag, attrs, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) k in e ? e[k] = v : e.setAttribute(k, v);
  e.append(...kids);
  return e;
};
const store = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } }
};
const arr = v => (Array.isArray(v) ? v : []);
let toastTimer;
const toast = text => {
  $('#status').textContent = text;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('#status').textContent = ''; }, 2200);
};
// 한국시간의 날짜·시각
const kstNow = () => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, label: `${+p.month}월 ${+p.day}일`, minutes: +p.hour * 60 + +p.minute };
};

/* ---------- 팝업 ---------- */
const modal = $('#modal');
let selected = null, returnFocus = null;
function show(title, body = '', quick = false) {
  returnFocus = document.activeElement;
  $('#modal-title').textContent = title;
  $('#modal-body').textContent = body;
  $('#modal-body').hidden = !body;
  $('#quick-rich').replaceChildren();
  $('#favorite').hidden = !quick;
  $('#go-service').hidden = !quick;
  if (!modal.open) modal.showModal();
}
modal.addEventListener('close', () => {
  const target = selected ? $(`[data-service="${selected.id}"]`) : returnFocus;
  selected = null;
  if (target?.isConnected) target.focus({ preventScroll: true });
});

/* ---------- 서비스 목록 ---------- */
const PREF = 'ksnu-service-preferences-v1', ORDER = 'ksnu-service-order-v1', FAV = 'ksnu-demo-favorites-v1';
const byId = id => services.find(s => s.id === id);
let prefs = store.get(PREF, {}), order = arr(store.get(ORDER, []));
if (!prefs || typeof prefs !== 'object' || Array.isArray(prefs)) prefs = {};
let favs = [...new Set(arr(store.get(FAV, [])).filter(byId))];
const ordered = () => [...new Set([...order, ...services.map(s => s.id)])].map(byId).filter(Boolean);
const pager = $('#services');

function renderServices() {
  const left = pager.scrollLeft;
  const list = ordered().filter(s => prefs[s.id] !== false);
  const pages = Math.max(1, Math.ceil(list.length / 8));
  pager.replaceChildren(...Array.from({ length: pages }, (_, p) => h('div', { class: 'service-page', role: 'group', 'aria-label': `서비스 ${p + 1}페이지` },
    ...list.slice(p * 8, p * 8 + 8).map(s => {
      const fav = favs.includes(s.id);
      return h('div', { class: 'service' + (fav ? ' is-favorite' : '') },
        h('button', { class: 'open', type: 'button', 'data-service': s.id, 'aria-label': `${s.name}${fav ? ', 즐겨찾기' : ''}. 길게 누르면 빠른 정보` },
          h('span', { class: 'icon', 'aria-hidden': 'true' }, s.icon), s.name));
    }))));
  $('#dots').replaceChildren(...Array.from({ length: pages }, (_, p) => h('button', {
    type: 'button', 'aria-label': `서비스 ${p + 1}페이지`, onclick: () => pager.scrollTo({ left: p * pager.clientWidth, behavior: 'smooth' })
  })));
  pager.scrollLeft = left;
  syncDots();
}
function syncDots() {
  const page = Math.round(pager.scrollLeft / pager.clientWidth);
  $$('#dots button').forEach((b, i) => { b.classList.toggle('current', i === page); b.setAttribute('aria-current', i === page); });
}
pager.addEventListener('scroll', syncDots, { passive: true });
$('#services-next').onclick = () => {
  const last = pager.children.length - 1, page = Math.round(pager.scrollLeft / pager.clientWidth);
  pager.scrollTo({ left: (page >= last ? 0 : page + 1) * pager.clientWidth, behavior: 'smooth' });
};

/* ---------- 빠른 정보(길게 누르기) ---------- */
const QUICK = ['portal', 'eclass', 'news', 'ai']; // 이 서비스만 빠른 정보를 보여줍니다. 나머지는 즐겨찾기 버튼만 나옵니다.
function quick(id) {
  selected = byId(id);
  $('#favorite').textContent = favs.includes(id) ? '★ 즐겨찾기 해제' : '☆ 즐겨찾기 추가';
  const info = QUICK.includes(id), build = window.quickInfo?.[id];
  show(info ? `${selected.name} · 빠른 정보` : selected.name, info && !build ? selected.summary + '\n\n과제용 예시 정보입니다.' : '', true);
  $('#go-service').hidden = !info;
  if (build) build($('#quick-rich'));
}
$('#favorite').onclick = () => {
  const id = selected.id;
  favs = favs.includes(id) ? favs.filter(x => x !== id) : [...favs, id];
  const saved = store.set(FAV, favs);
  renderServices();
  $('#favorite').textContent = favs.includes(id) ? '★ 즐겨찾기 해제' : '☆ 즐겨찾기 추가';
  toast(saved ? '즐겨찾기를 변경했어요. 별표 아이콘으로 바로 이용하세요.' : '변경했어요. 이 브라우저에서는 저장이 제한돼요.');
};
$('#go-service').onclick = () => show(selected.name, selected.body + '\n\n실제 시스템과 연결되지 않은 예시 화면입니다.');

let press = null, suppress = 0; // suppress: 길게 누르기·드래그 직후 클릭 무시
const cancelPress = () => { if (press) { clearTimeout(press.timer); press.button.classList.remove('pressing'); press = null; } };
pager.addEventListener('pointerdown', e => {
  const button = e.target.closest('[data-service]');
  if (!button || e.button !== 0) return;
  cancelPress();
  const state = press = { button, x: e.clientX, y: e.clientY, id: e.pointerId };
  button.classList.add('pressing');
  state.timer = setTimeout(() => {
    if (press !== state) return;
    suppress = Date.now() + 1200; cancelPress(); quick(button.dataset.service);
  }, 550);
});
pager.addEventListener('contextmenu', e => {
  const button = e.target.closest('[data-service]');
  if (!button) return;
  e.preventDefault(); cancelPress(); suppress = Date.now() + 1200;
  if (!modal.open) quick(button.dataset.service);
});
pager.addEventListener('keydown', e => {
  const button = e.target.closest('[data-service]');
  if (button && (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10'))) { e.preventDefault(); quick(button.dataset.service); }
});
pager.addEventListener('dragstart', e => e.preventDefault());
pager.addEventListener('click', e => {
  const button = e.target.closest('[data-service]');
  if (!button) return;
  if (Date.now() < suppress) return e.preventDefault();
  const s = byId(button.dataset.service);
  if (s.id === 'portal') return portal.open();
  if (s.link) { open(s.link, '_blank', 'noopener,noreferrer'); toast(`${s.name} 공식 페이지를 새 탭에서 열었습니다.`); }
  else show(s.name, s.summary + '\n\n해당 서비스의 공식 접속 주소는 별도 확인이 필요합니다. 국립군산대학교 공식 홈페이지에서 이용해 주세요.');
});

// 마우스 드래그로 좌우 넘기기 (터치는 브라우저 스크롤이 처리)
let drag = null;
pager.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse' && e.button === 0) drag = { id: e.pointerId, x: e.clientX, y: e.clientY, left: pager.scrollLeft, page: Math.round(pager.scrollLeft / pager.clientWidth), on: false };
});
document.addEventListener('pointermove', e => {
  if (press && e.pointerId === press.id && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) cancelPress();
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!drag.on) {
    if ((Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) || modal.open) { drag = null; return; }
    if (Math.abs(dx) < 8) return;
    drag.on = true; cancelPress(); pager.classList.add('dragging'); pager.setPointerCapture(e.pointerId);
  }
  e.preventDefault(); suppress = Date.now() + 500; pager.scrollLeft = drag.left - dx;
}, { passive: false });
const endPointer = e => {
  cancelPress();
  if (!drag || e.pointerId !== drag.id) return;
  const state = drag; drag = null;
  if (!state.on) return;
  const dx = e.clientX - state.x;
  let page = state.page;
  if (e.type === 'pointerup' && Math.abs(dx) > Math.min(55, pager.clientWidth * .18)) page += dx < 0 ? 1 : -1;
  page = Math.max(0, Math.min(pager.children.length - 1, page));
  pager.classList.remove('dragging');
  if (pager.hasPointerCapture(e.pointerId)) pager.releasePointerCapture(e.pointerId);
  suppress = Date.now() + 500;
  pager.scrollTo({ left: page * pager.clientWidth, behavior: 'smooth' });
};
document.addEventListener('pointerup', endPointer);
document.addEventListener('pointercancel', endPointer);

/* ---------- (모)통합정보 메뉴: 모든 분야·메뉴를 한 화면 흐름에서 보기 ---------- */
const PFAV = 'ksnu-portal-favorites', PRECENT = 'ksnu-portal-recent';
const portal = {
  tab: 'all', favs: arr(store.get(PFAV, [])), recent: arr(store.get(PRECENT, [])),
  open(tab) {
    if (tab) this.tab = tab;
    $('#portal-search').value = '';
    $('#portal').hidden = false; $('#portal').scrollTop = 0;
    renderPortal(); $('#portal-back').focus();
  },
  close() { $('#portal').hidden = true; $('[data-service="portal"]')?.focus(); }
};
const flatMenus = portalMenus.flatMap(c => c.items.map(name => ({ name, category: c.name })));
const uniq = list => [...new Map(list.map(x => [x.name, x])).values()];
const TABS = [['all', '전체 메뉴'], ['favorites', '☆ 즐겨찾기'], ['recent', '최근 사용']];
const starText = on => (on ? '★' : '☆');

function portalRow({ name, category }) {
  return h('div', { class: 'portal-item' },
    h('button', {
      type: 'button', class: 'name', onclick: () => {
        portal.recent = [name, ...portal.recent.filter(x => x !== name)].slice(0, 12);
        store.set(PRECENT, portal.recent);
        const cat = category || flatMenus.find(x => x.name === name).category;
        show(name, `${cat} · 통합정보시스템\n\n과제용 예시 화면입니다. 실제 학사 조회·신청은 학교 공식 통합정보시스템에서 진행해 주세요.`);
        $('#favorite').hidden = $('#go-service').hidden = true;
        $('#quick-rich').append(h('a', { class: 'quick-more', href: 'https://portal.kunsan.ac.kr/', target: '_blank', rel: 'noopener noreferrer' }, '공식 통합정보시스템 열기 ↗'));
      }
    }, name, ...(category ? [h('small', {}, category)] : [])),
    h('button', { type: 'button', class: 'star', 'data-name': name, onclick: () => toggleFavorite(name) }));
}
function paintStars() {
  $$('.star').forEach(b => {
    const on = portal.favs.includes(b.dataset.name);
    b.textContent = starText(on);
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
    b.setAttribute('aria-label', `${b.dataset.name} 즐겨찾기`);
  });
}
function toggleFavorite(name) {
  portal.favs = portal.favs.includes(name) ? portal.favs.filter(x => x !== name) : [...portal.favs, name];
  store.set(PFAV, portal.favs);
  if (portal.tab === 'favorites' && !$('#portal-search').value.trim()) return renderPortal(); // 목록에서 빠지므로 다시 그림
  paintStars(); // 그 밖에는 별만 바꿔 펼침 상태와 스크롤 위치를 유지
  $$('.star').find(b => b.dataset.name === name)?.focus();
}
function renderPortal() {
  const { tab } = portal, q = $('#portal-search').value.trim().toLowerCase();
  const grouped = tab === 'all' && !q;
  $$('[data-portal-tab]').forEach(b => {
    const on = b.dataset.portalTab === tab && !q;
    b.classList.toggle('active', on);
    if (b.getAttribute('role') === 'tab') b.setAttribute('aria-selected', on);
  });
  $('#portal-index').hidden = !grouped;
  $('#portal-toggle').hidden = !grouped;
  let summary, nodes;
  if (grouped) {
    summary = `${portalMenus.length}개 분야 · ${flatMenus.length}개 메뉴`;
    nodes = portalMenus.map((c, i) => h('details', { class: 'group', id: `cat-${i}` },
      h('summary', {}, h('span', { 'aria-hidden': 'true' }, c.icon), c.name, h('small', {}, c.items.length + '개')),
      h('div', { class: 'items' }, ...c.items.map(name => portalRow({ name })))));
  } else {
    const rows = q ? uniq(flatMenus.filter(x => `${x.name} ${x.category}`.toLowerCase().includes(q)))
      : tab === 'recent' ? portal.recent.map(n => flatMenus.find(x => x.name === n)).filter(Boolean)
      : uniq(flatMenus.filter(x => portal.favs.includes(x.name)));
    summary = q ? `"${$('#portal-search').value.trim()}" 검색 결과 ${rows.length}개` : `${{ favorites: '즐겨찾기', recent: '최근 사용' }[tab]} ${rows.length}개`;
    nodes = rows.length ? [h('div', { class: 'items' }, ...rows.map(portalRow))]
      : [h('p', { class: 'portal-empty' }, q ? '검색 결과가 없습니다.' : tab === 'recent' ? '아직 사용한 메뉴가 없습니다.' : '표시할 메뉴가 없습니다. 메뉴의 ☆를 눌러 즐겨찾기에 추가하세요.')];
  }
  $('#portal-summary').textContent = summary;
  $('#portal-list').replaceChildren(...nodes);
  syncToggle();
  paintStars();
}
// 분야 바로가기: 누르면 해당 분야로 이동하고, 스크롤하면 현재 분야가 표시됩니다.
$('#portal-index').replaceChildren(...portalMenus.map((c, i) => h('button', {
  type: 'button', onclick: () => { const g = $(`#cat-${i}`); g.open = true; g.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
}, h('span', { 'aria-hidden': 'true' }, c.icon), c.name)));
$('#portal').addEventListener('scroll', () => {
  const chips = $$('#portal-index button');
  if ($('#portal-index').hidden || !chips.length) return;
  const line = $('#portal-index').getBoundingClientRect().bottom + 40;
  let now = 0;
  portalMenus.forEach((_, i) => { if ($(`#cat-${i}`).getBoundingClientRect().top <= line) now = i; });
  chips.forEach((b, i) => { b.classList.toggle('active', i === now); if (i === now) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  const box = $('#portal-index'), on = chips[now];
  box.scrollTo({ left: on.offsetLeft - (box.clientWidth - on.clientWidth) / 2 });
}, { passive: true });
const syncToggle = () => { $('#portal-toggle').textContent = $$('.group').some(g => g.open) ? '모두 접기' : '모두 펼치기'; };
$('#portal-list').addEventListener('toggle', syncToggle, true); // 분야를 하나라도 펼치면 "모두 접기"로 바뀜
$('#portal-toggle').onclick = () => {
  const groups = $$('.group'), open = groups.some(g => g.open);
  groups.forEach(g => { g.open = !open; });
};
$('#portal-tabs').replaceChildren(...TABS.map(([tab, label]) => h('button', {
  type: 'button', class: 'tab', role: 'tab', 'data-portal-tab': tab, onclick: () => { portal.tab = tab; $('#portal-search').value = ''; renderPortal(); $('#portal').scrollTop = 0; }
}, label)));
$('#portal-bottom').replaceChildren(
  h('button', { type: 'button', onclick: () => portal.close() }, h('span', { 'aria-hidden': 'true' }, '⌂'), '홈'),
  ...[['▦', '전체 메뉴', 'all'], ['☆', '즐겨찾기', 'favorites'], ['↺', '최근 사용', 'recent']].map(([icon, label, tab]) => h('button', {
    type: 'button', 'data-portal-tab': tab, onclick: () => { portal.tab = tab; $('#portal-search').value = ''; renderPortal(); $('#portal').scrollTop = 0; }
  }, h('span', { 'aria-hidden': 'true' }, icon), label)));
$('#portal-back').onclick = () => portal.close();
$('#portal-search').addEventListener('input', renderPortal);

/* ---------- 오늘의 식단 (기본: 교직원) ---------- */
const SLOT = { breakfast: '아침', lunch: '점심', dinner: '저녁' };
let manual = null, lastSlot, lastDate, expanded = false;
$('#meal-tabs').replaceChildren(...Object.entries(meals).map(([id, v]) => h('button', {
  type: 'button', 'data-dining': id, onclick: () => { manual = id; renderMeal(); }
}, v.name)));
const NONE = ['현재 시간대 미운영', '전체 보기에서 하루 식단을 확인하세요.'];
function renderMeal() {
  const now = kstNow(), slot = now.minutes < 580 ? 'breakfast' : now.minutes < 810 ? 'lunch' : 'dinner';
  if (lastSlot !== slot || lastDate !== now.date) { manual = null; lastSlot = slot; lastDate = now.date; } // 시간대가 바뀌면 다시 기본 식당
  const id = manual || 'staff', venue = meals[id], menu = venue.menu[slot] || NONE;
  $('#meal-label').textContent = `${now.label} · ${venue.name} · ${SLOT[slot]}`;
  $('#meal-main').textContent = menu[0];
  $('#meal-side').textContent = menu[1];
  $('#meal-auto').textContent = manual ? '기본으로' : '기본 표시 중';
  $('#meal-auto').setAttribute('aria-pressed', !manual);
  $$('[data-dining]').forEach(b => { const on = b.dataset.dining === id; b.classList.toggle('selected', on); b.setAttribute('aria-pressed', on); });
  $('#daily-meals').hidden = !expanded;
  $('#food-detail').textContent = expanded ? '접기' : '전체 보기';
  $('#food-detail').setAttribute('aria-expanded', expanded);
  $('#daily-meals').replaceChildren(...(expanded ? [h('h3', {}, venue.name + ' 하루 식단'),
    ...Object.entries(SLOT).map(([key, name]) => { const m = venue.menu[key]; return h('div', { class: 'daily-meal' }, h('strong', {}, name), ...(m ? m.map(t => h('p', {}, t)) : [h('p', { class: 'none' }, '미운영')])); })] : []));
}
$('#meal-auto').onclick = () => { manual = null; renderMeal(); };
$('#food-detail').onclick = () => { expanded = !expanded; renderMeal(); };
document.addEventListener('visibilitychange', () => { if (!document.hidden) renderMeal(); });

/* ---------- 서비스 설정 (표시 · 순서) ---------- */
const dlg = $('#settings'), sList = $('#settings-list'), sError = $('#settings-error');
function fillSettings() {
  sError.textContent = '';
  sList.replaceChildren(...ordered().map(s => h('div', { class: 'setting-row', 'data-id': s.id },
    h('label', {}, h('input', { type: 'checkbox', checked: prefs[s.id] !== false, 'data-setting': s.id }), s.name),
    h('button', { type: 'button', class: 'drag-handle', 'aria-label': `${s.name} 순서 이동. 방향키로도 이동할 수 있어요` }, '☰'))));
}
const saveOrder = () => { order = $$('.setting-row', sList).map(r => r.dataset.id); store.set(ORDER, order); renderServices(); };
$('#settings-open').onclick = () => { fillSettings(); dlg.showModal(); };
$('#settings-reset').onclick = () => { order = []; prefs = {}; store.set(ORDER, order); store.set(PREF, prefs); renderServices(); fillSettings(); };
sList.addEventListener('change', e => {
  if (!e.target.matches('[data-setting]')) return;
  const boxes = $$('[data-setting]', sList);
  if (!boxes.some(b => b.checked)) { e.target.checked = true; sError.textContent = '서비스를 하나 이상 선택해 주세요.'; return; }
  sError.textContent = '';
  prefs = Object.fromEntries(boxes.map(b => [b.dataset.setting, b.checked]));
  store.set(PREF, prefs); renderServices(); pager.scrollLeft = 0;
});
// ☰ 손잡이를 잡아 끌거나 방향키(↑↓)로 순서를 바꿉니다.
let dragRow = null, dragHandle = null;
sList.addEventListener('pointerdown', e => {
  const handle = e.target.closest('.drag-handle');
  if (!handle || e.button !== 0) return;
  e.preventDefault();
  dragHandle = handle; dragRow = handle.closest('.setting-row');
  dragRow.classList.add('is-dragging'); handle.setPointerCapture(e.pointerId);
});
sList.addEventListener('pointermove', e => {
  if (!dragRow) return;
  e.preventDefault();
  const next = $$('.setting-row', sList).filter(r => r !== dragRow).find(r => { const b = r.getBoundingClientRect(); return e.clientY < b.top + b.height / 2; });
  sList.insertBefore(dragRow, next || null);
  const box = sList.getBoundingClientRect();
  if (e.clientY < box.top + 35) sList.scrollTop -= 15;
  if (e.clientY > box.bottom - 35) sList.scrollTop += 15;
}, { passive: false });
const endReorder = e => {
  if (!dragRow) return;
  dragRow.classList.remove('is-dragging');
  if (dragHandle.hasPointerCapture(e.pointerId)) dragHandle.releasePointerCapture(e.pointerId);
  dragRow = dragHandle = null; saveOrder();
};
sList.addEventListener('pointerup', endReorder);
sList.addEventListener('pointercancel', endReorder);
sList.addEventListener('keydown', e => {
  if (!e.target.matches('.drag-handle') || !['ArrowUp', 'ArrowDown'].includes(e.key)) return;
  e.preventDefault();
  const row = e.target.closest('.setting-row');
  if (e.key === 'ArrowUp' && row.previousElementSibling) sList.insertBefore(row, row.previousElementSibling);
  if (e.key === 'ArrowDown' && row.nextElementSibling) sList.insertBefore(row.nextElementSibling, row);
  saveOrder(); e.target.focus();
});

/* ---------- 그 밖의 버튼 ---------- */
$('#message').onclick = () => show('알림 · 예시', '장학금 신청 안내\n수강신청 변경 안내\n실제 수신 메시지가 아닙니다.');
document.addEventListener('click', e => {
  if (e.target.closest('[data-detail]')) show('학생정보', byId('student').body);
  const go = e.target.closest('[data-scroll]');
  if (!go) return;
  if (go.dataset.scroll === 'top') scrollTo({ top: 0, behavior: 'smooth' });
  else document.getElementById(go.dataset.scroll).scrollIntoView({ behavior: 'smooth' });
});

$('#lessons').replaceChildren(...lessons.map(([time, name, room]) => h('div', { class: 'lesson' },
  h('span', { class: 'time' }, time), h('div', {}, h('strong', {}, name), h('small', {}, room)))));
renderServices();
renderMeal();
setInterval(renderMeal, 30000);
