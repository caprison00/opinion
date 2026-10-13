export default function Loading() {
  return (
    <main className="mx-auto max-w-md animate-pulse px-4 pt-16">
      <div className="h-7 w-40 rounded-lg bg-gray-100" />
      <div className="mt-6 flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-gray-100" />
        ))}
      </div>
    </main>
  );
}
