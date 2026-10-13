-- 마일스톤 3: 예측

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  probability int not null check (probability between 1 and 99),
  reason text not null default '' check (char_length(reason) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create index predictions_question_id_idx on public.predictions (question_id);

-- 수정할 때마다 updated_at 갱신
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger predictions_set_updated_at
  before update on public.predictions
  for each row execute function public.set_updated_at();

-- 질문이 진행 중이고 마감 전일 때만 예측을 받는다.
create function public.question_is_accepting(qid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.questions
    where id = qid and status = 'open' and close_at > now()
  );
$$;

alter table public.predictions enable row level security;

-- 집단 확률과 근거 목록을 보여주기 위해 누구나 읽을 수 있다.
create policy "predictions are viewable by everyone"
  on public.predictions for select
  using (true);

-- 본인 예측만, 마감 전에만 만들고 고칠 수 있다.
create policy "users can insert own prediction before close"
  on public.predictions for insert
  with check (auth.uid() = user_id and public.question_is_accepting(question_id));

create policy "users can update own prediction before close"
  on public.predictions for update
  using (auth.uid() = user_id and public.question_is_accepting(question_id))
  with check (auth.uid() = user_id and public.question_is_accepting(question_id));

-- 질문별 집단 확률(단순 평균)과 참여자 수
create view public.question_stats
with (security_invoker = true)
as
select
  question_id,
  round(avg(probability))::int as crowd_probability,
  count(*)::int as prediction_count
from public.predictions
group by question_id;
