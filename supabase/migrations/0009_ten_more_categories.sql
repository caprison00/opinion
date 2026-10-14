-- 카테고리 10개 추가 (국내 공직선거·정당 관련은 계속 제외)
alter table public.questions drop constraint questions_category_check;
alter table public.questions
  add constraint questions_category_check
  check (category in (
    'sports', 'economy', 'tech', 'entertainment', 'esports', 'weather',
    'film', 'music', 'game', 'ai', 'creator', 'travel', 'food', 'crypto', 'realestate', 'science'
  ));
