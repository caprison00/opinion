import BadgeIcon from "@/components/BadgeIcon";
import { card } from "@/components/ui";
import {
  BADGES,
  FAMILY_LABEL,
  nextGoal,
  type BadgeFamily,
  type UserBadge,
} from "@/lib/badges";

// 프로필의 뱃지 진열장
// - 본인(내 뱃지 화면): 12종 전부 (못 받은 뱃지는 흐리게 + 다음 단계까지 남은 양)
// - 다른 사람: 공개로 둔 경우 받은 뱃지만
export default function BadgeShelf({
  owned,
  isMe,
  showBadges,
  featured,
}: {
  owned: UserBadge[];
  isMe: boolean;
  showBadges: boolean;
  featured: string | null;
}) {
  const byKey = new Map(owned.map((b) => [b.badge_key, b]));

  if (!isMe && !showBadges) {
    return (
      <p className="mt-3 rounded-xl bg-bg-alt py-8 text-center t-label-1 text-label-alt">
        뱃지를 비공개로 설정했어요.
      </p>
    );
  }
  const list = isMe ? BADGES : BADGES.filter((d) => byKey.get(d.key)?.level);
  if (!list.length) {
    return (
      <p className="mt-3 rounded-xl bg-bg-alt py-8 text-center t-label-1 text-label-alt">
        아직 받은 뱃지가 없어요.
      </p>
    );
  }

  const families = (["hit", "habit", "contrib", "contrarian"] as BadgeFamily[])
    .map((f) => ({ f, items: list.filter((d) => d.family === f) }))
    .filter((g) => g.items.length);

  return (
    <div className="mt-3 flex flex-col gap-4">
      {families.map(({ f, items }) => (
        <section key={f}>
          <h3 className="mb-2 t-label-1 !font-bold text-label-neutral">
            {FAMILY_LABEL[f]}
          </h3>
          <ul className="grid grid-cols-3 gap-2 sm:gap-3">
            {items.map((d) => {
              const b = byKey.get(d.key);
              const level = b?.level ?? 0;
              const progress = b?.progress ?? 0;
              const goal = nextGoal(d, level, progress);
              const single = d.thresholds.length === 1;
              // 다음 단계까지 진행 막대 (이전 단계 기준부터)
              const from = level ? (d.thresholds[level - 1] ?? 0) : 0;
              const pct = goal
                ? Math.min(
                    100,
                    Math.max(
                      0,
                      ((progress - from) / Math.max(1, goal.target - from)) *
                        100,
                    ),
                  )
                : 100;
              return (
                <li
                  key={d.key}
                  className={`${card} relative flex flex-col items-center px-2 pb-3 pt-4 text-center sm:px-3 sm:pb-4 sm:pt-5`}
                >
                  {featured === d.key && level > 0 && (
                    <span className="absolute right-1.5 top-1.5 rounded-full sm:right-2.5 sm:top-2.5 bg-accent-soft px-2 py-0.5 t-caption-1 !font-bold text-accent-ink">
                      대표
                    </span>
                  )}
                  <div
                    className={`[&>svg]:h-16 [&>svg]:w-16 sm:[&>svg]:h-24 sm:[&>svg]:w-24 ${level ? "" : "opacity-60"}`}
                  >
                    <BadgeIcon
                      badgeKey={d.key}
                      level={level}
                      size={96}
                      muted={!level}
                    />
                  </div>
                  <p
                    className={`mt-2 t-label-1 !font-bold sm:mt-3 sm:t-body-1 ${level ? "" : "text-label-alt"}`}
                  >
                    {d.name}
                  </p>
                  {!single && (
                    <div
                      className="mt-1 flex gap-1"
                      aria-label={
                        level ? `${LEVEL_NAMES[level]} 단계` : "단계 없음"
                      }
                    >
                      {[1, 2, 3].map((lv) => (
                        <span
                          key={lv}
                          className="h-1.5 w-3.5 rounded-full sm:w-5"
                          style={{
                            backgroundColor:
                              lv <= level
                                ? LEVEL_COLORS[lv]
                                : "var(--color-line)",
                          }}
                        />
                      ))}
                    </div>
                  )}
                  <p className="mt-1 t-caption-1 text-label-alt">
                    {d.description}
                  </p>
                  {isMe && (
                    <div className="mt-auto w-full pt-3">
                      {goal && (
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-fill">
                          <div
                            className="h-full rounded-full bg-accent"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                      <p className="mt-1.5 t-caption-1 text-label-neutral">
                        {single
                          ? level
                            ? progress > 1
                              ? `${progress}${d.unit} 달성`
                              : "달성"
                            : "아직 못 받았어요"
                          : goal
                            ? `${progress}/${goal.target}${d.unit} · ${LEVEL_NAMES[level + 1]}까지`
                            : `${progress}${d.unit} · 최고 단계`}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

const LEVEL_NAMES = ["", "브론즈", "실버", "골드"];
const LEVEL_COLORS = ["", "#c9814f", "#9aa6b5", "#e2a51c"];
