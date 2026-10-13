import Link from "next/link";

export default function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="예감 홈">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary t-label-1 !font-bold text-white">
        예
      </span>
      <span className="t-heading-2">예감</span>
    </Link>
  );
}
