-- 디자인 시안 비교 의견 (/compare). 이름·연락처 등 개인정보는 받지 않는다.
-- 누구나 남길 수 있고(로그인 불필요), 읽기는 관리자만 한다. 기존 데이터는 바꾸지 않는다.

create table public.design_feedback (
  id uuid primary key default gen_random_uuid(),
  looks_like text not null default '' check (char_length(looks_like) <= 200),
  want_click text not null check (want_click in ('A', 'B', 'same')),
  trust text not null check (trust in ('A', 'B', 'same')),
  comment text not null default '' check (char_length(comment) <= 500),
  device text not null default '' check (device in ('', 'pc', 'mobile')),
  created_at timestamptz not null default now()
);

alter table public.design_feedback enable row level security;

create policy "anyone can leave design feedback"
  on public.design_feedback for insert
  to anon, authenticated
  with check (true);

create policy "admins can read design feedback"
  on public.design_feedback for select
  using (public.is_admin());

create policy "admins can delete design feedback"
  on public.design_feedback for delete
  using (public.is_admin());
