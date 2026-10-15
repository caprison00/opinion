import Link from "next/link";
import { COMMENTS, FEATURED } from "../data";
import { PillTabs, PredictPanel, Reactions, TrendCard } from "../Interactive";

export default function PreviewQuestion() {
  const f = FEATURED;
  const before = f.title.replace(f.highlight, "");
  return (
    <main className="wrap">
      <Link href="/preview" className="crumb">
        ← 핫이슈 · {f.issue}
      </Link>

      <div className="layout" style={{ marginTop: 6 }}>
        <div>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <span className="chip">{f.issue}</span>
            <span className="chip plain">{f.category}</span>
            <span className="chip time">{f.closeIn}</span>
          </div>
          <h1 className="q-title">
            {before}
            <span className="hl">{f.highlight}</span>
          </h1>
          <p className="meta" style={{ margin: 0 }}>
            예측 마감 10월 31일 (토) 21:00 · 결과 확정 11월 9일 (월) 예정 ·{" "}
            <span className="num">{f.participants.toLocaleString()}</span>명
            예측
          </p>

          {/* 3줄 맥락 */}
          <section className="card" style={{ marginTop: 22 }}>
            <div
              className="keyfactors"
              style={{ marginTop: 0, borderTop: 0, paddingTop: 0 }}
            >
              <h4>3줄 맥락</h4>
              <ol>
                {f.context.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ol>
            </div>
            <p className="criteria">
              <b>판정 기준</b> · {f.source} · 출처: lolesports.com
            </p>
          </section>

          {/* 좁은 화면: 예측 패널을 맥락 바로 아래에 */}
          <section className="card lg:hidden" style={{ marginTop: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 12,
              }}
            >
              <h3 className="side-title" style={{ fontSize: 17 }}>
                내 예측
              </h3>
              <span className="badge win">지금 맞히면 최대 +84점</span>
            </div>
            <PredictPanel yes={f.yes} />
          </section>

          {/* 01 진영 대결 */}
          <section className="sec" style={{ marginTop: 36 }}>
            <div className="sec-head">
              <span className="idx">01</span>
              <h2>진영 대결</h2>
            </div>
            <p className="sec-sub">
              공감을 가장 많이 받은 근거를 진영별로 골랐어요.
            </p>
            <div className="grid2">
              {[
                {
                  side: "예",
                  cls: "y",
                  pct: f.yes,
                  delta: f.delta,
                  c: COMMENTS[0],
                },
                {
                  side: "아니오",
                  cls: "n",
                  pct: 100 - f.yes,
                  delta: -f.delta,
                  c: COMMENTS[1],
                },
              ].map((s) => (
                <div key={s.side} className="card">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                    }}
                  >
                    <b style={{ fontSize: 17 }}>{s.side}</b>
                    <span>
                      <span
                        className={`delta ${s.delta >= 0 ? "up" : "down"} num`}
                      >
                        {s.delta >= 0 ? "▲" : "▼"}
                        {Math.abs(s.delta)}%p
                      </span>{" "}
                      <span
                        className="num"
                        style={{
                          fontSize: 28,
                          fontWeight: 800,
                          color: `var(--${s.cls === "y" ? "yes" : "no"})`,
                        }}
                      >
                        {s.pct}%
                      </span>
                    </span>
                  </div>
                  <div className="bar-track" style={{ marginTop: 8 }}>
                    <span
                      className={`bar-fill ${s.cls}`}
                      style={{ width: `${s.pct}%`, display: "block" }}
                    />
                  </div>
                  <p
                    style={{
                      margin: "14px 0 0",
                      fontSize: 14.5,
                      color: "var(--ink-2)",
                    }}
                  >
                    <span className="tier">{s.c.tier}</span>{" "}
                    <b style={{ color: "var(--ink)" }}>{s.c.nick}</b> &ldquo;
                    {s.c.body}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 02 확률 추이 */}
          <section className="sec" style={{ marginTop: 36 }}>
            <div className="sec-head">
              <span className="idx">02</span>
              <h2>확률 추이</h2>
            </div>
            <p className="sec-sub">
              집단 확률이 어떻게 움직였는지, 내 예측과 겹쳐 볼 수 있어요.
            </p>
            <TrendCard />
          </section>

          {/* 03 토론 */}
          <section className="sec" style={{ marginTop: 36 }}>
            <div className="sec-head">
              <span className="idx">03</span>
              <h2>
                토론{" "}
                <span
                  className="num"
                  style={{ color: "var(--ink-3)", fontSize: "0.7em" }}
                >
                  128
                </span>
              </h2>
            </div>
            <div className="card">
              <textarea
                rows={3}
                placeholder="이 질문에 대한 생각을 남겨 보세요"
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  margin: "10px 0 6px",
                }}
              >
                <PillTabs items={["공감순", "고득점자순", "최신순"]} />
                <PillTabs items={["전체", "예 진영", "아니오 진영"]} />
              </div>
              {COMMENTS.map((c) => (
                <div key={c.nick} className="comment">
                  <div className="who">
                    <span className="tier">{c.tier}</span>
                    <b>{c.nick}</b>
                    <span className={`stance ${c.stance}`}>
                      {c.stance === "y" ? "예" : "아니오"} {c.pct}%
                    </span>
                    <span className="meta">{c.ago}</span>
                  </div>
                  <p>{c.body}</p>
                  <Reactions counts={c.r} />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* 사이드바: 예측 패널 */}
        <aside className="aside">
          <section className="card hidden lg:block">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 12,
              }}
            >
              <h3 className="side-title" style={{ fontSize: 17 }}>
                내 예측
              </h3>
              <span className="badge win">지금 맞히면 최대 +84점</span>
            </div>
            <PredictPanel yes={f.yes} />
          </section>

          <section className="navy">
            <span className="k">같은 이슈의 다른 질문</span>
            <ul className="side-list" style={{ marginTop: 10 }}>
              <li>
                <span className="n num" style={{ color: "var(--accent)" }}>
                  1
                </span>
                <Link href="/preview/question" style={{ color: "#eef1f6" }}>
                  올해 롤드컵 우승팀은?
                </Link>
              </li>
              <li>
                <span className="n num" style={{ color: "var(--accent)" }}>
                  2
                </span>
                <Link href="/preview/question" style={{ color: "#eef1f6" }}>
                  결승 세트 스코어가 3:0일까?
                </Link>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
