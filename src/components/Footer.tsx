import Link from "next/link";
import { container } from "./ui";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-bg-alt pb-24 md:pb-0">
      <div className={`${container} py-8 md:py-10`}>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 t-label-1">
          <Link href="/terms" className="text-label-neutral hover:text-label">
            이용약관
          </Link>
          {/* 개인정보처리방침은 다른 링크와 구분되게 강조한다 (개인정보 보호법 안내 기준) */}
          <Link
            href="/privacy"
            className="!font-bold text-label hover:text-primary"
          >
            개인정보처리방침
          </Link>
        </nav>
        <p className="mt-4 t-caption-1 text-label-alt">
          예감은 돈이나 재화를 걸지 않는 예측 서비스예요. 점수는 표시용이며 어떤
          것으로도 교환할 수 없어요.
        </p>
        <p className="mt-4 t-caption-1 text-label-assist">
          © {year} 예감. All rights reserved.
        </p>
        <p className="mt-1 t-caption-1 text-label-assist">
          UI는 Wanted Design System(© Wanted Lab)을 바탕으로 만들었어요 ·{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/deed.ko"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-label-alt"
          >
            CC BY 4.0
          </a>
        </p>
      </div>
    </footer>
  );
}
