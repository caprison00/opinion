import BadgeIcon from "@/components/BadgeIcon";
import { button, card } from "@/components/ui";
import {
  BADGES,
  badgeTitle,
  FAMILY_LABEL,
  nextGoal,
  type BadgeFamily,
  type UserBadge,
} from "@/lib/badges";
import { setFeaturedBadge, setShowBadges } from "./actions";

// 프로필의 뱃지 진열장
// - 본인: 12종 전부 (못 받은 뱃지는 흐리게 + 다음 단계까지 남은 양), 대표 뱃지·공개 설정
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
  const earned = owned.filter((b) => b.level > 0);

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
      {isMe && (
        <div
          className={`${card} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`}
        >
          <form
            action={setFeaturedBadge}
            className="flex flex-wrap items-center gap-2"
          >
            <label htmlFor="featured" className="t-label-1 !font-semibold">
              닉네임 옆 대표 뱃지
            </label>
            <select
              id="featured"
              name="badge"
              defaultValue={featured ?? ""}
              className="h-9 rounded-lg border border-line-neutral bg-surface px-2 t-label-1"
            >
              <option value="">없음</option>
              {earned.map((b) => (
                <option key={b.badge_key} value={b.badge_key}>
                  {badgeTitle(b.badge_key, b.level)}
                </option>
              ))}
            </select>
            <button className={button.smallSecondary}>저장</button>
          </form>
          <form action={setShowBadges} className="flex items-center gap-2">
            <label className="flex items-center gap-2 t-label-1">
              <input
                type="checkbox"
                name="show"
                defaultChecked={showBadges}
                className="h-4 w-4 accent-[var(--color-brand)]"
              />
              다른 사람에게 뱃지 공개
            </label>
            <button className={button.smallSecondary}>저장</button>
          </form>
        </div>
      )}

      {families.map(({ f, items }) => (
        <section key={f}>
          <h3 className="mb-2 t-label-1 !font-bold text-label-neutral">
            {FAMILY_LABEL[f]}
          </h3>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {items.map((d) => {
              const b = byKey.get(d.key);
              const level = b?.level ?? 0;
              const progress = b?.progress ?? 0;
              const goal = nextGoal(d, level, progress);
              const single = d.thresholds.length === 1;
              return (
                <li
                  key={d.key}
                  className={`${card} flex items-center gap-3 p-3.5 ${level ? "" : "opacity-70"}`}
                >
                  <BadgeIcon
                    badgeKey={d.key}
                    level={level}
                    size={40}
                    muted={!level}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 t-body-2 !font-bold">
                      {level ? badgeTitle(d.key, level) : d.name}
                      {featured === d.key && level > 0 && (
                        <span className="rounded-full bg-accent-soft px-1.5 t-caption-1 !font-bold text-accent-ink">
                          대표
                        </span>
                      )}
                    </p>
                    <p className="t-caption-1 text-label-alt">
                      {d.description}
                    </p>
                    {isMe && (
                      <p className="mt-0.5 t-caption-1 text-label-neutral">
                        {single
                          ? level
                            ? progress > 1
                              ? `${progress}${d.unit} 달성`
                              : "달성"
                            : "아직 못 받았어요"
                          : goal
                            ? `지금 ${progress}${d.unit} · ${LEVEL_NAMES[level + 1]}까지 ${goal.left}${d.unit} 남음`
                            : `${progress}${d.unit} · 최고 단계`}
                      </p>
                    )}
                  </div>
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
