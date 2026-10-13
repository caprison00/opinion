-- 마일스톤 1: 사용자 프로필(닉네임)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null unique
    check (char_length(nickname) between 2 and 12),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 닉네임은 랭킹·근거 목록에 보여야 하므로 누구나 읽을 수 있다.
create policy "profiles are viewable by everyone"
  on public.profiles for select
  using (true);

-- 본인 프로필만 만들고 고칠 수 있다.
create policy "users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
