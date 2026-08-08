import { and, eq, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  accounts,
  reminderNotifications,
  transactions,
  users,
} from "@mycash/database/schema";
import { createEmailService, reminderEmail } from "@mycash/email";
import type { Env } from "./env";
import { newId } from "./utils/id";

export interface ReminderResult {
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  errors: Array<{ transactionId: bigint; error: string }>;
}

export async function processReminders(env: Env): Promise<ReminderResult> {
  const db = drizzle(env.DB);
  const today = new Date().toISOString().slice(0, 10);

  const pending = await db
    .select({
      txId: transactions.id,
      txUserId: transactions.userId,
      txDescription: transactions.description,
      txAmount: transactions.amount,
      txDate: transactions.date,
      txType: transactions.type,
      accountId: transactions.accountId,
    })
    .from(transactions)
    .leftJoin(
      reminderNotifications,
      eq(reminderNotifications.transactionId, transactions.id)
    )
    .where(
      and(
        isNotNull(transactions.reminderDate),
        lte(transactions.reminderDate, today),
        isNull(transactions.deletedAt),
        sql`${reminderNotifications.id} IS NULL`
      )
    );

  const result: ReminderResult = {
    processed: pending.length,
    sent: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  if (pending.length === 0) {
    return result;
  }

  const appUrl = env.APP_URL || "http://localhost:5173";

  const userIds = Array.from(new Set(pending.map((p) => p.txUserId)));
  const accountIds = Array.from(new Set(pending.map((p) => p.accountId)));

  const userRows =
    userIds.length > 0
      ? await db
          .select({ id: users.id, email: users.email })
          .from(users)
          .where(inArray(users.id, userIds))
      : [];

  const accountRows =
    accountIds.length > 0
      ? await db
          .select({ id: accounts.id, name: accounts.name })
          .from(accounts)
          .where(inArray(accounts.id, accountIds))
      : [];

  const userById = new Map(userRows.map((u) => [u.id, u.email]));
  const accountById = new Map(accountRows.map((a) => [a.id, a.name]));

  const missingUserIds = new Set<bigint>();
  const emailService = createEmailService(env);

  for (const row of pending) {
    const userEmail = userById.get(row.txUserId);
    const accountName = accountById.get(row.accountId) ?? "Conta";

    if (!userEmail) {
      if (!missingUserIds.has(row.txUserId)) {
        missingUserIds.add(row.txUserId);
        result.errors.push({
          transactionId: row.txId,
          error: `user_not_found:${row.txUserId}`,
        });
      }
      result.skipped++;
      continue;
    }

    const notificationId = newId();

    try {
      const insertResult = await db
        .insert(reminderNotifications)
        .values({
          id: notificationId,
          transactionId: row.txId,
          userId: row.txUserId,
        })
        .onConflictDoNothing({ target: reminderNotifications.transactionId });

      const inserted = isRowInserted(insertResult);

      if (!inserted) {
        result.skipped++;
        continue;
      }

      const template = reminderEmail({
        description: row.txDescription,
        amount: row.txAmount,
        type: row.txType,
        date: row.txDate,
        accountName,
        appUrl,
      });

      await emailService.send(
        userEmail,
        template.subject,
        template.html,
        template.text
      );

      result.sent++;
    } catch (err) {
      result.failed++;
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push({ transactionId: row.txId, error: message });
      console.error(
        `[reminders] failed to send for transaction ${row.txId}:`,
        err
      );
    }
  }

  console.log(
    `[reminders] processed=${result.processed} sent=${result.sent} skipped=${result.skipped} failed=${result.failed}`
  );

  return result;
}

function isRowInserted(result: unknown): boolean {
  if (!result || typeof result !== "object") return false;
  const meta = (result as { meta?: { changes?: number; last_row_id?: number } })
    .meta;
  if (typeof meta?.changes === "number") {
    return meta.changes > 0;
  }
  if (typeof meta?.last_row_id === "number") {
    return meta.last_row_id > 0;
  }
  return true;
}