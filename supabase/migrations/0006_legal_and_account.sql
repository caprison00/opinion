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
