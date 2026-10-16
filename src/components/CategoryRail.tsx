import Link from "next/link";
import { ChartLineIcon, HomeIcon, TrophyIcon } from "./icons";
import { CATEGORIES, type Category } from "@/lib/questions";

// PC(1024px 이상) 홈 왼쪽 세로 메뉴: 홈 · 랭킹 · 내 예측 + 분야(분야별 진행 중 질문 수)
// 1024px 미만은 홈의 가로 분야 탭을 쓴다.
const MAIN = [
  { href: "/", label: "홈", Icon: HomeIcon },
  { href: "/ranking", label: "랭킹", Icon: TrophyIcon },
  { href: "/me", label: "내 예측", Icon: ChartLineIcon },
];

export default function CategoryRail({
  active,
  counts,
}: {
  active: Category | null; // null = 핫이슈
  counts: Record<Category, number>;
}) {
  const row = (on: boolean) =>
    `flex items-center gap-2.5 rounded-lg px-3 py-2 t-label-1 !font-semibold transition-colors ${
      on
        ? "bg-surface text-label shadow-small"
        : "text-label-neutral hover:bg-fill"
    }`;

  return (
    <nav aria-label="메뉴" className="flex flex-col gap-6">
      <ul className="flex flex-col gap-0.5">
        {MAIN.map(({ href, label, Icon }) => (
          <li key={href}>
            {/* 왼쪽 메뉴는 홈에만 있어서 홈이 현재 화면이다 */}
            <Link
              href={href}
              aria-current={href === "/" ? "page" : undefined}
              className={row(href === "/")}
            >
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </Link>
          </li>
        ))}
      </ul>

      <div>
        <h2 className="px-3 pb-1.5 t-caption-1 !font-bold text-label-alt">
          분야
        </h2>
        <ul className="flex flex-col gap-0.5">
          <li>
            <Link
              href="/"
              aria-current={active === null ? "true" : undefined}
              className={row(active === null)}
            >
              핫이슈
            </Link>
          </li>
          {CATEGORIES.map((c) => (
            <li key={c.value}>
              <Link
                href={`/?category=${c.value}`}
                aria-current={active === c.value ? "true" : undefined}
                className={row(active === c.value)}
              >
                <span className="min-w-0 flex-1 truncate">{c.label}</span>
                <span
                  className="t-caption-1 tabular-nums text-label-alt"
                  aria-label={`진행 중 ${counts[c.value]}개`}
                >
                  {counts[c.value]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
