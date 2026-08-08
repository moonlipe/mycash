import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockDb,
  queryQueue,
  mockEmailSend,
  setUpResult,
  nextIdRef,
  insertResultOverride,
} = vi.hoisted(() => {
  const queryQueue: Array<{ resolve: any[] }> = [];
  let nextId = 1n;
  const calls: Array<{ method: string; table?: string }> = [];
  let insertResultOverride: { meta: { changes: number; last_row_id: number } } | null =
    null;

  const createBuilder = () => {
    const builder: any = {
      from: vi.fn((table: any) => {
        calls.push({ method: "from", table: table?._?.name });
        return builder;
      }),
      leftJoin: vi.fn(() => builder),
      innerJoin: vi.fn(() => builder),
      where: vi.fn(() => {
        calls.push({ method: "where" });
        return builder;
      }),
      values: vi.fn(() => {
        calls.push({ method: "values" });
        return builder;
      }),
      onConflictDoNothing: vi.fn(() => {
        calls.push({ method: "onConflictDoNothing" });
        const override = insertResultOverride;
        const result = override ?? {
          meta: { changes: 1, last_row_id: Number(nextId) },
        };
        insertResultOverride = null;
        return Promise.resolve(result);
      }),
      then: vi.fn((resolve: any) => {
        const next = queryQueue.shift();
        const rows = next ? next.resolve : [];
        resolve(rows);
      }),
    };
    return builder;
  };

  const mockDb = {
    _builder: createBuilder(),
    _calls: calls,
    select: vi.fn(() => {
      calls.push({ method: "select" });
      return mockDb._builder;
    }),
    insert: vi.fn(() => {
      calls.push({ method: "insert" });
      return mockDb._builder;
    }),
  };

  const mockEmailSend = vi.fn(async () => undefined);

  const setUpResult = (rows: any[]) => {
    queryQueue.push({ resolve: rows });
  };

  return {
    mockDb,
    queryQueue,
    mockEmailSend,
    setUpResult,
    nextIdRef: { get value() { return nextId; }, set value(v) { nextId = v; } },
    insertResultOverride: { get value() { return insertResultOverride; }, set value(v) { insertResultOverride = v; } },
  };
});

vi.mock("drizzle-orm/d1", () => ({
  drizzle: vi.fn(() => mockDb),
}));

vi.mock("@mycash/email", () => ({
  createEmailService: vi.fn(() => ({ send: mockEmailSend })),
  reminderEmail: vi.fn((params: any) => ({
    subject: `Lembrete: ${params.description}`,
    html: `<html>${params.description}</html>`,
    text: params.description,
  })),
}));

vi.mock("./utils/id", () => ({
  newId: vi.fn(() => {
    const id = nextIdRef.value;
    nextIdRef.value += 1n;
    return id;
  }),
}));

import { processReminders } from "./reminders";

const baseEnv = {
  DB: {} as D1Database,
  JWT_SECRET: "x",
  HASHIDS_SALT: "x",
  S3_ENDPOINT: "x",
  S3_ACCESS_KEY: "x",
  S3_SECRET_KEY: "x",
  S3_BUCKET: "x",
  S3_REGION: "x",
  APP_URL: "https://app.example.com",
  EMAIL_DRIVER: "smtp",
  EMAIL_SMTP_HOST: "localhost",
  EMAIL_SMTP_PORT: "2525",
  EMAIL_SMTP_USER: "u",
  EMAIL_SMTP_PASS: "p",
  EMAIL_SMTP_SECURE: "false",
  EMAIL_API_KEY: "",
  EMAIL_FROM_ADDRESS: "noreply@mycash.app",
  EMAIL_FROM_NAME: "MyCash",
} as any;

beforeEach(() => {
  mockEmailSend.mockClear();
  mockDb.insert.mockClear();
  queryQueue.length = 0;
  nextIdRef.value = 1n;
  insertResultOverride.value = null;
});

