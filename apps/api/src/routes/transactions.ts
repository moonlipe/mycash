import { Hono } from "hono";
import {
  eq,
  and,
  gte,
  lte,
  isNull,
  asc,
  sql,
  like,
  inArray,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  transactions,
  accounts,
  categories,
  attachments,
} from "@mycash/database/schema";
import { newId } from "../utils/id";
import { encodeId, decodeId } from "../utils/hashid";
import { authMiddleware, type AuthEnv } from "../middleware/auth";
import { hashidMiddleware, type HashidVariables } from "../middleware/hashid";

type TxEnv = AuthEnv & { Variables: HashidVariables };

const txRoutes = new Hono<TxEnv>();

txRoutes.use("*", authMiddleware);

txRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const month = c.req.query("month");
  const year = c.req.query("year");
  const page = Math.max(1, parseInt(c.req.query("page") || "1", 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(c.req.query("limit") || "50", 10) || 50),
  );
  const offset = (page - 1) * limit;

  const searchQuery = c.req.query("search") || "";
  const filterAccountId = c.req.query("accountId") || "";
  const filterCategoryId = c.req.query("categoryId") || "";
  const filterType = c.req.query("type") || "";

  const now = new Date();
  const m = month ? parseInt(month, 10) : now.getMonth() + 1;
  const y = year ? parseInt(year, 10) : now.getFullYear();

  const startDate = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const endDate = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const db = drizzle(c.env.DB);
  const salt = c.env.HASHIDS_SALT;

  const conditions = [
    eq(transactions.userId, userId),
    gte(transactions.dueDate, startDate),
    lte(transactions.dueDate, endDate),
    isNull(transactions.deletedAt),
  ];

  if (searchQuery) {
    conditions.push(like(transactions.description, `%${searchQuery}%`));
  }

  const decodedAccountId = filterAccountId
    ? decodeId(filterAccountId, salt)
    : null;
  if (decodedAccountId !== null) {
    conditions.push(eq(transactions.accountId, decodedAccountId));
  }

  const decodedCategoryId = filterCategoryId
    ? decodeId(filterCategoryId, salt)
    : null;
  if (decodedCategoryId !== null) {
    conditions.push(eq(transactions.categoryId, decodedCategoryId));
  }

  if (
    filterType === "income" ||
    filterType === "expense" ||
    filterType === "transfer"
  ) {
    conditions.push(eq(transactions.type, filterType));
  }

  const whereCondition = and(...conditions);

  const summaryRows = await db
    .select({
      type: transactions.type,
      total: sql<number>`cast(sum(${transactions.amount}) as integer)`,
    })
    .from(transactions)
    .where(whereCondition)
    .groupBy(transactions.type);

  let income = 0;
  let expense = 0;
  for (const row of summaryRows) {
    if (row.type === "income") income += row.total;
    else if (row.type === "expense") expense += Math.abs(row.total);
  }

  const countResult = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(transactions)
    .where(whereCondition);

  const total = countResult[0]?.count ?? 0;

  const rows = await db
    .select({
      id: transactions.id,
      description: transactions.description,
      amount: transactions.amount,
      date: transactions.date,
      dueDate: transactions.dueDate,
      type: transactions.type,
      isPaid: transactions.isPaid,
      accountId: transactions.accountId,
      categoryId: transactions.categoryId,
      recurrenceId: transactions.recurrenceId,
      installmentNumber: transactions.installmentNumber,
      totalInstallments: transactions.totalInstallments,
      notes: transactions.notes,
      reminderDate: transactions.reminderDate,
      accountName: accounts.name,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(whereCondition)
    .orderBy(asc(transactions.dueDate))
    .limit(limit)
    .offset(offset);

  const txIds = rows.map((r) => r.id);

  const attachmentCounts =
    txIds.length > 0
      ? await db
          .select({
            transactionId: attachments.transactionId,
            count: sql<number>`cast(count(*) as integer)`,
          })
          .from(attachments)
          .where(
            and(
              eq(attachments.status, "confirmed"),
              isNull(attachments.deletedAt),
              inArray(attachments.transactionId, txIds),
            ),
          )
          .groupBy(attachments.transactionId)
      : [];

  const attachmentMap = new Map(
    attachmentCounts.map((r) => [r.transactionId, r.count]),
  );

  const items = rows.map((row) => ({
    id: encodeId(row.id, salt),
    description: row.description,
    amount: row.amount,
    date: row.date,
    dueDate: row.dueDate,
    type: row.type,
    isPaid: row.isPaid,
    accountId: encodeId(row.accountId, salt),
    categoryId: encodeId(row.categoryId, salt),
    recurrenceId: row.recurrenceId !== null ? encodeId(row.recurrenceId!, salt) : null,
    installmentNumber: row.installmentNumber,
    totalInstallments: row.totalInstallments,
    notes: row.notes,
    reminderDate: row.reminderDate,
    accountName: row.accountName,
    categoryName: row.categoryName,
    categoryColor: row.categoryColor,
    attachmentCount: attachmentMap.get(row.id) || 0,
  }));

  return c.json({
    summary: {
      income,
      expense,
      balance: income - expense,
    },
    items,
    pagination: {
      page,
      limit,
      total,
      hasMore: page * limit < total,
    },
  });
});

function addMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1 + months, 1);
  const maxDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const day = Math.min(d, maxDay);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

function recalculateDate(originalDate: string, newDate: string): string {
  const newDay = parseInt(newDate.split("-")[2], 10);
  const [y, m] = originalDate.split("-").map(Number);
  const maxDay = new Date(y, m, 0).getDate();
  const day = Math.min(newDay, maxDay);
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const INSTALLMENT_SUFFIX_REGEX = /\s*\(\d+\/\d+\)$/;

function stripInstallmentSuffix(description: string): string {
  return description.replace(INSTALLMENT_SUFFIX_REGEX, "");
}

txRoutes.post("/", async (c) => {
  const userId = c.get("userId");
  const salt = c.env.HASHIDS_SALT;

  const body = await c.req.json<{
    description: string;
    amount: number;
    date: string;
    dueDate: string;
    type: string;
    accountId: string;
    categoryId: string;
    notes?: string;
    reminderDate?: string;
    isPaid?: boolean;
    recurrence?: {
      type: "installment" | "recurring";
      totalInstallments: number;
    };
  }>();

  if (
    !body.description ||
    !body.amount ||
    !body.dueDate ||
    !body.type ||
    !body.accountId ||
    !body.categoryId
  ) {
    return c.json({ error: "errors.missing_fields" }, 400);
  }

  const decodedAccountId = decodeId(body.accountId, salt);
  const decodedCategoryId = decodeId(body.categoryId, salt);

  if (decodedAccountId === null || decodedCategoryId === null) {
    return c.json({ error: "errors.invalid_id" }, 400);
  }

  const db = drizzle(c.env.DB);
  const now = new Date();

  const amount =
    body.type === "expense" ? -Math.abs(body.amount) : Math.abs(body.amount);
  const dateValue = body.date || now.toISOString().split("T")[0];
  const initialIsPaid = body.isPaid === true;

  if (
    body.recurrence &&
    body.recurrence.type === "installment" &&
    body.recurrence.totalInstallments > 1
  ) {
    const totalInstallments = body.recurrence.totalInstallments;
    const recurrenceGroupId = newId();
    const firstId = newId();

    for (let i = 1; i <= totalInstallments; i++) {
      await db.insert(transactions).values({
        id: i === 1 ? firstId : newId(),
        userId,
        accountId: decodedAccountId,
        categoryId: decodedCategoryId,
        description: `${body.description} (${i}/${totalInstallments})`,
        amount,
        date: addMonths(dateValue, i - 1),
        dueDate: addMonths(body.dueDate, i - 1),
        type: body.type as "income" | "expense" | "transfer",
        isPaid: initialIsPaid,
        recurrenceId: recurrenceGroupId,
        installmentNumber: i,
        totalInstallments,
        notes: body.notes || null,
        reminderDate: body.reminderDate
          ? addMonths(body.reminderDate, i - 1)
          : null,
        createdAt: now,
        updatedAt: now,
      });
    }

    return c.json(
      {
        transaction: {
          id: encodeId(firstId, salt),
          description: `${body.description} (1/${totalInstallments})`,
          amount,
          date: dateValue,
          dueDate: body.dueDate,
          type: body.type,
          isPaid: initialIsPaid,
          accountId: body.accountId,
          categoryId: body.categoryId,
          recurrenceId: encodeId(recurrenceGroupId, salt),
          installmentNumber: 1,
          totalInstallments,
          notes: body.notes || null,
          reminderDate: body.reminderDate || null,
          accountName: "",
          categoryName: "",
          categoryColor: "",
        },
        createdCount: totalInstallments,
      },
      201,
    );
  }

  if (body.recurrence && body.recurrence.type === "recurring") {
    const recurrenceGroupId = newId();
    const totalInstallments = 12;
    const firstId = newId();

    for (let i = 1; i <= totalInstallments; i++) {
      await db.insert(transactions).values({
        id: i === 1 ? firstId : newId(),
        userId,
        accountId: decodedAccountId,
        categoryId: decodedCategoryId,
        description: body.description,
        amount,
        date: addMonths(dateValue, i - 1),
        dueDate: addMonths(body.dueDate, i - 1),
        type: body.type as "income" | "expense" | "transfer",
        isPaid: initialIsPaid,
        recurrenceId: recurrenceGroupId,
        installmentNumber: i,
        totalInstallments,
        notes: body.notes || null,
        reminderDate: body.reminderDate
          ? addMonths(body.reminderDate, i - 1)
          : null,
        createdAt: now,
        updatedAt: now,
      });
    }

    return c.json(
      {
        transaction: {
          id: encodeId(firstId, salt),
          description: body.description,
          amount,
          date: addMonths(dateValue, 0),
          dueDate: addMonths(body.dueDate, 0),
          type: body.type,
          isPaid: initialIsPaid,
          accountId: body.accountId,
          categoryId: body.categoryId,
          recurrenceId: encodeId(recurrenceGroupId, salt),
          installmentNumber: 1,
          totalInstallments,
          notes: body.notes || null,
          reminderDate: body.reminderDate || null,
          accountName: "",
          categoryName: "",
          categoryColor: "",
        },
        createdCount: totalInstallments,
      },
      201,
    );
  }

  const id = newId();
  await db.insert(transactions).values({
    id,
    userId,
    accountId: decodedAccountId,
    categoryId: decodedCategoryId,
    description: body.description,
    amount,
    date: dateValue,
    dueDate: body.dueDate,
    type: body.type as "income" | "expense" | "transfer",
    isPaid: initialIsPaid,
    notes: body.notes || null,
    reminderDate: body.reminderDate || null,
    createdAt: now,
    updatedAt: now,
  });

  return c.json(
    {
      transaction: {
        id: encodeId(id, salt),
        description: body.description,
        amount,
        date: dateValue,
        dueDate: body.dueDate,
        type: body.type,
        isPaid: initialIsPaid,
        accountId: body.accountId,
        categoryId: body.categoryId,
        recurrenceId: null,
        installmentNumber: null,
        totalInstallments: null,
        notes: body.notes || null,
        reminderDate: body.reminderDate || null,
        accountName: "",
        categoryName: "",
        categoryColor: "",
      },
      createdCount: 1,
    },
    201,
  );
});

txRoutes.put("/:id", hashidMiddleware, async (c) => {
  const userId = c.get("userId");
  const decodedId = c.get("decodedId");
  const salt = c.env.HASHIDS_SALT;

  if (!decodedId) {
    return c.json({ error: "errors.invalid_id" }, 400);
  }

  const body = await c.req.json<{
    description?: string;
    amount?: number;
    type?: string;
    date?: string;
    dueDate?: string;
    accountId?: string;
    categoryId?: string;
    notes?: string;
    reminderDate?: string | null;
    isPaid?: boolean;
    scope?: "single" | "future";
  }>();

  const db = drizzle(c.env.DB);

  const tx = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.id, decodedId),
        eq(transactions.userId, userId),
        isNull(transactions.deletedAt),
      ),
    )
    .get();

  if (!tx) {
    return c.json({ error: "errors.transaction_not_found" }, 404);
  }

  const now = new Date();
  const decodedAccountId = body.accountId
    ? decodeId(body.accountId, salt)
    : tx.accountId;
  const decodedCategoryId = body.categoryId
    ? decodeId(body.categoryId, salt)
    : tx.categoryId;

  if (
    (body.accountId && decodedAccountId === null) ||
    (body.categoryId && decodedCategoryId === null)
  ) {
    return c.json({ error: "errors.invalid_id" }, 400);
  }

  const scope = body.scope || "single";

  if (tx.recurrenceId && scope === "future") {
    const effectiveDueDate = tx.dueDate || tx.date;

    const futureTxns = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.recurrenceId, tx.recurrenceId),
          eq(transactions.userId, userId),
          gte(transactions.dueDate, effectiveDueDate),
          isNull(transactions.deletedAt),
        ),
      )
      .orderBy(asc(transactions.dueDate));

    const hasNewDate = body.date !== undefined;
    const hasNewDueDate = body.dueDate !== undefined;

    for (const futureTx of futureTxns) {
      const updateData: Record<string, unknown> = {
        updatedAt: now,
      };
      if (body.description !== undefined) {
        const newBase = stripInstallmentSuffix(body.description);
        if (futureTx.installmentNumber && futureTx.totalInstallments) {
          updateData.description = `${newBase} (${futureTx.installmentNumber}/${futureTx.totalInstallments})`;
        } else {
          updateData.description = newBase;
        }
      }
      if (body.amount !== undefined) {
        updateData.amount =
          body.type === "expense"
            ? -Math.abs(body.amount)
            : Math.abs(body.amount);
      } else if (body.type !== undefined) {
        updateData.amount =
          body.type === "expense" ? -Math.abs(tx.amount) : Math.abs(tx.amount);
      }
      if (body.type !== undefined) updateData.type = body.type;
      if (hasNewDate) {
        updateData.date = recalculateDate(futureTx.date, body.date!);
      }
      if (hasNewDueDate && futureTx.dueDate) {
        updateData.dueDate = recalculateDate(futureTx.dueDate, body.dueDate!);
      }
      if (body.notes !== undefined) updateData.notes = body.notes;
      if (body.reminderDate !== undefined)
        updateData.reminderDate = body.reminderDate;
      if (decodedAccountId !== null) updateData.accountId = decodedAccountId;
      if (decodedCategoryId !== null) updateData.categoryId = decodedCategoryId;
      if (body.isPaid !== undefined) updateData.isPaid = body.isPaid;

      await db
        .update(transactions)
        .set(updateData)
        .where(eq(transactions.id, futureTx.id));
    }

    return c.json({
      updatedCount: "bulk",
      scope: "future",
    });
  }

  const updateData: Record<string, unknown> = {
    updatedAt: now,
  };
  if (body.description !== undefined) updateData.description = body.description;
  if (body.amount !== undefined) {
    updateData.amount =
      (body.type || tx.type) === "expense"
        ? -Math.abs(body.amount)
        : Math.abs(body.amount);
  }
  if (body.type !== undefined) updateData.type = body.type;
  if (body.date !== undefined) updateData.date = body.date;
  if (body.dueDate !== undefined) updateData.dueDate = body.dueDate;
  if (decodedAccountId !== null) updateData.accountId = decodedAccountId;
  if (decodedCategoryId !== null) updateData.categoryId = decodedCategoryId;
  if (body.isPaid !== undefined) updateData.isPaid = body.isPaid;
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.reminderDate !== undefined)
    updateData.reminderDate = body.reminderDate;

  await db
    .update(transactions)
    .set(updateData)
    .where(eq(transactions.id, decodedId));

  return c.json({
    updatedCount: 1,
    scope: "single",
  });
});

