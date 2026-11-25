// auth.enabled(Supabase 설정됨)면 실제 회원가입·로그인, 아니면 예시 로그인으로 동작합니다.
const $ = id => document.getElementById(id);
const form = $('login-form'), idInput = $('login-id'), password = $('login-password'), error = $('login-error');
const say = (text, ok = false) => { error.textContent = text; error.toggleAttribute('data-ok', ok); };
const enter = name => { try { sessionStorage.setItem('campus-user-id', name); } catch (e) {} location.href = 'main.html'; };
const real = window.auth && window.auth.enabled;

if (real) {
    document.querySelector('label[for=login-id]').textContent = '전자우편';
    idInput.type = 'email'; idInput.autocomplete = 'email'; idInput.placeholder = '전자우편을 입력하세요';
    $('signup-fields').hidden = $('signup').hidden = false;
}

form.addEventListener('submit', async event => {
    event.preventDefault();
    const id = idInput.value.trim();
    if (!id || !password.value.trim()) return say(real ? '전자우편과 비밀번호를 입력하세요.' : '학번과 비밀번호를 입력하세요.');
    if (real) {
        const { data, error: err } = await auth.client.auth.signInWithPassword({ email: id, password: password.value });
        if (err) return say('전자우편, 비밀번호, 메일 확인 상태를 점검하세요.');
        try { enter(await auth.profileName(data.user)); } catch (e) { say('프로필 읽기 실패: ' + e.message); }
    } else {
        // 학번 → 이름: students.js 표 → 이 브라우저에 기억한 이름 → 처음이면 이름을 물어봅니다.
        let saved = {};
        try { saved = JSON.parse(localStorage.getItem('campus-student-names') || '{}'); } catch (e) {}
        const pick = o => (o && Object.hasOwn(o, id) ? o[id] : '');
        let name = pick(window.STUDENT_NAMES) || pick(saved);
        if (!name) {
            const typed = $('display-name').value.trim();
            if ($('signup-fields').hidden) {
                $('signup-fields').hidden = false;
                document.querySelector('label[for=display-name]').textContent = '이름';
                $('display-name').focus();
                return say('처음 접속한 학번입니다. 이름을 입력하고 다시 로그인하세요.');
            }
            if (typed.length < 2 || typed.length > 30) return say('이름을 2~30자로 입력하세요.');
            name = typed;
            try { saved[id] = name; localStorage.setItem('campus-student-names', JSON.stringify(saved)); } catch (e) {}
        }
        password.value = '';
        enter(name);
    }
    saveId();
});

$('signup').addEventListener('click', async () => {
    const name = $('display-name').value.trim();
    if (name.length < 2 || name.length > 30) return say('표시 이름을 2~30자로 입력하세요.');
    if (!idInput.validity.valid || !idInput.value || password.value.length < 8) return say('전자우편과 8자 이상의 비밀번호를 확인하세요.');
    const { error: err } = await auth.client.auth.signUp({
        email: idInput.value.trim(), password: password.value,
        options: { emailRedirectTo: location.href.split('#')[0], data: { display_name: name } }
    });
    err ? say('회원가입 실패: ' + err.message) : say('확인 메일을 열어 가입을 완료하세요.', true);
});

$('password-toggle').addEventListener('click', function () {
    const visible = password.type === 'password';
    password.type = visible ? 'text' : 'password';
    this.textContent = visible ? '숨기기' : '보기';
    this.setAttribute('aria-pressed', String(visible));
});

// ID 저장: 체크하면 다음 접속 때 ID를 미리 채웁니다. 비밀번호는 저장하지 않습니다.
const remember = $('remember-id');
function saveId() {
    try {
        if (remember.checked && idInput.value.trim()) localStorage.setItem('campus-saved-id', idInput.value.trim());
        else localStorage.removeItem('campus-saved-id');
    } catch (e) {}
}
try {
    const saved = localStorage.getItem('campus-saved-id');
    if (saved) { idInput.value = saved; remember.checked = true; }
} catch (e) {}
