import { Hono } from "hono";
import { cors } from "hono/cors";
import auth from "./routes/auth";
import email from "./routes/email";
import transactions from "./routes/transactions";
import accounts from "./routes/accounts";
import categories from "./routes/categories";
import attachments from "./routes/attachments";
import { processReminders } from "./reminders";
import type { Env } from "./env";

const app = new Hono<{ Bindings: Env }>();

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const appUrl = c.env.APP_URL || "http://localhost:5173";
      if (origin === appUrl || origin === "http://localhost:5173") {
        return origin;
      }
      return appUrl;
    },
    credentials: true,
  })
);

app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

app.route("/auth", auth);
app.route("/email", email);
app.route("/transactions", transactions);
app.route("/accounts", accounts);
app.route("/categories", categories);
app.route("/attachments", attachments);

export default {
  fetch: app.fetch,
  async scheduled(
    _event: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    ctx.waitUntil(processReminders(env));
  },
};
