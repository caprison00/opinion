import Link from "next/link";
import { CARDS, FEATURED, MOVING, RESOLVED, TRENDING, UPCOMING } from "./data";
import { Lock, PillTabs, QuickVote } from "./Interactive";

const TABS = [
  "핫이슈",
  "스포츠",
  "경제·재테크",
  "연예·컬처",
  "테크·AI",
  "게임·e스포츠",
  "생활·트렌드",
];

function Delta({ v }: { v: number }) {
  return (
    <span className={`delta ${v >= 0 ? "up" : "down"} num`}>
      {v >= 0 ? "▲" : "▼"}
      {Math.abs(v)}%p
    </span>
  );
}

export default function PreviewHome() {
  const f = FEATURED;
  const before = f.title.replace(f.highlight, "");
  return (
    <main className="wrap">
      <section className="hero">
        <h1>
          오늘, <span className="hl">무엇이 일어날까요?</span>
        </h1>
        <p>돈은 걸지 않아요. 확률로 예측하고, 맞힐수록 점수와 티어가 쌓여요.</p>
      </section>

      <div style={{ marginTop: 22 }}>
        <PillTabs items={TABS} />
      </div>

      <div className="layout" style={{ marginTop: 8 }}>
        <div>
          {/* 01 오늘의 핫이슈 */}
          <section className="sec" style={{ marginTop: 24 }}>
            <div className="sec-head">
              <span className="idx">01</span>
              <h2>오늘의 핫이슈</h2>
            </div>
            <p className="sec-sub">
              이슈 하나에 질문이 묶여 있어요. 먼저 예측하면 여론이 열려요.
            </p>
            <article className="card feature">
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
              <h3>
                <Link href="/preview/question">
                  {before}
                  <span className="hl">{f.highlight}</span>
                </Link>
              </h3>
              <p className="meta" style={{ margin: 0 }}>
                <span className="num">{f.participants.toLocaleString()}</span>명
                예측 · 리액션 <span className="num">{f.reactions}</span>
              </p>
              <QuickVote yes={f.yes} delta={f.delta} />
              <div className="keyfactors">
                <h4>3줄 맥락</h4>
                <ol>
                  {f.context.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ol>
              </div>
              <p className="criteria">
                <b>판정 기준</b> · {f.source}
              </p>
            </article>
          </section>

          {/* 02 여론이 움직이는 질문 */}
          <section className="sec">
            <div className="sec-head">
              <span className="idx">02</span>
              <h2>지금 여론이 움직이는 질문</h2>
            </div>
            <p className="sec-sub">
              지난 24시간 동안 집단 확률이 크게 바뀐 순서예요.
            </p>
            <div className="rank-list">
              {MOVING.map((m, i) => (
                <Link
                  key={m.title}
                  href="/preview/question"
                  className="rank-item"
                >
                  <span className="rank-no num">{i + 1}</span>
                  <div>
                    <span className="meta">{m.category}</span>
                    <h3>{m.title}</h3>
                  </div>
                  <div className="right">
                    {m.locked ? (
                      <span className="badge nom">여론 변동 큼</span>
                    ) : (
                      <>
                        <b className="num">예 {m.yes}%</b>
                        <Delta v={m.delta} />
                      </>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* 03 어제 판정된 질문 */}
          <section className="sec">
            <div className="sec-head">
              <span className="idx">03</span>
              <h2>어제 판정된 질문</h2>
            </div>
            <p className="sec-sub">
              소수만 맞힌 질문일수록 맞힌 사람의 점수가 커요.
            </p>
            <div className="grid2">
              {RESOLVED.map((r) => (
                <div key={r.title} className="card">
                  <p
                    style={{
                      margin: 0,
                      fontWeight: 800,
                      fontSize: 16,
                      lineHeight: 1.45,
                    }}
                  >
                    {r.title}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 12,
                    }}
                  >
                    <span className="badge win">결과 {r.result}</span>
                    <span style={{ fontSize: 14, color: "var(--ink-2)" }}>
                      {r.hit < 50 ? (
                        <>
                          단{" "}
                          <b className="num" style={{ color: "var(--ink)" }}>
                            {r.hit}%
                          </b>
                          만 맞혔어요
                        </>
                      ) : (
                        <>
                          <b className="num" style={{ color: "var(--ink)" }}>
                            {r.hit}%
                          </b>
                          가 맞혔어요
                        </>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 04 곧 마감 */}
          <section className="sec">
            <div className="sec-head">
              <span className="idx">04</span>
              <h2>곧 마감되는 질문</h2>
            </div>
            <p className="sec-sub">마감이 가까운 순서로 보여요.</p>
            <div className="grid2">
              {CARDS.map((c) => (
                <Link
                  key={c.title}
                  href="/preview/question"
                  className="card qcard"
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <span className="chip plain">{c.category}</span>
                    {c.type !== "OX" && <span className="chip">{c.type}</span>}
                    <span className="chip time">{c.closeIn}</span>
                  </div>
                  <h3>{c.title}</h3>
                  {c.top ? (
                    <>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                        }}
                      >
                        <span
                          style={{ fontWeight: 800, fontSize: 20 }}
                          className="num"
                        >
                          {c.top} {c.pct}%
                        </span>
                        <Delta v={c.delta} />
                      </div>
                      <div
                        className="bar-track"
                        style={{ marginTop: 8, height: 8 }}
                      >
                        <span
                          className="bar-fill c"
                          style={{ width: `${c.pct}%`, display: "block" }}
                        />
                      </div>
                    </>
                  ) : (
                    <span className="lock">
                      <Lock /> 예측하면 보여요
                    </span>
                  )}
                  <p className="meta" style={{ margin: "10px 0 0" }}>
                    <span className="num">{c.n}</span>명 예측
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* 사이드바 */}
        <aside className="aside" style={{ marginTop: 24 }}>
          <section className="navy" id="mine">
            <span className="k">10월 시즌</span>
            <div className="big num">+212점</div>
            <div className="sub">
              <span
                className="tier"
                style={{ background: "var(--accent)", color: "#1a1405" }}
              >
                골드
              </span>{" "}
              23위 · 상위 18%
            </div>
            <div className="tile-row">
              <div className="tile">
                <b className="num">67%</b>
                <span>적중률</span>
              </div>
              <div className="tile">
                <b className="num">6건</b>
                <span>이번 달 판정</span>
              </div>
            </div>
            <a className="go" href="#ranking">
              랭킹 보기 →
            </a>
          </section>

          <section className="card" id="ranking">
            <h3 className="side-title">트렌딩 TOP 5</h3>
            <ol className="side-list">
              {TRENDING.map((t, i) => (
                <li key={t}>
                  <span className="n num">{i + 1}</span>
                  <Link href="/preview/question">{t}</Link>
                </li>
              ))}
            </ol>
          </section>

          <section className="card">
            <h3 className="side-title">판정 예정</h3>
            <ul className="side-list">
              {UPCOMING.map((u) => (
                <li key={u.title} style={{ flexDirection: "column", gap: 0 }}>
                  <span className="meta">{u.when}</span>
                  <span>{u.title}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
