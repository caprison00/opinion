-- 마일스톤 7: v2 데이터 모델
-- 원칙: 새 구조를 추가하되, 화면이 개편되기 전(마일스톤 8 이전)의 v1 코드도 그대로 동작하게 한다.
--  - v1이 쓰는 questions.outcome(yes/no) ↔ v2의 outcome_index를 트리거로 맞춘다.
--  - v1이 쓰는 predictions.probability(YES %) ↔ v2의 probs(선택지별 확률)를 트리거로 맞춘다.
--  - 예측을 저장·수정할 때마다 prediction_events에 이력이 자동으로 쌓인다.

------------------------------------------------------------------------
-- 1) 이슈 묶음
------------------------------------------------------------------------
create table public.issues (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 80),
  context_lines text[] not null default '{}'
    check (cardinality(context_lines) <= 3),
  context_source_url text check (context_source_url ~ '^https?://'),
  created_at timestamptz not null default now()
);

alter table public.issues enable row level security;
create policy "issues are viewable by everyone"
  on public.issues for select using (true);
create policy "admins can insert issues"
  on public.issues for insert with check (public.is_admin());
create policy "admins can update issues"
  on public.issues for update using (public.is_admin()) with check (public.is_admin());
create policy "admins can delete issues"
  on public.issues for delete using (public.is_admin());

------------------------------------------------------------------------
-- 2) 질문: 유형(OX/객관식), 선택지, 예측 시작 시각, 정답 번호
------------------------------------------------------------------------
alter table public.questions
  add column issue_id uuid references public.issues (id) on delete set null,
  add column type text not null default 'ox' check (type in ('ox', 'choice')),
  add column options text[] not null default array['예', '아니오'],
  add column open_at timestamptz not null default now(),
  add column outcome_index int;

-- 기존 질문 이전: 예측 시작 = 만든 시각, yes → 0, no → 1
update public.questions set open_at = created_at;
update public.questions
  set outcome_index = case outcome when 'yes' then 0 when 'no' then 1 end;

-- 판정 완료일 때만 정답 번호가 있다 (기존 outcome 기준 제약을 대신함)
alter table public.questions drop constraint questions_outcome_matches_status;
alter table public.questions
  add constraint questions_outcome_index_matches_status
  check ((status = 'resolved') = (outcome_index is not null));

create index questions_issue_id_idx on public.questions (issue_id);

-- 선택지 검사와 outcome ↔ outcome_index 동기화
create function public.questions_sync_v2()
returns trigger
language plpgsql
as $$
declare
  n int := cardinality(new.options);
begin
  if new.type = 'ox' then
    if new.options is distinct from array['예', '아니오'] then
      raise exception 'OX 질문의 선택지는 예/아니오여야 합니다';
    end if;
    -- v1 화면은 outcome(yes/no)을, v2 화면은 outcome_index를 쓴다. 바뀐 쪽에 맞춘다.
    if tg_op = 'INSERT' or new.outcome is distinct from old.outcome then
      new.outcome_index := case new.outcome when 'yes' then 0 when 'no' then 1 end;
    elsif new.outcome_index is distinct from old.outcome_index then
      new.outcome := case new.outcome_index when 0 then 'yes' when 1 then 'no' end;
    end if;
  else
    if n < 3 or n > 5 then
      raise exception '객관식 선택지는 3~5개여야 합니다';
    end if;
    if exists (
      select 1 from unnest(new.options) o where char_length(btrim(o)) = 0
    ) or (select count(distinct btrim(o)) from unnest(new.options) o) <> n then
      raise exception '객관식 선택지는 비어 있거나 겹칠 수 없습니다';
    end if;
    new.outcome := null;
  end if;

  if new.outcome_index is not null and (new.outcome_index < 0 or new.outcome_index >= n) then
    raise exception '정답 번호가 선택지 범위를 벗어났습니다';
  end if;
  -- 만들 때나 시작 시각을 바꿀 때만 검사한다 (마감 처리로 마감을 앞당기는 것은 허용)
  if (tg_op = 'INSERT' or new.open_at is distinct from old.open_at)
     and new.open_at > new.close_at then
    raise exception '예측 시작은 마감보다 앞서야 합니다';
  end if;
  return new;
