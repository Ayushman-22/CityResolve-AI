export const APP_ROLES = ["citizen", "officer", "admin"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_WORKSPACE_PATH: Record<AppRole, string> = {
  citizen: "/citizen",
  officer: "/officer",
  admin: "/admin",
};

export const ROLE_SIGN_IN_PATH: Record<AppRole, string> = {
  citizen: "/sign-in/citizen",
  officer: "/sign-in/officer",
  admin: "/sign-in/admin",
};

export const ROLE_LABEL: Record<AppRole, string> = {
  citizen: "Citizen",
  officer: "Field Officer",
  admin: "Administrator",
};

export function workspaceForRole(role: string | null | undefined) {
  return ROLE_WORKSPACE_PATH[role as AppRole] ?? "/sign-in";
}

export function signInForRole(role: string | null | undefined) {
  return ROLE_SIGN_IN_PATH[role as AppRole] ?? "/sign-in";
}

export function postAuthPathForRole(requestedRole: string | null | undefined, authenticatedRole: string | null | undefined) {
  const requested = APP_ROLES.includes(requestedRole as AppRole) ? (requestedRole as AppRole) : null;
  const authenticated = APP_ROLES.includes(authenticatedRole as AppRole) ? (authenticatedRole as AppRole) : null;
  if (!authenticated) return "/sign-in";
  if (!requested || requested === authenticated) return ROLE_WORKSPACE_PATH[authenticated];
  return ROLE_SIGN_IN_PATH[requested];
}
