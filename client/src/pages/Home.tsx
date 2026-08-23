import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowRight, BellRing, MapPinned, ShieldCheck, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import { postAuthPathForRole, workspaceForRole } from "../../../shared/roleRouting";
import { useEffect } from "react";

/**
 * All content in this page are only for example, replace with your own feature implementation
 * When building pages, remember your instructions in Frontend Workflow, Frontend Best Practices, Design Guide and Common Pitfalls
 */
export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (loading || !user) return;
    const requestedRole = sessionStorage.getItem("cityresolve-requested-role");
    if (!requestedRole) return;
    const path = postAuthPathForRole(requestedRole, user.role);
    if (path === workspaceForRole(user.role)) sessionStorage.removeItem("cityresolve-requested-role");
    setLocation(path);
  }, [loading, setLocation, user]);
  const goToWorkspace = () => {
    if (!user) return setLocation("/sign-in");
    setLocation(workspaceForRole(user.role));
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#f7f8f6] text-[#15372e]">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <button onClick={() => setLocation("/")} className="flex items-center gap-3 text-left">
          <span className="grid h-10 w-10 place-items-center rounded-[1rem] bg-[#146c50] text-white shadow-lg shadow-[#146c50]/20"><MapPinned className="h-5 w-5" /></span>
          <span className="font-display text-2xl tracking-[-.04em]">CityResolve</span>
        </button>
        <Button onClick={goToWorkspace} variant="outline" className="rounded-xl border-[#cddbd2] bg-white px-4 text-[#20543f] hover:bg-[#edf5f0]">{user ? "Open workspace" : "Sign in"}</Button>
      </nav>
      <main className="mx-auto max-w-7xl px-5 pb-16 pt-12 sm:px-8 lg:pt-20">
        <section className="relative grid gap-12 lg:grid-cols-[1.08fr_.92fr] lg:items-center">
          <div className="rise-in">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#cfe3d5] bg-[#edf7f0] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.14em] text-[#276c51]"><Sparkles className="h-3.5 w-3.5" /> Civic service, considered</p>
            <h1 className="mt-6 max-w-3xl font-display text-5xl leading-[.99] tracking-[-.06em] text-[#15372e] sm:text-6xl lg:text-7xl">A clearer path from <em className="font-normal text-[#27765a]">report</em> to resolution.</h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[#5e7066]">CityResolve brings citizens, field teams, and city leaders into one calm, accountable service experience.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button onClick={goToWorkspace} size="lg" className="h-12 rounded-xl bg-[#146c50] px-6 text-base shadow-lg shadow-[#146c50]/20 hover:bg-[#0e583f]">{user ? "Continue to workspace" : "Choose sign in"}<ArrowRight className="ml-2 h-4 w-4" /></Button>
              <Link href="/sign-in/citizen"><Button size="lg" variant="outline" className="h-12 rounded-xl border-[#cddbd2] bg-white px-6 text-base text-[#20543f] hover:bg-[#edf5f0]">Citizen sign in</Button></Link>
            </div>
          </div>
          <div className="rise-in relative rounded-[2rem] border border-[#d9e4dc] bg-[#e8f1eb] p-4 shadow-[0_30px_80px_-48px_rgba(17,61,45,.52)]" style={{ animationDelay: "80ms" }}>
            <div className="rounded-[1.45rem] bg-[#153d32] p-6 text-white sm:p-8">
              <div className="flex items-center justify-between"><span className="font-mono text-[11px] tracking-[.12em] text-[#b5d4c3]">CITY SERVICE FLOW</span><span className="h-2.5 w-2.5 rounded-full bg-[#9ae0b5]" /></div>
              <div className="mt-10 rounded-2xl bg-white/[.09] p-5 backdrop-blur"><p className="text-sm font-medium text-[#d9eee0]">One connected case history</p><p className="mt-2 font-display text-3xl leading-tight">Every handoff, visible.</p><div className="mt-7 flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#e6b85c]" /><span className="h-px flex-1 bg-white/25" /><span className="h-2.5 w-2.5 rounded-full bg-[#8fbffb]" /><span className="h-px flex-1 bg-white/25" /><span className="h-2.5 w-2.5 rounded-full bg-[#92dbaa]" /></div><div className="mt-3 grid grid-cols-3 text-[10px] font-semibold uppercase tracking-wider text-[#bcd9c8]"><span>Pending</span><span className="text-center">In Progress</span><span className="text-right">Resolved</span></div></div>
              <div className="mt-4 grid grid-cols-2 gap-4"><div className="rounded-2xl bg-white/[.08] p-4"><ShieldCheck className="h-5 w-5 text-[#9ae0b5]" /><p className="mt-3 text-sm font-medium">Role-secure workspaces</p></div><div className="rounded-2xl bg-white/[.08] p-4"><BellRing className="h-5 w-5 text-[#e9c46a]" /><p className="mt-3 text-sm font-medium">Clear notifications</p></div></div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
