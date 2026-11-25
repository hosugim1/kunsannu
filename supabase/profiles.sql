-- Supabase SQL Editor → New query 에 붙여 넣고 "최초 한 번만" 실행합니다. (교안 3.6.2)
create table public.profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null check (char_length(display_name) between 2 and 30),
    introduction text not null default '' check (char_length(introduction) <= 300),
    updated_at timestamptz not null default now()
);

revoke all on table public.profiles from anon, authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;
alter table public.profiles enable row level security;

create policy "본인 프로필 읽기" on public.profiles for select to authenticated
using ((select auth.uid()) = user_id);

create policy "본인 프로필 만들기" on public.profiles for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "본인 프로필 수정" on public.profiles for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "본인 프로필 삭제" on public.profiles for delete to authenticated
using ((select auth.uid()) = user_id);
