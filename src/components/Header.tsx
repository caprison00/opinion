import Link from "next/link";
import { getViewer } from "@/lib/auth";
import Logo from "./Logo";
import NavLinks from "./NavLinks";
import { button, container } from "./ui";

export default async function Header() {
  const { user, isAdmin } = await getViewer();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur-md">
      <div
        className={`${container} flex h-[52px] items-center justify-between md:h-16`}
      >
        <div className="flex items-center gap-6">
          <Logo />
          <NavLinks isAdmin={isAdmin} />
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-full bg-accent-blue px-3 py-1 t-label-2 !font-semibold text-primary md:hidden"
            >
              관리자
            </Link>
          )}
          {user ? (
            <form action="/auth/signout" method="post">
              <button className="rounded-lg px-2 py-1.5 t-label-1 text-label-alt transition-colors hover:bg-fill">
                로그아웃
              </button>
            </form>
          ) : (
            <Link href="/login" className={button.smallPrimary}>
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
