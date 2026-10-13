import Link from "next/link";
import { getViewer } from "@/lib/auth";

export default async function Header() {
  const { user, isAdmin } = await getViewer();

  return (
    <header className="flex items-center justify-between py-4">
      <Link href="/" className="text-2xl font-bold">
        예감
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        {isAdmin && (
          <Link href="/admin" className="font-medium text-blue-600">
            관리자
          </Link>
        )}
        {user ? (
          <form action="/auth/signout" method="post">
            <button className="text-gray-500 underline">로그아웃</button>
          </form>
        ) : (
          <Link href="/login" className="font-medium underline">
            로그인
          </Link>
        )}
      </nav>
    </header>
  );
}
