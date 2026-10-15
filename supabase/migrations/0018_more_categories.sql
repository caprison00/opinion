-- 분야 개편: 직장·커리어(career), 음식·맛집(food) 추가
-- 기존 분야 값은 그대로 두고 화면 이름만 바꾼다. 기존 질문·예측은 지우거나 바꾸지 않는다.
--   economy → 금융·경제·재테크, culture → 연예·아이돌·컬처, life → 생활·트렌드·밈

alter table public.questions drop constraint questions_category_check;
alter table public.questions
  add constraint questions_category_check
  check (category in ('career', 'economy', 'sports', 'culture', 'food', 'tech', 'game', 'life'));
