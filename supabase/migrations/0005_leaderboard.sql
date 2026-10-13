-- 마일스톤 5: 랭킹
-- 판정된 예측이 3건 이상인 사용자만, 누적 점수 순. 동점이면 같은 순위.
create view public.leaderboard
with (security_invoker = true)
as
select
  rank() over (order by sum(s.score) desc) as rank,
  s.user_id,
  p.nickname,
  sum(s.score)::int as total_score,
  count(*)::int as scored_count
from public.prediction_scores s
join public.profiles p on p.id = s.user_id
group by s.user_id, p.nickname
having count(*) >= 3;
