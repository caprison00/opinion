"use client";

import { useState } from "react";
import { TREND } from "./data";

export function Lock() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

// 예/아니오 진영 막대 (공개 전에는 잠금)
export function Bars({ yes, open }: { yes: number; open: boolean }) {
  if (!open) {
    return (
      <p className="lock" style={{ marginTop: 14 }}>
        <Lock /> 예측하면 진영 막대가 보여요
      </p>
    );
  }
  return (
    <div style={{ marginTop: 16 }}>
      <div className="bar-line">
        <span className="name">예</span>
        <span className="bar-track">
          <span
            className="bar-fill y"
            style={{ width: `${yes}%`, display: "block" }}
          />
        </span>
        <span className="val num">{yes}%</span>
      </div>
      <div className="bar-line">
        <span className="name">아니오</span>
        <span className="bar-track">
          <span
            className="bar-fill n"
            style={{ width: `${100 - yes}%`, display: "block" }}
          />
        </span>
        <span className="val num">{100 - yes}%</span>
      </div>
    </div>
  );
}

// 홈 핫이슈 카드의 원탭 예측: 누르면 진영 막대가 열린다
export function QuickVote({ yes, delta }: { yes: number; delta: number }) {
  const [pick, setPick] = useState<"y" | "n" | null>(null);
  return (
    <div style={{ marginTop: 16 }}>
      <div className="vote-row">
        <button
          type="button"
          className={`vote-btn yes ${pick === "y" ? "picked" : ""}`}
          onClick={() => setPick("y")}
        >
          <span className="lbl">예</span>
          <span className="pct num">{pick ? `${yes}%` : "?"}</span>
        </button>
        <button
          type="button"
          className={`vote-btn no ${pick === "n" ? "picked" : ""}`}
          onClick={() => setPick("n")}
        >
          <span className="lbl">아니오</span>
          <span className="pct num">{pick ? `${100 - yes}%` : "?"}</span>
        </button>
      </div>
      <Bars yes={yes} open={!!pick} />
      {pick && (
        <p className="vote-msg">
          <b>{pick === "y" ? "예" : "아니오"} 70%</b>로 저장했어요. 지난 24시간
          여론{" "}
          <span className={`delta ${delta >= 0 ? "up" : "down"}`}>
            {delta >= 0 ? "▲" : "▼"}
            {Math.abs(delta)}%p
          </span>
          {" · "}
          {pick === "y" ? "다수파" : "소수파"}에 섰어요.
        </p>
      )}
    </div>
  );
}

