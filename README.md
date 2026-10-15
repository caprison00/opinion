# 예감

돈과 재화를 걸지 않고, 미래 사건을 확률(%)로 예측하면 적중 점수와 랭킹이 쌓이는 집단 예측 웹 서비스.

- 작업 지침: [CLAUDE.md](./CLAUDE.md)
- 기술 스택: Next.js(App Router) + TypeScript + Tailwind CSS, Supabase, Vercel
- 디자인: [Wanted Design System (Community)](design/wanted/README.md) 토큰 사용, 다크(기본)·라이트 테마 (`src/app/globals.css`의 `--c-*` 변수) — © Wanted Lab, CC BY 4.0. 토큰은 `src/app/globals.css`, 공통 클래스는 `src/components/ui.ts`. 원티드 로고·브랜드명은 쓰지 않는다.

## 처음 설정하기

1. Supabase 프로젝트를 만들고 `supabase/migrations/` 의 SQL(0001~0016)을 순서대로 SQL Editor에서 실행한다.
   관리자 지정: `insert into public.admins (user_id) select id from public.profiles where nickname = '닉네임';`
2. Supabase > Authentication > Providers 에서 Google 로그인을 켠다.
3. `.env.example` 을 `.env.local` 로 복사하고 값을 채운다. (Vercel에서는 Environment Variables에 같은 값을 넣는다.)
4. `npm install` 후 `npm run dev` → http://localhost:3000

## 화면

| 주소 | 내용 |
| --- | --- |
| `/` | 진행 중 질문 (마감 임박순), 카테고리 탭 (6개) |
| `/questions/[id]` | 질문 상세, 집단 확률, 내 예측 입력, 근거 목록 |
| `/me` | 내 예측 (진행 중 / 판정 완료), 누적 점수 |
| `/ranking` | 랭킹 (판정된 예측 3건 이상) |
| `/admin` | 질문 생성, 마감 처리, 결과 판정 (관리자만) |
| `/admin/stats` | 방문 통계 (쿠키 없이 일별 순 방문자, 페이지뷰, 인기 페이지, 유입 경로) |
| `/admin/legal` | 이용약관·개인정보처리방침 버전 게시 (관리자만) |
| `/terms`, `/privacy` | 현재 시행 중인 약관, 변경 이력, 시행 예정 안내 |
