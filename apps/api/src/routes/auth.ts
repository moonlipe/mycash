import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { users, accounts, categories } from "@mycash/database/schema";
import { hashPassword, verifyPassword } from "../utils/crypto";
import { signJwt, verifyResetToken, signResetToken } from "../utils/jwt";
import { newId } from "../utils/id";
import { encodeId } from "../utils/hashid";
import { authMiddleware, type AuthEnv } from "../middleware/auth";
import { createEmailService, passwordResetEmail } from "@mycash/email";

async function verifyTurnstile(token: string, secret: string): Promise<boolean> {
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, response: token }),
  });
  const data = (await res.json()) as { success: boolean };
  return data.success === true;
}

const auth = new Hono<AuthEnv>();

auth.post("/register", async (c) => {
  const { email, password, turnstileToken } = await c.req.json<{
    email: string;
    password: string;
    turnstileToken?: string;
  }>();

  if (c.env.ENVIRONMENT === "production") {
    if (!turnstileToken || !c.env.TURNSTILE_SECRET_KEY) {
      return c.json({ error: "errors.turnstile_required" }, 400);
    }
    const valid = await verifyTurnstile(turnstileToken, c.env.TURNSTILE_SECRET_KEY);
    if (!valid) {
      return c.json({ error: "errors.turnstile_failed" }, 400);
    }
  }

  if (!email || !password) {
    return c.json({ error: "errors.email_password_required" }, 400);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return c.json({ error: "errors.invalid_email" }, 400);
  }

  if (password.length < 8) {
    return c.json({ error: "errors.password_too_short" }, 400);
  }

  const db = drizzle(c.env.DB);
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .get();

  if (existing) {
    return c.json({ error: "errors.email_already_exists" }, 409);
  }

  const passwordHash = await hashPassword(password);
  const userId = newId();
  const now = new Date();

  const accountId = newId();
  const incomeCategoryId = newId();
  const expenseCategoryId = newId();

  await db.batch([
    db.insert(users).values({
      id: userId,
      email: normalizedEmail,
      passwordHash,
      status: "active",
      createdAt: now,
      updatedAt: now,
    }),
    db.insert(accounts).values({
      id: accountId,
      userId,
      name: "CAIXA",
      type: "cash",
      color: "#3b82f6",
      initialBalance: 0,
      currency: "BRL",
      createdAt: now,
      updatedAt: now,
    }),
    db.insert(categories).values({
      id: incomeCategoryId,
      userId,
      name: "RECEITAS",
      type: "income",
      color: "#22c55e",
      icon: "trending-up",
      createdAt: now,
      updatedAt: now,
    }),
    db.insert(categories).values({
      id: expenseCategoryId,
      userId,
      name: "DESPESAS",
      type: "expense",
      color: "#ef4444",
      icon: "trending-down",
      createdAt: now,
      updatedAt: now,
    }),
  ]);

  const token = await signJwt(
    { sub: userId.toString(), email: normalizedEmail },
    c.env.JWT_SECRET
  );

  setCookie(c, "token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  const salt = c.env.HASHIDS_SALT;

  return c.json(
    {
      user: {
        id: encodeId(userId, salt),
        email: normalizedEmail,
      },
    },
    201
  );
});

auth.post("/login", async (c) => {
  const { email, password, turnstileToken } = await c.req.json<{
    email: string;
    password: string;
    turnstileToken?: string;
  }>();

  if (c.env.ENVIRONMENT === "production") {
    if (!turnstileToken || !c.env.TURNSTILE_SECRET_KEY) {
      return c.json({ error: "errors.turnstile_required" }, 400);
    }
    const valid = await verifyTurnstile(turnstileToken, c.env.TURNSTILE_SECRET_KEY);
    if (!valid) {
      return c.json({ error: "errors.turnstile_failed" }, 400);
    }
  }

  if (!email || !password) {
    return c.json({ error: "errors.email_password_required" }, 400);
  }

  const db = drizzle(c.env.DB);
  const normalizedEmail = email.toLowerCase().trim();

  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .get();

  if (!user || user.deletedAt !== null) {
    return c.json({ error: "errors.invalid_credentials" }, 401);
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid) {
    return c.json({ error: "errors.invalid_credentials" }, 401);
  }

  const now = new Date();
  await db
    .update(users)
    .set({ lastLoginAt: now, updatedAt: now })
    .where(eq(users.id, user.id));

  const token = await signJwt(
    { sub: user.id.toString(), email: user.email },
    c.env.JWT_SECRET
  );

  setCookie(c, "token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  const salt = c.env.HASHIDS_SALT;

  return c.json({
    user: {
      id: encodeId(user.id, salt),
      email: user.email,
    },
  });
});

auth.post("/logout", (c) => {
  deleteCookie(c, "token", { path: "/", secure: true, sameSite: "None" });
  return c.json({ message: "ok" });
});

auth.get("/me", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const db = drizzle(c.env.DB);

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!user || user.deletedAt !== null) {
    return c.json({ error: "errors.user_not_found" }, 404);
  }

  const salt = c.env.HASHIDS_SALT;

  return c.json({
    user: {
      id: encodeId(user.id, salt),
      email: user.email,
      status: user.status,
    },
  });
});

auth.post("/forgot-password", async (c) => {
  const { email } = await c.req.json<{ email: string }>();

  if (!email) {
    return c.json({ error: "errors.email_required" }, 400);
  }

  const db = drizzle(c.env.DB);
  const normalizedEmail = email.toLowerCase().trim();

  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .get();

  if (!user || user.deletedAt !== null) {
    return c.json({ success: true, message: "auth.email_sent_if_exists" });
  }

  const resetToken = await signResetToken(
    { sub: user.id.toString(), email: user.email },
    c.env.JWT_SECRET
  );

  const appUrl = c.env.APP_URL || "http://localhost:5173";
  const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

  const emailService = createEmailService(c.env);
  const template = passwordResetEmail(resetUrl);

  c.executionCtx.waitUntil(
    emailService.send(user.email, template.subject, template.html, template.text).catch((err) => {
      console.error(`Failed to send password reset email to ${user.email}:`, err);
    })
  );

  return c.json({ success: true, message: "auth.email_sent_if_exists" });
});

auth.post("/reset-password", async (c) => {
  const { token, password } = await c.req.json<{ token: string; password: string }>();

  if (!token || !password) {
    return c.json({ error: "errors.token_password_required" }, 400);
  }

  if (password.length < 8) {
    return c.json({ error: "errors.password_too_short" }, 400);
  }

  const payload = await verifyResetToken(token, c.env.JWT_SECRET);

  if (!payload) {
    return c.json({ error: "errors.reset_token_invalid" }, 400);
  }

  const db = drizzle(c.env.DB);
  const userId = BigInt(payload.sub);

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!user || user.deletedAt !== null) {
    return c.json({ error: "errors.user_not_found" }, 404);
  }

  const passwordHash = await hashPassword(password);
  const now = new Date();

  await db
    .update(users)
    .set({ passwordHash, updatedAt: now })
    .where(eq(users.id, userId));

  return c.json({ success: true, message: "auth.password_reset_success" });
});

export default auth;