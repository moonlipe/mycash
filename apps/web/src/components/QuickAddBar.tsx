import { useTranslation } from "react-i18next";
import { useState, useCallback, useMemo, useRef, useEffect, type FormEvent } from "react";
import { Plus, ChevronDown, ChevronUp, X, Repeat, CalendarRange, Bell } from "lucide-react";
import type { Category, Account, TransactionType, RecurrenceType, CreateTransactionData } from "@/lib/api";
import { api } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import { parseCliInput } from "@/lib/cliParser";
import { fuzzyMatchCategory, fuzzyMatchAccount } from "@/lib/fuzzyMatch";

function parseCurrencyInput(value: string): number {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

function formatCurrencyInput(cents: number): string {
  if (cents === 0) return "";
  const reais = Math.floor(cents / 100);
  const centavos = cents % 100;
  return `R$ ${reais.toLocaleString("pt-BR")},${String(centavos).padStart(2, "0")}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Math.abs(value) / 100);
}

function isCliMode(text: string): boolean {
  const trimmed = text.trimStart();
  return trimmed.startsWith("/-") || trimmed.startsWith("/+");
}

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: "income", label: "+" },
  { value: "expense", label: "-" },
  { value: "transfer", label: "\u21C4" },
];

const typeColorClasses = (t: TransactionType) => {
  switch (t) {
    case "income":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "expense":
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
    case "transfer":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  }
};

const RECURRENCE_OPTIONS = [2, 3, 4, 5, 6, 8, 10, 12, 18, 24, 36, 48];

function getRandomColor(seed: string): string {
  const colors = [
    "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
    "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6",
    "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
    "#f43f5e",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

interface QuickAddBarProps {
  categories: Category[];
  accounts: Account[];
  onCreateTransaction: (data: CreateTransactionData) => Promise<void>;
  onRefresh: () => void;
  defaultAccountId?: string;
  month: number;
  year: number;
}

export function QuickAddBar({
  categories,
  accounts,
  onCreateTransaction,
  onRefresh,
  defaultAccountId,
  month,
  year,
}: QuickAddBarProps) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const descRef = useRef<HTMLInputElement>(null);
  const [desc, setDesc] = useState("");
  const [amountCents, setAmountCents] = useState(0);
  const [amountDisplay, setAmountDisplay] = useState("");
  const today = new Date().toISOString().split("T")[0];
  const [dueDate, setDueDate] = useState(today);
  const [type, setType] = useState<TransactionType>("expense");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState(defaultAccountId || "");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [highlightedCategoryIndex, setHighlightedCategoryIndex] = useState(0);
  const [accountQuery, setAccountQuery] = useState("");
  const [highlightedAccountIndex, setHighlightedAccountIndex] = useState(0);
  const [cliFocused, setCliFocused] = useState(false);

  const selectedMonth = `${year}-${String(month).padStart(2, "0")}`;

  const cliActive = isCliMode(desc);
  const cliPreview = useMemo(() => {
    if (!cliActive) return null;
    return parseCliInput(desc, selectedMonth);
  }, [desc, selectedMonth, cliActive]);

  const cliMatchedCategory = useMemo(() => {
    if (!cliPreview?.category) return null;
    return fuzzyMatchCategory(cliPreview.category, categories);
  }, [cliPreview?.category, categories]);

  const cliMatchedAccount = useMemo(() => {
    if (!cliPreview?.account) return null;
    return fuzzyMatchAccount(cliPreview.account, accounts);
  }, [cliPreview?.account, accounts]);

  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [notes, setNotes] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType | "none">("none");
  const [installmentCount, setInstallmentCount] = useState(2);

  const filteredCategories = categories.filter((cat) => {
    if (type === "transfer") return true;
    return cat.type === type;
  }).filter((cat) =>
    categoryQuery.trim() === "" ||
    cat.name.toLowerCase().includes(categoryQuery.trim().toLowerCase())
  );

  const filteredAccounts = accounts.filter((acc) =>
    accountQuery.trim() === "" ||
    acc.name.toLowerCase().includes(accountQuery.trim().toLowerCase())
  );

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedAccount = accounts.find((a) => a.id === accountId);

  useEffect(() => {
    if (selectedCategory) {
      setCategoryQuery(selectedCategory.name);
    } else {
      setCategoryQuery("");
    }
  }, [selectedCategory?.id]);

  useEffect(() => {
    if (selectedAccount) {
      setAccountQuery(selectedAccount.name);
    } else {
      setAccountQuery("");
    }
  }, [selectedAccount?.id]);

  const handleCreateCategory = useCallback(
    async (name: string) => {
      const { data, error } = await api.createCategory({
        name,
        type: type === "transfer" ? "expense" : type,
        color: getRandomColor(name),
      });
      if (error || !data) {
        showToast(t("errors.save_failed_retry"), "error");
        return;
      }
      setCategoryId(data.category.id);
      setCategoryQuery(data.category.name);
      setShowCategoryDropdown(false);
      onRefresh();
    },
    [type, showToast, t, onRefresh]
  );

  const handleAmountChange = useCallback((raw: string) => {
    const cents = parseCurrencyInput(raw);
    setAmountCents(cents);
    setAmountDisplay(formatCurrencyInput(cents));
  }, []);

  const resetTraditionalForm = useCallback(() => {
    setDesc("");
    setAmountCents(0);
    setAmountDisplay("");
    setDueDate(today);
    setCategoryId("");
    setCategoryQuery("");
    setAccountId(defaultAccountId || "");
    setAccountQuery(selectedAccount?.name || "");
    setNotes("");
    setReminderDate("");
    setRecurrenceType("none");
    setInstallmentCount(2);
    setShowMoreOptions(false);
    setType("expense");
    descRef.current?.focus();
  }, [today, defaultAccountId, selectedAccount?.name]);

  const resetCliForm = useCallback(() => {
    setDesc("");
    setNotes("");
    setReminderDate("");
    setRecurrenceType("none");
    setInstallmentCount(2);
    setShowMoreOptions(false);
    descRef.current?.focus();
  }, []);

  const handleInsert = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      if (cliActive) {
        if (!desc.trim()) return;

        const parsed = parseCliInput(desc, selectedMonth);
        if (!parsed.amount || parsed.amount <= 0) return;

        const amountCentsVal = Math.round(parsed.amount * 100);

        const matchedCategory = parsed.category
          ? fuzzyMatchCategory(parsed.category, categories)
          : null;
        if (!matchedCategory) return;

        const matchedAccount = parsed.account
          ? fuzzyMatchAccount(parsed.account, accounts)
          : null;
        const finalAccountId = matchedAccount?.id || defaultAccountId || "";
        if (!finalAccountId) return;

        const finalDate = parsed.date || today;

        const data: CreateTransactionData = {
          description: parsed.description || t("transactions.cli_default_description"),
          amount: amountCentsVal,
          date: finalDate,
          dueDate: finalDate,
          type: parsed.type,
          accountId: finalAccountId,
          categoryId: matchedCategory.id,
          notes: notes.trim() || undefined,
          reminderDate: reminderDate || undefined,
        };

        if (recurrenceType === "installment") {
          data.recurrence = {
            type: "installment",
            totalInstallments: installmentCount,
          };
        } else if (recurrenceType === "recurring") {
          data.recurrence = {
            type: "recurring",
            totalInstallments: 12,
          };
        }

        await onCreateTransaction(data);
        resetCliForm();
      } else {
        if (!desc.trim() || amountCents <= 0) return;
        if (!dueDate) return;

        let finalCategoryId = categoryId;
        if (!finalCategoryId && categoryQuery.trim()) {
          const exactMatch = categories.find(
            (c) =>
              c.name.toLowerCase() === categoryQuery.trim().toLowerCase() &&
              (type === "transfer" || c.type === type)
          );
          if (exactMatch) {
            finalCategoryId = exactMatch.id;
          }
        }

        let finalAccountId = accountId;
        if (!finalAccountId && accountQuery.trim()) {
          const exactMatch = accounts.find(
            (a) => a.name.toLowerCase() === accountQuery.trim().toLowerCase()
          );
          if (exactMatch) {
            finalAccountId = exactMatch.id;
          }
        }

        if (!finalCategoryId || !finalAccountId) return;

        const data: CreateTransactionData = {
          description: desc.trim(),
          amount: amountCents,
          date: today,
          dueDate,
          type,
          accountId: finalAccountId,
          categoryId: finalCategoryId,
          notes: notes.trim() || undefined,
          reminderDate: reminderDate || undefined,
        };

        if (recurrenceType === "installment") {
          data.recurrence = {
            type: "installment",
            totalInstallments: installmentCount,
          };
        } else if (recurrenceType === "recurring") {
          data.recurrence = {
            type: "recurring",
            totalInstallments: 12,
          };
        }

        await onCreateTransaction(data);
        resetTraditionalForm();
      }
    },
    [
      cliActive, desc, selectedMonth, categories, defaultAccountId, today,
      onCreateTransaction, amountCents, dueDate, type, categoryId, accountId,
      categoryQuery, accountQuery, accounts, notes, reminderDate,
      recurrenceType, installmentCount, resetCliForm, resetTraditionalForm, t
    ]
  );

  const currentAmountCents = cliActive && cliPreview?.amount
    ? Math.round(cliPreview.amount * 100)
    : amountCents;

  return (
    <form
      id="quick-add-form"
      onSubmit={handleInsert}
      className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="space-y-2 px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="flex shrink-0 overflow-hidden rounded-md border border-gray-200 dark:border-gray-600">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setType(opt.value);
                  setCategoryId("");
                }}
                className={`px-2 py-1 text-xs font-bold transition-colors ${
                  (cliActive
                    ? cliPreview?.type === opt.value
                    : type === opt.value)
                    ? typeColorClasses(opt.value)
                    : "bg-white text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-0 flex-1">
            <input
              ref={descRef}
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onFocus={() => setCliFocused(true)}
              onBlur={() => setTimeout(() => setCliFocused(false), 200)}
              placeholder={t("transactions.cli_placeholder")}
              className="w-full border-none bg-transparent text-sm outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-gray-100"
            />

            {cliActive && cliFocused && (
              <div className="absolute left-0 top-full z-50 mt-2 w-full max-w-xl rounded-lg border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95">
                <div className="flex flex-wrap gap-4 text-xs">
                  <span
                    className={`flex items-center gap-1 font-semibold ${
                      cliPreview?.type === "expense"
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {cliPreview?.type === "expense" ? "🔴" : "🟢"}{" "}
                    {cliPreview?.type === "expense"
                      ? t("transactions.expense")
                      : t("transactions.income")}
                  </span>

                  <span className="text-slate-400 dark:text-slate-500">|</span>

                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    💰 R${" "}
                    {cliPreview?.amount
                      ? cliPreview.amount.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })
                      : "0,00"}
                  </span>

                  <span className="text-slate-400 dark:text-slate-500">|</span>

                  <span className="text-slate-600 dark:text-slate-400">
                    📝 {cliPreview?.description || t("transactions.cli_no_description")}
                  </span>

                  {(cliPreview?.category || cliPreview?.account || cliPreview?.date) && (
                    <>
                      <span className="text-slate-400 dark:text-slate-500">|</span>
                      {cliPreview?.category && (
                        <span
                          className={`rounded px-1.5 py-0.5 font-medium ${
                            cliMatchedCategory
                              ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                              : "italic text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          🏷️{" "}
                          {cliMatchedCategory
                            ? `@${cliMatchedCategory.name}`
                            : `${t("transactions.cli_map_to")} ${cliPreview.category}?`}
                        </span>
                      )}
                      {cliPreview?.account && (
                        <span
                          className={`rounded px-1.5 py-0.5 font-medium ${
                            cliMatchedAccount
                              ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                              : "italic text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          🏦{" "}
                          {cliMatchedAccount
                            ? `!${cliMatchedAccount.name}`
                            : `${t("transactions.cli_map_to")} ${cliPreview.account}?`}
                        </span>
                      )}
                      {cliPreview?.date && (
                        <span className="text-slate-500 dark:text-slate-400">
                          📅{" "}
                          {new Date(cliPreview.date + "T12:00:00").toLocaleDateString(
                            i18n.language === "pt" ? "pt-BR" : "en-US",
                            { day: "numeric", month: "long", year: "numeric" }
                          )}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!cliActive && (
            <>
              <div className="relative">
                <div className="flex items-center gap-1">
                  {selectedCategory && (
                    <span
                      className="ml-1.5 inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: selectedCategory.color }}
                    />
                  )}
                  <input
                    type="text"
                    value={categoryQuery}
                    onChange={(e) => {
                      setCategoryQuery(e.target.value);
                      setCategoryId("");
                      setShowCategoryDropdown(true);
                      setHighlightedCategoryIndex(0);
                    }}
                    onFocus={() => {
                      setShowCategoryDropdown(true);
                      setShowAccountDropdown(false);
                      setHighlightedCategoryIndex(0);
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowCategoryDropdown(false), 150);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setShowCategoryDropdown(true);
                        setHighlightedCategoryIndex((prev) =>
                          Math.min(prev + 1, filteredCategories.length - 1)
                        );
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setShowCategoryDropdown(true);
                        setHighlightedCategoryIndex((prev) => Math.max(prev - 1, 0));
                      } else if (e.key === "Enter") {
                        e.preventDefault();
                        const items = filteredCategories;
                        if (items.length > 0 && highlightedCategoryIndex < items.length) {
                          const cat = items[highlightedCategoryIndex];
                          setCategoryId(cat.id);
                          setCategoryQuery(cat.name);
                          setShowCategoryDropdown(false);
                        }
                      } else if (e.key === "Escape") {
                        setShowCategoryDropdown(false);
                      }
                    }}
                    placeholder={t("transactions.category")}
                    className="w-28 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 outline-none transition-colors placeholder:text-gray-400 focus:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:placeholder:text-gray-500"
                  />
                </div>

                {showCategoryDropdown && (
                  <div className="absolute right-0 top-full z-20 mt-1 max-h-48 w-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700">
                    {filteredCategories.map((cat, index) => (
                      <button
                        key={cat.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setCategoryId(cat.id);
                          setCategoryQuery(cat.name);
                          setShowCategoryDropdown(false);
                        }}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors dark:text-gray-300 ${
                          index === highlightedCategoryIndex
                            ? "bg-gray-100 dark:bg-gray-600"
                            : "hover:bg-gray-100 dark:hover:bg-gray-600"
                        }`}
                      >
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </button>
                    ))}
                    {categoryQuery.trim() !== "" &&
                      !filteredCategories.some(
                        (c) => c.name.toLowerCase() === categoryQuery.trim().toLowerCase()
                      ) && (
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            if (
                              window.confirm(
                                t("transactions.create_category_confirm", {
                                  name: categoryQuery.trim(),
                                })
                              )
                            ) {
                              handleCreateCategory(categoryQuery.trim());
                            }
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
                        >
                          <Plus size={14} />
                          {t("transactions.create_category", { name: categoryQuery.trim() })}
                        </button>
                      )}
                    {filteredCategories.length === 0 && categoryQuery.trim() === "" && (
                      <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
                        {t("transactions.no_categories")}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={accountQuery}
                  onChange={(e) => {
                    setAccountQuery(e.target.value);
                    setAccountId("");
                    setShowAccountDropdown(true);
                    setHighlightedAccountIndex(0);
                  }}
                  onFocus={() => {
                    setShowAccountDropdown(true);
                    setShowCategoryDropdown(false);
                    setHighlightedAccountIndex(0);
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowAccountDropdown(false), 150);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setShowAccountDropdown(true);
                      setHighlightedAccountIndex((prev) =>
                        Math.min(prev + 1, filteredAccounts.length - 1)
                      );
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setShowAccountDropdown(true);
                      setHighlightedAccountIndex((prev) => Math.max(prev - 1, 0));
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      const items = filteredAccounts;
                      if (items.length > 0 && highlightedAccountIndex < items.length) {
                        const acc = items[highlightedAccountIndex];
                        setAccountId(acc.id);
                        setAccountQuery(acc.name);
                        setShowAccountDropdown(false);
                      }
                    } else if (e.key === "Escape") {
                      setShowAccountDropdown(false);
                    }
                  }}
                  placeholder={t("transactions.account")}
                  className="w-28 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 outline-none transition-colors placeholder:text-gray-400 focus:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:placeholder:text-gray-500"
                />

                {showAccountDropdown && (
                  <div className="absolute right-0 top-full z-20 mt-1 max-h-48 w-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700">
                    {filteredAccounts.map((acc, index) => (
                      <button
                        key={acc.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setAccountId(acc.id);
                          setAccountQuery(acc.name);
                          setShowAccountDropdown(false);
                        }}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors dark:text-gray-300 ${
                          index === highlightedAccountIndex
                            ? "bg-gray-100 dark:bg-gray-600"
                            : "hover:bg-gray-100 dark:hover:bg-gray-600"
                        }`}
                      >
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: acc.color }}
                        />
                        {acc.name}
                      </button>
                    ))}
                    {filteredAccounts.length === 0 && (
                      <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
                        {t("transactions.no_accounts")}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-32 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                title={t("transactions.due_date")}
              />

              <input
                type="text"
                value={amountDisplay}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder={t("transactions.new_amount_placeholder")}
                className="w-28 border-none bg-transparent text-right text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100 dark:placeholder:text-gray-500"
                inputMode="decimal"
              />
            </>
          )}

          <button
            type="submit"
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <Plus size={18} />
          </button>

          <button
            type="button"
            onClick={() => setShowMoreOptions(!showMoreOptions)}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            title={t("transactions.more_options")}
          >
            {showMoreOptions ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

      {showMoreOptions && (
        <div className="space-y-3 border-t border-gray-200 px-4 py-3 dark:border-gray-600">
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
              <Bell size={12} />
              {t("transactions.reminder_label")}
            </label>
            <input
              type="date"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              {t("transactions.notes_label")}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("transactions.notes_placeholder")}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              {t("transactions.recurrence_label")}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRecurrenceType(recurrenceType === "none" ? "none" : "none")}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  recurrenceType === "none"
                    ? "border-gray-400 bg-gray-100 text-gray-900 dark:border-gray-500 dark:bg-gray-600 dark:text-gray-100"
                    : "border-gray-200 bg-white text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
                }`}
              >
                {t("transactions.no_recurrence")}
              </button>
              <button
                type="button"
                onClick={() => setRecurrenceType(recurrenceType === "installment" ? "none" : "installment")}
                className={`flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  recurrenceType === "installment"
                    ? "border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-400"
                    : "border-gray-200 bg-white text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
                }`}
              >
                <CalendarRange size={14} />
                {t("transactions.installment")}
              </button>
              <button
                type="button"
                onClick={() => setRecurrenceType(recurrenceType === "recurring" ? "none" : "recurring")}
                className={`flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  recurrenceType === "recurring"
                    ? "border-violet-400 bg-violet-50 text-violet-700 dark:border-violet-500 dark:bg-violet-900/30 dark:text-violet-400"
                    : "border-gray-200 bg-white text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
                }`}
              >
                <Repeat size={14} />
                {t("transactions.recurring")}
              </button>
            </div>
          </div>

          {recurrenceType === "installment" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                {t("transactions.installment_count")}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {RECURRENCE_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setInstallmentCount(n)}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                      installmentCount === n
                        ? "border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-400"
                        : "border-gray-200 bg-white text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
                    }`}
                  >
                    {n}x
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                {t("transactions.installment_hint", { count: installmentCount })}
                {currentAmountCents > 0 && (
                  <span className="ml-1 text-gray-500 dark:text-gray-400">
                    {t("transactions.installment_value_hint", {
                      value: formatCurrency(currentAmountCents),
                    })}
                  </span>
                )}
              </p>
            </div>
          )}

          {recurrenceType === "recurring" && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("transactions.recurring_hint")}
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              setShowMoreOptions(false);
              setNotes("");
              setReminderDate("");
              setRecurrenceType("none");
              setInstallmentCount(2);
            }}
            className="flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={14} />
            {t("transactions.clear_options")}
          </button>
        </div>
      )}
      </div>
    </form>
  );
}
