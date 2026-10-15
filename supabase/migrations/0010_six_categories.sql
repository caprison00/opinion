-- 카테고리를 6개로 재구성 (기획자 확인: 기존 질문은 삭제해도 됨)
-- 질문을 지우면 그 질문의 예측과 점수 기록도 함께 지워진다.
delete from public.questions;

alter table public.questions drop constraint questions_category_check;
alter table public.questions
  add constraint questions_category_check
  check (category in ('sports', 'economy', 'culture', 'tech', 'game', 'life'));
