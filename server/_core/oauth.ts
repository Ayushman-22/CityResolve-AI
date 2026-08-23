import { COOKIE_NAME, ONE_YEAR_MS, OAUTH_STATE_COOKIE, decodeOAuthState } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  if (process.env.ALLOW_DEV_LOGIN === "true") {
    app.get("/api/dev-login", async (req: Request, res: Response) => {
      const requiredSecret = process.env.DEV_LOGIN_SECRET;

      if (requiredSecret) {
        const suppliedSecret = getQueryParam(req, "secret");

       if (suppliedSecret !== requiredSecret) {
         res.status(403).json({ error: "forbidden" });
         return;
       }
      }

      const role = (getQueryParam(req, "role") ?? "citizen") as
        | "citizen"
        | "officer"
        | "admin";
      const openId = `dev-${role}`;

      await db.upsertUser({
        openId,
        name: `Dev ${role[0].toUpperCase()}${role.slice(1)}`,
        email: `${openId}@example.com`,
        loginMethod: "dev",
        role,
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name: `Dev ${role}`,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      console.log("[DevLogin DEBUG] x-forwarded-proto:", req.headers["x-forwarded-proto"]);
      console.log("[DevLogin DEBUG] req.protocol:", req.protocol);
      console.log("[DevLogin DEBUG] cookieOptions:", JSON.stringify(cookieOptions));
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      console.log("[DevLogin DEBUG] Set-Cookie header sent:", res.getHeader("Set-Cookie"));
      res.redirect(302, "/");
    });
  }
}