end;
$$;

create trigger questions_sync_v2
  before insert or update on public.questions
  for each row execute function public.questions_sync_v2();

------------------------------------------------------------------------
-- 3) 예측: 선택지별 확률(probs) + 수정 이력(prediction_events)
------------------------------------------------------------------------
alter table public.predictions
  add column probs numeric[];
alter table public.predictions alter column probability drop not null;

-- 기존 예측 이전: YES % → [예, 아니오]
update public.predictions
  set probs = array[probability / 100.0, 1 - probability / 100.0];

alter table public.predictions alter column probs set not null;

-- probability(v1) ↔ probs(v2) 동기화와 확률 검사
create function public.predictions_sync_v2()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
  total numeric;
begin
  select cardinality(options) into n from public.questions where id = new.question_id;
  if n is null then
    raise exception '질문을 찾을 수 없습니다';
  end if;

  if tg_op = 'UPDATE' and new.probs is not distinct from old.probs
     and new.probability is distinct from old.probability then
    new.probs := null; -- v1 화면이 probability만 바꾼 경우: 아래에서 probs를 다시 만든다
  end if;

  if new.probs is null then
    if n <> 2 or new.probability is null then
      raise exception '선택지별 확률(probs)이 필요합니다';
    end if;
    new.probs := array[new.probability / 100.0, 1 - new.probability / 100.0];
  end if;

  if cardinality(new.probs) <> n then
    raise exception '확률 개수가 선택지 수와 다릅니다';
  end if;
  if exists (select 1 from unnest(new.probs) p where p < 0 or p > 1) then
    raise exception '확률은 0~1 사이여야 합니다';
  end if;
  select sum(p) into total from unnest(new.probs) p;
  if abs(total - 1) > 0.0001 then
    raise exception '확률의 합은 1(100%%)이어야 합니다';
  end if;

  -- OX는 v1 화면용 probability(YES %)도 함께 맞춘다. 객관식은 비운다.
  if n = 2 then
    new.probability := least(99, greatest(1, round(new.probs[1] * 100)::int));
  else
    new.probability := null;
  end if;
  return new;
end;
$$;

create trigger predictions_sync_v2
  before insert or update on public.predictions
  for each row execute function public.predictions_sync_v2();

-- 모든 입력·수정의 이력. 시간 평균 채점과 집단 확률 추이에 쓴다.
create table public.prediction_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  probs numeric[] not null,
  created_at timestamptz not null default now()
);
create index prediction_events_question_idx
  on public.prediction_events (question_id, created_at);
create index prediction_events_user_idx on public.prediction_events (user_id);

alter table public.prediction_events enable row level security;
-- 본인 이력과 관리자만 읽는다. 쓰기는 아래 트리거만 한다.
create policy "users can read own prediction events"
  on public.prediction_events for select
  using (auth.uid() = user_id or public.is_admin());

create function public.log_prediction_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.probs is distinct from old.probs then
    insert into public.prediction_events (user_id, question_id, probs, created_at)
    values (new.user_id, new.question_id, new.probs, now());
  end if;
  return null;
end;
$$;

create trigger predictions_log_event
  after insert or update on public.predictions
  for each row execute function public.log_prediction_event();

-- 기존 예측을 이력 1건씩으로 옮긴다 (마지막 저장 시각 기준)
insert into public.prediction_events (user_id, question_id, probs, created_at)
select user_id, question_id, probs, updated_at from public.predictions;

