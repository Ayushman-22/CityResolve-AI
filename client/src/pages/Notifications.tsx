import { EmptyState, PageHeading, formatDate } from "@/components/CivicPrimitives";
import { RoleLayout, type AppRole, type NavigationItem } from "@/components/RoleLayout";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Bell, ClipboardList, Map, ShieldCheck, Wrench } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

const navByRole: Record<AppRole, NavigationItem[]> = {
  citizen: [{ icon: ClipboardList, label: "My reports", path: "/citizen" }, { icon: Bell, label: "Notifications", path: "/notifications" }],
  officer: [{ icon: Wrench, label: "Field queue", path: "/officer" }, { icon: Bell, label: "Notifications", path: "/notifications" }],
  admin: [{ icon: ShieldCheck, label: "Operations", path: "/admin" }, { icon: Map, label: "Issue map", path: "/admin/map" }, { icon: Bell, label: "Notifications", path: "/notifications" }],
};

export default function Notifications() {
  const { user } = useAuth();
  const role = (user?.role ?? "citizen") as AppRole;
  const { data: notifications = [], isLoading } = trpc.notification.mine.useQuery(undefined, { enabled: Boolean(user) });
  const utils = trpc.useUtils();
  const markRead = trpc.notification.markRead.useMutation({ onSuccess: () => utils.notification.mine.invalidate() });
  return <RoleLayout allowedRoles={["citizen", "officer", "admin"]} title="CityResolve" navigation={navByRole[role]}><div className="mx-auto max-w-4xl space-y-8"><PageHeading eyebrow="Notification center" title="Service updates" description="Stay informed when an issue moves forward or a new field assignment is ready." />{isLoading ? <div className="rounded-2xl bg-white p-8 text-sm text-[#6c7c73]">Loading notifications…</div> : notifications.length === 0 ? <EmptyState title="You are all caught up" description="New issue updates and assignments will appear here." /> : <section className="overflow-hidden rounded-[1.5rem] border border-[#e1e9e3] bg-white shadow-sm">{notifications.map(notification => <article key={notification.id} className={`flex gap-4 border-b border-[#edf1ee] p-5 last:border-0 ${notification.isRead ? "" : "bg-[#f4faf6]"}`}><div className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${notification.kind === "assignment" ? "bg-[#e9f1ff] text-[#275da6]" : "bg-[#e8f6ed] text-[#22734b]"}`}><Bell className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold text-[#28463b]">{notification.title}</h2><span className="text-xs text-[#829188]">{formatDate(notification.createdAt)}</span></div><p className="mt-1 text-sm leading-6 text-[#6e7c74]">{notification.content}</p></div>{!notification.isRead && <Button size="sm" variant="ghost" onClick={() => markRead.mutate({ id: notification.id })} className="h-8 text-xs text-[#39745a]">Mark read</Button>}</article>)}</section>}</div></RoleLayout>;
}

