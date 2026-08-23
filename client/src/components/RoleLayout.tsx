import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import type { LucideIcon } from "lucide-react";
import { LockKeyhole, ShieldAlert } from "lucide-react";
import { signInForRole, workspaceForRole } from "../../../shared/roleRouting";
import { useLocation } from "wouter";

export type AppRole = "citizen" | "officer" | "admin";
export type NavigationItem = { icon: LucideIcon; label: string; path: string };

export function RoleLayout({
  allowedRoles,
  title,
  navigation,
  children,
}: {
  allowedRoles: AppRole[];
  title: string;
  navigation: NavigationItem[];
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return <div className="min-h-screen bg-[#f7f8f6]" />;
  }

  if (!user) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f7f8f6] px-6">
        <div className="max-w-md rounded-[2rem] border border-[#dfe5de] bg-white p-10 text-center shadow-[0_28px_70px_-40px_rgba(15,55,45,.38)]">
          <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-[#e5f3ea] text-[#136d4f]"><LockKeyhole className="h-6 w-6" /></div>
          <h1 className="font-display text-3xl text-[#15372e]">Secure civic workspace</h1>
          <p className="mt-3 text-sm leading-6 text-[#607168]">Sign in to access your protected CityResolve workspace.</p>
          <Button onClick={() => setLocation(allowedRoles.length === 1 ? signInForRole(allowedRoles[0]) : "/sign-in")} className="mt-7 w-full rounded-xl bg-[#146c50] hover:bg-[#0e583f]">Choose sign-in</Button>
        </div>
      </div>
    );
  }

  if (!allowedRoles.includes(user.role as AppRole)) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f7f8f6] px-6">
        <div className="max-w-md rounded-[2rem] border border-[#f1d5cf] bg-white p-10 text-center shadow-[0_28px_70px_-40px_rgba(96,27,18,.3)]">
          <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-[#fff0ed] text-[#b54430]"><ShieldAlert className="h-6 w-6" /></div>
          <h1 className="font-display text-3xl text-[#3d241f]">Restricted workspace</h1>
          <p className="mt-3 text-sm leading-6 text-[#6e5a54]">Your current role does not have access to this protected area.</p>
          <Button onClick={() => setLocation(workspaceForRole(user.role))} className="mt-7 w-full rounded-xl bg-[#146c50] hover:bg-[#0e583f]">Open my workspace</Button>
        </div>
      </div>
    );
  }

  return <DashboardLayout title={title} navigation={navigation}>{children}</DashboardLayout>;
}
