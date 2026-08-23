import { describe, expect, it } from "vitest";
import { ROLE_SIGN_IN_PATH, ROLE_WORKSPACE_PATH, postAuthPathForRole, signInForRole, workspaceForRole } from "../shared/roleRouting";

describe("role-targeted sign-in routing", () => {
  it("maps each CityResolve role to a separate sign-in and protected workspace", () => {
    expect(ROLE_SIGN_IN_PATH.citizen).toBe("/sign-in/citizen");
    expect(ROLE_SIGN_IN_PATH.officer).toBe("/sign-in/officer");
    expect(ROLE_SIGN_IN_PATH.admin).toBe("/sign-in/admin");
    expect(ROLE_WORKSPACE_PATH.citizen).toBe("/citizen");
    expect(ROLE_WORKSPACE_PATH.officer).toBe("/officer");
    expect(ROLE_WORKSPACE_PATH.admin).toBe("/admin");
  });

  it("does not route unknown roles into a protected workspace", () => {
    expect(workspaceForRole("unknown")).toBe("/sign-in");
    expect(signInForRole("unknown")).toBe("/sign-in");
  });

  it("returns a matching account to its selected workspace after authentication", () => {
    expect(postAuthPathForRole("citizen", "citizen")).toBe("/citizen");
    expect(postAuthPathForRole("officer", "officer")).toBe("/officer");
    expect(postAuthPathForRole("admin", "admin")).toBe("/admin");
  });

  it("returns a wrong-role account to the requested sign-in page for a clear mismatch message", () => {
    expect(postAuthPathForRole("admin", "citizen")).toBe("/sign-in/admin");
    expect(postAuthPathForRole("officer", "admin")).toBe("/sign-in/officer");
  });
});
