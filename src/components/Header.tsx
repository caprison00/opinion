import Link from "next/link";
import { getViewer } from "@/lib/auth";

export default async function Header() {
  const { user, isAdmin } = await getViewer();

  return (
    <header className="sticky top-0 z-10 -mx-4 mb-2 flex items-center justify-between bg-white/95 px-4 py-3 backdrop-blur">
      <Link href="/" className="flex items-center gap-2 text-xl font-bold">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-sm text-white">
          예
        </span>
        예감
      </Link>
      <nav className="flex items-center gap-3 text-sm">
        {isAdmin && (
          <Link
            href="/admin"
            className="rounded-full bg-indigo-50 px-3 py-1 font-medium text-indigo-600"
          >
            관리자
          </Link>
        )}
        {user ? (
          <form action="/auth/signout" method="post">
            <button className="text-gray-400">로그아웃</button>
          </form>
        ) : (
          <Link
            href="/login"
            className="rounded-full bg-gray-900 px-3 py-1 font-medium text-white"
          >
            로그인
          </Link>
        )}
      </nav>
    </header>
  );
}
