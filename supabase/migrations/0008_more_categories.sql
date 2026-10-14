-- 카테고리 추가: 테크, 연예, e스포츠, 날씨 (국내 공직선거·정당 관련은 계속 제외)
alter table public.questions drop constraint questions_category_check;
alter table public.questions
  add constraint questions_category_check
  check (category in ('sports', 'economy', 'tech', 'entertainment', 'esports', 'weather'));
