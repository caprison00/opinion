import Link from "next/link";
import { CATEGORIES, type Category } from "@/lib/questions";
import { chip } from "./ui";

// 가로로 넘기는 분야 탭 (첫 칸 + 9개 분야). counts를 주면 탭마다 숫자를 붙인다.
export default function CategoryTabs({
  active,
  hrefOf,
  firstLabel,
  counts,
}: {
  active: Category | null; // null = 첫 칸(전체·핫이슈)
  hrefOf: (category: Category | null) => string;
  firstLabel: string;
  counts?: { total: number; byCategory: Record<Category, number> };
}) {
  const tabs = [
    { value: null, label: firstLabel, n: counts?.total },
    ...CATEGORIES.map((c) => ({
      value: c.value,
      label: c.label,
      n: counts?.byCategory[c.value],
    })),
  ];
  return (
    <nav
      aria-label="분야"
      className="scroll-row -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0"
    >
      {tabs.map((tab) => {
        const on = tab.value === active;
        return (
          <Link
            key={tab.label}
            href={hrefOf(tab.value)}
            scroll={false}
            aria-current={on ? "page" : undefined}
            className={`${chip(on)} shrink-0 gap-1.5 !h-10`}
          >
            {tab.label}
            {tab.n !== undefined && (
              <span className="num text-[13px] !font-medium opacity-75">
                {tab.n}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
