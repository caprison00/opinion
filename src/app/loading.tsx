import { container } from "@/components/ui";

export default function Loading() {
  return (
    <main className={`${container} animate-pulse pt-20 md:pt-28`}>
      <div className="h-7 w-40 rounded-lg bg-fill" />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-44 rounded-[18px] bg-fill" />
        ))}
      </div>
    </main>
  );
}
