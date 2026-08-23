import { EmptyState, PageHeading, StatusBadge, formatDate } from "@/components/CivicPrimitives";
import { RoleLayout } from "@/components/RoleLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Bell, ClipboardList, Map, Plus, Timer } from "lucide-react";
import { Link } from "wouter";

const citizenNav = [
  { icon: ClipboardList, label: "My reports", path: "/citizen" },
  { icon: Plus, label: "Report an issue", path: "/citizen/report" },
  { icon: Bell, label: "Notifications", path: "/notifications" },
];

export default function CitizenDashboard() {
  const { data: issues = [], isLoading } = trpc.issue.mine.useQuery();
  const counts = { Pending: issues.filter(issue => issue.status === "Pending").length, "In Progress": issues.filter(issue => issue.status === "In Progress").length, Resolved: issues.filter(issue => issue.status === "Resolved").length, Closed: issues.filter(issue => issue.status === "Closed").length };
  return <RoleLayout allowedRoles={["citizen"]} title="CityResolve" navigation={citizenNav}>
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeading eyebrow="Citizen workspace" title="Your service reports" description="Follow every request from submission to closure, with a complete status history in one place." action={<Link href="/citizen/report"><Button className="h-11 rounded-xl bg-[#146c50] hover:bg-[#0e583f]"><Plus className="mr-2 h-4 w-4" />Report an issue</Button></Link>} />
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(counts).map(([status, value]) => <Card key={status} className="border-[#e1e9e3] bg-white shadow-sm"><CardContent className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-[#607168]">{status}</span><span className="font-mono text-xs text-[#89a096]">{String(value).padStart(2, "0")}</span></div><p className="mt-5 font-display text-4xl tracking-[-.05em] text-[#183d32]">{value}</p></CardContent></Card>)}
      </section>
      <section className="rounded-[1.5rem] border border-[#e1e9e3] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#edf1ee] px-6 py-5"><div><h2 className="font-display text-2xl tracking-[-.04em] text-[#1d4437]">Recent reports</h2><p className="mt-1 text-sm text-[#6c7c73]">Your submitted civic issues, ordered by latest activity.</p></div><Map className="h-5 w-5 text-[#78a18d]" /></div>
        {isLoading ? <div className="p-10 text-sm text-[#6c7c73]">Loading your reports…</div> : issues.length === 0 ? <EmptyState title="Nothing reported yet" description="When you notice a local issue, submit a detailed report and we will keep you informed at every stage." action={<Link href="/citizen/report"><Button className="rounded-xl bg-[#146c50] hover:bg-[#0e583f]">Create your first report</Button></Link>} /> : <div className="divide-y divide-[#edf1ee]">{issues.map(issue => <div key={issue.id} className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><span className="font-mono text-xs text-[#7b9286]">{issue.publicId}</span><StatusBadge status={issue.status} /></div><h3 className="mt-2 truncate font-semibold text-[#234438]">{issue.title}</h3><p className="mt-1 text-sm text-[#718078]">{issue.category} · {issue.locationName}</p></div><div className="flex items-center gap-2 text-sm text-[#7c8d83]"><Timer className="h-4 w-4" />Updated {formatDate(issue.updatedAt)}</div></div>)}</div>}
      </section>
    </div>
  </RoleLayout>;
}
