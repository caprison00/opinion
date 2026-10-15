-- 분야 추가: 종합 트렌드(trend). 기존 질문·예측은 바꾸지 않는다.
alter table public.questions drop constraint questions_category_check;
alter table public.questions
  add constraint questions_category_check
  check (category in ('trend', 'career', 'economy', 'sports', 'culture', 'food', 'tech', 'game', 'life'));
