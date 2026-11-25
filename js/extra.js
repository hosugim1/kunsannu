// 추가 편의 기능: 인사말, 학사일정 D-day, 다음 수업 표시
// 다른 기능과 분리해 두어 이 파일을 빼도 기존 화면은 그대로 동작합니다.

// 한국시간 기준 현재 날짜와 시각을 구합니다.
function extraNow() {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const v = Object.fromEntries(parts.map(p => [p.type, p.value]));
    return {
        year: Number(v.year), month: Number(v.month), day: Number(v.day),
        minutes: Number(v.hour) * 60 + Number(v.minute)
    };
}

// 시간대에 맞는 인사말을 고릅니다.
function greetingText(minutes) {
    if (minutes < 300) return '늦은 밤이에요';
    if (minutes < 660) return '좋은 아침이에요';
    if (minutes < 1020) return '좋은 오후예요';
    return '좋은 저녁이에요';
}

// 일정 시작일·종료일(MM-DD)로 D-day 문구를 만듭니다.
function ddayText(start, end, now) {
    const toDate = text => {
        const [month, day] = text.split('-').map(Number);
        return Date.UTC(now.year, month - 1, day);
    };
    const today = Date.UTC(now.year, now.month - 1, now.day);
    const left = Math.round((toDate(start) - today) / 86400000);
    if (left > 0) return 'D-' + left;
    if (today <= toDate(end)) return '진행 중';
    return '종료';
}

// 아직 시작하지 않은 첫 수업의 순번을 찾습니다. 없으면 -1입니다.
function nextLessonIndex(times, minutes) {
    return times.findIndex(text => {
        const [hour, minute] = text.split(':').map(Number);
        return hour * 60 + minute > minutes;
    });
}

function updateExtras() {
    const now = extraNow();

    const tag = document.querySelector('.profile-tag');
    if (tag) tag.textContent = 'MY CAMPUS · ' + greetingText(now.minutes);

    const badge = document.getElementById('calendar-dday');
    if (badge) {
        const text = ddayText(badge.dataset.start, badge.dataset.end, now);
        badge.textContent = text;
        badge.classList.toggle('is-ended', text === '종료');
    }

    const lessons = [...document.querySelectorAll('#schedule-section .lesson')];
    const times = lessons.map(lesson => lesson.querySelector('.time').textContent.trim());
    const next = nextLessonIndex(times, now.minutes);
    lessons.forEach((lesson, index) => {
        lesson.classList.toggle('is-past', next === -1 || index < next);
        lesson.classList.toggle('is-next', index === next);
    });
}

if (typeof document !== 'undefined') {
    updateExtras();
    setInterval(updateExtras, 60000);
}
if (typeof module !== 'undefined') module.exports = { greetingText, ddayText, nextLessonIndex };
