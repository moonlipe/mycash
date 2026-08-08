export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

import type { ReminderEmailParams } from "./types";

function formatBRL(cents: number): string {
  const reais = (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `R$ ${reais}`;
}

function formatDateBR(date: string): string {
  const [y, m, d] = date.split("-");
  if (!y || !m || !d) return date;
  return `${d}/${m}/${y}`;
}

export function reminderEmail(params: ReminderEmailParams): EmailTemplate {
  const { description, amount, type, date, accountName, appUrl } = params;

  const typeLabel =
    type === "income"
      ? "Receita"
      : type === "expense"
        ? "Despesa"
        : "Transferência";

  const amountColor =
    type === "income" ? "#10b981" : type === "expense" ? "#ef4444" : "#6366f1";

  const amountPrefix = type === "income" ? "+" : type === "expense" ? "-" : "";

  const subject = `MyCash — Lembrete: ${description}`;

  const text = [
    "Olá,",
    "",
    "Você tem um lembrete de transação no MyCash:",
    "",
    `Descrição: ${description}`,
    `Tipo: ${typeLabel}`,
    `Valor: ${amountPrefix}${formatBRL(amount)}`,
    `Data: ${formatDateBR(date)}`,
    `Conta: ${accountName}`,
    "",
    `Acesse o MyCash para visualizar: ${appUrl}`,
    "",
    "— Equipe MyCash",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 0">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
        <tr><td style="background:#3b82f6;padding:24px 32px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">MyCash</h1>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 8px;color:#374151;font-size:15px;line-height:1.6">Olá,</p>
          <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6">Você tem um lembrete de transação cadastrado no MyCash:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;padding:20px;margin-bottom:24px">
            <tr><td>
              <p style="margin:0 0 12px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.5px">Descrição</p>
              <p style="margin:0 0 16px;color:#111827;font-size:16px;font-weight:600">${description}</p>
              <p style="margin:0 0 12px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.5px">Tipo</p>
              <p style="margin:0 0 16px;color:#374151;font-size:14px">${typeLabel}</p>
              <p style="margin:0 0 12px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.5px">Valor</p>
              <p style="margin:0 0 16px;color:${amountColor};font-size:20px;font-weight:700">${amountPrefix}${formatBRL(amount)}</p>
              <p style="margin:0 0 12px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.5px">Data</p>
              <p style="margin:0 0 16px;color:#374151;font-size:14px">${formatDateBR(date)}</p>
              <p style="margin:0 0 12px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.5px">Conta</p>
              <p style="margin:0;color:#374151;font-size:14px">${accountName}</p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:8px">
            <a href="${appUrl}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:15px;font-weight:600">Abrir MyCash</a>
          </td></tr></table>
        </td></tr>
        <tr><td style="background:#f3f4f6;padding:16px 32px;text-align:center">
          <p style="margin:0;color:#9ca3af;font-size:12px">— Equipe MyCash</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

export function passwordResetEmail(resetUrl: string): EmailTemplate {
  return {
    subject: "MyCash — Recuperação de Senha / Password Reset",
    text: [
      "Olá,",
      "",
      "Recebemos uma solicitação para redefinir a senha da sua conta no MyCash.",
      "Clique no link abaixo para criar uma nova senha:",
      "",
      resetUrl,
      "",
      "Se você não solicitou essa alteração, ignore este e-mail — sua senha permanecerá inalterada.",
      "",
      "Este link expira em 1 hora.",
      "",
      "— Equipe MyCash",
    ].join("\n"),
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 0">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
        <tr><td style="background:#3b82f6;padding:24px 32px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">MyCash</h1>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6">Olá,</p>
          <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6">Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha:</p>
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:24px">
            <a href="${resetUrl}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:15px;font-weight:600">Redefinir Senha</a>
          </td></tr></table>
          <p style="margin:0 0 16px;color:#6b7280;font-size:13px;line-height:1.5">Se o botão não funcionar, copie e cole este link no seu navegador:</p>
          <p style="margin:0 0 24px;word-break:break-all;color:#3b82f6;font-size:13px">${resetUrl}</p>
          <p style="margin:0 0 8px;color:#6b7280;font-size:13px;line-height:1.5">Se você não solicitou essa alteração, ignore este e-mail — sua senha permanecerá inalterada.</p>
          <p style="margin:0;color:#9ca3af;font-size:12px">Este link expira em 1 hora.</p>
        </td></tr>
        <tr><td style="background:#f3f4f6;padding:16px 32px;text-align:center">
          <p style="margin:0;color:#9ca3af;font-size:12px">— Equipe MyCash</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}