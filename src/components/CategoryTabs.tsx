import Link from "next/link";
import { CATEGORIES, type Category } from "@/lib/questions";
import { pillBar, textTab } from "./ui";

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
    <nav aria-label="분야" className={`scroll-row ${pillBar}`}>
      {tabs.map((tab) => {
        const on = tab.value === active;
        return (
          <Link
            key={tab.label}
            href={hrefOf(tab.value)}
            scroll={false}
            aria-current={on ? "page" : undefined}
            className={`${textTab(on)} shrink-0 gap-1`}
          >
            {tab.label}
            {tab.n !== undefined && (
              <span className="num text-[12px] !font-medium text-label-alt">
                {tab.n}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
