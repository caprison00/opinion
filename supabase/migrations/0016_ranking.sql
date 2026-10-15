-- 마일스톤 12: 랭킹 개편 (월 시즌, 누적/정확도, 분야 필터, 상위 %, 티어 마크, 프로필)
-- 조회 함수만 추가한다. 기존 데이터는 바꾸지 않는다.

-- 이번 시즌 = 한국 시간 기준 이번 달 (YYYY-MM)
create function public.current_season()
returns text
language sql
stable
set search_path = ''
as $$
  select to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM');
$$;

-- 순위와 대상 인원으로 티어를 정한다.
-- 각 티어의 순위 컷 = 올림(대상 인원 × 누적 비율). 대상자가 있으면 마스터는 최소 1명.
-- 마스터 1% · 다이아 5% · 플래티넘 15% · 골드 35% · 실버 60% · 브론즈 나머지
create function public.tier_for(p_rank int, p_n int)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_rank is null or p_n is null or p_n < 1 then 'newbie'
    when p_rank <= greatest(1, ceil(p_n * 0.01)) then 'master'
    when p_rank <= ceil(p_n * 0.05) then 'diamond'
    when p_rank <= ceil(p_n * 0.15) then 'platinum'
    when p_rank <= ceil(p_n * 0.35) then 'gold'
    when p_rank <= ceil(p_n * 0.60) then 'silver'
    else 'bronze'
  end;
$$;

-- 한 시즌의 티어 표: 판정된 예측 3건 이상인 사람만 대상, 누적 점수 순
create function public.season_tiers(p_season text)
returns table (user_id uuid, total_score int, scored_count int, rank int, eligible int, tier text)
language sql
stable
security definer
set search_path = ''
as $$
  with s as (
    select qs.user_id, sum(qs.score)::int as total, count(*)::int as c
    from public.question_scores qs
    where qs.season = p_season
    group by qs.user_id
  ),
  e as (
    select s.*, rank() over (order by s.total desc)::int as rk, count(*) over ()::int as n
    from s where s.c >= 3
  )
  select e.user_id, e.total, e.c, e.rk, e.n, public.tier_for(e.rk, e.n) from e;
$$;

-- 여러 사용자의 이번 시즌 티어 (대상이 아니면 newbie = 새내기)
create function public.user_tiers(p_ids uuid[])
returns table (user_id uuid, tier text)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, coalesce(t.tier, 'newbie')
  from unnest(p_ids) as u(id)
  left join public.season_tiers(public.current_season()) t on t.user_id = u.id;
$$;

-- 시즌 랭킹
--   p_mode: 'total'(누적 점수, 판정 3건 이상) | 'accuracy'(평균 점수, 판정 10건 이상)
--   p_category: 분야 필터 (null이면 전체)
--   상위 p_limit명 + 내 행(순위 밖이어도)을 돌려준다. eligible = 대상 인원 (상위 % 계산용)
create function public.season_leaderboard(
  p_season text,
  p_mode text default 'total',
  p_category text default null,
  p_limit int default 100
)
returns table (
  rank int,
  user_id uuid,
  nickname text,
  total_score int,
  scored_count int,
  avg_score numeric,
  eligible int,
  tier text
)
language sql
stable
security definer
set search_path = ''
as $$
  with s as (
    select qs.user_id, sum(qs.score)::int as total, count(*)::int as c,
           avg(qs.score) as avg_s
    from public.question_scores qs
    join public.questions q on q.id = qs.question_id
    where qs.season = p_season
      and (p_category is null or q.category = p_category)
    group by qs.user_id
  ),
  e as (
    select s.*, count(*) over ()::int as n,
      rank() over (
        order by case when p_mode = 'accuracy' then s.avg_s else s.total end desc
      )::int as rk
    from s
    where s.c >= case when p_mode = 'accuracy' then 10 else 3 end
  )
  select e.rk, e.user_id, p.nickname, e.total, e.c, round(e.avg_s, 1), e.n,
         coalesce(t.tier, 'newbie')
  from e
  join public.profiles p on p.id = e.user_id
  left join public.season_tiers(p_season) t on t.user_id = e.user_id
  where e.rk <= least(greatest(p_limit, 1), 200) or e.user_id = auth.uid()
  order by e.rk, e.c desc, p.nickname;
$$;

-- 프로필 요약
--   이번 시즌: 티어, 누적 점수, 판정 수, 순위/대상 인원, 분야별 순위(상위 %)
--   전체 기간: 누적 점수, 판정된 예측 수, 적중률(정답을 가장 높게 본 비율)
create function public.profile_stats(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'nickname', p.nickname,
    'joined_at', p.created_at,
    'season', public.current_season(),
    'tier', coalesce(t.tier, 'newbie'),
    'season_rank', t.rank,
    'season_eligible', t.eligible,
    'season_total', coalesce((
      select sum(score) from public.question_scores
      where user_id = p.id and season = public.current_season()), 0),
    'season_count', (
      select count(*) from public.question_scores
      where user_id = p.id and season = public.current_season()),
    'total_score', coalesce((
      select sum(score) from public.question_scores where user_id = p.id), 0),
    'scored_count', (
      select count(*) from public.question_scores where user_id = p.id),
    'hit_rate', (
      select avg(case when pr.probs[q.outcome_index + 1] =
                   (select max(x) from unnest(pr.probs) as x) then 1.0 else 0.0 end)
      from public.predictions pr
      join public.questions q on q.id = pr.question_id
      where pr.user_id = p.id and q.status = 'resolved' and q.outcome_index is not null),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
               'category', c.category, 'total', c.total, 'count', c.cnt,
               'rank', c.rk, 'n', c.n)
             order by c.rk::numeric / c.n)
      from (
        select q.category, qs.user_id, sum(qs.score)::int as total, count(*)::int as cnt,
          rank() over (partition by q.category order by sum(qs.score) desc)::int as rk,
          count(*) over (partition by q.category)::int as n
        from public.question_scores qs
        join public.questions q on q.id = qs.question_id
        where qs.season = public.current_season()
        group by q.category, qs.user_id
      ) c
      where c.user_id = p.id), '[]'::jsonb)
  )
  from public.profiles p
  left join public.season_tiers(public.current_season()) t on t.user_id = p.id
  where p.id = p_user;
$$;

grant execute on function public.current_season() to anon, authenticated;
grant execute on function public.tier_for(int, int) to anon, authenticated;
grant execute on function public.season_tiers(text) to anon, authenticated;
grant execute on function public.user_tiers(uuid[]) to anon, authenticated;
grant execute on function public.season_leaderboard(text, text, text, int) to anon, authenticated;
grant execute on function public.profile_stats(uuid) to anon, authenticated;
