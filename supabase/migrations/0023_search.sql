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
