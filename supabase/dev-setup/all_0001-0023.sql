-- 개발 서버(새 Supabase 프로젝트) 처음 설정용: 마이그레이션 0001~0023 합본.
-- 빈 프로젝트의 SQL Editor에서 한 번만 실행한다. 실서버에는 실행하지 않는다.
-- 0024부터는 이 파일에 넣지 않고, 마이그레이션 파일을 개발 → 실서버 순서로 하나씩 실행한다.

-- ======================================================================
-- 0001_profiles.sql
-- ======================================================================
-- 마일스톤 1: 사용자 프로필(닉네임)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null unique
    check (char_length(nickname) between 2 and 12),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 닉네임은 랭킹·근거 목록에 보여야 하므로 누구나 읽을 수 있다.
create policy "profiles are viewable by everyone"
  on public.profiles for select
  using (true);

-- 본인 프로필만 만들고 고칠 수 있다.
create policy "users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ======================================================================
-- 0002_questions.sql
-- ======================================================================
-- 마일스톤 2: 관리자, 질문

-- 관리자 목록. 클라이언트에서는 추가·수정할 수 없고, Supabase SQL Editor에서만 넣는다.
-- (profiles에 is_admin 칸을 두면 본인 프로필 수정 권한으로 스스로 관리자가 될 수 있어 별도 표로 둔다.)
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

create policy "users can see own admin row"
  on public.admins for select
  using (auth.uid() = user_id);

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- 질문. 카테고리는 스포츠·경제만 허용한다 (공직선거·정당 질문 제외).
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 5 and 120),
  description text not null default '',
  category text not null check (category in ('sports', 'economy')),
  resolution_source text not null check (char_length(resolution_source) > 0),
  close_at timestamptz not null,
  resolve_at timestamptz not null,
  status text not null default 'open'
    check (status in ('open', 'closed', 'resolved', 'void')),
  outcome text check (outcome in ('yes', 'no')),
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  check (resolve_at >= close_at)
);

create index questions_open_close_at_idx
  on public.questions (close_at) where status = 'open';

alter table public.questions enable row level security;

create policy "questions are viewable by everyone"
  on public.questions for select
  using (true);

create policy "admins can insert questions"
  on public.questions for insert
  with check (public.is_admin());

create policy "admins can update questions"
  on public.questions for update
  using (public.is_admin())
  with check (public.is_admin());

-- ======================================================================
-- 0003_predictions.sql
-- ======================================================================
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

-- ======================================================================
-- 0004_scoring.sql
-- ======================================================================
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

-- ======================================================================
-- 0005_leaderboard.sql
-- ======================================================================
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

-- ======================================================================
-- 0006_legal_and_account.sql
-- ======================================================================
-- 이용약관·개인정보처리방침 버전 관리, 약관 동의 기록, 회원 탈퇴

-- 1) 약관 문서. 한 번 게시해 시행된 버전은 고칠 수 없고, 바꾸려면 새 버전을 올린다.
create table public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('terms', 'privacy')),
  version text not null check (version ~ '^[0-9]+(\.[0-9]+)*$'),
  content text not null check (char_length(content) between 1 and 100000),
  effective_at timestamptz not null,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (kind, version)
);

create index legal_documents_kind_effective_idx
  on public.legal_documents (kind, effective_at desc);

alter table public.legal_documents enable row level security;

create policy "legal documents are viewable by everyone"
  on public.legal_documents for select
  using (true);

create policy "admins can publish legal documents"
  on public.legal_documents for insert
  with check (public.is_admin());

-- 시행 전(예약) 버전만 삭제할 수 있다. 시행된 버전은 기록으로 남긴다.
create policy "admins can delete scheduled legal documents"
  on public.legal_documents for delete
  using (public.is_admin() and effective_at > now());

-- 2) 가입 시 동의 기록 (어느 버전에 동의했는지)
alter table public.profiles
  add column terms_version text,
  add column privacy_version text,
  add column agreed_at timestamptz;

-- 3) 회원 탈퇴: 본인 계정을 지운다. 프로필·예측·근거가 함께 삭제된다.
--    관리자가 만든 질문은 남기고 작성자 칸만 비운다.
alter table public.questions alter column created_by drop not null;
alter table public.questions drop constraint questions_created_by_fkey;
alter table public.questions
  add constraint questions_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;

