import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import {
  ROLE_LABEL,
  ROLE_SIGN_IN_PATH,
  ROLE_WORKSPACE_PATH,
  type AppRole,
} from "../../../shared/roleRouting";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CircleUserRound,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";

const roleCards: Record<
  AppRole,
  {
    icon: typeof CircleUserRound;
    eyebrow: string;
    title: string;
    description: string;
    accent: string;
  }
> = {
  citizen: {
    icon: CircleUserRound,
    eyebrow: "Community access",
    title: "Citizen sign in",
    description:
      "Report local issues, track their progress, and receive service updates.",
    accent: "bg-[#e9f6ed] text-[#1d7750]",
  },
  officer: {
    icon: Wrench,
    eyebrow: "Field operations",
    title: "Officer sign in",
    description:
      "Open your assigned queue, document work, and mark field resolution.",
    accent: "bg-[#edf4ff] text-[#3168bb]",
  },
  admin: {
    icon: ShieldCheck,
    eyebrow: "Civic management",
    title: "Administrator sign in",
    description:
      "Manage operations, assignments, analytics, and citywide service activity.",
    accent: "bg-[#fff3df] text-[#a66c08]",
  },
};

export function RoleSignIn({
  requestedRole,
}: {
  requestedRole: AppRole;
}) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  const role = roleCards[requestedRole];
  const Icon = role.icon;

  useEffect(() => {
  if (loading) return;

  if (user?.role === requestedRole) {
    sessionStorage.removeItem("cityresolve-requested-role");
    setLocation(ROLE_WORKSPACE_PATH[requestedRole]);
  }
}, [loading, requestedRole, setLocation, user?.role]);

  const beginSignIn = () => {
    sessionStorage.setItem(
      "cityresolve-requested-role",
      requestedRole
    );

    startLogin(requestedRole);
  };

  const signedInAsDifferentRole =
    !loading && !!user && user.role !== requestedRole;

  return (
    <SignInFrame>
      <Link
        href="/sign-in"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#63746b] transition-colors hover:text-[#1c5b43]"
      >
        <ArrowLeft className="h-4 w-4" />
        All sign-in options
      </Link>

      <div className="mt-10 rounded-[2rem] border border-[#dce7df] bg-white p-8 shadow-[0_32px_80px_-48px_rgba(15,55,45,.45)] sm:p-10">
        <div
          className={`grid h-12 w-12 place-items-center rounded-2xl ${role.accent}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <p className="mt-7 text-[11px] font-bold uppercase tracking-[.17em] text-[#6d907d]">
          {role.eyebrow}
        </p>

        <h1 className="mt-2 font-display text-4xl tracking-[-.05em] text-[#173a2f]">
          {role.title}
        </h1>

        <p className="mt-3 max-w-md text-sm leading-6 text-[#65766d]">
          {role.description}
        </p>

        {loading ? (
          <p className="mt-8 text-sm text-[#718278]">
            Checking your secure session…
          </p>
        ) : signedInAsDifferentRole ? (
          <div className="mt-8 rounded-xl border border-[#f0d9c0] bg-[#fff8ed] p-4">
            <p className="font-semibold text-[#825818]">
              You are already signed in.
            </p>

            <p className="mt-1 text-sm leading-6 text-[#806947]">
              Current account:{" "}
              <strong>
                {ROLE_LABEL[user!.role as AppRole]}
              </strong>
              .
            </p>

            <p className="mt-1 text-sm leading-6 text-[#806947]">
              To enter the{" "}
              <strong>{ROLE_LABEL[requestedRole]}</strong> workspace,
              sign out first and then sign in again.
            </p>

            <div className="mt-4 grid gap-2">
              <Button
                onClick={async () => {
                  try {
                    const response = await fetch(
                      "/api/trpc/auth.logout",
                      {
                        method: "POST",
                        headers: {
                          "content-type": "application/json",
                        },
                        body: JSON.stringify({}),
                      }
                    );

                    if (!response.ok) {
                      throw new Error("Logout failed");
                    }

                    window.location.href =
                      ROLE_SIGN_IN_PATH[requestedRole];
                  } catch (error) {
                    console.error("Logout failed:", error);
                    window.location.reload();
                  }
                }}
                className="h-10 w-full rounded-xl bg-[#146c50] text-white hover:bg-[#0e583f]"
              >
                Sign out and continue as{" "}
                {ROLE_LABEL[requestedRole]}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <Button
                onClick={() =>
                  setLocation(
                    ROLE_WORKSPACE_PATH[user!.role as AppRole]
                  )
                }
                variant="outline"
                className="h-10 w-full rounded-xl"
              >
                Open my{" "}
                {ROLE_LABEL[user!.role as AppRole]} workspace
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={beginSignIn}
            className="mt-8 h-12 w-full rounded-xl bg-[#146c50] text-base hover:bg-[#0e583f]"
          >
            Continue as {ROLE_LABEL[requestedRole]}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}

        {!user && !loading && (
          <p className="mt-4 text-center text-xs leading-5 text-[#7b8c83]">
            Your account role is checked after secure authentication.
            The role-specific entry point does not change your account
            permissions.
          </p>
        )}
      </div>
    </SignInFrame>
  );
}

export function SignInChooser() {
  return (
    <SignInFrame>
      <div className="text-center">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-[#e8f5eb] text-[#187250]">
          <Building2 className="h-5 w-5" />
        </span>

        <p className="mt-5 text-[11px] font-bold uppercase tracking-[.17em] text-[#6d907d]">
          CityResolve access
        </p>

        <h1 className="mt-2 font-display text-4xl tracking-[-.05em] text-[#173a2f]">
          Choose your workspace
        </h1>

        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#65766d]">
          Select the sign-in path that matches your CityResolve account role.
        </p>
      </div>

      <div className="mt-9 grid gap-3">
        <RoleChoice role="citizen" />
        <RoleChoice role="officer" />
        <RoleChoice role="admin" />
      </div>
    </SignInFrame>
  );
}

function RoleChoice({ role }: { role: AppRole }) {
  const item = roleCards[role];
  const Icon = item.icon;

  return (
    <Link
      href={ROLE_SIGN_IN_PATH[role]}
      className="group flex items-center gap-4 rounded-2xl border border-[#dce7df] bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#afd0bb] hover:shadow-[0_18px_40px_-28px_rgba(20,108,80,.45)]"
    >
      <span
        className={`grid h-11 w-11 place-items-center rounded-xl ${item.accent}`}
      >
        <Icon className="h-5 w-5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-[#25463a]">
          {ROLE_LABEL[role]}
        </span>

        <span className="mt-0.5 block truncate text-sm text-[#738278]">
          {item.description}
        </span>
      </span>

      <ArrowRight className="h-4 w-4 text-[#83a392] transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function SignInFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f7f8f6] px-5 py-8 sm:grid sm:place-items-center sm:p-8">
      <div className="mx-auto w-full max-w-xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-display text-2xl tracking-[-.04em] text-[#173a2f]"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#146c50] text-white">
            <Building2 className="h-4.5 w-4.5" />
          </span>
          CityResolve
        </Link>

        <div className="mt-10">{children}</div>
      </div>
    </main>
  );
}

