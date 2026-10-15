-- 마일스톤 9: 채점 개편
-- 1) 다지선다 통합 공식: S = (1 − B / B0) × 100, B = Σ (p_k − o_k)², B0 = 1 − 1/n
-- 2) 시간 평균: 예측 시작(open_at)~마감(close_at) 동안 각 예측이 유지된 시간만큼 가중 평균
--    처음 예측하기 전 기간은 그 시점의 집단 확률로 계산 (아무도 없었으면 0점)
-- 3) 판정·재판정·무효 처리 때 자동으로 다시 계산해 question_scores에 저장
-- 4) 시즌 = 판정된 날(한국 시간)이 속한 달

-- 판정 시각 (시즌 귀속에 쓴다)
alter table public.questions add column resolved_at timestamptz;
update public.questions set resolved_at = now() where status = 'resolved';

create function public.questions_set_resolved_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'resolved' and (
    tg_op = 'INSERT' or old.status is distinct from 'resolved'
    or new.outcome_index is distinct from old.outcome_index
  ) then
    new.resolved_at := now();
  elsif new.status <> 'resolved' then
    new.resolved_at := null;
  end if;
  return new;
end;
$$;

create trigger questions_set_resolved_at
  before insert or update on public.questions
  for each row execute function public.questions_set_resolved_at();

-- 한 시점의 점수. probs는 선택지별 확률, answer는 정답 번호(0부터)
create function public.point_score(probs numeric[], answer int)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select (1 - sum(power(u.p - case when u.k - 1 = answer then 1 else 0 end, 2))
              / (1 - 1.0 / cardinality(probs))) * 100
  from unnest(probs) with ordinality as u(p, k);
$$;

-- 한 질문의 점수를 모두 다시 계산한다.
create function public.compute_question_scores(qid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  q record;
  t0 timestamptz;
  t1 timestamptz;
  total_seconds numeric;
begin
  delete from public.question_scores where question_id = qid;

  select * into q from public.questions where id = qid;
  if q is null or q.status <> 'resolved' or q.outcome_index is null then
    return; -- 진행 중·마감·무효 질문은 점수가 없다
  end if;

  t0 := q.open_at;
  t1 := greatest(q.close_at, q.open_at);
  total_seconds := extract(epoch from (t1 - t0));

  if total_seconds <= 0 then
    -- 열린 기간이 없으면 마지막 예측으로만 채점한다
    insert into public.question_scores (user_id, question_id, score, season)
    select p.user_id, qid, round(public.point_score(p.probs, q.outcome_index))::int,
           to_char(q.resolved_at at time zone 'Asia/Seoul', 'YYYY-MM')
    from public.predictions p where p.question_id = qid;
    return;
  end if;

  insert into public.question_scores (user_id, question_id, score, season)
  with ev as (
    -- 열린 기간 안의 예측 이력 (시작 전 기록은 시작 시각으로 맞춘다)
    select e.id, e.user_id, e.probs, greatest(e.created_at, t0) as t
    from public.prediction_events e
    where e.question_id = qid and e.created_at <= t1
  ),
  users as (select distinct user_id from ev),
  pts as (
    select t0 as t
    union select t from ev
    union select t1
  ),
  iv as (
    select t as a, lead(t) over (order by t) as b from pts
  ),
  spans as (
    select a, b, extract(epoch from (b - a)) as secs
    from iv where b is not null and b > a
  ),
  -- 구간 시작 시점에 각 사용자의 최신 예측 (아직 없으면 null)
  latest as (
    select s.a, s.secs, u.user_id,
      (select e.probs from ev e
       where e.user_id = u.user_id and e.t <= s.a
       order by e.t desc, e.id desc limit 1) as probs
    from spans s cross join users u
  ),
  -- 구간마다 집단 확률(그때까지 예측한 사람들의 최신 예측 평균)의 점수
  crowd as (
    select x.a, public.point_score(array_agg(x.avg_p order by x.k), q.outcome_index) as s
    from (
      select l.a, v.k, avg(v.p) as avg_p
      from latest l, unnest(l.probs) with ordinality as v(p, k)
      where l.probs is not null
      group by l.a, v.k
    ) x
    group by x.a
  )
  select l.user_id, qid,
    round(sum(
      case when l.probs is null then coalesce(c.s, 0)
           else public.point_score(l.probs, q.outcome_index) end
      * l.secs
    ) / total_seconds)::int,
    to_char(q.resolved_at at time zone 'Asia/Seoul', 'YYYY-MM')
  from latest l
  left join crowd c on c.a = l.a
  group by l.user_id;
end;
$$;

revoke all on function public.compute_question_scores(uuid) from public, anon, authenticated;

-- 판정·재판정·무효·마감 시각 변경 때 자동으로 다시 계산
create function public.questions_rescore()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     or new.outcome_index is distinct from old.outcome_index
     or new.close_at is distinct from old.close_at
     or new.open_at is distinct from old.open_at then
    perform public.compute_question_scores(new.id);
  end if;
  return null;
end;
$$;

create trigger questions_rescore
  after update on public.questions
  for each row execute function public.questions_rescore();

-- 기존 화면(내 예측·질문 상세·랭킹)이 읽는 뷰를 새 점수 표 기준으로 바꾼다.
drop view public.leaderboard;
drop view public.prediction_scores;

create view public.prediction_scores
with (security_invoker = true)
as
select
  p.id as prediction_id,
  s.user_id,
  s.question_id,
  s.score,
  s.season
from public.question_scores s
join public.predictions p
  on p.user_id = s.user_id and p.question_id = s.question_id;

create view public.leaderboard
with (security_invoker = true)
as
select
  rank() over (order by sum(s.score) desc) as rank,
  s.user_id,
  p.nickname,
  sum(s.score)::int as total_score,
  count(*)::int as scored_count
from public.question_scores s
join public.profiles p on p.id = s.user_id
group by s.user_id, p.nickname
having count(*) >= 3;

-- 이미 판정된 질문을 새 공식으로 다시 계산한다.
select public.compute_question_scores(id) from public.questions where status = 'resolved';