describe("processReminders", () => {
  it("retorna contadores zerados quando não há lembretes pendentes", async () => {
    setUpResult([]);

    const result = await processReminders(baseEnv);

    expect(result).toEqual({
      processed: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    });
    expect(mockEmailSend).not.toHaveBeenCalled();
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("envia email e registra notificação para transação com reminderDate <= hoje", async () => {
    setUpResult([
      {
        txId: 1n,
        txUserId: 10n,
        txDescription: "Conta de luz",
        txAmount: 15990,
        txDate: "2026-06-15",
        txType: "expense",
        accountId: 100n,
      },
    ]);
    setUpResult([{ id: 10n, email: "user@example.com" }]);
    setUpResult([{ id: 100n, name: "Conta Corrente" }]);

    const result = await processReminders(baseEnv);

    expect(result.processed).toBe(1);
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
    expect(mockEmailSend).toHaveBeenCalledTimes(1);
    expect(mockEmailSend).toHaveBeenCalledWith(
      "user@example.com",
      "Lembrete: Conta de luz",
      "<html>Conta de luz</html>",
      "Conta de luz"
    );
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
    expect(mockDb._calls.filter((c) => c.method === "onConflictDoNothing")).toHaveLength(1);
  });

  it("marca como skipped quando o usuário não é encontrado", async () => {
    setUpResult([
      {
        txId: 1n,
        txUserId: 999n,
        txDescription: "X",
        txAmount: 100,
        txDate: "2026-06-15",
        txType: "expense",
        accountId: 100n,
      },
    ]);
    setUpResult([]);

    const result = await processReminders(baseEnv);

    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.errors[0]).toMatchObject({
      transactionId: 1n,
      error: "user_not_found:999",
    });
    expect(mockEmailSend).not.toHaveBeenCalled();
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("registra apenas um erro quando múltiplas transações do mesmo usuário não existem", async () => {
    setUpResult([
      {
        txId: 1n,
        txUserId: 999n,
        txDescription: "X",
        txAmount: 100,
        txDate: "2026-06-15",
        txType: "expense",
        accountId: 100n,
      },
      {
        txId: 2n,
        txUserId: 999n,
        txDescription: "Y",
        txAmount: 200,
        txDate: "2026-06-16",
        txType: "expense",
        accountId: 100n,
      },
    ]);
    setUpResult([]);

    const result = await processReminders(baseEnv);

    expect(result.skipped).toBe(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      error: "user_not_found:999",
    });
  });

  it("incrementa failed quando o envio de email falha", async () => {
    setUpResult([
      {
        txId: 1n,
        txUserId: 10n,
        txDescription: "X",
        txAmount: 100,
        txDate: "2026-06-15",
        txType: "expense",
        accountId: 100n,
      },
    ]);
    setUpResult([{ id: 10n, email: "user@example.com" }]);
    setUpResult([{ id: 100n, name: "Conta" }]);

    mockEmailSend.mockRejectedValueOnce(new Error("SMTP down"));

    const result = await processReminders(baseEnv);

    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors[0]).toMatchObject({
      transactionId: 1n,
      error: "SMTP down",
    });
  });

  it("pula envio quando INSERT falha por conflito (transação já notificada por outra execução)", async () => {
    setUpResult([
      {
        txId: 1n,
        txUserId: 10n,
        txDescription: "X",
        txAmount: 100,
        txDate: "2026-06-15",
        txType: "expense",
        accountId: 100n,
      },
    ]);
    setUpResult([{ id: 10n, email: "user@example.com" }]);
    setUpResult([{ id: 100n, name: "Conta" }]);

    insertResultOverride.value = { meta: { changes: 0, last_row_id: 0 } };

    const result = await processReminders(baseEnv);

    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.failed).toBe(0);
    expect(mockEmailSend).not.toHaveBeenCalled();
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
  });
});