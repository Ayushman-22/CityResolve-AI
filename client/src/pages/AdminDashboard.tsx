import { EmptyState, PageHeading, PriorityBadge, StatusBadge, formatDate } from "@/components/CivicPrimitives";
import { RoleLayout } from "@/components/RoleLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { ISSUE_CATEGORIES, ISSUE_PRIORITIES, ISSUE_STATUSES, type IssueCategory, type IssuePriority, type IssueStatus } from "../../../shared/civic";
import { BarChart3, Bell, ChevronDown, Clock3, Map, Search, ShieldCheck, TrendingUp, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const adminNav = [
  { icon: ShieldCheck, label: "Operations", path: "/admin" },
  { icon: Map, label: "Issue map", path: "/admin/map" },
  { icon: Bell, label: "Notifications", path: "/notifications" },
];

export default function AdminDashboard() {
  const { data: issues = [], isLoading } = trpc.admin.list.useQuery();
  const { data: officers = [] } = trpc.admin.officers.useQuery();
  const { data: analytics } = trpc.admin.analytics.useQuery();
  const utils = trpc.useUtils();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | IssueStatus>("All");
  const [categoryFilter, setCategoryFilter] = useState<"All" | IssueCategory>("All");
  const [wardFilter, setWardFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");
  const update = trpc.admin.update.useMutation({
    onSuccess: () => { utils.admin.list.invalidate(); utils.admin.analytics.invalidate(); toast.success("Issue management update saved."); },
    onError: error => toast.error(error.message),
  });
  const assign = trpc.admin.assign.useMutation({
    onSuccess: () => { utils.admin.list.invalidate(); utils.admin.analytics.invalidate(); toast.success("Field officer assigned and notified."); },
    onError: error => toast.error(error.message),
  });
  const wards = useMemo(() => ["All", ...Array.from(new Set(issues.map(issue => issue.ward)))], [issues]);
  const dates = useMemo(() => ["All", ...Array.from(new Set(issues.map(issue => new Date(issue.createdAt).toISOString().slice(0, 10))))], [issues]);
  const visibleIssues = useMemo(() => issues.filter(issue => {
    const searchTarget = `${issue.publicId} ${issue.title} ${issue.category} ${issue.locationName}`.toLowerCase();
    return (statusFilter === "All" || issue.status === statusFilter)
      && (categoryFilter === "All" || issue.category === categoryFilter)
      && (wardFilter === "All" || issue.ward === wardFilter)
      && (dateFilter === "All" || new Date(issue.createdAt).toISOString().slice(0, 10) === dateFilter)
      && searchTarget.includes(query.toLowerCase());
  }), [issues, statusFilter, categoryFilter, wardFilter, dateFilter, query]);

  return <RoleLayout allowedRoles={["admin"]} title="City Operations" navigation={adminNav}>
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeading eyebrow="Administrator command center" title="Service operations" description="See the full service picture, guide field work, and keep every issue moving with accountability." action={<Link href="/admin/map"><Button variant="outline" className="h-11 rounded-xl border-[#cddbd2] bg-white text-[#20543f] hover:bg-[#edf5f0]"><Map className="mr-2 h-4 w-4" />Open map</Button></Link>} />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={BarChart3} label="All issues" value={analytics?.total ?? 0} tone="green" />
        <Metric icon={Clock3} label="In progress" value={analytics?.inProgress ?? 0} tone="blue" />
        <Metric icon={ShieldCheck} label="Resolved / Closed" value={analytics?.resolved ?? 0} tone="green" />
        <Metric icon={UsersRound} label="Avg. resolution" value={`${analytics?.avgResolutionHours ?? 0}h`} tone="amber" />
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        <AnalyticsCard title="Issue volume trend" description="Reports opened across the last six calendar months." icon={TrendingUp}>
          <ResponsiveContainer width="100%" height="100%"><LineChart data={analytics?.trends ?? []} margin={{ left: -18, right: 10, top: 8 }}><CartesianGrid vertical={false} stroke="#edf2ee" /><XAxis dataKey="month" tick={{ fill: "#718078", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: "#718078", fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip cursor={{ stroke: "#cfe3d5" }} /><Line dataKey="issues" type="monotone" stroke="#247455" strokeWidth={3} dot={{ r: 3, fill: "#247455" }} /></LineChart></ResponsiveContainer>
        </AnalyticsCard>
        <AnalyticsCard title="Officer performance" description="Assigned requests compared with completed field work." icon={UsersRound}>
          {analytics?.officerPerformance.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.officerPerformance} margin={{ left: -18, right: 5, top: 8 }}><CartesianGrid vertical={false} stroke="#edf2ee" /><XAxis dataKey="officer" tick={{ fill: "#718078", fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: "#718078", fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: "#f1f7f2" }} /><Bar dataKey="assigned" fill="#9bc8ae" radius={[5, 5, 0, 0]} /><Bar dataKey="resolved" fill="#247455" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer> : <div className="grid h-full place-items-center text-center text-sm leading-6 text-[#789087]">Performance analytics appear after a verified officer is assigned a request.</div>}
        </AnalyticsCard>
      </section>
      <section className="overflow-hidden rounded-[1.5rem] border border-[#e1e9e3] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#edf1ee] p-5">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center"><div><h2 className="font-display text-2xl tracking-[-.04em] text-[#214538]">Issue management</h2><p className="mt-1 text-sm text-[#718078]">Search, filter, prioritize, and assign service requests.</p></div><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#829188]" /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search issues" className="h-10 w-full rounded-xl border-[#dbe5de] pl-9 sm:w-64" /></div></div>
          <div className="flex flex-wrap gap-2"><FilterSelect value={statusFilter} onChange={value => setStatusFilter(value as "All" | IssueStatus)} options={["All", ...ISSUE_STATUSES]} label="Status" /><FilterSelect value={categoryFilter} onChange={value => setCategoryFilter(value as "All" | IssueCategory)} options={["All", ...ISSUE_CATEGORIES]} label="Category" /><FilterSelect value={wardFilter} onChange={setWardFilter} options={wards} label="Ward" /><FilterSelect value={dateFilter} onChange={setDateFilter} options={dates} label="Report date" /></div>
        </div>
        {isLoading ? <div className="p-8 text-sm text-[#6c7c73]">Loading operations…</div> : visibleIssues.length === 0 ? <EmptyState title="No matching issues" description="Adjust your search or filters to see another section of the service queue." /> : <div className="divide-y divide-[#edf1ee]">{visibleIssues.map(issue => <article key={issue.id} className="p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs text-[#7b9286]">{issue.publicId}</span><StatusBadge status={issue.status} /><PriorityBadge priority={issue.priority} /></div><h3 className="mt-2 font-semibold text-[#28463b]">{issue.title}</h3><p className="mt-1 text-sm text-[#718078]">{issue.category} · {issue.ward} · {issue.locationName} · Reported {formatDate(issue.createdAt)}</p></div><div className="grid gap-2 sm:grid-cols-3 xl:w-[520px]"><select value={issue.status} onChange={event => update.mutate({ publicId: issue.publicId, status: event.target.value as IssueStatus, priority: issue.priority })} disabled={update.isPending} className="h-10 rounded-xl border border-[#dce6df] bg-white px-2 text-xs text-[#395e4d]">{ISSUE_STATUSES.map(status => <option key={status}>{status}</option>)}</select><select value={issue.priority} onChange={event => update.mutate({ publicId: issue.publicId, status: issue.status, priority: event.target.value as IssuePriority })} disabled={update.isPending} className="h-10 rounded-xl border border-[#dce6df] bg-white px-2 text-xs text-[#395e4d]">{ISSUE_PRIORITIES.map(priority => <option key={priority}>{priority}</option>)}</select><select defaultValue="" onChange={event => event.target.value && assign.mutate({ publicId: issue.publicId, officerId: Number(event.target.value), priority: issue.priority })} disabled={assign.isPending || officers.length === 0} className="h-10 rounded-xl border border-[#dce6df] bg-white px-2 text-xs text-[#395e4d]"><option value="">{officers.length ? "Assign officer" : "No officers available"}</option>{officers.map(officer => <option key={officer.id} value={officer.id}>{officer.name || officer.email || `Officer #${officer.id}`}</option>)}</select></div></div></article>)}</div>}
      </section>
    </div>
  </RoleLayout>;
}

function Metric({ icon: Icon, label, value, tone }: { icon: typeof BarChart3; label: string; value: string | number; tone: "green" | "blue" | "amber" }) {
  const color = { green: "bg-[#e9f6ed] text-[#247852]", blue: "bg-[#edf4ff] text-[#346abe]", amber: "bg-[#fff5de] text-[#a16b0c]" }[tone];
  return <Card className="border-[#e1e9e3] bg-white shadow-sm"><CardContent className="flex items-start justify-between p-5"><div><p className="text-sm text-[#6d7e74]">{label}</p><p className="mt-4 font-display text-4xl tracking-[-.05em] text-[#183d32]">{value}</p></div><span className={`grid h-9 w-9 place-items-center rounded-xl ${color}`}><Icon className="h-4.5 w-4.5" /></span></CardContent></Card>;
}

function AnalyticsCard({ title, description, icon: Icon, children }: { title: string; description: string; icon: typeof BarChart3; children: React.ReactNode }) {
  return <Card className="border-[#e1e9e3] bg-white shadow-sm"><CardContent className="p-6"><div className="flex items-center justify-between"><div><h2 className="font-display text-2xl tracking-[-.04em] text-[#214538]">{title}</h2><p className="mt-1 text-sm text-[#718078]">{description}</p></div><Icon className="h-5 w-5 text-[#76a18a]" /></div><div className="mt-5 h-56">{children}</div></CardContent></Card>;
}

function FilterSelect({ value, onChange, options, label }: { value: string; onChange: (value: string) => void; options: string[]; label: string }) {
  return <div className="relative"><select aria-label={label} value={value} onChange={event => onChange(event.target.value)} className="h-10 appearance-none rounded-xl border border-[#dbe5de] bg-white py-0 pl-3 pr-8 text-xs text-[#476357]">{options.map(option => <option key={option}>{option}</option>)}</select><ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-3.5 w-3.5 text-[#829188]" /></div>;
}
