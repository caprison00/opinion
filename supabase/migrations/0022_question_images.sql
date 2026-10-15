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
