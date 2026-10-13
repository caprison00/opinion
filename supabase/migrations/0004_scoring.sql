-- 마일스톤 4: 판정, 채점

-- 판정 완료(resolved)일 때만 결과(yes/no)가 있다. 무효(void)는 결과 없음.
alter table public.questions
  add constraint questions_outcome_matches_status
  check ((status = 'resolved') = (outcome is not null));

-- 판정된 예측의 점수.
-- 브라이어 = (p - o)^2, 표시 점수 = round((0.25 - 브라이어) * 400)
-- 마감 후에는 예측을 고칠 수 없으므로(RLS) 저장된 예측이 곧 마감 시점의 최종 예측이다.
-- 무효 질문은 resolved가 아니므로 채점되지 않는다.
create view public.prediction_scores
with (security_invoker = true)
as
select
  p.id as prediction_id,
  p.user_id,
  p.question_id,
  p.probability,
  q.outcome,
  power(p.probability / 100.0 - case when q.outcome = 'yes' then 1 else 0 end, 2)
    as brier,
  round(
    (0.25 - power(p.probability / 100.0 - case when q.outcome = 'yes' then 1 else 0 end, 2))
    * 400
  )::int as score
from public.predictions p
join public.questions q on q.id = p.question_id
where q.status = 'resolved';
