import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { verifyJwt } from "../utils/jwt";
import type { Env } from "../env";

export type AuthEnv = {
  Variables: {
    userId: bigint;
    userEmail: string;
  };
  Bindings: Env;
};

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const token = getCookie(c, "token");

  if (!token) {
    return c.json({ error: "errors.not_authenticated" }, 401);
  }

  const payload = await verifyJwt(token, c.env.JWT_SECRET);

  if (!payload) {
    return c.json({ error: "errors.token_invalid" }, 401);
  }

  c.set("userId", BigInt(payload.sub));
  c.set("userEmail", payload.email);

  await next();
});