-- 비공개 질문: 관리자가 만든 질문은 먼저 비공개로 저장하고, 공개로 바꾸면 사용자에게 보인다.
-- 기존 질문은 모두 공개 상태로 둔다. 기존 데이터는 지우거나 바꾸지 않는다.

alter table public.questions
  add column is_public boolean not null default true;
-- 앞으로 새로 만드는 질문은 비공개가 기본
alter table public.questions alter column is_public set default false;

create index questions_is_public_idx on public.questions (is_public);

-- 읽기: 공개 질문은 누구나, 비공개 질문은 관리자만
drop policy "questions are viewable by everyone" on public.questions;
create policy "public questions are viewable by everyone"
  on public.questions for select
  using (is_public or public.is_admin());

-- 삭제: 관리자가 비공개 질문만 지울 수 있다 (공개된 질문은 예측·점수가 있으므로 지우지 않는다)
create policy "admins can delete private questions"
  on public.questions for delete
  using (public.is_admin() and not is_public);

-- 공개된 질문은 다시 비공개로 돌릴 수 없다 (예측한 사람의 기록이 사라지는 것을 막는다)
create function public.questions_guard_public()
returns trigger
language plpgsql
as $$
begin
  if old.is_public and not new.is_public then
    raise exception '공개된 질문은 비공개로 되돌릴 수 없습니다';
  end if;
  return new;
end;
$$;

create trigger questions_guard_public
  before update of is_public on public.questions
  for each row execute function public.questions_guard_public();

-- 예측은 공개된 질문에만 (비공개 질문에는 예측·수정 불가)
create or replace function public.question_is_accepting(qid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.questions
    where id = qid and is_public and status = 'open' and close_at > now()
  );
$$;

-- 댓글도 공개된 질문에만
drop policy "users can write own comments" on public.comments;
create policy "users can write own comments"
  on public.comments for insert
  with check (
    auth.uid() = user_id and not hidden
    and exists (select 1 from public.questions q where q.id = question_id and q.is_public)
  );

-- 홈의 '여론이 움직이는 질문'·'트렌딩'에서 비공개 질문 제외
create or replace function public.moving_questions(p_limit int default 5)
returns table (question_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id from (
    select q.id, public.crowd_movement(q.id) as mv
    from public.questions q
    where q.is_public and q.status = 'open' and q.close_at > now()
      and exists (
        select 1 from public.prediction_events e
        where e.question_id = q.id and e.created_at > now() - interval '24 hours'
      )
  ) m
  where m.mv >= 0.01
  order by m.mv desc
  limit least(greatest(p_limit, 1), 20);
$$;

create or replace function public.trending_questions(p_limit int default 5)
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
  where q.is_public and q.status = 'open' and q.close_at > now()
  order by activity desc, q.close_at asc
  limit least(greatest(p_limit, 1), 20);
$$;
