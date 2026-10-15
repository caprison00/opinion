import BadgeIcon from "@/components/BadgeIcon";
import { BADGES, FAMILY_LABEL, LEVEL_LABEL } from "@/lib/badges";

// 뱃지 디자인 확인용: 12종 × 단계 + 아직 못 받은 모양
export default function BadgeGallery() {
  return (
    <main className="wrap" style={{ paddingTop: 32 }}>
      <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0 }}>
        뱃지 <span className="hl">도감</span>
      </h1>
      <p style={{ color: "var(--ink-2)", marginTop: 6 }}>
        12종 · 단계별(브론즈·실버·골드) 모양과 아직 못 받은 모양이에요. 골드와
        특별 뱃지는 반짝이고 은은하게 빛나요.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 14,
          marginTop: 24,
        }}
      >
        {BADGES.map((b) => {
          const levels = b.thresholds.length > 1 ? [1, 2, 3] : [1];
          return (
            <section key={b.key} className="card">
              <p className="meta" style={{ margin: 0 }}>
                {FAMILY_LABEL[b.family]}
              </p>
              <h2
                style={{ margin: "2px 0 4px", fontSize: 18, fontWeight: 800 }}
              >
                {b.name}
              </h2>
              <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink-2)" }}>
                {b.description}
              </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 14,
                  alignItems: "flex-end",
                  marginTop: 14,
                }}
              >
                {levels.map((lv) => (
                  <figure key={lv} style={{ margin: 0, textAlign: "center" }}>
                    <BadgeIcon badgeKey={b.key} level={lv} size={64} />
                    <figcaption className="meta">
                      {b.thresholds.length > 1
                        ? `${LEVEL_LABEL[lv]} · ${b.thresholds[lv - 1]}${b.unit}`
                        : "달성"}
                    </figcaption>
                  </figure>
                ))}
                <figure style={{ margin: 0, textAlign: "center" }}>
                  <BadgeIcon badgeKey={b.key} level={0} size={64} muted />
                  <figcaption className="meta">미획득</figcaption>
                </figure>
                <figure
                  style={{
                    margin: 0,
                    display: "flex",
                    gap: 6,
                    alignItems: "center",
                    flexBasis: "100%",
                  }}
                >
                  <BadgeIcon
                    badgeKey={b.key}
                    level={levels.at(-1) ?? 1}
                    size={18}
                  />
                  <span className="meta">닉네임 옆 크기</span>
                </figure>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
