-- 마일스톤 11: 홈·질문 상세 개편에 필요한 조회 함수
-- 모두 여론 공개 규칙을 따른다: 집단 확률·변화량·추이는 can_view_crowd일 때만 돌려준다.
-- 기존 데이터는 바꾸지 않는다.

-- 특정 시점의 집단 확률 = 그때까지 각 사용자의 최신 예측을 선택지별로 평균 (이력 기준)
create function public.crowd_at(qid uuid, t timestamptz)
returns numeric[]
language sql
stable
security definer
set search_path = ''
as $$
  select array_agg(a.avg_p order by a.idx)
  from (
    select u.idx, avg(u.prob) as avg_p
    from (
      select distinct on (e.user_id) e.probs
      from public.prediction_events e
      where e.question_id = qid and e.created_at <= t
      order by e.user_id, e.created_at desc, e.id desc
    ) l,
    unnest(l.probs) with ordinality as u(prob, idx)
    group by u.idx
  ) a;
$$;

-- 내부용: 지난 24시간 동안 선택지 확률이 가장 크게 움직인 폭 (0~1)
create function public.crowd_movement(qid uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(max(abs(n.p - coalesce(o.p, 1.0 / cardinality(q.options)))), 0)
  from public.questions q
  cross join lateral unnest(public.crowd_at(q.id, now())) with ordinality as n(p, k)
  left join lateral unnest(public.crowd_at(q.id, now() - interval '24 hours'))
    with ordinality as o(p, k) on o.k = n.k
  where q.id = qid;
$$;

revoke all on function public.crowd_at(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.crowd_movement(uuid) from public, anon, authenticated;

-- 질문 카드·상세에 쓰는 요약
--   participants: 참여자 수 (누구나)
--   crowd / crowd_prev: 현재·24시간 전 집단 확률 (볼 수 있을 때만, 24시간 전에 예측이 없었으면 null)
--   reactions: 그 질문 댓글에 달린 감정 리액션 합계 (누구나)
--   hit_rate: 판정된 질문에서 정답을 가장 높게 본 사람의 비율 (판정 후 누구나)
create function public.question_board(p_ids uuid[])
returns table (
  question_id uuid,
  participants int,
  crowd numeric[],
  crowd_prev numeric[],
  reactions int,
  hit_rate numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    q.id,
    (select count(*)::int from public.predictions p where p.question_id = q.id),
    case when public.can_view_crowd(q.id) then public.crowd_at(q.id, now()) end,
    case when public.can_view_crowd(q.id)
      then public.crowd_at(q.id, least(now(), q.close_at) - interval '24 hours') end,
    (select count(*)::int from public.comment_reactions r
       join public.comments c on c.id = r.comment_id
     where c.question_id = q.id and not c.hidden),
    case when q.status = 'resolved' then (
      select avg(case when p.probs[q.outcome_index + 1] = (
               select max(x) from unnest(p.probs) as x) then 1.0 else 0.0 end)
      from public.predictions p where p.question_id = q.id
    ) end
  from public.questions q
  where q.id = any(p_ids);
$$;

-- "지금 여론이 움직이는 질문": 진행 중 질문을 24시간 변동 폭이 큰 순서로 (숫자는 주지 않는다)
create function public.moving_questions(p_limit int default 5)
returns table (question_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id from (
    select q.id, public.crowd_movement(q.id) as mv
    from public.questions q
    where q.status = 'open' and q.close_at > now()
      and exists (
        select 1 from public.prediction_events e
        where e.question_id = q.id and e.created_at > now() - interval '24 hours'
      )
  ) m
  where m.mv >= 0.01
  order by m.mv desc
  limit least(greatest(p_limit, 1), 20);
$$;

-- 트렌딩: 지난 24시간 활동(예측 입력·수정 + 댓글)이 많은 진행 중 질문
create function public.trending_questions(p_limit int default 5)
returns table (question_id uuid, activity int)
language sql
stable
security definer
set search_path = ''
as $$
  select q.id,
    ((select count(*) from public.prediction_events e
       where e.question_id = q.id and e.created_at > now() - interval '24 hours')
     + (select count(*) from public.comments c
       where c.question_id = q.id and c.created_at > now() - interval '24 hours'))::int as activity
  from public.questions q
  where q.status = 'open' and q.close_at > now()
  order by activity desc, q.close_at asc
  limit least(greatest(p_limit, 1), 20);
$$;

-- 확률 추이 그래프: 예측 시작~(지금 또는 마감) 구간을 p_points개 시점으로 나눠 집단 확률을 돌려준다.
-- 볼 수 없으면 아무것도 돌려주지 않는다.
create function public.crowd_history(qid uuid, p_points int default 40)
returns table (t timestamptz, crowd numeric[])
language sql
stable
security definer
set search_path = ''
as $$
  with q as (
    select open_at as t0, least(now(), close_at) as t1
    from public.questions where id = qid and public.can_view_crowd(id)
  ),
  n as (select least(greatest(p_points, 2), 100) as k)
  select s.t, public.crowd_at(qid, s.t)
  from q, n,
    lateral (
      select q.t0 + (q.t1 - q.t0) * g / (n.k - 1) as t
      from generate_series(0, n.k - 1) g
    ) s
  where q.t1 > q.t0
  order by s.t;
$$;

grant execute on function public.question_board(uuid[]) to anon, authenticated;
grant execute on function public.moving_questions(int) to anon, authenticated;
grant execute on function public.trending_questions(int) to anon, authenticated;
grant execute on function public.crowd_history(uuid, int) to anon, authenticated;
