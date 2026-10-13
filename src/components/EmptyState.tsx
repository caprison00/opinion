import { InboxIcon } from "./icons";

export default function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-bg-alt py-16 text-label-assist">
      <InboxIcon className="h-8 w-8" strokeWidth={1.5} />
      <p className="t-label-1 text-label-alt">{message}</p>
    </div>
  );
}
