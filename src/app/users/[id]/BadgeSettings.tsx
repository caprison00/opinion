"use client";

import { card } from "@/components/ui";
import { badgeTitle, type UserBadge } from "@/lib/badges";
import { setFeaturedBadge, setShowBadges } from "./actions";

// 내 뱃지 > 대표 뱃지 고르기 · 공개 여부 (바꾸면 바로 저장)
export default function BadgeSettings({
  earned,
  featured,
  showBadges,
}: {
  earned: UserBadge[];
  featured: string | null;
  showBadges: boolean;
}) {
  return (
    <div className={`${card} divide-y divide-line-alt`}>
      <form
        action={setFeaturedBadge}
        className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
      >
        <div>
          <label htmlFor="featured" className="t-body-2 !font-bold">
            대표 뱃지
          </label>
          <p className="t-caption-1 text-label-alt">닉네임 옆에 보여요.</p>
        </div>
        <select
          id="featured"
          name="badge"
          defaultValue={featured ?? ""}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="h-10 min-w-40 rounded-lg border border-line-neutral bg-surface px-2 t-label-1"
        >
          <option value="">없음</option>
          {earned.map((b) => (
            <option key={b.badge_key} value={b.badge_key}>
              {badgeTitle(b.badge_key, b.level)}
            </option>
          ))}
        </select>
      </form>
      <form
        action={setShowBadges}
        className="flex items-center justify-between gap-3 px-5 py-4"
      >
        <div>
          <label htmlFor="show-badges" className="t-body-2 !font-bold">
            받은 뱃지 공개
          </label>
          <p className="t-caption-1 text-label-alt">
            끄면 다른 사람은 내 프로필에서 뱃지를 볼 수 없어요. 대표 뱃지는
            그대로 보여요.
          </p>
        </div>
        <input
          id="show-badges"
          type="checkbox"
          role="switch"
          name="show"
          defaultChecked={showBadges}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="peer sr-only"
        />
        <label
          htmlFor="show-badges"
          aria-hidden="true"
          className="relative h-7 w-12 shrink-0 cursor-pointer rounded-full bg-fill-strong transition-colors after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-small after:transition-transform peer-checked:bg-brand peer-checked:after:translate-x-5 peer-focus-visible:ring-3 peer-focus-visible:ring-fill-strong"
        />
      </form>
    </div>
  );
}
