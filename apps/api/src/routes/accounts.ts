import { Hono } from "hono";
import { eq, and, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { accounts, transactions } from "@mycash/database/schema";
import { newId } from "../utils/id";
import { encodeId, decodeId } from "../utils/hashid";
import { authMiddleware, type AuthEnv } from "../middleware/auth";

const accountRoutes = new Hono<AuthEnv>();

accountRoutes.use("*", authMiddleware);

accountRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const db = drizzle(c.env.DB);
  const salt = c.env.HASHIDS_SALT;

  const rows = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), isNull(accounts.deletedAt)));

  const items = rows.map((row) => ({
    id: encodeId(row.id, salt),
    name: row.name,
    type: row.type,
    color: row.color,
    currency: row.currency,
    initialBalance: row.initialBalance,
  }));

  return c.json({ items });
});

accountRoutes.post("/", async (c) => {
  const userId = c.get("userId");
  const db = drizzle(c.env.DB);
  const salt = c.env.HASHIDS_SALT;
  const body = await c.req.json();
  const now = new Date();
  const id = newId();

  await db.insert(accounts).values({
    id,
    userId,
    name: body.name,
    type: body.type || "checking",
    color: body.color || "#3b82f6",
    initialBalance: body.initialBalance || 0,
    currency: "BRL",
    createdAt: now,
    updatedAt: now,
  });

  return c.json({
    account: {
      id: encodeId(id, salt),
      name: body.name,
      type: body.type || "checking",
      color: body.color || "#3b82f6",
      currency: "BRL",
      initialBalance: body.initialBalance || 0,
    },
  });
});

accountRoutes.put("/:id", async (c) => {
  const userId = c.get("userId");
  const db = drizzle(c.env.DB);
  const salt = c.env.HASHIDS_SALT;
  const hash = c.req.param("id");
  const decoded = decodeId(hash, salt);
  if (decoded === null) return c.json({ error: "errors.invalid_id" }, 400);

  const body = await c.req.json();
  const now = new Date();

  await db
    .update(accounts)
    .set({
      name: body.name,
      type: body.type,
      color: body.color,
      initialBalance: body.initialBalance,
      updatedAt: now,
    })
    .where(and(eq(accounts.id, decoded), eq(accounts.userId, userId)));

  return c.json({
    account: {
      id: hash,
      name: body.name,
      type: body.type,
      color: body.color,
      currency: "BRL",
      initialBalance: body.initialBalance,
    },
  });
});

accountRoutes.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const db = drizzle(c.env.DB);
  const salt = c.env.HASHIDS_SALT;
  const hash = c.req.param("id");
  const decoded = decodeId(hash, salt);
  if (decoded === null) return c.json({ error: "errors.invalid_id" }, 400);

  const allActive = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), isNull(accounts.deletedAt)));

  if (allActive.length <= 1) {
    return c.json({ error: "errors.cannot_delete_last_account" }, 400);
  }

  const now = new Date();
  await db
    .update(accounts)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(accounts.id, decoded), eq(accounts.userId, userId)));

  return c.json({ success: true });
});

accountRoutes.get("/balances", async (c) => {
  const userId = c.get("userId");
  const db = drizzle(c.env.DB);
  const salt = c.env.HASHIDS_SALT;

  const accountBalances = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      color: accounts.color,
      type: accounts.type,
      initialBalance: accounts.initialBalance,
      totalIncome: sql<number>`TOTAL(CASE WHEN ${transactions.type} = 'income' AND ${transactions.isPaid} = 1 AND ${transactions.deletedAt} IS NULL THEN ${transactions.amount} ELSE 0 END)`,
      totalExpense: sql<number>`TOTAL(CASE WHEN ${transactions.type} = 'expense' AND ${transactions.isPaid} = 1 AND ${transactions.deletedAt} IS NULL THEN ABS(${transactions.amount}) ELSE 0 END)`,
    })
    .from(accounts)
    .leftJoin(transactions, eq(accounts.id, transactions.accountId))
    .where(and(eq(accounts.userId, userId), isNull(accounts.deletedAt)))
    .groupBy(accounts.id);

  const items = accountBalances.map((acc) => {
    const currentBalanceCents = acc.initialBalance + acc.totalIncome - acc.totalExpense;
    return {
      id: encodeId(acc.id, salt),
      name: acc.name,
      color: acc.color,
      type: acc.type,
      currentBalance: currentBalanceCents,
    };
  });

  return c.json({ items });
});

export default accountRoutes;