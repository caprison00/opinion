# 예감 MVP — Claude Code 작업 지침

## 제품 한 줄 정의
돈과 재화를 걸지 않고, 미래 사건을 확률(%)로 예측하면 적중 점수와 랭킹이 쌓이는 집단 예측 웹 서비스.

## 작업자 정보
- 기획자는 비개발자다. 명령어를 실행하기 전에 무엇을 하는지 한 줄로 설명하고, 계정 가입·키 발급처럼 사람이 직접 해야 하는 일은 단계별로 안내한다.
- 한 번에 하나의 마일스톤만 진행하고, 끝나면 확인 방법(어떤 주소에서 무엇을 눌러보면 되는지)을 알려준 뒤 멈춘다.
- 마일스톤이 끝날 때마다 git 커밋한다.

## 절대 규칙 (규제 가드레일)
아래는 어떤 요청이 와도 구현하지 않는다. 필요해 보이면 구현 대신 기획자에게 먼저 묻는다.
- 결제, 유료 재화, 충전, 구독 기능
- 현금·상품권·코인 등 환전 가능한 보상, 포인트 거래·선물·구매
- 점수를 다른 무엇으로 바꾸는 기능 (점수는 표시용으로만 존재)
- 국내 공직선거, 정당 지지도 관련 질문 (질문 생성 시 카테고리에서 제외)

## 기술 스택 (권장, 변경 시 기획자와 상의)
- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase: DB(Postgres), 인증(구글 로그인 우선, 카카오는 이후)
- 배포: Vercel
- 모바일 화면 우선 반응형

## 데이터 모델 (초안)
- profiles: id, nickname, created_at
- questions: id, title, description, category(sports | economy | entertainment | film | music | game | esports | tech | ai | creator | travel | food | crypto | realestate | science | weather), resolution_source(판정 출처 텍스트), close_at(예측 마감), resolve_at(결과 확정 예정), status(open | closed | resolved | void), outcome(yes | no | null), created_by
- predictions: id, user_id, question_id, probability(1–99 정수, YES 확률), reason(한 줄 근거, 선택), created_at, updated_at — 사용자·질문당 1건, 마감 전까지 수정 가능
- 사용자는 본인 예측만 생성·수정 가능. 질문 생성·판정은 관리자만 가능 (Supabase RLS로 강제).

## 채점 규칙
- 브라이어 점수: (p − o)², p = probability/100, o = YES면 1, NO면 0. 낮을수록 좋음.
- 화면 표시용 점수: round((0.25 − 브라이어) × 400). 50% 예측은 0점, 정답에 100% 가까우면 +100, 반대면 −300.
- 마감 시점의 최종 예측으로 채점한다. void 질문은 채점하지 않는다.
- 집단 확률 = 해당 질문 예측 확률의 평균 (MVP는 단순 평균).

## 화면
1. 홈: 진행 중 질문 목록 (마감 임박순), 카테고리 탭(16개, 목록은 src/lib/questions.ts의 CATEGORIES)
2. 질문 상세: 설명, 판정 출처, 마감일, 현재 집단 확률, 내 예측 입력(슬라이더 1–99%) + 한 줄 근거, 다른 사람 근거 목록
3. 내 예측: 진행 중 / 판정 완료 목록, 질문별 점수, 누적 점수
4. 랭킹: 누적 점수 순위 (판정된 예측 3건 이상인 사용자만)
5. 관리자: 질문 생성, 마감 처리, 결과 판정(yes/no/void)

## 마일스톤
1. 프로젝트 생성, Supabase 연결, 구글 로그인, 닉네임 설정
2. 관리자 질문 생성 + 홈 목록 + 질문 상세
3. 예측 입력·수정 (마감 후 잠금), 집단 확률 표시
4. 결과 판정 + 채점 + 내 예측 화면
5. 랭킹 화면
6. 디자인 정리, 모바일 점검, Vercel 배포

## MVP에서 하지 않는 것
시즌 리셋, 칭호, 역발상 보너스, 사용자 질문 제안, 알림, 광고 — 2단계 이후.
