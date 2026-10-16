import PageShell from "@/components/PageShell";
import { card } from "@/components/ui";

export const metadata = { title: "라이선스" };

// 사용한 디자인 자료·서체·아이콘의 출처 (CC BY 4.0 등 출처 표시 조건)
const ITEMS = [
  {
    name: "Wanted Design System",
    by: "© Wanted Lab",
    use: "타이포그래피 단계(글자 크기·줄 간격 구성)를 참고했어요.",
    license: "CC BY 4.0",
    href: "https://creativecommons.org/licenses/by/4.0/deed.ko",
  },
  {
    name: "Pretendard",
    by: "© 길형진(orioncactus)",
    use: "사이트 전체 서체로 써요.",
    license: "SIL Open Font License 1.1",
    href: "https://github.com/orioncactus/pretendard",
  },
  {
    name: "Space Grotesk",
    by: "© The Space Grotesk Project Authors (Florian Karsten)",
    use: "확률·D-N·점수 같은 숫자 서체로 써요.",
    license: "SIL Open Font License 1.1",
    href: "https://github.com/floriankarsten/space-grotesk",
  },
  {
    name: "Lucide",
    by: "© Lucide Contributors",
    use: "화면의 기본 아이콘 모양을 참고했어요.",
    license: "ISC License",
    href: "https://lucide.dev/license",
  },
  {
    name: "Simple Icons",
    by: "Simple Icons Collaborators",
    use: "공유 메뉴의 SNS 아이콘 모양을 썼어요. 각 로고는 해당 회사의 상표예요.",
    license: "CC0 1.0",
    href: "https://simpleicons.org",
  },
];

export default function LicensesPage() {
  return (
    <PageShell narrow>
      <h1 className="t-heading-1 md:t-title-3">라이선스</h1>
      <p className="mt-2 t-body-2 text-label-neutral">
        예감은 아래 자료를 각 라이선스 조건에 따라 사용하고 있어요.
      </p>
      <ul className={`${card} mt-6 divide-y divide-line-alt`}>
        {ITEMS.map((it) => (
          <li key={it.name} className="px-5 py-4">
            <p className="t-body-1 !font-bold">
              {it.name}{" "}
              <span className="t-caption-1 !font-medium text-label-alt">
                {it.by}
              </span>
            </p>
            <p className="mt-1 t-body-3 text-label-neutral">{it.use}</p>
            <a
              href={it.href}
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 inline-block t-caption-1 !font-semibold text-primary underline"
            >
              {it.license}
            </a>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
