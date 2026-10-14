-- 방문 통계 (쿠키 없이, 개인을 식별하지 않는 방식)
-- IP와 브라우저 정보는 저장하지 않고, 매일 바뀌는 비밀값과 섞은 해시로만 "그날의 순 방문자"를 센다.
-- 비밀값은 다음 날 지워지므로, 서로 다른 날의 방문을 같은 사람으로 이을 수 없다.

create table public.daily_salts (
  day date primary key,
  salt text not null
);
alter table public.daily_salts enable row level security;
-- 정책 없음: 아래 함수(security definer)만 접근한다.

create table public.page_views (
  id bigint generated always as identity primary key,
  day date not null,
  path text not null check (char_length(path) <= 200),
  visitor_hash text not null,
  is_member boolean not null default false,
  device text not null check (device in ('mobile', 'desktop')),
  referrer_host text check (char_length(referrer_host) <= 100),
  created_at timestamptz not null default now()
);
create index page_views_day_idx on public.page_views (day);

alter table public.page_views enable row level security;
create policy "admins can read page views"
  on public.page_views for select
  using (public.is_admin());

create function public.log_page_view(
  p_path text,
  p_ip text,
  p_user_agent text,
  p_is_member boolean,
  p_device text,
  p_referrer_host text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := (now() at time zone 'Asia/Seoul')::date;
  v_salt text;
begin
  insert into public.daily_salts (day, salt)
  values (v_day, gen_random_uuid()::text || gen_random_uuid()::text)
  on conflict (day) do nothing;
  delete from public.daily_salts where day < v_day;
  select salt into v_salt from public.daily_salts where day = v_day;

  insert into public.page_views (day, path, visitor_hash, is_member, device, referrer_host)
  values (
    v_day,
    left(p_path, 200),
    encode(sha256(convert_to(v_salt || '|' || coalesce(p_ip, '') || '|' || coalesce(p_user_agent, ''), 'UTF8')), 'hex'),
    coalesce(p_is_member, false),
    case when p_device = 'mobile' then 'mobile' else 'desktop' end,
    nullif(left(p_referrer_host, 100), '')
  );

  -- 13개월이 지난 기록은 지운다.
  delete from public.page_views where day < v_day - interval '13 months';
end;
$$;

revoke all on function public.log_page_view(text, text, text, boolean, text, text) from public;
grant execute on function public.log_page_view(text, text, text, boolean, text, text) to anon, authenticated;

-- 일별 방문자·페이지뷰 (관리자만 읽을 수 있음: page_views의 정책을 따른다)
create view public.visit_daily
with (security_invoker = true)
as
select
  day,
  count(distinct visitor_hash)::int as visitors,
  count(*)::int as page_views,
  count(distinct visitor_hash) filter (where is_member)::int as member_visitors,
  count(distinct visitor_hash) filter (where device = 'mobile')::int as mobile_visitors
from public.page_views
group by day;

-- 기간별 인기 페이지와 유입 경로
create function public.visit_top(p_since date, p_kind text)
returns table (label text, views int, visitors int)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    case when p_kind = 'referrer' then coalesce(referrer_host, '(직접 방문)') else path end as label,
    count(*)::int as views,
    count(distinct visitor_hash)::int as visitors
  from public.page_views
  where day >= p_since
  group by 1
  order by views desc
  limit 10;
$$;