// 알약 토글 (분야 탭 등)
export function PillTabs({ items }: { items: string[] }) {
  const [on, setOn] = useState(0);
  return (
    <div className="toggle" role="tablist">
      {items.map((t, i) => (
        <button
          key={t}
          type="button"
          role="tab"
          aria-selected={on === i}
          className={on === i ? "on" : ""}
          onClick={() => setOn(i)}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// 상세: 예측 패널 (OX 퀵 + 슬라이더)
export function PredictPanel({ yes }: { yes: number }) {
  const [pick, setPick] = useState<"y" | "n" | null>(null);
  const [pct, setPct] = useState(70);
  return (
    <div>
      <div className="vote-row">
        <button
          type="button"
          className={`vote-btn yes ${pick === "y" ? "picked" : ""}`}
          onClick={() => setPick("y")}
        >
          <span className="lbl">예</span>
        </button>
        <button
          type="button"
          className={`vote-btn no ${pick === "n" ? "picked" : ""}`}
          onClick={() => setPick("n")}
        >
          <span className="lbl">아니오</span>
        </button>
      </div>
      {pick && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginTop: 16,
            }}
          >
            <span
              style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-2)" }}
            >
              &lsquo;{pick === "y" ? "예" : "아니오"}&rsquo;일 확률
            </span>
            <span className="num" style={{ fontSize: 28, fontWeight: 800 }}>
              {pct}%
            </span>
          </div>
          <input
            className="slider"
            type="range"
            min={51}
            max={99}
            value={pct}
            onChange={(e) => setPct(Number(e.target.value))}
            aria-label="확률"
          />
          <div
            className="meta"
            style={{ display: "flex", justifyContent: "space-between" }}
          >
            <span>조금 더 그럴 듯</span>
            <span>거의 확실</span>
          </div>
          <input
            placeholder="한 줄 근거 (선택) · 토론에 첫 댓글로 공개돼요"
            style={{
              width: "100%",
              marginTop: 14,
              fontFamily: "inherit",
              fontSize: 14.5,
              padding: "11px 13px",
              borderRadius: 10,
              border: "1px solid var(--line)",
              background: "var(--surface)",
              color: "var(--ink)",
            }}
          />
          <button type="button" className="btn" style={{ marginTop: 12 }}>
            예측 저장
          </button>
          <Bars yes={yes} open />
        </>
      )}
      {!pick && (
        <p className="meta" style={{ marginTop: 10 }}>
          누르면 고른 쪽 70%로 바로 저장돼요. 저장한 뒤 확률을 조절할 수 있어요.
        </p>
      )}
    </div>
  );
}

// 상세: 확률 추이 (전체 / 내 예측 겹쳐 보기)
export function TrendCard() {
  const [layer, setLayer] = useState<"crowd" | "both">("both");
  const W = 560;
  const H = 180;
  const pad = 30;
  const n = TREND.crowd.length;
  const x = (i: number) => pad + (i / (n - 1)) * (W - pad - 8);
  const y = (v: number) => 10 + (1 - v / 100) * (H - 30);
  const path = (vals: (number | null)[]) =>
    vals
      .map((v, i) =>
        v === null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`,
      )
      .filter(Boolean)
      .join(" ");
  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>
          <p className="meta" style={{ margin: 0, fontWeight: 700 }}>
            지금 집단 확률 · 예
          </p>
          <div className="bigpct num">
            63%<small>▲8%p 24시간</small>
          </div>
        </div>
        <div className="toggle">
          <button
            type="button"
            className={layer === "crowd" ? "on" : ""}
            onClick={() => setLayer("crowd")}
          >
            전체
          </button>
          <button
            type="button"
            className={layer === "both" ? "on" : ""}
            onClick={() => setLayer("both")}
          >
            내 예측 겹쳐 보기
          </button>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", marginTop: 10 }}
        role="img"
        aria-label="확률 추이"
      >
        {[0, 50, 100].map((g) => (
          <g key={g}>
            <line
              x1={pad}
              x2={W - 8}
              y1={y(g)}
              y2={y(g)}
              stroke="var(--line)"
              strokeDasharray={g === 50 ? "4 4" : undefined}
            />
            <text
              x={pad - 6}
              y={y(g) + 4}
              textAnchor="end"
              fontSize="12"
              fill="var(--ink-3)"
            >
              {g}
            </text>
          </g>
        ))}
        <polyline
          points={path(TREND.crowd)}
          fill="none"
          stroke="var(--chart-line)"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {layer === "both" && (
          <polyline
            points={path(TREND.mine)}
            fill="none"
            stroke="var(--chart-you)"
            strokeWidth="3"
            strokeDasharray="6 5"
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="legend">
        <span>
          <span className="sw" style={{ background: "var(--chart-line)" }} />
          집단 확률 (예)
        </span>
        {layer === "both" && (
          <span>
            <span className="sw" style={{ background: "var(--chart-you)" }} />내
            예측
          </span>
        )}
        <span style={{ marginLeft: "auto" }}>
          {TREND.labels[0]} → {TREND.labels[1]}
        </span>
      </div>
      <p className="src-line">
        점수는 예측을 유지한 시간만큼 반영돼요. 일찍 맞힐수록 높아요.
      </p>
    </div>
  );
}

export function Reactions({ counts }: { counts: number[] }) {
  const [mine, setMine] = useState<number | null>(null);
  const labels = ["확신해요", "불안해요", "말도 안 돼"];
  return (
    <div className="react">
      {labels.map((l, i) => (
        <button
          key={l}
          type="button"
          className={mine === i ? "on" : ""}
          onClick={() => setMine(mine === i ? null : i)}
        >
          {l} <span className="num">{counts[i] + (mine === i ? 1 : 0)}</span>
        </button>
      ))}
    </div>
  );
}