create function public.delete_my_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ======================================================================
-- 0007_visit_stats.sql
-- ======================================================================
-- 방문 통계 (쿠키 없이, 개인을 식별하지 않는 방식)
-- IP와 브라우저 정보는 저장하지 않고, 매일 바뀌는 비밀값과 섞은 해시로만 "그날의 순 방문자"를 센다.
-- 비밀값은 다음 날 지워지므로, 서로 다른 날의 방문을 같은 사람으로 이을 수 없다.

create table public.daily_salts (
  day date primary key,
  salt text not null
);
alter table public.daily_salts enable row level security;
-- 정책 없음: 아래 함수(security definer)만 접근한다.

create table public.page_views (
  id bigint generated always as identity primary key,
  day date not null,
  path text not null check (char_length(path) <= 200),
  visitor_hash text not null,
  is_member boolean not null default false,
  device text not null check (device in ('mobile', 'desktop')),
  referrer_host text check (char_length(referrer_host) <= 100),
  created_at timestamptz not null default now()
);
create index page_views_day_idx on public.page_views (day);

alter table public.page_views enable row level security;
create policy "admins can read page views"
  on public.page_views for select
  using (public.is_admin());

create function public.log_page_view(
  p_path text,
  p_ip text,
  p_user_agent text,
  p_is_member boolean,
  p_device text,
  p_referrer_host text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := (now() at time zone 'Asia/Seoul')::date;
  v_salt text;
begin
  insert into public.daily_salts (day, salt)
  values (v_day, gen_random_uuid()::text || gen_random_uuid()::text)
  on conflict (day) do nothing;
  delete from public.daily_salts where day < v_day;
  select salt into v_salt from public.daily_salts where day = v_day;

  insert into public.page_views (day, path, visitor_hash, is_member, device, referrer_host)
  values (
    v_day,
    left(p_path, 200),
    encode(sha256(convert_to(v_salt || '|' || coalesce(p_ip, '') || '|' || coalesce(p_user_agent, ''), 'UTF8')), 'hex'),
    coalesce(p_is_member, false),
    case when p_device = 'mobile' then 'mobile' else 'desktop' end,
    nullif(left(p_referrer_host, 100), '')
  );

  -- 13개월이 지난 기록은 지운다.
  delete from public.page_views where day < v_day - interval '13 months';
end;
$$;

revoke all on function public.log_page_view(text, text, text, boolean, text, text) from public;
grant execute on function public.log_page_view(text, text, text, boolean, text, text) to anon, authenticated;

-- 일별 방문자·페이지뷰 (관리자만 읽을 수 있음: page_views의 정책을 따른다)
create view public.visit_daily
with (security_invoker = true)
as
select
  day,
  count(distinct visitor_hash)::int as visitors,
  count(*)::int as page_views,
  count(distinct visitor_hash) filter (where is_member)::int as member_visitors,
  count(distinct visitor_hash) filter (where device = 'mobile')::int as mobile_visitors
from public.page_views
group by day;

-- 기간별 인기 페이지와 유입 경로
create function public.visit_top(p_since date, p_kind text)
returns table (label text, views int, visitors int)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    case when p_kind = 'referrer' then coalesce(referrer_host, '(직접 방문)') else path end as label,
    count(*)::int as views,
    count(distinct visitor_hash)::int as visitors
  from public.page_views
  where day >= p_since
  group by 1
  order by views desc
  limit 10;
$$;

-- ======================================================================
-- 0008_more_categories.sql
-- ======================================================================
-- 카테고리 추가: 테크, 연예, e스포츠, 날씨 (국내 공직선거·정당 관련은 계속 제외)
alter table public.questions drop constraint questions_category_check;
alter table public.questions
  add constraint questions_category_check
  check (category in ('sports', 'economy', 'tech', 'entertainment', 'esports', 'weather'));

-- ======================================================================
-- 0009_ten_more_categories.sql
-- ======================================================================
-- 카테고리 10개 추가 (국내 공직선거·정당 관련은 계속 제외)
alter table public.questions drop constraint questions_category_check;
alter table public.questions
  add constraint questions_category_check
  check (category in (
    'sports', 'economy', 'tech', 'entertainment', 'esports', 'weather',
    'film', 'music', 'game', 'ai', 'creator', 'travel', 'food', 'crypto', 'realestate', 'science'
  ));

-- ======================================================================
-- 0010_six_categories.sql
-- ======================================================================
-- 카테고리를 6개로 재구성 (기획자 확인: 기존 질문은 삭제해도 됨)
-- 질문을 지우면 그 질문의 예측과 점수 기록도 함께 지워진다.
delete from public.questions;

alter table public.questions drop constraint questions_category_check;
alter table public.questions
  add constraint questions_category_check
  check (category in ('sports', 'economy', 'culture', 'tech', 'game', 'life'));

-- ======================================================================
-- 0011_v2_data_model.sql
-- ======================================================================
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

-- ======================================================================
-- 0012_crowd_visibility.sql
-- ======================================================================
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

-- ======================================================================
-- 0013_scoring_v2.sql
-- ======================================================================
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

-- ======================================================================
-- 0014_discussion.sql
-- ======================================================================
-- 마일스톤 10: 토론 규칙
-- 1) 신고가 5건 쌓이면 댓글을 자동으로 숨긴다 (관리자 화면에서 확인)
-- 2) 댓글 금지어: 욕설, 국내 정당·선거, 외부 연락처·오픈채팅 유도

