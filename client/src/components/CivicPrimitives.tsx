import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { IssuePriority, IssueStatus } from "../../../shared/civic";

const statusStyle: Record<IssueStatus, string> = {
  Pending: "border-[#f2d99c] bg-[#fff7df] text-[#9c6300]",
  "In Progress": "border-[#bfd6ff] bg-[#edf4ff] text-[#1858b5]",
  Resolved: "border-[#bfe6cf] bg-[#eaf8ef] text-[#147344]",
  Closed: "border-[#d7dde3] bg-[#f1f3f5] text-[#52606d]",
};

const priorityStyle: Record<IssuePriority, string> = {
  Low: "bg-[#eff5f1] text-[#46715b]",
  Medium: "bg-[#fff4dc] text-[#9a6400]",
  High: "bg-[#fff0e9] text-[#ba4d1e]",
  Critical: "bg-[#fbe9e8] text-[#aa302b]",
};

export function StatusBadge({ status, className }: { status: IssueStatus; className?: string }) {
  return <Badge variant="outline" className={cn("gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[.01em]", statusStyle[status], className)}><span className="h-1.5 w-1.5 rounded-full bg-current" />{status}</Badge>;
}

export function PriorityBadge({ priority }: { priority: IssuePriority }) {
  return <Badge className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-none", priorityStyle[priority])}>{priority}</Badge>;
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <header className="flex flex-col gap-5 border-b border-[#e5eae6] pb-7 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#62927d]">{eyebrow}</p>
      <h1 className="mt-2 font-display text-3xl tracking-[-.04em] text-[#15372e] sm:text-4xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#617168]">{description}</p>
    </div>
    {action}
  </header>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="rounded-[1.5rem] border border-dashed border-[#cad8d0] bg-white/70 px-7 py-16 text-center">
    <h2 className="font-display text-2xl text-[#21443a]">{title}</h2>
    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6b7a72]">{description}</p>
    {action ? <div className="mt-6">{action}</div> : null}
  </div>;
}

export function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