txRoutes.delete("/:id", hashidMiddleware, async (c) => {
  const userId = c.get("userId");
  const decodedId = c.get("decodedId");

  if (!decodedId) {
    return c.json({ error: "errors.invalid_id" }, 400);
  }

  const scope = c.req.query("scope") || "single";

  const db = drizzle(c.env.DB);

  const tx = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.id, decodedId),
        eq(transactions.userId, userId),
        isNull(transactions.deletedAt),
      ),
    )
    .get();

  if (!tx) {
    return c.json({ error: "errors.transaction_not_found" }, 404);
  }

  const now = new Date();

  if (tx.recurrenceId && scope === "future") {
    const effectiveDueDate = tx.dueDate || tx.date;
    await db
      .update(transactions)
      .set({ deletedAt: now })
      .where(
        and(
          eq(transactions.recurrenceId, tx.recurrenceId),
          eq(transactions.userId, userId),
          gte(transactions.dueDate, effectiveDueDate),
          isNull(transactions.deletedAt),
        ),
      );

    return c.json({ deletedCount: "bulk", scope: "future" });
  }

  await db
    .update(transactions)
    .set({ deletedAt: now })
    .where(eq(transactions.id, decodedId));

  return c.json({ deletedCount: 1, scope: "single" });
});

txRoutes.patch("/:id/toggle-paid", hashidMiddleware, async (c) => {
  const userId = c.get("userId");
  const decodedId = c.get("decodedId");

  if (!decodedId) {
    return c.json({ error: "errors.invalid_id" }, 400);
  }

  const db = drizzle(c.env.DB);
  const txId = decodedId;

  const tx = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.id, txId),
        eq(transactions.userId, userId),
        isNull(transactions.deletedAt),
      ),
    )
    .get();

  if (!tx) {
    return c.json({ error: "errors.transaction_not_found" }, 404);
  }

  const newIsPaid = !tx.isPaid;
  await db
    .update(transactions)
    .set({ isPaid: newIsPaid, updatedAt: new Date() })
    .where(eq(transactions.id, txId));

  return c.json({ isPaid: newIsPaid });
});

export default txRoutes;