create function public.reports_auto_hide()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.reports where comment_id = new.comment_id) >= 5 then
    update public.comments set hidden = true where id = new.comment_id;
  end if;
  return null;
end;
$$;

create trigger reports_auto_hide
  after insert on public.reports
  for each row execute function public.reports_auto_hide();

-- 본인 댓글은 신고할 수 없다
create function public.reports_check_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.comments where id = new.comment_id and user_id = new.user_id) then
    raise exception '내 댓글은 신고할 수 없습니다';
  end if;
  return new;
end;
$$;

create trigger reports_check_owner
  before insert on public.reports
  for each row execute function public.reports_check_owner();

-- 금지어. 화면은 이 오류 문구를 그대로 보여준다.
create function public.comment_banned_reason(body text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when body ~* '(시발|씨발|씨빨|ㅅㅂ|ㅆㅂ|병신|ㅂㅅ|좆|존나|개새끼|개새|지랄|닥쳐|꺼져|미친놈|미친년|느금|니애미|니애비)'
      then '욕설이나 비하 표현'
    when body ~ '(선거|대선(?!배)|총선|지방선거|보궐|재보선|정당(?![한히하성화])|지지율|지지도|당대표|민주당|국민의힘|조국혁신당|개혁신당|진보당)'
      then '국내 정당·선거 관련 내용'
    when body ~* '(open\.kakao|오픈채팅|오픈톡|카톡\s*아이디|카톡\s*id|텔레그램|t\.me/|라인\s*아이디|01[016789][- .]?[0-9]{3,4}[- .]?[0-9]{4})'
      then '외부 연락처나 오픈채팅 유도'
  end;
$$;

create function public.comments_check_banned()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  reason text := public.comment_banned_reason(new.body);
begin
  if reason is not null then
    raise exception '쓸 수 없는 내용이 있어요: %', reason using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger comments_check_banned
  before insert or update of body on public.comments
  for each row execute function public.comments_check_banned();

-- ======================================================================
-- 0015_home_and_detail.sql
-- ======================================================================
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

-- ======================================================================
-- 0016_ranking.sql
-- ======================================================================
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

-- ======================================================================
-- 0017_design_feedback.sql
-- ======================================================================
-- 디자인 시안 비교 의견 (/compare). 이름·연락처 등 개인정보는 받지 않는다.
-- 누구나 남길 수 있고(로그인 불필요), 읽기는 관리자만 한다. 기존 데이터는 바꾸지 않는다.

create table public.design_feedback (
  id uuid primary key default gen_random_uuid(),
  looks_like text not null default '' check (char_length(looks_like) <= 200),
  want_click text not null check (want_click in ('A', 'B', 'same')),
  trust text not null check (trust in ('A', 'B', 'same')),
  comment text not null default '' check (char_length(comment) <= 500),
  device text not null default '' check (device in ('', 'pc', 'mobile')),
  created_at timestamptz not null default now()
);

alter table public.design_feedback enable row level security;

create policy "anyone can leave design feedback"
  on public.design_feedback for insert
  to anon, authenticated
  with check (true);

create policy "admins can read design feedback"
  on public.design_feedback for select
  using (public.is_admin());

create policy "admins can delete design feedback"
  on public.design_feedback for delete
  using (public.is_admin());

-- ======================================================================
-- 0018_more_categories.sql
-- ======================================================================
-- 분야 개편: 직장·커리어(career), 음식·맛집(food) 추가
-- 기존 분야 값은 그대로 두고 화면 이름만 바꾼다. 기존 질문·예측은 지우거나 바꾸지 않는다.
--   economy → 금융·경제·재테크, culture → 연예·아이돌·컬처, life → 생활·트렌드·밈

alter table public.questions drop constraint questions_category_check;
alter table public.questions
  add constraint questions_category_check
  check (category in ('career', 'economy', 'sports', 'culture', 'food', 'tech', 'game', 'life'));

-- ======================================================================
-- 0019_private_questions.sql
-- ======================================================================
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

-- ======================================================================
-- 0020_trend_category.sql
-- ======================================================================
-- 분야 추가: 종합 트렌드(trend). 기존 질문·예측은 바꾸지 않는다.
alter table public.questions drop constraint questions_category_check;
alter table public.questions
  add constraint questions_category_check
  check (category in ('trend', 'career', 'economy', 'sports', 'culture', 'food', 'tech', 'game', 'life'));

-- ======================================================================
-- 0021_badges.sql
-- ======================================================================
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

-- ======================================================================
-- 0022_question_images.sql
-- ======================================================================
-- 0022: 질문·이슈 묶음 이미지 (선택)
-- - 사진 주소, 출처(사진이 있으면 필수), 화면 낭독용 설명
-- - 사진 저장소(question-images): 누구나 볼 수 있고, 올리기·바꾸기·지우기는 관리자만
-- 기존 데이터는 지우거나 바꾸지 않는다.

alter table public.questions
  add column if not exists image_url text,
  add column if not exists image_credit text,
  add column if not exists image_alt text;

alter table public.issues
  add column if not exists image_url text,
  add column if not exists image_credit text,
  add column if not exists image_alt text;

alter table public.questions
  add constraint questions_image_credit_required
  check (image_url is null or length(btrim(coalesce(image_credit, ''))) > 0);

alter table public.issues
  add constraint issues_image_credit_required
  check (image_url is null or length(btrim(coalesce(image_credit, ''))) > 0);

-- 사진 저장소: 공개 읽기(주소로만), 2MB 이하 이미지
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'question-images',
  'question-images',
  true,
  2097152,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

-- 목록 조회(select) 규칙은 두지 않는다: 주소를 모르면 비공개 질문의 사진을 찾을 수 없다.
create policy "admins upload question images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'question-images' and public.is_admin());

create policy "admins update question images"
  on storage.objects for update to authenticated
  using (bucket_id = 'question-images' and public.is_admin());

create policy "admins delete question images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'question-images' and public.is_admin());

-- ======================================================================
-- 0023_search.sql
-- ======================================================================
-- 0023: 검색 (질문 · 이슈 묶음 · 닉네임 · 토론 댓글)
-- - 부분 일치(포함) 검색. 글자 조각(trigram) 색인으로 빠르게 찾는다.
-- - 모든 함수는 호출한 사람의 권한(RLS)으로 돈다. 비공개 질문·숨긴 댓글은 관리자라도 결과에서 뺀다.
-- 기존 데이터는 지우거나 바꾸지 않는다.

create extension if not exists pg_trgm with schema extensions;

create index if not exists questions_title_trgm on public.questions using gin (title extensions.gin_trgm_ops);
create index if not exists questions_description_trgm on public.questions using gin (description extensions.gin_trgm_ops);
create index if not exists issues_title_trgm on public.issues using gin (title extensions.gin_trgm_ops);
create index if not exists profiles_nickname_trgm on public.profiles using gin (nickname extensions.gin_trgm_ops);
create index if not exists comments_body_trgm on public.comments using gin (body extensions.gin_trgm_ops);

-- 검색어 → LIKE 패턴 (%, _ 같은 특수 문자는 글자 그대로 찾는다)
create or replace function public.search_pattern(p_q text)
returns text
language sql
immutable
as $$
  select '%' || replace(replace(replace(btrim(coalesce(p_q, '')), '\', '\\'), '%', '\%'), '_', '\_') || '%';
$$;

-- 질문: 제목·설명·선택지·이슈 이름에서 찾는다
-- p_status: 'open'(진행 중) | 'done'(마감·판정됨), p_category: 분야 값 또는 null
create or replace function public.search_questions(
  p_q text,
  p_status text default 'open',
  p_category text default null,
  p_limit int default 30
)
returns setof public.questions
language sql
stable
security invoker
set search_path = ''
as $$
  select q.*
  from public.questions q
  left join public.issues i on i.id = q.issue_id
  where length(btrim(coalesce(p_q, ''))) > 0
    and q.is_public
    and (p_category is null or q.category = p_category)
    and (
      case when p_status = 'done'
        then not (q.status = 'open' and q.close_at > now())
        else q.status = 'open' and q.close_at > now()
      end
    )
    and (
      q.title ilike public.search_pattern(p_q)
      or q.description ilike public.search_pattern(p_q)
      or array_to_string(q.options, ' ') ilike public.search_pattern(p_q)
      or i.title ilike public.search_pattern(p_q)
    )
  order by
    case when p_status = 'done' then null else q.close_at end asc,
    coalesce(q.resolved_at, q.close_at) desc
  limit least(greatest(p_limit, 1), 100);
$$;

-- 이슈 묶음: 이름·3줄 맥락에서 찾는다. 공개된 질문 수도 함께
create or replace function public.search_issues(p_q text, p_limit int default 20)
returns table (
  id uuid,
  title text,
  context_lines text[],
  image_url text,
  image_credit text,
  image_alt text,
  open_count bigint,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select i.id, i.title, i.context_lines, i.image_url, i.image_credit, i.image_alt,
    count(q.id) filter (where q.status = 'open' and q.close_at > now()),
    count(q.id)
  from public.issues i
  left join public.questions q on q.issue_id = i.id and q.is_public
  where length(btrim(coalesce(p_q, ''))) > 0
    and (
      i.title ilike public.search_pattern(p_q)
      or array_to_string(i.context_lines, ' ') ilike public.search_pattern(p_q)
    )
  group by i.id
  having count(q.id) > 0
  order by count(q.id) filter (where q.status = 'open' and q.close_at > now()) desc, i.created_at desc
  limit least(greatest(p_limit, 1), 50);
$$;

-- 닉네임: 정확히 같은 닉네임 → 앞부분 일치 → 포함 순서
create or replace function public.search_users(p_q text, p_limit int default 20)
returns table (id uuid, nickname text)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.id, p.nickname
  from public.profiles p
  where length(btrim(coalesce(p_q, ''))) > 0
    and p.nickname ilike public.search_pattern(p_q)
  order by
    (lower(p.nickname) = lower(btrim(p_q))) desc,
    starts_with(lower(p.nickname), lower(btrim(p_q))) desc,
    length(p.nickname),
    p.nickname
  limit least(greatest(p_limit, 1), 50);
$$;

-- 토론 댓글: 공개된 질문의 숨기지 않은 댓글만. 작성자의 예측(진영)은 돌려주지 않는다.
create or replace function public.search_comments(p_q text, p_limit int default 30)
returns table (
  id uuid,
  question_id uuid,
  question_title text,
  user_id uuid,
  nickname text,
  body text,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.id, c.question_id, q.title, c.user_id, p.nickname, c.body, c.created_at
  from public.comments c
  join public.questions q on q.id = c.question_id and q.is_public
  left join public.profiles p on p.id = c.user_id
  where length(btrim(coalesce(p_q, ''))) > 0
    and not c.hidden
    and c.body ilike public.search_pattern(p_q)
  order by c.created_at desc
  limit least(greatest(p_limit, 1), 100);
$$;

grant execute on function public.search_questions(text, text, text, int) to anon, authenticated;
grant execute on function public.search_issues(text, int) to anon, authenticated;
grant execute on function public.search_users(text, int) to anon, authenticated;
grant execute on function public.search_comments(text, int) to anon, authenticated;
