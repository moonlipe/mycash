import { useTranslation } from "react-i18next";
import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, SlidersHorizontal, Download, Paperclip, Upload } from "lucide-react";
import type { Account, Category, TransactionType, TransactionFilters } from "@/lib/api";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg,.jpeg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "text/csv": ".csv",
  "text/plain": ".txt",
};

const ACCEPT_STRING = Object.keys(ALLOWED_TYPES).join(",");
const MAX_FILE_SIZE = 5 * 1024 * 1024;

interface TransactionToolbarProps {
  filters: TransactionFilters;
  onFiltersChange: (filters: TransactionFilters) => void;
  accounts: Account[];
  categories: Category[];
  onExportCSV: () => void;
  onOpenAttachments: (transactionId: string) => void;
  activeTransactionId?: string;
}

export function TransactionToolbar({
  filters,
  onFiltersChange,
  accounts,
  categories,
  onExportCSV,
  onOpenAttachments,
  activeTransactionId,
}: TransactionToolbarProps) {
  const { t } = useTranslation();
  const [showFilters, setShowFilters] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleSearchChange = useCallback(
    (value: string) => {
      onFiltersChange({ ...filters, search: value || undefined });
    },
    [filters, onFiltersChange]
  );

  const handleClearFilters = useCallback(() => {
    onFiltersChange({});
  }, [onFiltersChange]);

  const activeFilterCount =
    (filters.search ? 1 : 0) +
    (filters.accountId ? 1 : 0) +
    (filters.categoryId ? 1 : 0) +
    (filters.type ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  useEffect(() => {
    if (showFilters) {
      const id = window.setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 50);
      return () => window.clearTimeout(id);
    }
  }, [showFilters]);

  return (
    <div className="border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          aria-expanded={showFilters}
          aria-label={t("transactions.filters")}
          className={`relative rounded-lg border px-2 py-1.5 text-sm transition-colors ${
            hasActiveFilters
              ? "border-blue-300 bg-blue-50 text-blue-600 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
          }`}
          title={t("transactions.filters")}
        >
          <SlidersHorizontal size={16} />
          {hasActiveFilters && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[9px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>

        {activeTransactionId && (
          <button
            onClick={() => setShowAttach(!showAttach)}
            className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
            title={t("transactions.attach_file")}
          >
            <Paperclip size={16} />
          </button>
        )}

        <button
          onClick={onExportCSV}
          className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
          title={t("transactions.export_csv")}
        >
          <Download size={16} />
        </button>
      </div>

      {showFilters && (
        <div className="mt-2 space-y-2">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={filters.search || ""}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t("transactions.search_placeholder")}
              className="w-full rounded-md border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-8 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
            {filters.search && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title={t("transactions.clear_search")}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filters.type || ""}
              onChange={(e) =>
                onFiltersChange({ ...filters, type: (e.target.value as TransactionType | "") || undefined })
              }
              className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
            >
              <option value="">{t("transactions.all_types")}</option>
              <option value="income">{t("transactions.income")}</option>
              <option value="expense">{t("transactions.expense")}</option>
              <option value="transfer">{t("transactions.transfer")}</option>
            </select>

            <select
              value={filters.accountId || ""}
              onChange={(e) =>
                onFiltersChange({ ...filters, accountId: e.target.value || undefined })
              }
              className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
            >
              <option value="">{t("transactions.all_accounts")}</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>

            <select
              value={filters.categoryId || ""}
              onChange={(e) =>
                onFiltersChange({ ...filters, categoryId: e.target.value || undefined })
              }
              className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
            >
              <option value="">{t("transactions.all_categories")}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                <X size={12} />
                {t("transactions.clear_filters")}
              </button>
            )}
          </div>
        </div>
      )}

      {showAttach && activeTransactionId && (
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
          >
            <Upload size={14} />
            {uploading ? t("transactions.uploading") : t("transactions.upload_file")}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_STRING}
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > MAX_FILE_SIZE) {
                alert(t("errors.attachment_too_large"));
                return;
              }
              setUploading(true);
              try {
                onOpenAttachments(activeTransactionId);
              } finally {
                setUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
                setShowAttach(false);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