------------------------------------------------------------------------
-- 4) 질문 점수 (마일스톤 9에서 계산해 채운다)
------------------------------------------------------------------------
create table public.question_scores (
  user_id uuid not null references public.profiles (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  score int not null,
  season text not null check (season ~ '^\d{4}-\d{2}$'), -- 판정일(한국 시간)이 속한 달
  computed_at timestamptz not null default now(),
  primary key (user_id, question_id)
);
create index question_scores_season_idx on public.question_scores (season);

alter table public.question_scores enable row level security;
create policy "question scores are viewable by everyone"
  on public.question_scores for select using (true);
-- 쓰기는 채점 함수(security definer)만 한다.

------------------------------------------------------------------------
-- 5) 토론: 댓글, 리액션, 신고 (화면은 마일스톤 10)
------------------------------------------------------------------------
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  parent_id uuid references public.comments (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index comments_question_idx on public.comments (question_id, created_at);
create index comments_parent_idx on public.comments (parent_id);

-- 답글은 1단계까지: 답글에 다시 답글을 달 수 없고, 같은 질문 안에서만 단다.
create function public.comments_check_parent()
returns trigger
language plpgsql
as $$
begin
  if new.parent_id is not null and not exists (
    select 1 from public.comments
    where id = new.parent_id and parent_id is null and question_id = new.question_id
  ) then
    raise exception '답글은 같은 질문의 댓글에만, 1단계까지 달 수 있습니다';
  end if;
  return new;
end;
$$;

create trigger comments_check_parent
  before insert or update of parent_id on public.comments
  for each row execute function public.comments_check_parent();

create trigger comments_set_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();

alter table public.comments enable row level security;
create policy "visible comments are viewable by everyone"
  on public.comments for select
  using (not hidden or auth.uid() = user_id or public.is_admin());
create policy "users can write own comments"
  on public.comments for insert
  with check (auth.uid() = user_id and not hidden);
create policy "users can edit own comments"
  on public.comments for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users or admins can delete comments"
  on public.comments for delete
  using (auth.uid() = user_id or public.is_admin());

-- 사용자는 본문만 고칠 수 있다. 숨김(hidden)은 관리자 함수로만 바꾼다.
revoke update on public.comments from anon, authenticated;
grant update (body) on public.comments to authenticated;

create function public.set_comment_hidden(p_comment_id uuid, p_hidden boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 할 수 있습니다';
  end if;
  update public.comments set hidden = p_hidden where id = p_comment_id;
end;
$$;
revoke all on function public.set_comment_hidden(uuid, boolean) from public, anon;
grant execute on function public.set_comment_hidden(uuid, boolean) to authenticated;

create table public.comment_reactions (
  comment_id uuid not null references public.comments (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('confident', 'anxious', 'absurd')),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id) -- 한 댓글에 한 사람당 하나
);

alter table public.comment_reactions enable row level security;
create policy "reactions are viewable by everyone"
  on public.comment_reactions for select using (true);
create policy "users can react"
  on public.comment_reactions for insert with check (auth.uid() = user_id);
create policy "users can change own reaction"
  on public.comment_reactions for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can remove own reaction"
  on public.comment_reactions for delete using (auth.uid() = user_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reason text not null default '' check (char_length(reason) <= 200),
  created_at timestamptz not null default now(),
  unique (comment_id, user_id) -- 같은 댓글은 한 번만 신고
);

alter table public.reports enable row level security;
create policy "users can report"
  on public.reports for insert with check (auth.uid() = user_id);
create policy "admins and reporters can read reports"
  on public.reports for select using (auth.uid() = user_id or public.is_admin());

-- 기존 한 줄 근거를 그 질문의 첫 댓글로 옮긴다.
-- (마일스톤 8에서 입력 화면이 바뀌기 전까지 새 근거는 predictions.reason에 계속 저장된다)
insert into public.comments (question_id, user_id, body, created_at, updated_at)
select question_id, user_id, btrim(reason), created_at, updated_at
from public.predictions
where char_length(btrim(reason)) > 0;
