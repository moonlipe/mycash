import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { users } from "@mycash/database/schema";
import { authMiddleware, type AuthEnv } from "../middleware/auth";
import { createEmailService, passwordResetEmail } from "@mycash/email";

const email = new Hono<AuthEnv>();

email.post("/test", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const userEmail = c.get("userEmail");
  const db = drizzle(c.env.DB);

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!user || user.deletedAt !== null) {
    return c.json({ error: "errors.user_not_found" }, 404);
  }

  const emailService = createEmailService(c.env);
  const appUrl = c.env.APP_URL || "http://localhost:5173";
  const template = passwordResetEmail(`${appUrl}/reset-password?token=test`);

  try {
    await emailService.send(user.email, template.subject, template.html, template.text);
    return c.json({ success: true });
  } catch (err) {
    const details = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "email.test_failed", message: details }, 500);
  }
});

export default email;