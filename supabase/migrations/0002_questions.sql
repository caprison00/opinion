-- 마일스톤 2: 관리자, 질문

-- 관리자 목록. 클라이언트에서는 추가·수정할 수 없고, Supabase SQL Editor에서만 넣는다.
-- (profiles에 is_admin 칸을 두면 본인 프로필 수정 권한으로 스스로 관리자가 될 수 있어 별도 표로 둔다.)
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

create policy "users can see own admin row"
  on public.admins for select
  using (auth.uid() = user_id);

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- 질문. 카테고리는 스포츠·경제만 허용한다 (공직선거·정당 질문 제외).
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 5 and 120),
  description text not null default '',
  category text not null check (category in ('sports', 'economy')),
  resolution_source text not null check (char_length(resolution_source) > 0),
  close_at timestamptz not null,
  resolve_at timestamptz not null,
  status text not null default 'open'
    check (status in ('open', 'closed', 'resolved', 'void')),
  outcome text check (outcome in ('yes', 'no')),
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  check (resolve_at >= close_at)
);

create index questions_open_close_at_idx
  on public.questions (close_at) where status = 'open';

alter table public.questions enable row level security;

create policy "questions are viewable by everyone"
  on public.questions for select
  using (true);

create policy "admins can insert questions"
  on public.questions for insert
  with check (public.is_admin());

create policy "admins can update questions"
  on public.questions for update
  using (public.is_admin())
  with check (public.is_admin());
