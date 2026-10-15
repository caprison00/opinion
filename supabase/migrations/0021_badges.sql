-- 뱃지 (1차 12종). 표시용 기록일 뿐이며 점수·경품·재화와 바꿀 수 없다 (절대 규칙).
-- 기존 데이터는 읽기만 하고 바꾸지 않는다. 마지막에 지금까지의 기록으로 한 번 계산(소급)한다.

------------------------------------------------------------------------
-- 1) 뱃지 종류
------------------------------------------------------------------------
create table public.badges (
  key text primary key,
  family text not null check (family in ('hit', 'habit', 'contrib', 'contrarian')),
  name text not null,
  description text not null,
  -- 단계별 기준 숫자 (브론즈·실버·골드). 단계 없는 뱃지는 {1}
  thresholds int[] not null,
  sort int not null
);

insert into public.badges (key, family, name, description, thresholds, sort) values
  ('hits',        'hit',        '명중',          '판정된 질문을 맞힌 횟수',                     '{5,30,100}', 1),
  ('hit_streak',  'hit',        '연속 적중',      '판정 순서대로 연달아 맞힌 횟수',               '{3,5,10}',   2),
  ('season_master','hit',       '시즌 마스터',    '한 달 시즌을 마스터 티어로 마감',              '{1}',        3),
  ('daily',       'habit',      '꾸준한 예측가',  '연속으로 예측한 날 수',                       '{3,7,30}',   4),
  ('variety',     'habit',      '다방면',        '판정된 예측이 있는 분야 수',                   '{3,6,9}',    5),
  ('first_step',  'habit',      '첫 발걸음',      '첫 예측을 남김',                             '{1}',        6),
  ('liked',       'contrib',    '공감 받는 근거',  '내 댓글이 받은 리액션 합계',                   '{10,50,200}',7),
  ('early',       'contrib',    '선발대',        '공개 후 24시간 안에 먼저 예측한 질문 수',        '{5,20,50}',  8),
  ('reasoner',    'contrib',    '토론가',        '근거를 적은 예측 수',                         '{10,50,150}',9),
  ('minority',    'contrarian', '소수파 적중',    '30% 미만만 맞힌 질문을 맞힌 횟수',             '{1,5,20}',   10),
  ('contrarian',  'contrarian', '역발상',        '집단과 반대로 예측해서 맞힌 횟수',              '{1,5,20}',   11),
  ('sharpshooter','contrarian', '족집게',        '단 10% 미만만 맞힌 질문을 맞힌 횟수',           '{1}',        12);

alter table public.badges enable row level security;
create policy "badges are viewable by everyone"
  on public.badges for select using (true);

------------------------------------------------------------------------
-- 2) 사용자별 뱃지 (계산 함수만 쓴다)
------------------------------------------------------------------------
create table public.user_badges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_key text not null references public.badges (key) on delete cascade,
  level int not null default 0,       -- 0 = 아직 못 받음, 1~3 = 브론즈·실버·골드 (단계 없는 뱃지는 1)
  progress int not null default 0,    -- 현재 수치
  seen_level int not null default 0,  -- 사용자가 "새 뱃지" 안내를 본 단계
  earned_at timestamptz,              -- 지금 단계에 처음 오른 시각
  updated_at timestamptz not null default now(),
  primary key (user_id, badge_key)
);

-- 프로필 설정: 닉네임 옆 대표 뱃지, 수집한 뱃지 공개 여부
alter table public.profiles
  add column featured_badge text references public.badges (key) on delete set null,
  add column show_badges boolean not null default true;

alter table public.user_badges enable row level security;
-- 본인은 전부(진행도 포함), 다른 사람은 '공개'로 둔 사람의 받은 뱃지만
create policy "own badges or public collections are viewable"
  on public.user_badges for select
  using (
    auth.uid() = user_id
    or (level > 0 and exists (
      select 1 from public.profiles p where p.id = user_id and p.show_badges))
  );
-- 쓰기는 아래 함수만 한다.

