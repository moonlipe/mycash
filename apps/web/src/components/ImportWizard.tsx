import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  api,
  type Account,
  type Category,
  type CreateTransactionData,
} from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import {
  Upload,
  FileSpreadsheet,
  Table,
  Check,
  AlertCircle,
  ArrowLeft,
  Loader2,
  ChevronDown,
} from "lucide-react";

type ImportStep = "upload" | "map" | "review" | "processing" | "done";

interface ImportWizardProps {
  accounts: Account[];
  categories: Category[];
  onComplete?: () => void;
}

interface PreviewRow {
  [key: string]: string | number | null | undefined;
}

interface MappedTransaction {
  description: string;
  amount: number;
  date: string;
  type: "income" | "expense";
  accountId: string;
  categoryId: string;
  isPaid: boolean;
  rawAccountName?: string;
  rawCategoryName?: string;
}

function normalizeAmount(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const str = String(value)
    .replace(/[^\d,.-]/g, "")
    .trim();
  if (!str) return 0;

  const hasComma = str.includes(",");
  const hasDot = str.includes(".");

  let cleaned = str;
  if (hasComma && hasDot) {
    const lastComma = str.lastIndexOf(",");
    const lastDot = str.lastIndexOf(".");
    if (lastComma > lastDot) {
      cleaned = str.replace(/\./g, "").replace(",", ".");
    } else {
      cleaned = str.replace(/,/g, "");
    }
  } else if (hasComma && !hasDot) {
    cleaned = str.replace(",", ".");
  }

  const numeric = parseFloat(cleaned);
  if (isNaN(numeric)) return 0;

  const isNegative = cleaned.startsWith("-") || numeric < 0;
  const absCents = Math.round(Math.abs(numeric) * 100);
  return isNegative ? -absCents : absCents;
}

