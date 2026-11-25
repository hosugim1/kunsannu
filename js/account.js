// 화면 표시용 사용자 이름. Supabase가 켜져 있으면 실제 세션이 있어야 들어올 수 있습니다.
(async function () {
    const real = window.auth && window.auth.enabled;
    let name = '';
    if (real) {
        const { data } = await auth.client.auth.getSession();
        if (data.session) {
            try { name = await auth.profileName(data.session.user); } catch (e) { name = '사용자'; }
        }
    } else {
        try { name = sessionStorage.getItem('campus-user-id') || ''; } catch (e) {}
    }
    if (!name) { location.replace('index.html'); return; }
    document.querySelector('.profile h1').textContent = name + ' 님';
    document.querySelector('.avatar').textContent = name.slice(0, 2);
    document.getElementById('logout').addEventListener('click', async event => {
        try { sessionStorage.removeItem('campus-user-id'); } catch (e) {}
        if (real) { event.preventDefault(); await auth.client.auth.signOut(); location.href = 'index.html'; }
    });
})();
