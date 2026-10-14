// 일별 방문자 막대 차트. 막대마다 마우스·키보드 포커스로 값을 보여주고, 같은 값은 표로도 볼 수 있다.
export type DailyRow = {
  day: string; // YYYY-MM-DD
  visitors: number;
  page_views: number;
};

const CHART_HEIGHT = 180;

// 가운데 눈금이 1·2·3·4·5·6·8 단위의 정수가 되도록 최댓값을 정한다.
function niceMax(n: number) {
  const half = Math.max(1, Math.ceil(n / 2));
  const pow = 10 ** Math.floor(Math.log10(half));
  const nice = [1, 2, 3, 4, 5, 6, 8, 10]
    .map((m) => m * pow)
    .find((v) => v >= half)!;
  return nice * 2;
}

function shortDate(day: string) {
  const [, m, d] = day.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export default function DailyChart({ rows }: { rows: DailyRow[] }) {
  const max = niceMax(Math.max(...rows.map((r) => r.visitors), 1));
  const ticks = [max, max / 2, 0];
  const labelEvery = rows.length > 31 ? 14 : rows.length > 7 ? 7 : 2;

  return (
    <figure className="m-0">
      <div className="flex gap-2">
        {/* y축 눈금 */}
        <div
          className="flex flex-col justify-between text-right t-caption-1 tabular-nums text-label-alt"
          style={{ height: CHART_HEIGHT }}
          aria-hidden="true"
        >
          {ticks.map((t) => (
            <span
              key={t}
              className="-translate-y-1/2 first:translate-y-0 last:translate-y-0"
            >
              {Math.round(t)}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {/* 가로 눈금선 */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-between"
            style={{ height: CHART_HEIGHT }}
            aria-hidden="true"
          >
            <div className="border-t border-line-alt" />
            <div className="border-t border-line-alt" />
            <div className="border-t border-line" />
          </div>

          <ul
            className="relative flex items-end gap-[2px]"
            style={{ height: CHART_HEIGHT }}
            aria-label="일별 방문자"
          >
            {rows.map((r) => {
              const h =
                r.visitors === 0
                  ? 0
                  : Math.max(2, (r.visitors / max) * CHART_HEIGHT);
              return (
                <li
                  key={r.day}
                  tabIndex={0}
                  className="group relative flex h-full flex-1 items-end outline-none"
                  aria-label={`${r.day} 방문자 ${r.visitors}명, 페이지뷰 ${r.page_views}회`}
                >
                  <div
                    className="w-full rounded-t-[4px] bg-primary transition-colors group-hover:bg-primary-heavy group-focus-visible:bg-primary-heavy"
                    style={{ height: h }}
                  />
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-inverse px-3 py-2 text-white shadow-medium group-hover:block group-focus-visible:block">
                    <p className="t-caption-1 text-white/70">{r.day}</p>
                    <p className="t-label-1 !font-bold tabular-nums">
                      방문자 {r.visitors}명
                    </p>
                    <p className="t-caption-1 tabular-nums text-white/80">
                      페이지뷰 {r.page_views}회
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* x축 날짜 */}
          <div className="mt-2 flex gap-[2px]" aria-hidden="true">
            {rows.map((r, i) => (
              <span
                key={r.day}
                className="flex-1 overflow-visible whitespace-nowrap t-caption-1 tabular-nums text-label-alt"
              >
                {(rows.length - 1 - i) % labelEvery === 0
                  ? shortDate(r.day)
                  : ""}
              </span>
            ))}
          </div>
        </div>
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer t-label-1 text-label-alt hover:text-label">
          표로 보기
        </summary>
        <div className="mt-2 max-h-72 overflow-auto rounded-xl border border-line">
          <table className="w-full t-label-1 tabular-nums">
            <thead className="sticky top-0 bg-bg-alt text-label-alt">
              <tr>
                <th className="px-3 py-2 text-left font-medium">날짜</th>
                <th className="px-3 py-2 text-right font-medium">방문자</th>
                <th className="px-3 py-2 text-right font-medium">페이지뷰</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-alt">
              {[...rows].reverse().map((r) => (
                <tr key={r.day}>
                  <td className="px-3 py-2">{r.day}</td>
                  <td className="px-3 py-2 text-right">{r.visitors}</td>
                  <td className="px-3 py-2 text-right">{r.page_views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
