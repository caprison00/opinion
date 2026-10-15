-- 마일스톤 8: 여론 공개 규칙
-- 진행 중인 질문의 다른 사람 예측(집단 확률, 댓글 작성자의 진영)은
-- 본인이 그 질문에 예측했거나, 질문이 마감됐거나, 관리자일 때만 볼 수 있다.
-- 참여자 수는 누구나 볼 수 있다.

-- 내가 이 질문에 예측했는가 (RLS 안에서 써도 되도록 security definer)
create function public.has_predicted(qid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.predictions
    where question_id = qid and user_id = auth.uid()
  );
$$;

create function public.can_view_crowd(qid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin()
    or not public.question_is_accepting(qid)
    or public.has_predicted(qid);
$$;

drop policy "predictions are viewable by everyone" on public.predictions;
create policy "predictions are viewable after predicting or closing"
  on public.predictions for select
  using (auth.uid() = user_id or public.can_view_crowd(question_id));

-- 질문별 참여자 수(누구나)와 집단 확률(볼 수 있을 때만, 선택지별 평균)
create function public.question_summary(p_ids uuid[])
returns table (question_id uuid, participants int, crowd numeric[])
language sql
stable
security definer
set search_path = ''
as $$
  select
    q.id,
    (select count(*)::int from public.predictions p where p.question_id = q.id),
    case when public.can_view_crowd(q.id) then (
      select array_agg(a.avg_p order by a.idx)
      from (
        select u.idx, avg(u.prob) as avg_p
        from public.predictions p,
             unnest(p.probs) with ordinality as u(prob, idx)
        where p.question_id = q.id
        group by u.idx
      ) a
    ) end
  from public.questions q
  where q.id = any(p_ids);
$$;

grant execute on function public.has_predicted(uuid) to anon, authenticated;
grant execute on function public.can_view_crowd(uuid) to anon, authenticated;
grant execute on function public.question_summary(uuid[]) to anon, authenticated;

-- v1 집단 확률 뷰는 question_summary로 대체한다.
drop view public.question_stats;
