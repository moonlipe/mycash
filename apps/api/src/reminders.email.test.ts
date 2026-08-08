import { describe, it, expect } from "vitest";
import { reminderEmail } from "../../packages/email/src/templates";

describe("reminderEmail template", () => {
  const baseParams = {
    description: "Conta de luz",
    amount: 15990,
    type: "expense" as const,
    date: "2026-06-15",
    accountName: "Conta Corrente",
    appUrl: "https://mycash.example.com",
  };

  it("gera subject com a descrição da transação", () => {
    const t = reminderEmail(baseParams);
    expect(t.subject).toContain("Conta de luz");
    expect(t.subject).toContain("MyCash");
  });

  it("gera text plano contendo dados principais", () => {
    const t = reminderEmail(baseParams);
    expect(t.text).toContain("Conta de luz");
    expect(t.text).toContain("Despesa");
    expect(t.text).toContain("R$ 159,90");
    expect(t.text).toContain("15/06/2026");
    expect(t.text).toContain("Conta Corrente");
  });

  it("usa sinal negativo para expense", () => {
    const t = reminderEmail({ ...baseParams, type: "expense" });
    expect(t.text).toMatch(/-\s*R\$\s*159,90/);
  });

  it("usa sinal positivo para income", () => {
    const t = reminderEmail({ ...baseParams, type: "income", amount: 50000 });
    expect(t.text).toContain("Receita");
    expect(t.text).toMatch(/\+R\$\s*500,00/);
  });

  it("usa label Transferência para transfer", () => {
    const t = reminderEmail({ ...baseParams, type: "transfer" });
    expect(t.text).toContain("Transferência");
  });

  it("gera html válido com DOCTYPE e dados embutidos", () => {
    const t = reminderEmail(baseParams);
    expect(t.html).toMatch(/^<!DOCTYPE html>/);
    expect(t.html).toContain("Conta de luz");
    expect(t.html).toContain("Conta Corrente");
    expect(t.html).toContain("https://mycash.example.com");
  });

  it("formata datas no padrão dd/mm/yyyy", () => {
    const t = reminderEmail({ ...baseParams, date: "2026-01-05" });
    expect(t.text).toContain("05/01/2026");
  });

  it("devolve string vazia para date inválida sem quebrar", () => {
    const t = reminderEmail({ ...baseParams, date: "invalid" });
    expect(t.text).toContain("invalid");
  });
});
