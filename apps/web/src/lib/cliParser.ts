export interface ParsedCommand {
  type: "expense" | "income";
  amount?: number;
  category?: string;
  account?: string;
  date?: string;
  description: string;
}

function parseSmartDate(dateToken: string, selectedMonth: string): string {
  const normalized = dateToken.toLowerCase().trim();
  const today = new Date();

  if (normalized === "hoje") {
    return today.toISOString().split("T")[0];
  }

  if (normalized === "ontem") {
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    return yesterday.toISOString().split("T")[0];
  }

  if (/^\d+$/.test(normalized)) {
    const day = parseInt(normalized, 10);
    const paddedDay = day.toString().padStart(2, "0");
    return `${selectedMonth}-${paddedDay}`;
  }

  if (/^\d{1,2}\/\d{1,2}$/.test(normalized)) {
    const [day, month] = normalized.split("/");
    const year = selectedMonth.split("-")[0];
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  return today.toISOString().split("T")[0];
}

export function parseCliInput(input: string, selectedMonth: string = "2026-06"): ParsedCommand {
  const tokens = input.trim().split(/\s+/);

  let type: "expense" | "income" = "expense";
  let amount: number | undefined;
  let category: string | undefined;
  let account: string | undefined;
  let date: string | undefined;
  const descriptionWords: string[] = [];

  for (const token of tokens) {
    if (!token) continue;

    if (token === "/-") {
      type = "expense";
    } else if (token === "/+") {
      type = "income";
    } else if (token.startsWith("@") && token.length > 1) {
      category = token.substring(1);
    } else if (token.startsWith("!") && token.length > 1) {
      account = token.substring(1);
    } else if (token.startsWith("#") && token.length > 1) {
      date = parseSmartDate(token.substring(1), selectedMonth);
    } else if (!amount && /^\d+([.,]\d{1,2})?$/.test(token)) {
      amount = parseFloat(token.replace(",", "."));
    } else {
      descriptionWords.push(token);
    }
  }

  return {
    type,
    amount,
    category,
    account,
    date,
    description: descriptionWords.join(" "),
  };
}