function parseSmartDate(value: string | number | null | undefined): string {
  if (value == null) return "";
  const str = String(value).trim();
  if (!str) return "";

  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m}-${d}`;
  }

  const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    return `${y}-${m}-${d}`;
  }

  const usMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (usMatch) {
    const [, m, d, y] = usMatch;
    return `${y}-${m}-${d}`;
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }

  return "";
}

function resolveEntityByName(
  name: string | null | undefined,
  entities: { id: string; name: string }[]
): string | null {
  if (!name) return null;
  const normalized = String(name).trim().toLowerCase();
  if (!normalized) return null;
  const match = entities.find(
    (e) => e.name.trim().toLowerCase() === normalized
  );
  return match?.id ?? null;
}

export function ImportWizard({ accounts, categories, onComplete }: ImportWizardProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [step, setStep] = useState<ImportStep>("upload");
  const [rawRows, setRawRows] = useState<PreviewRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");

  const [colDescription, setColDescription] = useState("");
  const [colAmount, setColAmount] = useState("");
  const [colDate, setColDate] = useState("");
  const [colAccount, setColAccount] = useState("");
  const [colCategory, setColCategory] = useState("");

  const [fallbackAccountId, setFallbackAccountId] = useState("");
  const [fallbackCategoryId, setFallbackCategoryId] = useState("");
  const [globalIsPaid, setGlobalIsPaid] = useState(true);

  const [progress, setProgress] = useState({ current: 0, total: 0, errors: 0 });
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [expandedPreviewRow, setExpandedPreviewRow] = useState<number | null>(null);
  const [showAllValid, setShowAllValid] = useState(false);

  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === "income"),
    [categories]
  );
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === "expense"),
    [categories]
  );

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setFileName(file.name);
      setProcessingError(null);

      if (file.name.toLowerCase().endsWith(".csv")) {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const data = results.data as PreviewRow[];
            if (data.length > 0) {
              setHeaders(Object.keys(data[0]));
              setRawRows(data);
              autoMapHeaders(Object.keys(data[0]));
              setStep("map");
            } else {
              showToast(t("import.empty_file"), "error");
            }
          },
          error: (err) => {
            showToast(err.message || t("import.parse_error"), "error");
          },
        });
      } else {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const bstr = evt.target?.result as string;
            const wb = XLSX.read(bstr, { type: "binary" });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { defval: "" }) as PreviewRow[];
            if (data.length > 0) {
              setHeaders(Object.keys(data[0]));
              setRawRows(data);
              autoMapHeaders(Object.keys(data[0]));
              setStep("map");
            } else {
              showToast(t("import.empty_file"), "error");
            }
          } catch {
            showToast(t("import.parse_error"), "error");
          }
        };
        reader.onerror = () => showToast(t("import.read_error"), "error");
        reader.readAsBinaryString(file);
      }
    },
    [showToast, t]
  );

  function autoMapHeaders(h: string[]) {
    const find = (keywords: string[]) =>
      h.find((header) =>
        keywords.some((k) => header.toLowerCase().includes(k))
      ) || "";

    setColDescription(find(["desc", "hist", "memo", "nome", "lançamento", "identificação", "transação"]));
    setColAmount(find(["valor", "amount", "value", "montante", "total", "preço", "r$", "$"]));
    setColDate(find(["data", "date", "vencimento", "due", "realizado", "competência"]));
    setColAccount(find(["conta", "account", "banco", "cartão", "instituição"]));
    setColCategory(find(["categoria", "category", "classificação", "grupo", "tipo"]));
  }

  const previewRows = useMemo(() => rawRows.slice(0, 5), [rawRows]);

  const preparedTransactions = useMemo<MappedTransaction[]>(() => {
    if (!colDescription || !colAmount || !colDate) return [];

    return rawRows
      .map((row) => {
        const rawDesc = row[colDescription];
        const description = rawDesc ? String(rawDesc).trim() : t("import.default_description");

        const rawAmt = row[colAmount];
        const amountInCents = normalizeAmount(rawAmt);

        const rawDt = row[colDate];
        const formattedDate = parseSmartDate(rawDt);

        const type: MappedTransaction["type"] = amountInCents >= 0 ? "income" : "expense";

        const fileAccountName = colAccount ? String(row[colAccount] ?? "") : null;
        const resolvedAccountId =
          resolveEntityByName(fileAccountName, accounts) ?? fallbackAccountId;

        const fileCategoryName = colCategory ? String(row[colCategory] ?? "") : null;
        const targetCategories = type === "income" ? incomeCategories : expenseCategories;
        const resolvedCategoryId =
          resolveEntityByName(fileCategoryName, targetCategories) ?? fallbackCategoryId;

        return {
          description,
          amount: Math.abs(amountInCents),
          date: formattedDate,
          type,
          accountId: resolvedAccountId,
          categoryId: resolvedCategoryId,
          isPaid: globalIsPaid,
          rawAccountName: fileAccountName || undefined,
          rawCategoryName: fileCategoryName || undefined,
        };
      })
      .filter((tx) => tx.amount > 0 && tx.date !== "");
  }, [
    rawRows,
    colDescription,
    colAmount,
    colDate,
    colAccount,
    colCategory,
    fallbackAccountId,
    fallbackCategoryId,
    globalIsPaid,
    accounts,
    incomeCategories,
    expenseCategories,
    t,
  ]);

  const importableCount = preparedTransactions.length;

  const processAndImport = useCallback(async () => {
    if (importableCount === 0) {
      showToast(t("import.no_valid_transactions"), "error");
      return;
    }

    const missingAccountCount = preparedTransactions.filter((tx) => !tx.accountId).length;
    const missingCategoryCount = preparedTransactions.filter((tx) => !tx.categoryId).length;

    if (missingAccountCount > 0 || missingCategoryCount > 0) {
      let msg = t("import.resolve_all_entities");
      if (missingAccountCount > 0 && missingCategoryCount > 0) {
        msg = t("import.resolve_both", {
          accountCount: missingAccountCount,
          categoryCount: missingCategoryCount,
        });
      } else if (missingAccountCount > 0) {
        msg = t("import.resolve_account", { count: missingAccountCount });
      } else {
        msg = t("import.resolve_category", { count: missingCategoryCount });
      }
      showToast(msg, "error");
      return;
    }

    setStep("processing");
    setProgress({ current: 0, total: preparedTransactions.length, errors: 0 });

    const chunkSize = 10;
    let processed = 0;
    let errors = 0;

    for (let i = 0; i < preparedTransactions.length; i += chunkSize) {
      const chunk = preparedTransactions.slice(i, i + chunkSize);
      const results = await Promise.all(
        chunk.map(async (tx) => {
          const data: CreateTransactionData = {
            description: tx.description,
            amount: tx.amount,
            date: tx.date,
            dueDate: tx.date,
            type: tx.type,
            accountId: tx.accountId,
            categoryId: tx.categoryId,
            isPaid: tx.isPaid,
          };

          try {
            const res = await api.createTransaction(data);
            if (res.error) {
              return { success: false, error: res.error };
            }
            return { success: true, error: null };
          } catch (err) {
            return { success: false, error: String(err) };
          }
        })
      );

      processed += chunk.length;
      errors += results.filter((r) => !r.success).length;
      setProgress({ current: processed, total: preparedTransactions.length, errors });
    }

    if (errors > 0) {
      setProcessingError(t("import.partial_error", { count: errors }));
    }

    setStep("done");
  }, [importableCount, preparedTransactions, showToast, t]);

  const resetWizard = useCallback(() => {
    setStep("upload");
    setRawRows([]);
    setHeaders([]);
    setFileName("");
    setColDescription("");
    setColAmount("");
    setColDate("");
    setColAccount("");
    setColCategory("");
    setFallbackAccountId("");
    setFallbackCategoryId("");
    setGlobalIsPaid(true);
    setProgress({ current: 0, total: 0, errors: 0 });
    setProcessingError(null);
    setExpandedPreviewRow(null);
    onComplete?.();
  }, [onComplete]);

  const goBack = useCallback(() => {
    if (step === "map") {
      setStep("upload");
    } else if (step === "review") {
      setStep("map");
    } else if (step === "done") {
      resetWizard();
    }
  }, [step, resetWizard]);

  function formatPreviewValue(val: unknown): string {
    if (val == null) return "";
    return String(val);
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 md:p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {step !== "upload" && step !== "processing" && (
            <button
              onClick={goBack}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              title={t("import.back")}
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {step === "upload" && t("import.title_upload")}
            {step === "map" && t("import.title_map")}
            {step === "review" && t("import.title_review")}
            {step === "processing" && t("import.title_processing")}
            {step === "done" && t("import.title_done")}
          </h2>
        </div>
        {fileName && (
          <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            {fileName.toLowerCase().endsWith(".csv") ? (
              <Table size={12} />
            ) : (
              <FileSpreadsheet size={12} />
            )}
            {fileName}
          </span>
        )}
      </div>

      {/* Step: Upload */}
      {step === "upload" && (
        <div className="py-6">
          <label className="flex cursor-pointer flex-col items-center gap-4 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-10 transition-colors hover:border-gray-400 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800/50 dark:hover:border-gray-500 dark:hover:bg-gray-700/50">
            <Upload size={40} className="text-gray-400 dark:text-gray-500" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("import.upload_prompt")}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t("import.supported_formats")}
              </p>
            </div>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* Step: Map */}
      {step === "map" && (
        <div className="space-y-5">
          {/* Column mapping */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t("import.column_mapping")}
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                  {t("import.col_description")} *
                </label>
                <select
                  value={colDescription}
                  onChange={(e) => setColDescription(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="">{t("import.select_column")}</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                  {t("import.col_amount")} *
                </label>
                <select
                  value={colAmount}
                  onChange={(e) => setColAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="">{t("import.select_column")}</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                  {t("import.col_date")} *
                </label>
                <select
                  value={colDate}
                  onChange={(e) => setColDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="">{t("import.select_column")}</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {t("import.col_account")}
                </label>
                <select
                  value={colAccount}
                  onChange={(e) => setColAccount(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="">{t("import.select_column_optional")}</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {t("import.col_category")}
                </label>
                <select
                  value={colCategory}
                  onChange={(e) => setColCategory(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="">{t("import.select_column_optional")}</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Destination rules */}
          <div className="space-y-4 border-t border-gray-100 pt-4 dark:border-gray-700">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t("import.destination_rules")}
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                  {t("import.fallback_account")}
                </label>
                <select
                  value={fallbackAccountId}
                  onChange={(e) => setFallbackAccountId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="">{t("import.choose_account")}</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  {t("import.fallback_account_hint")}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                  {t("import.fallback_category")}
                </label>
                <select
                  value={fallbackCategoryId}
                  onChange={(e) => setFallbackCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="">{t("import.choose_category")}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  {t("import.fallback_category_hint")}
                </p>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={globalIsPaid}
                    onChange={(e) => setGlobalIsPaid(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("import.mark_all_paid")}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Preview */}
          {previewRows.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  <tr>
                    {headers.map((h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {previewRows.map((row, idx) => (
                    <tr key={idx} className="text-gray-700 dark:text-gray-300">
                      {headers.map((h) => (
                        <td key={h} className="whitespace-nowrap px-3 py-2">
                          {formatPreviewValue(row[h])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rawRows.length > 5 && (
                <div className="bg-gray-50 px-3 py-1.5 text-xs text-gray-400 dark:bg-gray-800 dark:text-gray-500">
                  {t("import.preview_count", { count: rawRows.length })}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("import.required_fields_hint")}
            </p>
            <button
              onClick={() => setStep("review")}
              disabled={!colDescription || !colAmount || !colDate}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-600"
            >
              {t("import.continue_to_review")}
            </button>
          </div>
        </div>
      )}

      {/* Step: Review */}
      {step === "review" && (
        <div className="space-y-5">
          {/* Summary bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t("import.review_summary", { count: importableCount })}
            </p>
            {importableCount > 0 && (
              <button
                onClick={processAndImport}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
              >
                {t("import.start_import")}
              </button>
            )}
          </div>

          {preparedTransactions.length === 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
              {t("import.no_valid_transactions")}
            </div>
          )}

          {preparedTransactions.length > 0 && (
            <div className="space-y-4">
              {/* Problems banner */}
              {(() => {
                const missingAccount = preparedTransactions.filter((tx) => !tx.accountId);
                const missingCategory = preparedTransactions.filter((tx) => !tx.categoryId);
                const hasProblems = missingAccount.length > 0 || missingCategory.length > 0;

                if (!hasProblems) {
                  return (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
                      <Check size={16} />
                      {t("import.all_ready", { count: preparedTransactions.length })}
                    </div>
                  );
                }

                return (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                    <div className="flex items-start gap-2">
                      <AlertCircle
                        size={18}
                        className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                          {t("import.problems_found")}
                        </p>
                        <ul className="mt-1 list-inside list-disc text-xs text-amber-700 dark:text-amber-400">
                          {missingAccount.length > 0 && (
                            <li>
                              {t("import.missing_account_count", {
                                count: missingAccount.length,
                              })}
                            </li>
                          )}
                          {missingCategory.length > 0 && (
                            <li>
                              {t("import.missing_category_count", {
                                count: missingCategory.length,
                              })}
                            </li>
                          )}
                        </ul>

                        {/* Quick fallback controls */}
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {missingAccount.length > 0 && (
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-amber-800 dark:text-amber-300">
                                {t("import.quick_fallback_account")}
                              </label>
                              <select
                                value={fallbackAccountId}
                                onChange={(e) => setFallbackAccountId(e.target.value)}
                                className="w-full rounded-lg border border-amber-200 bg-white p-2 text-xs text-gray-900 outline-none dark:border-amber-900 dark:bg-gray-800 dark:text-gray-100"
                              >
                                <option value="">{t("import.choose_account")}</option>
                                {accounts.map((acc) => (
                                  <option key={acc.id} value={acc.id}>
                                    {acc.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          {missingCategory.length > 0 && (
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-amber-800 dark:text-amber-300">
                                {t("import.quick_fallback_category")}
                              </label>
                              <select
                                value={fallbackCategoryId}
                                onChange={(e) => setFallbackCategoryId(e.target.value)}
                                className="w-full rounded-lg border border-amber-200 bg-white p-2 text-xs text-gray-900 outline-none dark:border-amber-900 dark:bg-gray-800 dark:text-gray-100"
                              >
                                <option value="">{t("import.choose_category")}</option>
                                {categories.map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                        {(fallbackAccountId || fallbackCategoryId) && (
                          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                            {t("import.fallback_auto_applied")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Problematic items — always shown, no limit */}
              {(() => {
                const problematic = preparedTransactions.filter(
                  (tx) => !tx.accountId || !tx.categoryId
                );
                if (problematic.length === 0) return null;

                return (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      {t("import.problematic_items", { count: problematic.length })}
                    </h4>
                    {problematic.map((tx, idx) => {
                      const account = accounts.find((a) => a.id === tx.accountId);
                      const cat = categories.find((c) => c.id === tx.categoryId);
                      const missingAccount = !tx.accountId;
                      const missingCategory = !tx.categoryId;

                      return (
                        <div
                          key={`problem-${idx}`}
                          className="rounded-xl border border-amber-300 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-900/20"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                                {tx.description}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                                <span className="rounded bg-white px-1.5 py-0.5 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                                  {tx.date}
                                </span>
                                {account ? (
                                  <span className="flex items-center gap-1 rounded bg-white px-1.5 py-0.5 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                    <span
                                      className="inline-block h-1.5 w-1.5 rounded-full"
                                      style={{ backgroundColor: account.color }}
                                    />
                                    {account.name}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                    <AlertCircle size={10} />
                                    {t("import.account_missing")}
                                    {tx.rawAccountName && (
                                      <span className="ml-1 font-mono text-[10px] opacity-75">
                                        (“{tx.rawAccountName}”)
                                      </span>
                                    )}
                                  </span>
                                )}
                                {cat ? (
                                  <span className="flex items-center gap-1 rounded bg-white px-1.5 py-0.5 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                    <span
                                      className="inline-block h-1.5 w-1.5 rounded-full"
                                      style={{ backgroundColor: cat.color }}
                                    />
                                    {cat.name}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                    <AlertCircle size={10} />
                                    {t("import.category_missing")}
                                    {tx.rawCategoryName && (
                                      <span className="ml-1 font-mono text-[10px] opacity-75">
                                        (“{tx.rawCategoryName}”)
                                      </span>
                                    )}
                                  </span>
                                )}
                                <span
                                  className={`rounded px-1.5 py-0.5 font-medium ${
                                    tx.type === "income"
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                      : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                                  }`}
                                >
                                  {tx.type === "income" ? "+" : "-"}
                                  R$ {(tx.amount / 100).toFixed(2).replace(".", ",")}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Valid items */}
              {(() => {
                const valid = preparedTransactions.filter(
                  (tx) => tx.accountId && tx.categoryId
                );
                if (valid.length === 0) return null;

                const showLimit = 10;
                const showAll = valid.length <= showLimit;
                const display = showAll || showAllValid ? valid : valid.slice(0, showLimit);

                return (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      {t("import.valid_items", { count: valid.length })}
                    </h4>
                    {display.map((tx, idx) => {
                      const account = accounts.find((a) => a.id === tx.accountId);
                      const cat = categories.find((c) => c.id === tx.categoryId);

                      return (
                        <div
                          key={`valid-${idx}`}
                          className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                                {tx.description}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <span className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-700">
                                  {tx.date}
                                </span>
                                <span className="flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-700">
                                  <span
                                    className="inline-block h-1.5 w-1.5 rounded-full"
                                    style={{ backgroundColor: account?.color }}
                                  />
                                  {account?.name}
                                </span>
                                <span className="flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-700">
                                  <span
                                    className="inline-block h-1.5 w-1.5 rounded-full"
                                    style={{ backgroundColor: cat?.color }}
                                  />
                                  {cat?.name}
                                </span>
                                <span
                                  className={`rounded px-1.5 py-0.5 font-medium ${
                                    tx.type === "income"
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                      : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                                  }`}
                                >
                                  {tx.type === "income" ? "+" : "-"}
                                  R$ {(tx.amount / 100).toFixed(2).replace(".", ",")}
                                </span>
                                {tx.isPaid ? (
                                  <span className="flex items-center gap-0.5 rounded bg-blue-100 px-1.5 py-0.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                    <Check size={10} />
                                    {t("import.paid")}
                                  </span>
                                ) : (
                                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                                    {t("import.pending")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {!showAll && !showAllValid && (
                      <button
                        onClick={() => setShowAllValid(true)}
                        className="w-full rounded-lg py-2 text-xs font-medium text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                      >
                        {t("import.show_more_valid", {
                          count: valid.length - showLimit,
                        })}
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Step: Processing */}
      {step === "processing" && (
        <div className="py-10 text-center">
          <Loader2
            size={40}
            className="mx-auto animate-spin text-blue-600 dark:text-blue-400"
          />
          <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("import.processing_status", {
              current: progress.current,
              total: progress.total,
            })}
          </p>
          <div className="mx-auto mt-3 h-2 w-full max-w-xs overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300 dark:bg-blue-500"
              style={{
                width: `${
                  progress.total > 0
                    ? (progress.current / progress.total) * 100
                    : 0
                }%`,
              }}
            />
          </div>
          {progress.errors > 0 && (
            <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
              {t("import.errors_so_far", { count: progress.errors })}
            </p>
          )}
        </div>
      )}

      {/* Step: Done */}
      {step === "done" && (
        <div className="py-10 text-center">
          {processingError ? (
            <>
              <AlertCircle
                size={40}
                className="mx-auto text-amber-500 dark:text-amber-400"
              />
              <p className="mt-4 text-sm font-medium text-gray-800 dark:text-gray-200">
                {t("import.done_with_errors")}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {processingError}
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <Check
                  size={24}
                  className="text-emerald-600 dark:text-emerald-400"
                />
              </div>
              <p className="mt-4 text-sm font-medium text-gray-800 dark:text-gray-200">
                {t("import.done_success", { count: progress.total })}
              </p>
            </>
          )}
          <button
            onClick={resetWizard}
            className="mt-6 rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            {t("import.close")}
          </button>
        </div>
      )}
    </div>
  );
}
