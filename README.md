# 예감

돈과 재화를 걸지 않고, 미래 사건을 확률(%)로 예측하면 적중 점수와 랭킹이 쌓이는 집단 예측 웹 서비스.

- 작업 지침: [CLAUDE.md](./CLAUDE.md)
- 기술 스택: Next.js(App Router) + TypeScript + Tailwind CSS, Supabase, Vercel

## 처음 설정하기

1. Supabase 프로젝트를 만들고 `supabase/migrations/` 의 SQL을 순서대로 SQL Editor에서 실행한다.
2. Supabase > Authentication > Providers 에서 Google 로그인을 켠다.
3. `.env.example` 을 `.env.local` 로 복사하고 값을 채운다. (Vercel에서는 Environment Variables에 같은 값을 넣는다.)
4. `npm install` 후 `npm run dev` → http://localhost:3000
