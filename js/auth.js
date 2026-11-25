// Supabase 클라이언트와 프로필 읽기. config.js가 비어 있으면 auth.enabled 는 false 입니다.
(function () {
    const c = window.SUPABASE_CONFIG || {};
    const enabled = Boolean(c.url && c.key && window.supabase);
    const client = enabled ? window.supabase.createClient(c.url, c.key) : null;

    // 본인 profiles 행을 읽고, 없으면 만든 뒤 표시 이름을 돌려줍니다. (RLS가 본인 행만 허용)
    async function profileName(user) {
        const { data, error } = await client.from('profiles').select('display_name')
            .eq('user_id', user.id).maybeSingle();
        if (error) throw error;
        if (data) return data.display_name;
        const meta = String(user.user_metadata?.display_name || '').trim();
        const name = meta.length >= 2 ? meta : '새 사용자';
        const made = await client.from('profiles').insert({ user_id: user.id, display_name: name })
            .select('display_name').single();
        if (made.error) throw made.error;
        return made.data.display_name;
    }

    window.auth = { enabled, client, profileName };
})();