------------------------------------------------------------------------
-- 3) 계산
------------------------------------------------------------------------
-- 판정된 공개 질문별: 정답 번호, 예측한 사람 수, 맞힌 비율
create function public.resolved_question_stats()
returns table (question_id uuid, answer int, n int, hit_rate numeric, category text,
               open_at timestamptz, resolved_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select q.id, q.outcome_index, count(p.*)::int,
    avg(case when p.probs[q.outcome_index + 1] = (select max(x) from unnest(p.probs) x)
             then 1.0 else 0.0 end),
    q.category, q.open_at, q.resolved_at
  from public.questions q
  join public.predictions p on p.question_id = q.id
  where q.status = 'resolved' and q.outcome_index is not null and q.is_public
  group by q.id;
$$;

-- 한 사용자의 12종 수치를 처음부터 다시 계산해 저장한다.
-- p_exact = false: 이미 받은 단계는 내리지 않는다 (회수 없음)
-- p_exact = true : 재판정·무효 처리 때, 계산한 그대로 맞춘다
create function public.refresh_user_badges(p_user uuid, p_exact boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
  lvl int;
begin
  if not exists (select 1 from public.profiles where id = p_user) then
    return;
  end if;

  for v in
    with mine as (
      -- 내가 예측한 판정 질문 + 맞혔는지
      select s.*, (p.probs[s.answer + 1] = (select max(x) from unnest(p.probs) x)) as hit,
             p.created_at as first_at
      from public.resolved_question_stats() s
      join public.predictions p on p.question_id = s.question_id and p.user_id = p_user
    ),
    ordered as (
      select hit, row_number() over (order by resolved_at, question_id) as rn,
             row_number() over (partition by hit order by resolved_at, question_id) as grp_rn
      from mine
    ),
    streak as (
      select coalesce(max(cnt), 0) as best from (
        select count(*) as cnt from ordered where hit group by rn - grp_rn
      ) z
    ),
    days as (
      select distinct (created_at at time zone 'Asia/Seoul')::date as d
      from public.predictions where user_id = p_user
    ),
    day_streak as (
      select coalesce(max(cnt), 0) as best from (
        select count(*) as cnt from (
          select d, d - (row_number() over (order by d))::int as g from days
        ) x group by g
      ) z
    ),
    -- 역발상: 처음 예측한 순간의 집단 1위(나를 빼고, 그때 5명 이상)와 다른 쪽을 골라
    -- 마감까지 같은 쪽을 유지했고 맞힌 질문 (예측한 사람 10명 이상)
    contra as (
      select count(*) as cnt from (
        select m.question_id, m.answer,
          (select e.probs from public.prediction_events e
            where e.question_id = m.question_id and e.user_id = p_user
            order by e.created_at, e.id limit 1) as first_probs,
          (select p.probs from public.predictions p
            where p.question_id = m.question_id and p.user_id = p_user) as last_probs,
          (select count(distinct e.user_id) from public.prediction_events e
            where e.question_id = m.question_id and e.user_id <> p_user
              and e.created_at < m.first_at) as others_before,
          (select array_agg(a.avg_p order by a.idx) from (
             select u.idx, avg(u.prob) as avg_p
             from (
               select distinct on (e.user_id) e.probs
               from public.prediction_events e
               where e.question_id = m.question_id and e.user_id <> p_user
                 and e.created_at < m.first_at
               order by e.user_id, e.created_at desc, e.id desc
             ) l, unnest(l.probs) with ordinality as u(prob, idx)
             group by u.idx) a) as crowd_before
        from mine m
        where m.hit and m.n >= 10
      ) c
      where c.others_before >= 5
        and public.top_index(c.first_probs) <> public.top_index(c.crowd_before)
        and public.top_index(c.first_probs) = public.top_index(c.last_probs)
        and public.top_index(c.first_probs) = c.answer
    )
    select 'hits' as key, (select count(*) from mine where hit and n >= 5)::int as val
    union all select 'hit_streak', (select best from streak)::int
    union all select 'season_master', (
      select count(*) from (
        select distinct qs.season from public.question_scores qs
        where qs.user_id = p_user
          and qs.season < to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM')
      ) s
      where exists (
        select 1 from public.season_tiers(s.season) t
        where t.user_id = p_user and t.tier = 'master' and t.eligible >= 10)
    )::int
    union all select 'daily', (select best from day_streak)::int
    union all select 'variety', (select count(distinct category) from mine)::int
    union all select 'first_step', (select least(count(*), 1) from public.predictions where user_id = p_user)::int
    union all select 'liked', (
      select count(*) from public.comment_reactions r
      join public.comments c on c.id = r.comment_id
      where c.user_id = p_user and not c.hidden and r.user_id <> p_user)::int
    union all select 'early', (
      select count(*) from mine where first_at <= open_at + interval '24 hours')::int
    union all select 'reasoner', (
      select count(distinct p.question_id) from public.predictions p
      where p.user_id = p_user and exists (
        select 1 from public.comments c
        where c.question_id = p.question_id and c.user_id = p_user
          and c.parent_id is null and not c.hidden
          and char_length(btrim(c.body)) >= 10))::int
    union all select 'minority', (select count(*) from mine where hit and n >= 10 and hit_rate < 0.3)::int
    union all select 'contrarian', (select cnt from contra)::int
    union all select 'sharpshooter', (select count(*) from mine where hit and n >= 20 and hit_rate < 0.1)::int
  loop
    select count(*) into lvl
    from public.badges b, unnest(b.thresholds) t
    where b.key = v.key and v.val >= t;

    insert into public.user_badges as ub (user_id, badge_key, level, progress, earned_at, updated_at)
    values (p_user, v.key, lvl, v.val, case when lvl > 0 then now() end, now())
    on conflict (user_id, badge_key) do update set
      progress = excluded.progress,
      level = case when p_exact then excluded.level else greatest(ub.level, excluded.level) end,
      earned_at = case
        when (case when p_exact then excluded.level else greatest(ub.level, excluded.level) end) > ub.level
          then now()
        when (case when p_exact then excluded.level else greatest(ub.level, excluded.level) end) = 0
          then null
        else ub.earned_at end,
      seen_level = least(ub.seen_level,
        case when p_exact then excluded.level else greatest(ub.level, excluded.level) end),
      updated_at = now();
  end loop;
end;
$$;

-- 확률 배열에서 가장 높은 선택지 번호(0부터). 동률이면 앞 번호.
create function public.top_index(probs numeric[])
returns int
language sql
immutable
set search_path = ''
as $$
  select (u.k - 1)::int
  from unnest(probs) with ordinality as u(p, k)
  order by u.p desc, u.k
  limit 1;
$$;

revoke all on function public.resolved_question_stats() from public, anon, authenticated;
revoke all on function public.refresh_user_badges(uuid, boolean) from public, anon, authenticated;

------------------------------------------------------------------------
-- 4) 자동 재계산 시점
------------------------------------------------------------------------
-- 예측 저장 (첫 발걸음·꾸준한 예측가)
create function public.badges_on_prediction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_user_badges(new.user_id);
  return null;
end;
$$;
create trigger badges_on_prediction
  after insert on public.predictions
  for each row execute function public.badges_on_prediction();

-- 댓글 (토론가)
create function public.badges_on_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_user_badges(coalesce(new.user_id, old.user_id));
  return null;
end;
$$;
create trigger badges_on_comment
  after insert or delete or update of hidden on public.comments
  for each row execute function public.badges_on_comment();

-- 리액션 (공감 받는 근거: 댓글 작성자)
create function public.badges_on_reaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  author uuid;
begin
  select user_id into author from public.comments
  where id = coalesce(new.comment_id, old.comment_id);
  if author is not null then
    perform public.refresh_user_badges(author);
  end if;
  return null;
end;
$$;
create trigger badges_on_reaction
  after insert or delete on public.comment_reactions
  for each row execute function public.badges_on_reaction();

-- 판정·재판정·무효: 그 질문에 예측한 사람 모두 (판정을 바꾼 경우는 그대로 맞춤)
create function public.badges_on_resolve()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid;
  changed boolean := old.status = 'resolved';
begin
  if new.status is distinct from old.status
     or new.outcome_index is distinct from old.outcome_index then
    for u in select user_id from public.predictions where question_id = new.id loop
      perform public.refresh_user_badges(u, changed);
    end loop;
  end if;
  return null;
end;
$$;
create trigger badges_on_resolve
  after update on public.questions
  for each row execute function public.badges_on_resolve();

------------------------------------------------------------------------
-- 5) 화면용 함수
------------------------------------------------------------------------
-- 닉네임 옆에 붙일 대표 뱃지 (받은 뱃지일 때만)
create function public.featured_badges(p_ids uuid[])
returns table (user_id uuid, badge_key text, level int)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, ub.badge_key, ub.level
  from public.profiles p
  join public.user_badges ub on ub.user_id = p.id and ub.badge_key = p.featured_badge
  where p.id = any(p_ids) and ub.level > 0;
$$;

-- 새로 받은 뱃지 안내를 봤다고 표시
create function public.mark_badges_seen()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.user_badges set seen_level = level
  where user_id = auth.uid() and seen_level < level;
$$;

-- 관리자: 모든 사용자 다시 계산 (시즌 마스터 반영 등)
create function public.refresh_all_badges()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid;
  n int := 0;
begin
  if not public.is_admin() then
    raise exception '관리자만 할 수 있습니다';
  end if;
  for u in select id from public.profiles loop
    perform public.refresh_user_badges(u);
    n := n + 1;
  end loop;
  return n;
end;
$$;

grant execute on function public.featured_badges(uuid[]) to anon, authenticated;
grant execute on function public.mark_badges_seen() to authenticated;
grant execute on function public.refresh_all_badges() to authenticated;
grant execute on function public.top_index(numeric[]) to anon, authenticated;

------------------------------------------------------------------------
-- 6) 소급: 지금까지의 기록으로 한 번 계산한다. 이미 있는 뱃지는 '본 것'으로 처리해 안내가 쏟아지지 않게 한다.
------------------------------------------------------------------------
select public.refresh_user_badges(id) from public.profiles;
update public.user_badges set seen_level = level;
