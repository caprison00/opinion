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
