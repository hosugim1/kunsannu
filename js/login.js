// auth.enabled(Supabase 설정됨)면 실제 회원가입·로그인, 아니면 예시 로그인으로 동작합니다.
const $ = id => document.getElementById(id);
const form = $('login-form'), idInput = $('login-id'), password = $('login-password'), error = $('login-error');
const say = (text, ok = false) => { error.textContent = text; error.toggleAttribute('data-ok', ok); };
const enter = name => { try { sessionStorage.setItem('campus-user-id', name); } catch (e) {} location.href = 'main.html'; };
const real = window.auth && window.auth.enabled;

if (real) {
    document.querySelector('label[for=login-id]').textContent = '전자우편';
    idInput.type = 'email'; idInput.autocomplete = 'email'; idInput.placeholder = '전자우편을 입력하세요';
    $('signup').hidden = false;
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
        // 표시 이름 = 학번. students.js 표에 이름을 적어 둔 학번만 그 이름으로 바꿔 보여줍니다.
        const listed = window.STUDENT_NAMES && Object.hasOwn(window.STUDENT_NAMES, id) ? window.STUDENT_NAMES[id] : '';
        const name = listed || id;
        password.value = '';
        enter(name);
    }
    saveId();
});

$('signup').addEventListener('click', async () => {
    // 표시 이름은 따로 받지 않고 전자우편 @ 앞부분(학번 등)을 씁니다.
    const name = idInput.value.trim().split('@')[0];
    if (!idInput.validity.valid || !idInput.value || password.value.length < 8) return say('전자우편과 8자 이상의 비밀번호를 확인하세요.');
    if (name.length < 2 || name.length > 30) return say('전자우편 @ 앞부분은 2~30자여야 합니다.');
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
