import { sqliteTable, integer, text, index, customType } from "drizzle-orm/sqlite-core";

const bigintInteger = customType<{ data: bigint; driverData: string }>({
  dataType() {
    return "integer";
  },
  toDriver(value: bigint): string {
    return value.toString();
  },
  fromDriver(value: string): bigint {
    return BigInt(value);
  },
});

export const attachments = sqliteTable(
  "attachments",
  {
    id: bigintInteger("id").primaryKey(),
    transactionId: bigintInteger("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    userId: bigintInteger("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    fileKey: text("file_key").notNull(),
    status: text("status", { enum: ["pending", "confirmed"] }).default("pending").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
  },
  (table) => [
    index("attachments_transaction_idx").on(table.transactionId, table.deletedAt),
    index("attachments_user_idx").on(table.userId),
  ]
);

export const users = sqliteTable(
  "users",
  {
    id: bigintInteger("id").primaryKey(),
    email: text("email").unique().notNull(),
    passwordHash: text("password_hash").notNull(),
    status: text("status").default("active").notNull(),
    lastLoginAt: integer("last_login_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
  },
  (table) => [index("users_email_idx").on(table.email)]
);

export const accounts = sqliteTable(
  "accounts",
  {
    id: bigintInteger("id").primaryKey(),
    userId: bigintInteger("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").default("checking").notNull(),
    color: text("color").default("#3b82f6").notNull(),
    initialBalance: integer("initial_balance").default(0).notNull(),
    currency: text("currency").default("BRL").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
  },
  (table) => [index("accounts_user_idx").on(table.userId, table.deletedAt)]
);

export const categories = sqliteTable(
  "categories",
  {
    id: bigintInteger("id").primaryKey(),
    userId: bigintInteger("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull(),
    color: text("color").default("#6b7280").notNull(),
    icon: text("icon").default("tag").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
  },
  (table) => [index("categories_user_idx").on(table.userId, table.type)]
);

export const transactions = sqliteTable(
  "transactions",
  {
    id: bigintInteger("id").primaryKey(),
    userId: bigintInteger("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: bigintInteger("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    categoryId: bigintInteger("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    amount: integer("amount").notNull(),
    date: text("date").notNull(),
    dueDate: text("due_date"),
    type: text("type", { enum: ["income", "expense", "transfer"] }).notNull(),
    isPaid: integer("is_paid", { mode: "boolean" }).default(false).notNull(),
    recurrenceId: bigintInteger("recurrence_id"),
    installmentNumber: integer("installment_number"),
    totalInstallments: integer("total_installments"),
    notes: text("notes"),
    reminderDate: text("reminder_date"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
  },
  (table) => [
    index("transactions_user_date_idx").on(
      table.userId,
      table.date,
      table.deletedAt
    ),
    index("transactions_recurrence_idx").on(table.recurrenceId),
    index("transactions_reminder_idx").on(table.reminderDate, table.deletedAt),
  ]
);

export const reminderNotifications = sqliteTable(
  "reminder_notifications",
  {
    id: bigintInteger("id").primaryKey(),
    transactionId: bigintInteger("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    userId: bigintInteger("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sentAt: integer("sent_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("reminder_notifications_tx_idx").on(table.transactionId),
    index("reminder_notifications_user_idx").on(table.userId),
  ]
);