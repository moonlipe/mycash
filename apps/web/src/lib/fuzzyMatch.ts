const DIACRITICS_MAP: Record<string, string> = {
  á: "a", à: "a", â: "a", ã: "a", ä: "a",
  é: "e", è: "e", ê: "e", ë: "e",
  í: "i", ì: "i", î: "i", ï: "i",
  ó: "o", ò: "o", ô: "o", õ: "o", ö: "o",
  ú: "u", ù: "u", û: "u", ü: "u",
  ç: "c", ñ: "n",
};

function removeDiacritics(str: string): string {
  return str.replace(/[áàâãäéèêëíìîïóòôõöúùûüçñ]/g, (ch) => DIACRITICS_MAP[ch] || ch);
}

export function normalize(str: string): string {
  return removeDiacritics(str).toLowerCase().trim();
}

export function fuzzyMatchAccount(query: string, accounts: { id: string; name: string }[]): { id: string; name: string } | null {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return null;

  const exact = accounts.find((a) => normalize(a.name) === normalizedQuery);
  if (exact) return exact;

  const startsWith = accounts.find((a) => normalize(a.name).startsWith(normalizedQuery));
  if (startsWith) return startsWith;

  const includes = accounts.find((a) => normalize(a.name).includes(normalizedQuery));
  if (includes) return includes;

  return null;
}

export function fuzzyMatchCategory(query: string, categories: { id: string; name: string }[]): { id: string; name: string } | null {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return null;

  const exact = categories.find((c) => normalize(c.name) === normalizedQuery);
  if (exact) return exact;

  const startsWith = categories.find((c) => normalize(c.name).startsWith(normalizedQuery));
  if (startsWith) return startsWith;

  const includes = categories.find((c) => normalize(c.name).includes(normalizedQuery));
  if (includes) return includes;

  return null;
}
