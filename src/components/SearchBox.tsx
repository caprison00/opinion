import { SearchIcon } from "./icons";

// 검색창: /search 로 보낸다 (자바스크립트 없이도 동작)
export default function SearchBox({
  q = "",
  hidden,
  autoFocus,
  compact,
}: {
  q?: string;
  hidden?: Record<string, string>; // 검색 화면에서 지금 탭·걸러보기를 유지
  autoFocus?: boolean;
  compact?: boolean; // PC 상단 메뉴줄용 작은 검색창 (Enter로 검색)
}) {
  if (compact) {
    return (
      <form action="/search" role="search" className="relative">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-label-alt" />
        <input
          type="search"
          name="q"
          maxLength={50}
          aria-label="검색어"
          placeholder="질문, 이슈, 닉네임, 댓글 검색"
          className="h-10 w-60 rounded-full border border-line-neutral bg-surface pl-10 pr-4 t-label-1 text-label outline-none transition-[width,border-color] placeholder:text-label-assist focus:w-72 focus:border-brand focus:ring-2 focus:ring-brand/20 lg:w-72 lg:focus:w-80"
        />
      </form>
    );
  }
  return (
    <form action="/search" role="search" className="relative">
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-label-alt" />
      <input
        type="search"
        name="q"
        defaultValue={q}
        maxLength={50}
        autoFocus={autoFocus}
        aria-label="검색어"
        placeholder="질문, 이슈, 닉네임, 댓글 검색"
        className="h-12 w-full rounded-full border border-line-neutral bg-surface pl-11 pr-24 t-body-2 text-label shadow-small outline-none transition-colors placeholder:text-label-assist focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
      <button className="absolute right-1.5 top-1/2 h-9 -translate-y-1/2 rounded-full bg-brand px-4 t-label-1 !font-bold text-white transition-colors hover:bg-brand-strong">
        검색
      </button>
    </form>
  );
}
