-- 사진 출처는 받지도 표시하지도 않는다 (기획자 결정, 2026-10).
-- 0022에서 넣은 "사진이 있으면 출처 필수" 규칙을 없앤다. 기존 image_credit 값은 그대로 둔다(지우지 않음).
alter table public.questions drop constraint if exists questions_image_credit_required;
alter table public.issues drop constraint if exists issues_image_credit_required;
